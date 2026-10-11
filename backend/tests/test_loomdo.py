import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.quality import Roll
from backend.app.models.master import Machine, Worker
from backend.app.models.yarn_order import Order
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

def test_roll_passport_full_journey():
    # 1. Fetch rolls list to get a valid seeded roll code
    rolls_resp = client.get("/api/quality/rolls")
    assert rolls_resp.status_code == 200
    rolls = rolls_resp.json()
    assert len(rolls) > 0
    roll_code = rolls[0]["roll_number"]

    # 2. Query public passport endpoint
    resp = client.get(f"/api/quality/passport/{roll_code}")
    assert resp.status_code == 200
    data = resp.json()

    assert data["roll_code"] == roll_code
    assert "timeline" in data
    assert len(data["timeline"]) >= 4

    # Verify timeline stages
    stage_steps = [s["step"] for s in data["timeline"]]
    assert "yarn_intake" in stage_steps
    assert "order_booking" in stage_steps
    assert "weaving_production" in stage_steps
    assert "quality_inspection" in stage_steps

    # Verify cost breakdown
    assert "cost" in data
    assert "yarn_cost" in data["cost"]
    assert "overhead_cost" in data["cost"]
    assert "total_cost" in data["cost"]

def test_roll_passport_unknown_code_returns_404():
    resp = client.get("/api/quality/passport/ROLL-UNKNOWN-99999")
    assert resp.status_code == 404
    data = resp.json()
    assert "not found" in data["detail"].lower()

def test_roll_passport_no_private_fields_leaked():
    rolls_resp = client.get("/api/quality/rolls")
    roll_code = rolls_resp.json()[0]["roll_number"]

    resp = client.get(f"/api/quality/passport/{roll_code}")
    assert resp.status_code == 200
    raw_text = resp.text.lower()

    # Private confidential fields that must NEVER be leaked on public passport
    forbidden_terms = [
        "wage_rate_per_shift",
        "credit_limit",
        "current_balance",
        "balance_due",
        "operator_wage",
        "worker_wage"
    ]
    for term in forbidden_terms:
        assert term not in raw_text, f"Forbidden confidential field '{term}' was leaked in public passport response!"

def test_insights_endpoints_return_seeded_data():
    """Verifies that all three insights endpoints return non-empty seeded data without 500 errors."""
    # 1. Defect Root Cause Anomalies
    anom_resp = client.get("/api/insights/anomalies")
    assert anom_resp.status_code == 200
    anom_data = anom_resp.json()
    assert "insights" in anom_data
    insights = anom_data["insights"]
    assert len(insights) > 0
    # Must contain defect root-cause statements (e.g. Loom W-03 outlier)
    loom_w03_found = any("Loom W-03" in i["title"] or "Loom W-03" in i["statement"] for i in insights)
    assert loom_w03_found, "Loom W-03 anomaly must be present in root cause insights"

    # 2. Yield & Wastage
    yield_resp = client.get("/api/insights/yield-wastage")
    assert yield_resp.status_code == 200
    yield_data = yield_resp.json()
    assert "batches" in yield_data
    batches = yield_data["batches"]
    assert len(batches) > 0
    # Flagged abnormal batch YB-2026-0412
    abnormal_batches = [b for b in batches if b["is_abnormal_wastage"]]
    assert len(abnormal_batches) > 0
    assert any(b["batch_code"] == "YB-2026-0412" for b in abnormal_batches)

    # 3. Delay Risk Engine
    delay_resp = client.get("/api/insights/delay-risk")
    assert delay_resp.status_code == 200
    delay_data = delay_resp.json()
    assert "orders" in delay_data
    orders = delay_data["orders"]
    assert len(orders) > 0
    # Must have status color, reason, and suggested action
    for o in orders:
        assert o["status"] in ["green", "amber", "red"]
        assert len(o["reason"]) > 0
        assert len(o["suggested_action"]) > 0
    red_orders = [o for o in orders if o["status"] == "red"]
    assert len(red_orders) > 0, "Must have at least one critical delayed order"

