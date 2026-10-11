from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List

from backend.app.core.database import get_db
from backend.app.models.quality import Roll, Defect
from backend.app.models.master import Machine, Setting, Supplier
from backend.app.models.yarn_order import Order, YarnBatch, YarnConsumption, YarnDamageRecord
from backend.app.services.delay_risk import evaluate_order_delay_risk

router = APIRouter(prefix="/insights", tags=["Insights"])

@router.get("/anomalies")
def get_root_cause_insights(db: Session = Depends(get_db)):
    """
    Computes explainable, rule-based diagnostic anomalies across
    machines, yarn batches, and shifts.
    """
    insights = []

    # 1. Machine Defect Outlier
    machine_points = db.query(
        Machine.name,
        func.avg(Roll.defect_points).label("avg_points"),
        func.sum(Roll.defect_points).label("total_points"),
        func.count(Roll.id).label("rolls_count")
    ).join(Roll, Roll.machine_id == Machine.id).group_by(Machine.name).all()

    if machine_points:
        overall_avg = sum(m.avg_points for m in machine_points) / len(machine_points)
        for m in machine_points:
            if m.avg_points > (1.8 * overall_avg) and m.rolls_count >= 2:
                ratio = round(m.avg_points / overall_avg, 1) if overall_avg > 0 else 2.0
                insights.append({
                    "category": "machine_defect_outlier",
                    "severity": "high",
                    "title": f"High Defect Concentration on {m.name}",
                    "statement": f"{m.name} has {ratio}x the mill-wide average defect points ({m.avg_points:.1f} vs mill avg {overall_avg:.1f}).",
                    "action": f"Schedule immediate mechanical inspection of {m.name}'s warp stop-motion and shuttle alignment.",
                    "entity": m.name
                })

    # 2. Defect Type by Yarn Batch Correlation
    defects_by_batch = db.query(
        Defect.type,
        YarnBatch.batch_code,
        func.count(Defect.id).label("defect_count")
    ).join(Roll, Roll.id == Defect.roll_id
    ).join(YarnBatch, YarnBatch.id == Roll.yarn_batch_id
    ).group_by(Defect.type, YarnBatch.batch_code).all()

    for defect_type, batch_code, count in defects_by_batch:
        total_for_type = sum(d.defect_count for d in defects_by_batch if d.type == defect_type)
        if total_for_type >= 4 and (count / total_for_type) >= 0.5:
            pct = round((count / total_for_type) * 100, 0)
            clean_type = defect_type.replace('_', ' ').capitalize()
            insights.append({
                "category": "yarn_batch_defect",
                "severity": "medium",
                "title": f"{clean_type} Concentrated in Yarn Batch {batch_code}",
                "statement": f"{clean_type} defects are {pct:.0f}% concentrated in yarn batch {batch_code} ({count} of {total_for_type} total).",
                "action": f"Quarantine remaining cones of {batch_code} and request replacement/credit from supplier.",
                "entity": batch_code
            })

    # 3. Shift Rework Disparity
    shift_rolls = db.query(
        Roll.shift,
        func.count(Roll.id).label("total_rolls"),
        func.sum(func.case((Roll.qc_status.in_(["rework", "reject"]), 1), else_=0)).label("bad_rolls")
    ).group_by(Roll.shift).all()

    shifts_dict = {}
    for s in shift_rolls:
        rate = (s.bad_rolls / s.total_rolls * 100) if s.total_rolls > 0 else 0.0
        shifts_dict[s.shift] = round(rate, 1)

    if "night" in shifts_dict and "morning" in shifts_dict:
        if shifts_dict["night"] > (shifts_dict["morning"] * 1.5) and shifts_dict["night"] > 10.0:
            insights.append({
                "category": "shift_disparity",
                "severity": "medium",
                "title": "Night Shift Quality Variance",
                "statement": f"Night shift rework/reject rate is {shifts_dict['night']}% vs {shifts_dict['morning']}% on Morning shift.",
                "action": "Audit night perch inspection lighting, loom tension maintenance, and supervisor rounds.",
                "entity": "Night Shift"
            })

    # 4. Supplier Yarn Damage Rate (group-by queries)
    supplier_received = db.query(
        Supplier.id,
        Supplier.name,
        func.sum(YarnBatch.kg_received).label("total_received")
    ).join(YarnBatch, YarnBatch.supplier_id == Supplier.id
    ).group_by(Supplier.id, Supplier.name).all()

    supplier_damaged = db.query(
        Supplier.id,
        Supplier.name,
        func.sum(YarnDamageRecord.kg_damaged).label("total_damaged")
    ).join(YarnBatch, YarnBatch.supplier_id == Supplier.id
    ).join(YarnDamageRecord, YarnDamageRecord.yarn_batch_id == YarnBatch.id
    ).group_by(Supplier.id, Supplier.name).all()

    damaged_by_supplier = {row[0]: (row[1], float(row[2] or 0.0)) for row in supplier_damaged}
    total_mill_received = sum(float(r.total_received or 0.0) for r in supplier_received)
    total_mill_damaged = sum(amt for _, amt in damaged_by_supplier.values())
    avg_damage_pct = (total_mill_damaged / total_mill_received * 100) if total_mill_received > 0 else 1.0

    for s_id, s_name, rec_kg in supplier_received:
        rec_kg = float(rec_kg or 0.0)
        _, dmg_kg = damaged_by_supplier.get(s_id, (s_name, 0.0))
        if rec_kg > 0 and dmg_kg > 0:
            supp_damage_pct = (dmg_kg / rec_kg) * 100
            if supp_damage_pct > avg_damage_pct:
                insights.append({
                    "category": "supplier_damage_anomaly",
                    "severity": "high" if supp_damage_pct >= 5.0 else "medium",
                    "title": f"High Yarn Damage Rate from {s_name}",
                    "statement": f"Supplier {s_name} batches have {supp_damage_pct:.1f}% damage versus {avg_damage_pct:.1f}% average.",
                    "action": f"Quarantine sub-standard lots from {s_name} and enforce debit claims for damaged yarn.",
                    "entity": s_name
                })

    return {"insights": insights}

