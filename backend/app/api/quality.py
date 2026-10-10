from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.models.quality import Roll, Defect
from backend.app.models.master import Setting, Machine, Worker
from backend.app.models.yarn_order import Order, YarnBatch, ProductionJob
from backend.app.models.system import AuditLog
from backend.app.services.grading import calculate_defect_points, evaluate_roll_grade
from backend.app.schemas.schemas import (
    RollCreate,
    RollResponse,
    DefectCreate
)

router = APIRouter(prefix="/quality", tags=["Quality"])

@router.get("/rolls", response_model=List[RollResponse])
def get_rolls(
    qc_status: Optional[str] = None,
    dispatched: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Roll)
    if qc_status:
        query = query.filter(Roll.qc_status == qc_status)
    if dispatched is not None:
        query = query.filter(Roll.dispatched == dispatched)

    rolls = query.order_by(Roll.id.desc()).all()
    results = []

    for r in rolls:
        results.append(RollResponse(
            id=r.id,
            roll_number=r.roll_number,
            order_id=r.order_id,
            order_number=r.order.order_number if r.order else None,
            buyer_name=r.order.buyer.name if (r.order and r.order.buyer) else None,
            fabric_type=r.order.fabric_type if r.order else None,
            machine_id=r.machine_id,
            machine_name=r.machine.name if r.machine else None,
            yarn_batch_id=r.yarn_batch_id,
            dye_lot=r.dye_lot,
            shade_value=r.shade_value,
            length_m=r.length_m,
            width_in=r.width_in,
            shift=r.shift,
            operator_id=r.operator_id,
            operator_name=r.operator.name if r.operator else None,
            qc_status=r.qc_status,
            grade=r.grade,
            defect_points=r.defect_points,
            inspected_area_sq_yd=r.inspected_area_sq_yd,
            dispatched=r.dispatched,
            created_at=r.created_at,
            defects_count=len(r.defects)
        ))

    return results

@router.get("/rolls/{roll_id}")
def get_roll_pedigree(roll_id: int, db: Session = Depends(get_db)):
    roll = db.query(Roll).filter(Roll.id == roll_id).first()
    if not roll:
        raise HTTPException(status_code=404, detail="Roll not found.")

    order = roll.order
    machine = roll.machine
    yarn_batch = roll.yarn_batch
    supplier = yarn_batch.supplier if yarn_batch else None
    operator = roll.operator
    dispatch = roll.dispatch

    defects_data = [
        {
            "id": d.id,
            "type": d.type,
            "size_in": d.size_in,
            "points": d.points,
            "created_at": d.created_at.isoformat()
        }
        for d in roll.defects
    ]

    return {
        "roll_id": roll.id,
        "roll_number": roll.roll_number,
        "qc_status": roll.qc_status,
        "grade": roll.grade,
        "defect_points": roll.defect_points,
        "inspected_area_sq_yd": roll.inspected_area_sq_yd,
        "length_m": roll.length_m,
        "width_in": roll.width_in,
        "dye_lot": roll.dye_lot,
        "shade_value": roll.shade_value,
        "shift": roll.shift,
        "dispatched": roll.dispatched,
        "created_at": roll.created_at.isoformat(),
        "traceability": {
            "order": {
                "id": order.id if order else None,
                "order_number": order.order_number if order else None,
                "buyer": order.buyer.name if (order and order.buyer) else None,
                "fabric_type": order.fabric_type if order else None,
                "colour": order.colour if order else None,
                "price_per_m": order.price_per_m if order else None
            },
            "machine": {
                "id": machine.id if machine else None,
                "name": machine.name if machine else None,
                "stage": machine.stage if machine else None
            },
            "yarn_batch": {
                "id": yarn_batch.id if yarn_batch else None,
                "batch_code": yarn_batch.batch_code if yarn_batch else None,
                "yarn_type": yarn_batch.yarn_type if yarn_batch else None,
                "colour": yarn_batch.colour if yarn_batch else None,
                "cost_per_kg": yarn_batch.cost_per_kg if yarn_batch else None,
                "supplier": supplier.name if supplier else None
            },
            "operator": {
                "id": operator.id if operator else None,
                "name": operator.name if operator else None,
                "role": operator.role if operator else None
            },
            "dispatch": {
                "dispatch_number": dispatch.dispatch_number if dispatch else None,
                "vehicle_no": dispatch.vehicle_no if dispatch else None,
                "dispatched_at": dispatch.dispatched_at.isoformat() if dispatch else None,
                "invoice_no": dispatch.invoice.invoice_no if (dispatch and dispatch.invoice) else None
            } if roll.dispatched else None
        },
        "defects": defects_data
    }

