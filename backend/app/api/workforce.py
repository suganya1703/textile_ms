from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from typing import List

from backend.app.core.database import get_db
from backend.app.models.master import Worker, Machine
from backend.app.models.workforce import Attendance, JobAssignment, Wage
from backend.app.models.yarn_order import ProductionJob
from backend.app.models.system import AuditLog
from backend.app.services.wages import generate_shift_wages
from backend.app.schemas.schemas import (
    AttendanceCreate,
    JobAssignmentCreate,
    GenerateWagesRequest
)

router = APIRouter(prefix="/workforce", tags=["Workforce"])

@router.get("/workers")
def get_workers(db: Session = Depends(get_db)):
    workers = db.query(Worker).order_by(Worker.id.asc()).all()
    results = []
    for w in workers:
        results.append({
            "id": w.id,
            "name": w.name,
            "role": w.role,
            "skill_level": w.skill_level,
            "hourly_rate": w.hourly_rate,
            "overtime_multiplier": w.overtime_multiplier,
            "default_shift": w.default_shift
        })
    return results

@router.get("/attendance")
def get_attendance(work_date: date = None, shift: str = None, db: Session = Depends(get_db)):
    query = db.query(Attendance)
    if work_date:
        query = query.filter(Attendance.work_date == work_date)
    if shift:
        query = query.filter(Attendance.shift == shift)

    records = query.order_by(Attendance.work_date.desc(), Attendance.id.desc()).all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "worker_id": r.worker_id,
            "worker_name": r.worker.name if r.worker else "Unknown",
            "role": r.worker.role if r.worker else "Worker",
            "work_date": r.work_date.isoformat(),
            "shift": r.shift,
            "hours_worked": r.hours_worked,
            "status": r.status
        })
    return results

@router.post("/attendance")
def log_attendance(payload: AttendanceCreate, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == payload.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found.")

    if payload.hours_worked < 0 or payload.hours_worked > 16.0:
        raise HTTPException(status_code=400, detail="Hours worked must be between 0 and 16 hours.")

    existing = db.query(Attendance).filter(
        Attendance.worker_id == payload.worker_id,
        Attendance.work_date == payload.work_date,
        Attendance.shift == payload.shift
    ).first()

    if existing:
        existing.status = payload.status
        existing.hours_worked = payload.hours_worked
    else:
        existing = Attendance(
            worker_id=payload.worker_id,
            work_date=payload.work_date,
            shift=payload.shift,
            hours_worked=payload.hours_worked,
            status=payload.status
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)
    return {"status": "success", "attendance_id": existing.id, "worker": worker.name}

@router.post("/job-assignments")
def assign_worker_to_job(payload: JobAssignmentCreate, db: Session = Depends(get_db)):
    # Validate worker attendance
    att = db.query(Attendance).filter(
        Attendance.worker_id == payload.worker_id,
        Attendance.work_date == payload.work_date,
        Attendance.shift == payload.shift
    ).first()

    if not att or att.status != "present":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot assign worker: Worker is not marked 'present' on {payload.work_date} ({payload.shift} shift)."
        )

    # Check for duplicate assignment
    existing = db.query(JobAssignment).filter(
        JobAssignment.worker_id == payload.worker_id,
        JobAssignment.work_date == payload.work_date,
        JobAssignment.shift == payload.shift,
        JobAssignment.production_job_id == payload.production_job_id
    ).first()

    if existing:
        existing.hours_on_job = payload.hours_on_job
    else:
        assignment = JobAssignment(
            worker_id=payload.worker_id,
            production_job_id=payload.production_job_id,
            machine_id=payload.machine_id,
            work_date=payload.work_date,
            shift=payload.shift,
            hours_on_job=payload.hours_on_job
        )
        db.add(assignment)

    db.commit()
    return {"status": "success"}

@router.post("/generate-wages")
def generate_wages_endpoint(payload: GenerateWagesRequest, db: Session = Depends(get_db)):
    wages = generate_shift_wages(db, payload.work_date, payload.shift)
    total_amount = sum(w.amount for w in wages)

    db.add(AuditLog(
        user="Payroll System",
        action="GENERATE_WAGES",
        entity="Wage",
        entity_id=None,
        before_state=None,
        after_state=f"Generated {len(wages)} wage entries for {payload.work_date} ({payload.shift} shift) totaling ₹{total_amount:,.2f}"
    ))
    db.commit()

    return {
        "status": "success",
        "wages_count": len(wages),
        "total_payout": round(total_amount, 2),
        "shift": payload.shift,
        "date": payload.work_date.isoformat()
    }

@router.get("/wages")
def get_wages_report(db: Session = Depends(get_db)):
    wages = db.query(Wage).order_by(Wage.work_date.desc(), Wage.id.desc()).all()
    results = []

    total_job_wages = 0.0
    total_idle_wages = 0.0
    total_general_wages = 0.0

    for w in wages:
        if w.wage_type == "job":
            total_job_wages += w.amount
        elif w.wage_type == "idle":
            total_idle_wages += w.amount
        else:
            total_general_wages += w.amount

        results.append({
            "id": w.id,
            "worker_name": w.worker.name if w.worker else "Unknown",
            "role": w.worker.role if w.worker else "Worker",
            "order_number": w.order.order_number if w.order else None,
            "machine_name": w.machine.name if w.machine else None,
            "work_date": w.work_date.isoformat(),
            "shift": w.shift,
            "regular_hours": w.regular_hours,
            "overtime_hours": w.overtime_hours,
            "rate": w.rate,
            "amount": w.amount,
            "wage_type": w.wage_type,
            "paid_status": w.paid_status
        })

    total_wages = total_job_wages + total_idle_wages + total_general_wages

    return {
        "wages": results,
        "summary": {
            "total_wages": round(total_wages, 2),
            "order_direct_labour": round(total_job_wages, 2),
            "idle_labour_cost": round(total_idle_wages, 2),
            "general_labour_cost": round(total_general_wages, 2),
            "reconciliation_check": {
                "direct_plus_idle_plus_general": round(total_job_wages + total_idle_wages + total_general_wages, 2),
                "total_wages_sum": round(total_wages, 2),
                "is_balanced": abs((total_job_wages + total_idle_wages + total_general_wages) - total_wages) < 0.01
            }
        }
    }
