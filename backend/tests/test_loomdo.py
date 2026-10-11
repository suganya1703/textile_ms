import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.quality import Roll
from backend.app.models.master import Machine, Worker
from backend.app.models.yarn_order import Order, ProductionJob
from backend.app.services.grading import calculate_defect_points, evaluate_roll_grade

client = TestClient(app)

def test_astm_four_point_grading_logic():
    # Holes: <= 1 in -> 2 pts, > 1 in -> 4 pts
    assert calculate_defect_points("hole", 0.5) == 2
    assert calculate_defect_points("hole", 2.0) == 4
    
    # Linear defects: <=3in -> 1, 3-6in -> 2, 6-9in -> 3, >9in -> 4
    assert calculate_defect_points("uneven_weave", 2.5) == 1
    assert calculate_defect_points("uneven_weave", 5.0) == 2
    assert calculate_defect_points("uneven_weave", 8.0) == 3
    assert calculate_defect_points("uneven_weave", 12.0) == 4

    # 100m roll (109.36 yards) of 58" fabric with 10 total points
    grade, qc_status, pts_per_100, area = evaluate_roll_grade(10, 100.0, 58.0)
    assert grade == "A"
    assert qc_status == "pass"
    assert pts_per_100 <= 20.0

    # 100m roll with 80 total points (45.4 pts/100 sq yd > 40 cutoff) -> Reject
    grade_rej, qc_rej, pts_rej, _ = evaluate_roll_grade(80, 100.0, 58.0)
    assert grade_rej == "reject"
    assert qc_rej == "reject"

def test_cannot_assign_job_to_broken_machine():
    db = SessionLocal()
    # Machine 7 is Loom W-04 (breakdown)
    resp = client.post("/api/production/jobs/assign", json={
        "order_id": 1,
        "machine_id": 7,
        "stage": "weaving",
        "shift": "morning",
        "operator_id": 1
    })
    db.close()
    assert resp.status_code == 400
    assert "BREAKDOWN" in resp.json()["detail"]

def test_cannot_assign_job_to_busy_machine():
    # Machine 4 is Loom W-01 (running job 1)
    resp = client.post("/api/production/jobs/assign", json={
        "order_id": 2,
        "machine_id": 4,
        "stage": "weaving",
        "shift": "morning",
        "operator_id": 2
    })
    assert resp.status_code == 400
    assert "already busy" in resp.json()["detail"]

def test_deadline_cannot_be_in_past():
    past_date = (date.today() - timedelta(days=5)).isoformat()
    resp = client.post("/api/orders", json={
        "buyer_id": 1,
        "fabric_type": "Twill",
        "colour": "Navy Blue",
        "quantity_m": 500.0,
        "deadline": past_date,
        "price_per_m": 120.0,
        "yarn_required_kg": 110.0,
        "expected_delivery": past_date
    })
    assert resp.status_code in [400, 422]

