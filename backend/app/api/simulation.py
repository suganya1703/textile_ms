from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.services.simulator import run_simulation_cycle

router = APIRouter(prefix="/simulation", tags=["Simulation"])

@router.post("/tick")
def trigger_simulation_tick(db: Session = Depends(get_db)):
    """
    Triggers one cycle of the simulated machine sensor feed.
    Simulates electronic pulse counters on running looms.
    """
    result = run_simulation_cycle(db)
    return {
        "status": "success",
        "description": "Simulated feed, ready to connect to real machine counters",
        "result": result
    }