@router.get("/defect-heatmap")
def get_defect_heatmap(db: Session = Depends(get_db)):
    """
    Matrix of Machines (rows) vs Defect Types (columns) with counts and points.
    """
    defect_types = ["hole", "colour_mismatch", "uneven_weave", "stain", "other"]
    machines = db.query(Machine).filter(Machine.stage.in_(["weaving", "dyeing"])).all()

    heatmap_rows = []
    for m in machines:
        row = {"machine_id": m.id, "machine_name": m.name, "stage": m.stage, "defects": {}}
        for dt in defect_types:
            count = db.query(func.count(Defect.id)).join(Roll, Roll.id == Defect.roll_id).filter(
                Roll.machine_id == m.id,
                Defect.type == dt
            ).scalar() or 0
            row["defects"][dt] = count
        row["total_defects"] = sum(row["defects"].values())
        heatmap_rows.append(row)

    return {
        "defect_types": defect_types,
        "machines": heatmap_rows
    }

@router.get("/yield-wastage")
def get_yield_wastage(db: Session = Depends(get_db)):
    """
    Compare yarn issued with fabric produced against expected yield (0.95),
    and flag abnormal wastage by machine, shift, and yarn batch.
    """
    yield_setting = db.query(Setting).filter(Setting.key == "expected_yield_ratio").first()
    expected_ratio = float(yield_setting.value) if yield_setting else 0.95

    batches = db.query(YarnBatch).all()
    batch_analysis = []

    for b in batches:
        # Yarn consumed
        consumptions = db.query(YarnConsumption).filter(YarnConsumption.yarn_batch_id == b.id).all()
        kg_consumed = sum(max(0, c.kg_issued - c.kg_returned) for c in consumptions)

        # Finished rolls produced from this batch
        rolls = db.query(Roll).filter(Roll.yarn_batch_id == b.id).all()
        # Approx: 1 metre of fabric = ~0.21 kg
        fabric_weight_kg = sum(r.length_m * 0.21 for r in rolls)

        expected_fabric_kg = kg_consumed * expected_ratio
        actual_yield_ratio = (fabric_weight_kg / kg_consumed) if kg_consumed > 0 else expected_ratio
        wastage_pct = max(0.0, (1.0 - actual_yield_ratio) * 100) if kg_consumed > 0 else 5.0

        is_abnormal = wastage_pct > 8.0  # More than 8% wastage is flagged

        batch_analysis.append({
            "batch_code": b.batch_code,
            "yarn_type": b.yarn_type,
            "colour": b.colour,
            "supplier": b.supplier.name if b.supplier else "Unknown",
            "kg_consumed": round(kg_consumed, 1),
            "fabric_kg_produced": round(fabric_weight_kg, 1),
            "actual_yield_ratio": round(actual_yield_ratio, 3),
            "expected_yield_ratio": expected_ratio,
            "wastage_pct": round(wastage_pct, 1),
            "is_abnormal_wastage": is_abnormal
        })

    return {
        "expected_yield_ratio": expected_ratio,
        "batches": batch_analysis
    }

@router.get("/delay-risk")
def get_delay_risk_analysis(db: Session = Depends(get_db)):
    """
    Evaluates delay risk for all active orders.
    """
    active_orders = db.query(Order).filter(Order.status != "Dispatched").all()
    assessments = [evaluate_order_delay_risk(o, db) for o in active_orders]

    return {
        "orders": assessments,
        "critical_count": sum(1 for a in assessments if a["status"] == "red"),
        "moderate_count": sum(1 for a in assessments if a["status"] == "amber"),
        "on_track_count": sum(1 for a in assessments if a["status"] == "green")
    }
