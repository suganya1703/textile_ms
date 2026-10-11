from datetime import date
from sqlalchemy.orm import Session
from backend.app.models.yarn_order import Order
from backend.app.models.master import Machine

def evaluate_order_delay_risk(order: Order, db: Session, simulated_today: date = None):
    today = simulated_today or date.today()
    days_left = (order.deadline - today).days

    # Fabric produced so far for this order that passed QC
    passed_metres = sum(r.length_m for r in order.rolls if r.qc_status == 'pass')
    remaining_metres = max(0.0, order.quantity_m - passed_metres)

    # Current output rate: sum of output_today_m on assigned active jobs
    active_jobs = [j for j in order.production_jobs if not j.completed_at]
    current_daily_rate = sum(j.output_today_m for j in active_jobs)

    # If no output logged today yet, approximate from machine capacity
    if current_daily_rate == 0 and active_jobs:
        current_daily_rate = sum(j.machine.capacity_m_per_hour * 8.0 for j in active_jobs if j.machine and j.machine.status == 'running')

    if order.status == "Dispatched":
        return {
            "order_id": order.id,
            "order_number": order.order_number,
            "buyer": order.buyer.name if order.buyer else "Unknown",
            "status": "green",
            "risk_level": "Completed",
            "days_left": days_left,
            "remaining_m": 0.0,
            "required_m_per_day": 0.0,
            "current_m_per_day": current_daily_rate,
            "reason": "Order already dispatched.",
            "suggested_action": "No action needed."
        }

    if days_left <= 0:
        return {
            "order_id": order.id,
            "order_number": order.order_number,
            "buyer": order.buyer.name if order.buyer else "Unknown",
            "status": "red",
            "risk_level": "Overdue",
            "days_left": days_left,
            "remaining_m": remaining_metres,
            "required_m_per_day": remaining_metres,
            "current_m_per_day": current_daily_rate,
            "reason": f"Deadline was {order.deadline}. {remaining_metres:.1f} m remaining.",
            "suggested_action": "Prioritize on highest speed looms or negotiate extension with buyer."
        }

    required_daily_rate = round(remaining_metres / max(1, days_left), 1)

    # Idle machines that could assist
    idle_looms = db.query(Machine).filter(Machine.status == "idle", Machine.stage == "weaving").all()
    idle_suggestion = f"{idle_looms[0].name} is idle; allocate parallel job there." if idle_looms else "Consider scheduling overtime on next shift."

    if current_daily_rate >= required_daily_rate:
        status = "green"
        risk_level = "On Track"
        reason = f"On track: producing {current_daily_rate:.1f} m/day vs required {required_daily_rate:.1f} m/day."
        suggested_action = "Maintain current shift schedule."
    elif current_daily_rate >= 0.70 * required_daily_rate:
        status = "amber"
        risk_level = "Moderate Risk"
        reason = f"Slight shortfall: needs {required_daily_rate:.1f} m/day, currently achieving {current_daily_rate:.1f} m/day."
        suggested_action = idle_suggestion
    else:
        status = "red"
        risk_level = "Critical Delay"
        reason = f"Severe deficit: needs {required_daily_rate:.1f} m/day, currently only {current_daily_rate:.1f} m/day."
        suggested_action = idle_suggestion

    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "buyer": order.buyer.name if order.buyer else "Unknown",
        "status": status,
        "risk_level": risk_level,
        "days_left": days_left,
        "remaining_m": remaining_metres,
        "required_m_per_day": required_daily_rate,
        "current_m_per_day": current_daily_rate,
        "reason": reason,
        "suggested_action": suggested_action
    }
