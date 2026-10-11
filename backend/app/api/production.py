from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from backend.app.core.database import get_db
from backend.app.models.master import Machine, Worker
from backend.app.models.yarn_order import Order, ProductionJob
from backend.app.models.system import AuditLog
from backend.app.schemas.schemas import (
    MachineResponse,
    MachineStatusUpdate,
    JobAssignRequest,
    JobProgressUpdate
)

router = APIRouter(prefix="/production", tags=["Production"])

@router.get("/machines")
def get_machines_status(db: Session = Depends(get_db)):
    machines = db.query(Machine).order_by(Machine.id.asc()).all()
    results = []

    for m in machines:
        # Find active job
        active_job = db.query(ProductionJob).filter(
            ProductionJob.machine_id == m.id,
            ProductionJob.completed_at == None
        ).order_by(ProductionJob.id.desc()).first()

        effective_status = "breakdown" if m.status == "breakdown" else ("running" if active_job else "idle")

        job_info = None
        if active_job:
            order = active_job.order
            operator = active_job.operator
            job_info = {
                "job_id": active_job.id,
                "order_id": active_job.order_id,
                "order_number": order.order_number if order else None,
                "fabric_type": order.fabric_type if order else None,
                "colour": order.colour if order else None,
                "stage": active_job.stage,
                "progress_pct": round(active_job.progress_pct, 1),
                "output_today_m": round(active_job.output_today_m, 1),
                "produced_m": round(active_job.output_today_m, 1),
                "shift": active_job.shift,
                "operator_name": operator.name if operator else "Unassigned",
                "started_at": active_job.started_at.isoformat() if active_job.started_at else None
            }

        results.append({
            "id": m.id,
            "name": m.name,
            "stage": m.stage,
            "status": effective_status,
            "capacity_m_per_hour": m.capacity_m_per_hour,
            "floor_x": m.floor_x,
            "floor_y": m.floor_y,
            "status_updated_at": m.status_updated_at.isoformat() if m.status_updated_at else None,
            "current_job": job_info
        })

    # Summary counters
    total = len(results)
    running = sum(1 for m in results if m["status"] == "running")
    idle = sum(1 for m in results if m["status"] == "idle")
    breakdown = sum(1 for m in results if m["status"] == "breakdown")

    return {
        "machines": results,
        "summary": {
            "total": total,
            "running": running,
            "idle": idle,
            "breakdown": breakdown,
            "utilization_pct": round((running / total * 100), 1) if total > 0 else 0
        }
    }

@router.patch("/machines/{machine_id}/status")
def update_machine_status(machine_id: int, payload: MachineStatusUpdate, db: Session = Depends(get_db)):
    if payload.status not in ["running", "idle", "breakdown"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be running, idle, or breakdown.")

    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found.")

    old_status = machine.status
    machine.status = payload.status
    machine.status_updated_at = datetime.utcnow()

    # Log to audit trail
    db.add(AuditLog(
        user="Operator",
        action="UPDATE_STATUS",
        entity="Machine",
        entity_id=machine.id,
        before_state=f"Status: {old_status}",
        after_state=f"Status: {payload.status}"
    ))
    db.commit()

    return {"status": "success", "machine_id": machine.id, "new_status": machine.status}

@router.post("/jobs/assign")
def assign_job_to_machine(payload: JobAssignRequest, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == payload.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found.")

    if machine.status == "breakdown":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot assign job to {machine.name}: Machine is currently in BREAKDOWN state."
        )

    # Check if machine already has an active incomplete job
    active_job = db.query(ProductionJob).filter(
        ProductionJob.machine_id == machine.id,
        ProductionJob.completed_at == None
    ).first()
    if active_job:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot assign job: {machine.name} is already busy running Job #{active_job.id} for Order {active_job.order.order_number}."
        )

    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    operator = db.query(Worker).filter(Worker.id == payload.operator_id).first()
    if not operator:
        raise HTTPException(status_code=404, detail="Operator worker not found.")

    new_job = ProductionJob(
        order_id=payload.order_id,
        machine_id=payload.machine_id,
        stage=payload.stage,
        progress_pct=0.0,
        output_today_m=0.0,
        shift=payload.shift,
        operator_id=payload.operator_id,
        started_at=datetime.utcnow()
    )
    db.add(new_job)

    # Update machine status to running
    machine.status = "running"
    machine.status_updated_at = datetime.utcnow()

    # Update order pipeline status if appropriate
    if payload.stage == "spinning" and order.status in ["Created", "Yarn reserved"]:
        order.status = "Spinning"
    elif payload.stage == "weaving" and order.status in ["Created", "Yarn reserved", "Spinning"]:
        order.status = "Weaving"
    elif payload.stage == "dyeing" and order.status in ["Created", "Yarn reserved", "Spinning", "Weaving"]:
        order.status = "Dyeing"

    db.add(AuditLog(
        user="Supervisor",
        action="ASSIGN_JOB",
        entity="ProductionJob",
        entity_id=None,
        before_state=None,
        after_state=f"Assigned Order {order.order_number} to {machine.name} ({payload.stage}) operated by {operator.name}"
    ))

    db.commit()
    db.refresh(new_job)

    return {"status": "success", "job_id": new_job.id, "machine": machine.name, "order": order.order_number}