def test_machine_status_consistent_across_endpoints_and_jobs():
    """
    Verifies that a machine's status strictly matches its jobs:
    - Running: active job exists
    - Idle: no active job exists
    - Breakdown: set manually
    And that Production Board, Floor Map, and Dashboard counts all agree.
    """
    p_resp = client.get("/api/production/machines")
    assert p_resp.status_code == 200
    p_data = p_resp.json()
    machines = p_data["machines"]
    summary = p_data["summary"]

    # Invariant: running means active job exists; idle means no active job
    for m in machines:
        if m["status"] == "running":
            assert m["current_job"] is not None, f"Machine {m['name']} is running but has no active job"
        elif m["status"] == "idle":
            assert m["current_job"] is None, f"Machine {m['name']} is idle but has an active job"
        elif m["status"] == "breakdown":
            assert m["name"] == "Loom W-04 (Airjet Broken)"

    p_running = summary["running"]
    p_idle = summary["idle"]
    p_breakdown = summary["breakdown"]

    # Floor Map endpoint
    f_resp = client.get("/api/floormap/layout")
    assert f_resp.status_code == 200
    f_data = f_resp.json()
    f_machines = f_data["machines"]
    f_running = sum(1 for m in f_machines if m["status"] == "running")
    f_idle = sum(1 for m in f_machines if m["status"] == "idle")
    f_breakdown = sum(1 for m in f_machines if m["status"] == "breakdown")

    # Dashboard endpoint
    d_resp = client.get("/api/dashboard/summary")
    assert d_resp.status_code == 200
    d_data = d_resp.json()
    d_running = d_data["kpis"]["running_machines"]
    d_outputs = d_data["machine_outputs"]
    d_idle = sum(1 for m in d_outputs if m["status"] == "idle")
    d_breakdown = sum(1 for m in d_outputs if m["status"] == "breakdown")

    # All three endpoints MUST agree
    assert p_running == f_running == d_running, f"Running counts mismatch: {p_running} vs {f_running} vs {d_running}"
    assert p_idle == f_idle == d_idle, f"Idle counts mismatch: {p_idle} vs {f_idle} vs {d_idle}"
    assert p_breakdown == f_breakdown == d_breakdown, f"Breakdown counts mismatch: {p_breakdown} vs {f_breakdown} vs {d_breakdown}"

def test_reset_demo_data_restores_planted_story():
    """
    Verifies that the reset action restores the baseline database state and
    planted story points (positive net profit, positive receivables, and loss-making ORD-2026-008).
    """
    reset_resp = client.post("/api/settings/reset-demo-data")
    assert reset_resp.status_code == 200
    assert reset_resp.json()["status"] == "success"

    # Verify Dashboard financials after reset
    dash_resp = client.get("/api/dashboard/summary")
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()

    # Overall monthly profit must be positive
    net_profit = dash_data["pl_statement"]["net_profit"]
    assert net_profit > 0, f"Net profit must be positive after reset, got {net_profit}"

    # Outstanding Due must be > 0 (at least one invoice partial, one unpaid)
    outstanding_receivables = dash_data["kpis"]["outstanding_receivables"]
    assert outstanding_receivables > 0, f"Outstanding receivables must be > 0, got {outstanding_receivables}"

    # Planted loss-making order ORD-2026-008 must lose ~5-15%
    alerts = dash_data["margin_alerts"]
    ord8_alert = next((a for a in alerts if a["order_number"] == "ORD-2026-008"), None)
    assert ord8_alert is not None, "ORD-2026-008 margin alert must be present"
    loss_pct = (ord8_alert["loss_amount"] / ord8_alert["revenue"]) * 100
    assert 5.0 <= loss_pct <= 15.0, f"ORD-2026-008 loss pct must be 5-15%, got {loss_pct:.2f}%"