@router.post("/rolls/{roll_id}/defects")
def log_roll_defect(roll_id: int, payload: DefectCreate, db: Session = Depends(get_db)):
    roll = db.query(Roll).filter(Roll.id == roll_id).first()
    if not roll:
        raise HTTPException(status_code=404, detail="Roll not found.")

    if roll.dispatched:
        raise HTTPException(status_code=400, detail="Cannot log defects on an already dispatched roll.")

    # Calculate defect points using ASTM 4-point rule
    points = calculate_defect_points(payload.type, payload.size_in)

    defect = Defect(
        roll_id=roll.id,
        type=payload.type,
        size_in=payload.size_in,
        points=points
    )
    db.add(defect)
    db.flush()

    # Re-evaluate roll points and grade
    total_points = sum(d.points for d in roll.defects)
    grade_a_setting = db.query(Setting).filter(Setting.key == "four_point_grade_a_max").first()
    grade_b_setting = db.query(Setting).filter(Setting.key == "four_point_grade_b_max").first()
    grade_a_max = float(grade_a_setting.value) if grade_a_setting else 20.0
    grade_b_max = float(grade_b_setting.value) if grade_b_setting else 40.0

    grade, qc_status, points_per_100, area = evaluate_roll_grade(
        total_points=total_points,
        length_m=roll.length_m,
        width_in=roll.width_in,
        grade_a_cutoff=grade_a_max,
        grade_b_cutoff=grade_b_max
    )

    old_status = roll.qc_status
    roll.defect_points = total_points
    roll.inspected_area_sq_yd = area
    roll.grade = grade
    roll.qc_status = qc_status

    db.add(AuditLog(
        user="QC Inspector",
        action="LOG_DEFECT",
        entity="Roll",
        entity_id=roll.id,
        before_state=f"Defect Points: {roll.defect_points - points}, Grade: {old_status}",
        after_state=f"Added {payload.type} ({payload.size_in}\") [{points} pts] -> Points/100sqyd: {points_per_100}, Grade: {grade}"
    ))

    db.commit()

    return {
        "status": "success",
        "defect_id": defect.id,
        "points_awarded": points,
        "total_roll_points": total_points,
        "points_per_100_sq_yd": points_per_100,
        "grade": grade,
        "qc_status": qc_status
    }

@router.post("/rolls/{roll_id}/complete-inspection")
def complete_inspection(roll_id: int, decision: str, db: Session = Depends(get_db)):
    if decision not in ["pass", "rework", "reject"]:
        raise HTTPException(status_code=400, detail="Decision must be pass, rework, or reject.")

    roll = db.query(Roll).filter(Roll.id == roll_id).first()
    if not roll:
        raise HTTPException(status_code=404, detail="Roll not found.")

    old_status = roll.qc_status
    roll.qc_status = decision
    if decision == "pass" and not roll.grade:
        roll.grade = "A"

    db.add(AuditLog(
        user="QC Inspector",
        action="COMPLETE_QC",
        entity="Roll",
        entity_id=roll.id,
        before_state=f"QC: {old_status}",
        after_state=f"QC finalized as: {decision} (Grade: {roll.grade})"
    ))

    db.commit()
    return {"status": "success", "roll_number": roll.roll_number, "qc_status": roll.qc_status, "grade": roll.grade}

@router.post("/rolls", response_model=RollResponse)
def create_roll(payload: RollCreate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Generate roll number: ROLL-YYYYMMDD-XXXX
    date_str = datetime.utcnow().strftime("%Y%m%d")
    count_today = db.query(Roll).filter(Roll.roll_number.like(f"ROLL-{date_str}-%")).count() + 1
    roll_number = f"ROLL-{date_str}-{count_today:04d}"

    roll = Roll(
        roll_number=roll_number,
        order_id=payload.order_id,
        machine_id=payload.machine_id,
        yarn_batch_id=payload.yarn_batch_id,
        production_job_id=payload.production_job_id,
        dye_lot=payload.dye_lot,
        shade_value=payload.shade_value,
        length_m=payload.length_m,
        width_in=payload.width_in,
        shift=payload.shift,
        operator_id=payload.operator_id,
        qc_status="pending",
        grade=None,
        defect_points=0,
        inspected_area_sq_yd=0.0,
        dispatched=False
    )
    db.add(roll)
    db.flush()

    db.add(AuditLog(
        user="Weaver/Operator",
        action="CREATE_ROLL",
        entity="Roll",
        entity_id=roll.id,
        before_state=None,
        after_state=f"Created {roll_number} ({payload.length_m}m) on {roll.machine.name if roll.machine else 'Machine'}"
    ))

    db.commit()
    db.refresh(roll)

    return RollResponse(
        id=roll.id,
        roll_number=roll.roll_number,
        order_id=roll.order_id,
        order_number=order.order_number,
        buyer_name=order.buyer.name if order.buyer else None,
        fabric_type=order.fabric_type,
        machine_id=roll.machine_id,
        machine_name=roll.machine.name if roll.machine else None,
        yarn_batch_id=roll.yarn_batch_id,
        dye_lot=roll.dye_lot,
        shade_value=roll.shade_value,
        length_m=roll.length_m,
        width_in=roll.width_in,
        shift=roll.shift,
        operator_id=roll.operator_id,
        operator_name=roll.operator.name if roll.operator else None,
        qc_status=roll.qc_status,
        grade=roll.grade,
        defect_points=0,
        inspected_area_sq_yd=0.0,
        dispatched=False,
        created_at=roll.created_at,
        defects_count=0
    )
