from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.models.yarn_order import Order, YarnBatch
from backend.app.models.master import Buyer, Machine, Setting
from backend.app.models.system import AuditLog
from backend.app.schemas.schemas import (
    OrderCreate,
    OrderResponse,
    OrderFeasibilityQuoteRequest
)

router = APIRouter(prefix="/orders", tags=["Orders"])

STAGES_ORDER = ["Created", "Yarn reserved", "Spinning", "Weaving", "Dyeing", "QC", "Ready", "Dispatched"]

@router.get("", response_model=List[OrderResponse])
def get_orders(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)

    orders = query.order_by(Order.id.desc()).all()
    results = []

    for o in orders:
        passed_m = sum(r.length_m for r in o.rolls if r.qc_status == 'pass')
        pct = min(100.0, round((passed_m / o.quantity_m * 100), 1)) if o.quantity_m > 0 else 0.0

        results.append(OrderResponse(
            id=o.id,
            order_number=o.order_number,
            buyer_id=o.buyer_id,
            buyer_name=o.buyer.name if o.buyer else "Unknown",
            fabric_type=o.fabric_type,
            colour=o.colour,
            quantity_m=o.quantity_m,
            deadline=o.deadline,
            price_per_m=o.price_per_m,
            status=o.status,
            yarn_required_kg=o.yarn_required_kg,
            expected_delivery=o.expected_delivery,
            created_at=o.created_at,
            progress_pct=pct,
            produced_m=round(passed_m, 1)
        ))

    return results

@router.get("/buyers")
def get_buyers(db: Session = Depends(get_db)):
    return db.query(Buyer).all()

