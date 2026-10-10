import random
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.master import Machine
from backend.app.models.yarn_order import ProductionJob

def run_simulation_cycle(db: Session):
    """
    Simulates real electronic loom counter pulses on the mill floor.
    Updates output_today_m and progress_pct on active jobs and running machines.
    """
    running_machines = db.query(Machine).filter(Machine.status == "running").all()
    updated_count = 0

    for machine in running_machines:
        # Increment meterage output based on machine capacity
        # e.g., 5-12 metres per simulation step
        increment_m = round(random.uniform(4.0, 10.0), 1)
        
        # Update active production job on this machine
        active_job = db.query(ProductionJob).filter(
            ProductionJob.machine_id == machine.id,
            ProductionJob.completed_at == None
        ).first()

        if active_job:
            active_job.output_today_m += increment_m
            
            # Progress calculation based on order total
            order = active_job.order
            if order and order.quantity_m > 0:
                new_progress = min(99.0, active_job.progress_pct + round((increment_m / order.quantity_m) * 100, 1))
                active_job.progress_pct = new_progress

        machine.status_updated_at = datetime.utcnow()
        updated_count += 1

    db.commit()
    return {"status": "success", "machines_pulsed": updated_count, "timestamp": datetime.utcnow().isoformat()}