def test_yarn_feasibility_shortfall_message():
    resp = client.post("/api/inventory/check-feasibility", json={
        "fabric_type": "Poplin",
        "colour": "Jet Black",
        "quantity_m": 1000.0 # Requires ~220kg, but Jet Black has only 42kg!
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_sufficient"] is False
    assert data["shortfall_kg"] > 0
    assert "PURCHASE REQUISITION" in data["draft_po_text"]

def test_cannot_dispatch_unpassed_or_already_dispatched_roll():
    db = SessionLocal()
    # Find an already dispatched roll
    dispatched_roll = db.query(Roll).filter(Roll.dispatched == True).first()
    db.close()

    assert dispatched_roll is not None
    resp = client.post("/api/dispatch", json={
        "buyer_id": 1,
        "roll_ids": [dispatched_roll.id],
        "vehicle_no": "KA-01-AB-1234"
    })
    assert resp.status_code == 400
    assert "ALREADY been dispatched" in resp.json()["detail"]

def test_concurrent_double_dispatch_protection():
    """
    Simulates race condition: If Roll A is dispatched in transaction 1,
    any subsequent dispatch of Roll A must be rejected atomically.
    """
    db = SessionLocal()
    # Find available undispatched roll for Buyer 2
    roll = db.query(Roll).join(Roll.order).filter(
        Roll.order.has(buyer_id=2),
        Roll.qc_status == "pass",
        Roll.dispatched == False
    ).first()
    db.close()

    assert roll is not None, "Need undispatched passed roll for test"

    # First dispatch succeeds
    resp1 = client.post("/api/dispatch", json={
        "buyer_id": 2,
        "roll_ids": [roll.id],
        "vehicle_no": "KA-04-XY-9999",
        "override_dye_lot_warning": True
    })
    assert resp1.status_code == 200

    # Second concurrent dispatch must FAIL with HTTP 400
    resp2 = client.post("/api/dispatch", json={
        "buyer_id": 2,
        "roll_ids": [roll.id],
        "vehicle_no": "TN-38-ZZ-1111",
        "override_dye_lot_warning": True
    })
    assert resp2.status_code == 400
    assert "ALREADY been dispatched" in resp2.json()["detail"]

def test_labour_wages_reconciliation():
    resp = client.get("/api/dashboard/summary")
    assert resp.status_code == 200
    data = resp.json()
    rec = data["labour_reconciliation"]
    assert rec["is_verified"] is True
    # Invariant: order_direct_labour + idle_labour_cost + general_labour_cost == total_wages_for_period
    assert abs((rec["order_direct_labour"] + rec["idle_labour_cost"] + rec["general_labour_cost"]) - rec["total_wages_for_period"]) < 0.01

def test_odoo_exports_endpoint():
    for export_type in ["products", "lots", "stock", "invoices"]:
        resp = client.get(f"/api/settings/odoo-export/{export_type}")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        assert len(resp.text) > 10

def test_machine_breakdown_interrupts_job():
    db = SessionLocal()
    # Find an active job and its machine
    job = db.query(ProductionJob).filter(ProductionJob.completed_at == None, ProductionJob.status == "active").first()
    assert job is not None
    m = db.query(Machine).filter(Machine.id == job.machine_id).first()
    assert m is not None
    db.close()

    orig_progress = job.progress_pct
    orig_output = job.output_today_m

    # Set machine to breakdown
    resp = client.patch(f"/api/production/machines/{m.id}/status", json={"status": "breakdown"})
    assert resp.status_code == 200

    # Check that job is now marked interrupted and progress/output are preserved
    db = SessionLocal()
    j = db.query(ProductionJob).filter(ProductionJob.id == job.id).first()
    assert j.status == "interrupted"
    assert j.progress_pct == orig_progress
    assert j.output_today_m == orig_output
    db.close()

def test_transfer_invalid_targets():
    db = SessionLocal()
    # Find an interrupted job
    job = db.query(ProductionJob).filter(ProductionJob.status == "interrupted").first()
    broken_machine = db.query(Machine).filter(Machine.status == "breakdown").first()
    diff_stage_machine = db.query(Machine).filter(Machine.stage != job.stage).first()
    running_machine = db.query(Machine).filter(Machine.status == "running").first()
    db.close()

    # Invalid 1: Target is in breakdown
    resp1 = client.post(f"/api/production/jobs/{job.id}/transfer", json={"target_machine_id": broken_machine.id})
    assert resp1.status_code == 400
    assert "BREAKDOWN" in resp1.json()["detail"]

    # Invalid 2: Target is not idle (running)
    resp2 = client.post(f"/api/production/jobs/{job.id}/transfer", json={"target_machine_id": running_machine.id})
    assert resp2.status_code == 400
    assert "must be Idle" in resp2.json()["detail"]

    # Invalid 3: Target is different stage
    resp3 = client.post(f"/api/production/jobs/{job.id}/transfer", json={"target_machine_id": diff_stage_machine.id})
    assert resp3.status_code == 400
    assert "Stage mismatch" in resp3.json()["detail"] or "must be Idle" in resp3.json()["detail"]

def test_transfer_job_success_and_timeline():
    db = SessionLocal()
    job = db.query(ProductionJob).filter(ProductionJob.status == "interrupted").first()
    # Find a valid idle machine with same stage
    target = db.query(Machine).filter(Machine.stage == job.stage, Machine.status == "idle").first()
    db.close()
    assert target is not None

    # Suggestions endpoint test
    sugg_resp = client.get(f"/api/production/jobs/{job.id}/reassign-suggestions")
    assert sugg_resp.status_code == 200
    sugg_data = sugg_resp.json()
    assert len(sugg_data["suggestions"]) > 0
    assert sugg_data["auto_suggest_reassignment"] is True
    assert "remaining_m" in sugg_data

    # Execute transfer
    transfer_resp = client.post(f"/api/production/jobs/{job.id}/transfer", json={"target_machine_id": target.id})
    assert transfer_resp.status_code == 200
    data = transfer_resp.json()
    assert data["status"] == "success"
    new_job_id = data["new_job_id"]

    # Verify DB states
    db = SessionLocal()
    old_j = db.query(ProductionJob).filter(ProductionJob.id == job.id).first()
    new_j = db.query(ProductionJob).filter(ProductionJob.id == new_job_id).first()
    t_m = db.query(Machine).filter(Machine.id == target.id).first()

    assert old_j.status == "transferred"
    assert old_j.completed_at is not None
    assert old_j.transferred_to_job_id == new_j.id
    assert new_j.status == "active"
    assert new_j.transferred_from_job_id == old_j.id
    assert new_j.progress_pct == old_j.progress_pct
    assert new_j.output_today_m == 0.0
    assert t_m.status == "running"

    # Verify order activity timeline
    order_resp = client.get(f"/api/orders/{old_j.order_id}")
    assert order_resp.status_code == 200
    timeline = order_resp.json().get("activity_timeline", [])
    assert any("Job moved from" in act["message"] for act in timeline)
    db.close()

def test_repaired_machine_behavior():
    db = SessionLocal()
    # Find machine from previous test that was breakdown and whose job was transferred
    job = db.query(ProductionJob).filter(ProductionJob.status == "transferred").order_by(ProductionJob.id.desc()).first()
    broken_m = db.query(Machine).filter(Machine.id == job.machine_id).first()
    db.close()

    # Now that the job was transferred, repairing broken_m to idle must succeed
    resp = client.patch(f"/api/production/machines/{broken_m.id}/status", json={"status": "idle"})
    assert resp.status_code == 200

    # Verify machine is idle and shows no active job
    machines_resp = client.get("/api/production/machines")
    m_info = next(item for item in machines_resp.json()["machines"] if item["id"] == broken_m.id)
    assert m_info["status"] == "idle"
    assert m_info["current_job"] is None

def test_repaired_machine_blocked_when_job_interrupted():
    db = SessionLocal()
    # Find an active job
    job = db.query(ProductionJob).filter(ProductionJob.completed_at == None, ProductionJob.status == "active").first()
    assert job is not None
    m = db.query(Machine).filter(Machine.id == job.machine_id).first()
    db.close()

    # Set machine to breakdown -> job becomes interrupted
    client.patch(f"/api/production/machines/{m.id}/status", json={"status": "breakdown"})

    # Attempt to repair to idle while job is still interrupted -> MUST FAIL with HTTP 400
    resp = client.patch(f"/api/production/machines/{m.id}/status", json={"status": "idle"})
    assert resp.status_code == 400
    assert "reassign or resolve" in resp.json()["detail"].lower() or "interrupted" in resp.json()["detail"].lower()

def test_public_tracking_successful_match():
    # Test lookup via order number
    resp = client.post("/api/orders/track", json={
        "identifier": "ORD-2026-002",
        "phone_last4": "6329"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["buyer_name"] == "Kaveri Fashions"
    assert len(data["orders"]) > 0
    ord0 = data["orders"][0]
    assert "order_number" in ord0
    assert "fabric_type" in ord0
    assert "stage_timeline" in ord0
    assert "rolls_ready" in ord0
    assert "metres_ready" in ord0
    assert len(ord0["stage_timeline"]) == 6

    # Test lookup via buyer name
    resp2 = client.post("/api/orders/track", json={
        "identifier": "Kaveri Fashions",
        "phone_last4": "6329"
    })
    assert resp2.status_code == 200
    assert resp2.json()["buyer_name"] == "Kaveri Fashions"

def test_public_tracking_mismatch_generic_error():
    # Wrong phone
    resp1 = client.post("/api/orders/track", json={
        "identifier": "ORD-2026-002",
        "phone_last4": "9999"
    })
    assert resp1.status_code == 404
    assert "No match found" in resp1.json()["detail"]

    # Wrong order number
    resp2 = client.post("/api/orders/track", json={
        "identifier": "ORD-NONEXISTENT",
        "phone_last4": "6329"
    })
    assert resp2.status_code == 404
    assert "No match found" in resp2.json()["detail"]

def test_public_tracking_prevents_data_leaks():
    resp = client.post("/api/orders/track", json={
        "identifier": "ORD-2026-001",
        "phone_last4": "4521"
    })
    assert resp.status_code == 200
    data = resp.json()

    # Check top-level
    assert "id" not in data
    assert "credit_limit" not in data

    # Check orders
    for o in data["orders"]:
        assert "id" not in o
        assert "buyer_id" not in o
        assert "price_per_m" not in o
        assert "cost_per_kg" not in o
        assert "wages" not in o
        assert "margin" not in o

    # Check dispatches
    for d in data["dispatches"]:
        assert "id" not in d
        assert "buyer_id" not in d

    # Check invoices
    for inv in data["invoices"]:
        assert "id" not in inv
        assert "subtotal" not in inv
        assert "tax" not in inv

def test_public_tracking_rate_limit():
    from backend.app.api.orders import FAILED_TRACKING_ATTEMPTS
    FAILED_TRACKING_ATTEMPTS.clear()

    # 5 failed attempts
    for _ in range(5):
        resp = client.post("/api/orders/track", json={
            "identifier": "ORD-FAKE",
            "phone_last4": "0000"
        })
        assert resp.status_code == 404

    # 6th attempt must be 429
    resp_rate_limited = client.post("/api/orders/track", json={
        "identifier": "ORD-FAKE",
        "phone_last4": "0000"
    })
    assert resp_rate_limited.status_code == 429
    assert "Too many failed tracking attempts" in resp_rate_limited.json()["detail"]

    FAILED_TRACKING_ATTEMPTS.clear()

def test_buyer_360_staff_view():
    resp = client.get("/api/orders/buyers/2/360")
    assert resp.status_code == 200
    data = resp.json()

    # Profile & Financials
    assert data["profile"]["name"] == "Kaveri Fashions"
    assert data["financials"]["credit_limit"] == 1500000.0
    assert "outstanding_balance" in data["financials"]
    assert "credit_utilization_pct" in data["financials"]

    # Orders with delay risk and status message
    assert len(data["orders"]) > 0
    ord0 = data["orders"][0]
    assert "delay_risk" in ord0
    assert "risk_level" in ord0["delay_risk"]
    assert "status_message" in ord0
    assert "Your order" in ord0["status_message"]



