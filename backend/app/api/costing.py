from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from backend.app.core.database import get_db
from backend.app.models.yarn_order import Order, YarnConsumption
from backend.app.models.workforce import Wage
from backend.app.models.master import Setting
from backend.app.models.quality import Roll

router = APIRouter(prefix="/costing", tags=["Costing"])

@router.get("/orders")
def get_order_costing(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.id.desc()).all()
    
    overhead_setting = db.query(Setting).filter(Setting.key == "overhead_rate_per_hour").first()
    overhead_rate = float(overhead_setting.value) if overhead_setting else 250.0

    results = []
    total_factory_revenue = 0.0
    total_factory_cost = 0.0

    for o in orders:
        # 1. Yarn Cost
        yarn_consumptions = db.query(YarnConsumption).filter(YarnConsumption.order_id == o.id).all()
        yarn_cost = 0.0
        yarn_kg_consumed = 0.0
        for c in yarn_consumptions:
            net_kg = max(0.0, c.kg_issued - c.kg_returned)
            yarn_kg_consumed += net_kg
            cost_per_kg = c.yarn_batch.cost_per_kg if c.yarn_batch else 240.0
            yarn_cost += (net_kg * cost_per_kg)

        # Fallback if consumption table has no records yet
        if yarn_cost == 0.0:
            yarn_kg_consumed = o.yarn_required_kg
            yarn_cost = o.yarn_required_kg * 240.0

        # 2. Direct Labour Cost
        labour_cost = db.query(func.sum(Wage.amount)).filter(
            Wage.order_id == o.id,
            Wage.wage_type == "job"
        ).scalar() or 0.0
        labour_cost = float(labour_cost)

        # If order is completed or has produced rolls, add standard labour if wages not fully booked
        passed_m = sum(r.length_m for r in o.rolls if r.qc_status == 'pass')
        if labour_cost == 0.0 and passed_m > 0:
            labour_cost = passed_m * 18.0

        # 3. Machine Overhead Allocation
        # Estimated machine hours = produced metres / 25 m/hr
        machine_hours = passed_m / 25.0 if passed_m > 0 else (o.quantity_m * 0.1 / 25.0)
        overhead_cost = machine_hours * (overhead_rate / 4.0)  # apportioned across looms

        # 4. Rework & Scrap Cost
        rework_rolls = [r for r in o.rolls if r.qc_status == 'rework']
        rework_cost = sum(r.length_m * 12.0 for r in rework_rolls)

        # Total Cost
        total_cost = round(yarn_cost + labour_cost + overhead_cost + rework_cost, 2)
        total_revenue = round(o.quantity_m * o.price_per_m, 2)
        
        gross_profit = round(total_revenue - total_cost, 2)
        margin_pct = round((gross_profit / total_revenue * 100), 1) if total_revenue > 0 else 0.0

        is_loss_making = gross_profit < 0

        total_factory_revenue += total_revenue
        total_factory_cost += total_cost

        results.append({
            "order_id": o.id,
            "order_number": o.order_number,
            "buyer_name": o.buyer.name if o.buyer else "Unknown",
            "fabric_type": o.fabric_type,
            "colour": o.colour,
            "quantity_m": o.quantity_m,
            "price_per_m": o.price_per_m,
            "total_revenue": total_revenue,
            "cost_breakdown": {
                "yarn_cost": round(yarn_cost, 2),
                "yarn_kg": round(yarn_kg_consumed, 1),
                "labour_cost": round(labour_cost, 2),
                "overhead_cost": round(overhead_cost, 2),
                "rework_cost": round(rework_cost, 2),
                "total_cost": total_cost
            },
            "gross_profit": gross_profit,
            "margin_pct": margin_pct,
            "is_loss_making": is_loss_making,
            "status": o.status
        })

    total_factory_profit = round(total_factory_revenue - total_factory_cost, 2)
    overall_margin = round((total_factory_profit / total_factory_revenue * 100), 1) if total_factory_revenue > 0 else 0.0

    return {
        "orders": results,
        "factory_summary": {
            "total_revenue": round(total_factory_revenue, 2),
            "total_cost": round(total_factory_cost, 2),
            "total_gross_profit": total_factory_profit,
            "overall_margin_pct": overall_margin,
            "loss_making_orders_count": sum(1 for r in results if r["is_loss_making"])
        }
    }
