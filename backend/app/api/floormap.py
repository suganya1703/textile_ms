from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.master import Machine
from backend.app.models.yarn_order import ProductionJob

router = APIRouter(prefix="/floormap", tags=["FloorMap"])

@router.get("/layout")
def get_floor_layout(db: Session = Depends(get_db)):
    machines = db.query(Machine).all()
    results = []

    for m in machines:
        active_job = db.query(ProductionJob).filter(
            ProductionJob.machine_id == m.id,
            ProductionJob.completed_at == None
        ).order_by(ProductionJob.id.desc()).first()

        results.append({
            "id": m.id,
            "name": m.name,
            "stage": m.stage,
            "status": m.status,
            "x": m.floor_x,
            "y": m.floor_y,
            "capacity_m_per_hour": m.capacity_m_per_hour,
            "active_job": {
                "order_number": active_job.order.order_number if (active_job and active_job.order) else None,
                "fabric_type": active_job.order.fabric_type if (active_job and active_job.order) else None,
                "colour": active_job.order.colour if (active_job and active_job.order) else None,
                "operator_name": active_job.operator.name if (active_job and active_job.operator) else None,
                "shift": active_job.shift if active_job else None,
                "output_today_m": round(active_job.output_today_m, 1) if active_job else 0.0,
                "progress_pct": round(active_job.progress_pct, 1) if active_job else 0.0
            } if active_job else None
        })

    return {
        "mill_name": "Everest Textile Mills",
        "zones": [
            {"id": "spinning_zone", "name": "Spinning Shed", "x": 30, "y": 30, "width": 260, "height": 340},
            {"id": "weaving_zone", "name": "Weaving Shed (Looms)", "x": 320, "y": 30, "width": 420, "height": 340},
            {"id": "dyeing_zone", "name": "Dye House & Perch Table", "x": 770, "y": 30, "width": 300, "height": 340}
        ],
        "machines": results
    }
