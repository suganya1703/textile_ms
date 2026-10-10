from datetime import date
from typing import List
from sqlalchemy.orm import Session
from backend.app.models.workforce import Attendance, JobAssignment, Wage
from backend.app.models.yarn_order import ProductionJob
from backend.app.models.master import Worker

def generate_shift_wages(db: Session, target_date: date, shift: str) -> List[Wage]:
    """
    Deterministically generates shift wages from Attendance and JobAssignments.
    Invariants:
    1. Only 'present' workers earn wages.
    2. Overtime hours = max(0, hours_worked - 8.0).
    3. Job hours mapped to JobAssignment rows.
    4. Unassigned shift hours become 'idle' wages.
    5. No double-calculation for same worker on the same date and shift.
    """
    attendances = db.query(Attendance).filter(
        Attendance.work_date == target_date,
        Attendance.shift == shift,
        Attendance.status == "present"
    ).all()

    created_wages = []

    for att in attendances:
        worker: Worker = att.worker
        if not worker:
            continue

        # Check if wages already generated for this worker on this date/shift
        existing = db.query(Wage).filter(
            Wage.worker_id == worker.id,
            Wage.work_date == target_date,
            Wage.shift == shift
        ).first()
        if existing:
            continue

        total_hours = att.hours_worked
        standard_shift_hours = 8.0
        regular_hours = min(total_hours, standard_shift_hours)
        overtime_hours = max(0.0, total_hours - standard_shift_hours)
        ot_multiplier = worker.overtime_multiplier or 1.5
        hourly_rate = worker.hourly_rate

        assignments = db.query(JobAssignment).filter(
            JobAssignment.worker_id == worker.id,
            JobAssignment.work_date == target_date,
            JobAssignment.shift == shift
        ).all()

        assigned_hours_total = sum(a.hours_on_job for a in assignments)

        if assignments:
            # Distribute regular & OT proportionately across jobs
            for assign in assignments:
                job: ProductionJob = assign.production_job
                job_ratio = assign.hours_on_job / assigned_hours_total if assigned_hours_total > 0 else 0
                job_reg_hours = round(min(assign.hours_on_job, regular_hours * job_ratio), 2)
                job_ot_hours = round(overtime_hours * job_ratio, 2)
                
                amount = round((job_reg_hours * hourly_rate) + (job_ot_hours * hourly_rate * ot_multiplier), 2)

                wage = Wage(
                    worker_id=worker.id,
                    production_job_id=job.id if job else None,
                    order_id=job.order_id if job else None,
                    machine_id=assign.machine_id,
                    work_date=target_date,
                    shift=shift,
                    regular_hours=job_reg_hours,
                    overtime_hours=job_ot_hours,
                    rate=hourly_rate,
                    amount=amount,
                    wage_type="job",
                    paid_status="paid"
                )
                db.add(wage)
                created_wages.append(wage)

            # Any remainder between standard shift hours and assigned hours becomes idle wage
            idle_hours = max(0.0, regular_hours - assigned_hours_total)
            if idle_hours > 0:
                idle_amount = round(idle_hours * hourly_rate, 2)
                idle_wage = Wage(
                    worker_id=worker.id,
                    production_job_id=None,
                    order_id=None,
                    machine_id=None,
                    work_date=target_date,
                    shift=shift,
                    regular_hours=round(idle_hours, 2),
                    overtime_hours=0.0,
                    rate=hourly_rate,
                    amount=idle_amount,
                    wage_type="idle",
                    paid_status="paid"
                )
                db.add(idle_wage)
                created_wages.append(idle_wage)
        else:
            # Worker was present but had NO assigned jobs (loom breakdown or waiting for yarn) -> 100% idle wage
            idle_amount = round((regular_hours * hourly_rate) + (overtime_hours * hourly_rate * ot_multiplier), 2)
            idle_wage = Wage(
                worker_id=worker.id,
                production_job_id=None,
                order_id=None,
                machine_id=None,
                work_date=target_date,
                shift=shift,
                regular_hours=round(regular_hours, 2),
                overtime_hours=round(overtime_hours, 2),
                rate=hourly_rate,
                amount=idle_amount,
                wage_type="idle",
                paid_status="paid"
            )
            db.add(idle_wage)
            created_wages.append(idle_wage)

    db.commit()
    return created_wages