@router.patch("/jobs/{job_id}/progress")
def update_job_progress(job_id: int, payload: JobProgressUpdate, db: Session = Depends(get_db)):
    job = db.query(ProductionJob).filter(ProductionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Production job not found.")

    if payload.output_increment_m is not None:
        if payload.output_increment_m <= 0:
            raise HTTPException(status_code=400, detail="Output increment must be greater than 0.")
        job.output_today_m += payload.output_increment_m
        
        # Auto-compute progress if order quantity available
        if job.order and job.order.quantity_m > 0:
            inc_pct = (payload.output_increment_m / job.order.quantity_m) * 100
            job.progress_pct = min(100.0, job.progress_pct + inc_pct)

    if payload.progress_pct is not None:
        if not (0.0 <= payload.progress_pct <= 100.0):
            raise HTTPException(status_code=400, detail="Progress percentage must be between 0 and 100.")
        job.progress_pct = payload.progress_pct
        if payload.progress_pct >= 100.0:
            job.completed_at = datetime.utcnow()
            # Set machine to idle
            if job.machine:
                job.machine.status = "idle"
                job.machine.status_updated_at = datetime.utcnow()

    db.commit()
    return {
        "status": "success",
        "job_id": job.id,
        "progress_pct": job.progress_pct,
        "output_today_m": job.output_today_m,
        "is_completed": job.completed_at is not None
    }

@router.post("/telemetry-tick")
def simulate_telemetry_tick(db: Session = Depends(get_db)):
    """Simulates a telemetry heartbeat tick: advances output and progress on all running machines."""
    running_machines = db.query(Machine).filter(Machine.status == "running").all()
    updated = []
    for m in running_machines:
        job = db.query(ProductionJob).filter(
            ProductionJob.machine_id == m.id,
            ProductionJob.completed_at == None
        ).first()
        if job:
            increment = 3.5  # metres produced in this tick
            job.output_today_m = round(job.output_today_m + increment, 1)
            if job.order and job.order.quantity_m > 0:
                inc_pct = (increment / job.order.quantity_m) * 100
                job.progress_pct = min(100.0, round(job.progress_pct + inc_pct, 1))
            else:
                job.progress_pct = min(100.0, round(job.progress_pct + 2.0, 1))
            
            if job.progress_pct >= 100.0:
                job.completed_at = datetime.utcnow()
                m.status = "idle"
                m.status_updated_at = datetime.utcnow()
            updated.append({
                "machine_id": m.id,
                "machine_name": m.name,
                "job_id": job.id,
                "output_m": job.output_today_m,
                "progress_pct": job.progress_pct
            })
    
    db.commit()
    return {"status": "success", "updated_jobs": len(updated), "machines": updated}