@router.get("/{order_id}")
def get_order_details(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    passed_m = sum(r.length_m for r in order.rolls if r.qc_status == 'pass')
    pct = min(100.0, round((passed_m / order.quantity_m * 100), 1)) if order.quantity_m > 0 else 0.0

    # WhatsApp / SMS staff message
    whatsapp_message = (
        f"Namaste! Your order #{order.order_number} ({order.fabric_type} {order.colour}) "
        f"is currently in {order.status.lower()} stage at Everest Textile Mills. "
        f"Progress: {pct:.0f}% ({passed_m:.1f}/{order.quantity_m:.0f}m). "
        f"Expected delivery: {order.expected_delivery.strftime('%d %b %Y')}."
    )

    rolls_summary = [
        {
            "id": r.id,
            "roll_number": r.roll_number,
            "length_m": r.length_m,
            "dye_lot": r.dye_lot,
            "qc_status": r.qc_status,
            "grade": r.grade,
            "dispatched": r.dispatched
        }
        for r in order.rolls
    ]

    return {
        "id": order.id,
        "order_number": order.order_number,
        "buyer_name": order.buyer.name if order.buyer else "Unknown",
        "buyer_contact": order.buyer.contact if order.buyer else None,
        "buyer_phone": order.buyer.phone if order.buyer else None,
        "fabric_type": order.fabric_type,
        "colour": order.colour,
        "quantity_m": order.quantity_m,
        "produced_m": round(passed_m, 1),
        "progress_pct": pct,
        "deadline": order.deadline.isoformat(),
        "expected_delivery": order.expected_delivery.isoformat(),
        "price_per_m": order.price_per_m,
        "status": order.status,
        "whatsapp_message": whatsapp_message,
        "rolls": rolls_summary
    }

@router.get("/track/{order_ref}")
def get_public_tracking(order_ref: str, db: Session = Depends(get_db)):
    # Look up by order_number or numeric id
    order = None
    if order_ref.isdigit():
        order = db.query(Order).filter(Order.id == int(order_ref)).first()
    if not order:
        order = db.query(Order).filter(Order.order_number == order_ref.strip()).first()

    if not order:
        raise HTTPException(status_code=404, detail=f"Order '{order_ref}' not found in mill records.")

    passed_m = sum(r.length_m for r in order.rolls if r.qc_status == 'pass')
    pct = min(100.0, round((passed_m / order.quantity_m * 100), 1)) if order.quantity_m > 0 else 0.0

    current_idx = STAGES_ORDER.index(order.status) if order.status in STAGES_ORDER else 0

    stages = [
        {"name": "Spinning", "completed": current_idx >= 2, "active": current_idx == 2},
        {"name": "Weaving", "completed": current_idx >= 3, "active": current_idx == 3},
        {"name": "Dyeing", "completed": current_idx >= 4, "active": current_idx == 4},
        {"name": "Quality Inspection", "completed": current_idx >= 5, "active": current_idx == 5},
        {"name": "Ready for Dispatch", "completed": current_idx >= 6, "active": current_idx == 6},
        {"name": "Dispatched", "completed": current_idx >= 7, "active": current_idx == 7}
    ]

    return {
        "order_number": order.order_number,
        "mill_name": "Everest Textile Mills",
        "fabric_type": order.fabric_type,
        "colour": order.colour,
        "quantity_m": order.quantity_m,
        "produced_m": round(passed_m, 1),
        "progress_pct": pct,
        "current_status": order.status,
        "expected_delivery": order.expected_delivery.strftime("%d %b %Y"),
        "stages": stages
    }

@router.post("", response_model=OrderResponse)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    buyer = db.query(Buyer).filter(Buyer.id == payload.buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found.")

    today_str = datetime.utcnow().strftime("%Y%m%d")
    count_today = db.query(Order).filter(Order.order_number.like(f"ORD-{today_str}-%")).count() + 1
    order_number = f"ORD-{today_str}-{count_today:03d}"

    # Check yarn stock reservation
    available_yarn = db.query(func.sum(YarnBatch.kg_remaining)).filter(
        YarnBatch.colour == payload.colour
    ).scalar() or 0.0

    initial_status = "Yarn reserved" if available_yarn >= payload.yarn_required_kg else "Created"

    order = Order(
        order_number=order_number,
        buyer_id=payload.buyer_id,
        fabric_type=payload.fabric_type,
        colour=payload.colour,
        quantity_m=payload.quantity_m,
        deadline=payload.deadline,
        price_per_m=payload.price_per_m,
        status=initial_status,
        yarn_required_kg=payload.yarn_required_kg,
        expected_delivery=payload.expected_delivery
    )
    db.add(order)
    db.flush()

    db.add(AuditLog(
        user="Sales Coordinator",
        action="CREATE_ORDER",
        entity="Order",
        entity_id=order.id,
        before_state=None,
        after_state=f"Created Order {order_number} for {buyer.name} ({payload.quantity_m}m {payload.fabric_type} {payload.colour}) at ₹{payload.price_per_m}/m"
    ))

    db.commit()
    db.refresh(order)

    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        buyer_id=order.buyer_id,
        buyer_name=buyer.name,
        fabric_type=order.fabric_type,
        colour=order.colour,
        quantity_m=order.quantity_m,
        deadline=order.deadline,
        price_per_m=order.price_per_m,
        status=order.status,
        yarn_required_kg=order.yarn_required_kg,
        expected_delivery=order.expected_delivery,
        created_at=order.created_at,
        progress_pct=0.0,
        produced_m=0.0
    )

@router.post("/simulate-feasibility")
def simulate_order_feasibility(req: OrderFeasibilityQuoteRequest, db: Session = Depends(get_db)):
    """
    Order Feasibility and Profit Simulator:
    Checks yarn stock, free machine capacities, estimated cost and margin,
    proposes realistic delivery and recommends: ACCEPT, RENEGOTIATE, or DECLINE.
    """
    required_yarn_kg = round(req.quantity_m * 0.22, 1)

    # 1. Yarn check
    yarn_stock = db.query(func.sum(YarnBatch.kg_remaining)).filter(
        YarnBatch.colour == req.colour
    ).scalar() or 0.0
    has_enough_yarn = yarn_stock >= required_yarn_kg
    yarn_shortfall = max(0.0, required_yarn_kg - yarn_stock)

    # 2. Machine capacity check
    active_weaving_looms = db.query(Machine).filter(Machine.stage == "weaving", Machine.status != "breakdown").all()
    avg_capacity = sum(m.capacity_m_per_hour for m in active_weaving_looms) / len(active_weaving_looms) if active_weaving_looms else 25.0
    
    # Standard production speed: approx 2 shifts * 8 hours = 16 hours/day on 1 loom
    daily_output_per_loom = avg_capacity * 16.0
    days_needed_single_loom = req.quantity_m / daily_output_per_loom if daily_output_per_loom > 0 else 5.0
    
    # Feasible days adding lead time (yarn prep 1 day, dyeing 2 days, QC 1 day)
    lead_time_days = 4.0 if has_enough_yarn else 7.0
    total_days_needed = int(days_needed_single_loom + lead_time_days)
    
    earliest_delivery = date.today() + timedelta(days=total_days_needed)
    deadline_feasible = req.deadline >= earliest_delivery

    # 3. Cost estimation
    # Average yarn cost: ₹240/kg
    # Labour cost: ~₹18/metre
    # Overhead: ~₹12/metre
    estimated_yarn_cost_per_m = (required_yarn_kg * 240.0) / req.quantity_m
    estimated_labour_per_m = 18.0
    estimated_overhead_per_m = 12.0
    estimated_unit_cost = round(estimated_yarn_cost_per_m + estimated_labour_per_m + estimated_overhead_per_m, 2)
    
    projected_margin_per_m = req.offered_price_per_m - estimated_unit_cost
    projected_margin_pct = round((projected_margin_per_m / req.offered_price_per_m) * 100, 1)

    # Recommendation rule
    if projected_margin_pct < 5.0:
        recommendation = "DECLINE"
        reason = f"Loss-making or negative margin ({projected_margin_pct}%). Estimated unit cost is ₹{estimated_unit_cost}/m vs offered ₹{req.offered_price_per_m}/m."
    elif not deadline_feasible:
        recommendation = "RENEGOTIATE"
        reason = f"Tight timeline. Earliest realistic delivery is {earliest_delivery.strftime('%d %b %Y')} ({total_days_needed} days) vs requested {req.deadline.strftime('%d %b %Y')}."
    elif not has_enough_yarn:
        recommendation = "RENEGOTIATE"
        reason = f"Profitable ({projected_margin_pct}% margin), but yarn short by {yarn_shortfall:.1f} kg. Need 3 extra days for yarn procurement."
    else:
        recommendation = "ACCEPT"
        reason = f"Profitable order ({projected_margin_pct}% margin) with feasible deadline of {earliest_delivery.strftime('%d %b %Y')}."

    return {
        "recommendation": recommendation,
        "reason": reason,
        "estimated_unit_cost": estimated_unit_cost,
        "offered_price_per_m": req.offered_price_per_m,
        "projected_margin_pct": projected_margin_pct,
        "required_yarn_kg": required_yarn_kg,
        "yarn_available_kg": round(yarn_stock, 1),
        "has_enough_yarn": has_enough_yarn,
        "earliest_delivery": earliest_delivery.isoformat(),
        "total_days_needed": total_days_needed,
        "is_deadline_feasible": deadline_feasible
    }
