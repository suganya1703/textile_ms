from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from typing import List

from backend.app.core.database import get_db
from backend.app.models.master import Supplier, Setting
from backend.app.models.yarn_order import YarnBatch, Order
from backend.app.models.system import AuditLog
from backend.app.schemas.schemas import (
    YarnArrivalCreate,
    YarnBatchResponse,
    OrderFeasibilityCheckRequest
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/suppliers")
def get_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).all()

@router.get("/yarn", response_model=List[YarnBatchResponse])
def get_yarn_batches(db: Session = Depends(get_db)):
    threshold_setting = db.query(Setting).filter(Setting.key == "low_stock_threshold_kg").first()
    threshold = float(threshold_setting.value) if threshold_setting else 100.0

    batches = db.query(YarnBatch).order_by(YarnBatch.id.desc()).all()
    results = []
    for b in batches:
        data = YarnBatchResponse(
            id=b.id,
            batch_code=b.batch_code,
            supplier_id=b.supplier_id,
            supplier_name=b.supplier.name if b.supplier else "Unknown",
            yarn_type=b.yarn_type,
            colour=b.colour,
            kg_received=b.kg_received,
            kg_remaining=b.kg_remaining,
            cost_per_kg=b.cost_per_kg,
            linked_order_id=b.linked_order_id,
            received_at=b.received_at,
            received_by=b.received_by,
            is_low_stock=(b.kg_remaining < threshold)
        )
        results.append(data)
    return results

@router.get("/stock-summary")
def get_stock_summary(db: Session = Depends(get_db)):
    threshold_setting = db.query(Setting).filter(Setting.key == "low_stock_threshold_kg").first()
    threshold = float(threshold_setting.value) if threshold_setting else 100.0

    # Group yarn by yarn_type and colour
    summaries = db.query(
        YarnBatch.yarn_type,
        YarnBatch.colour,
        func.sum(YarnBatch.kg_remaining).label("total_kg_available"),
        func.avg(YarnBatch.cost_per_kg).label("avg_cost_per_kg"),
        func.count(YarnBatch.id).label("batch_count")
    ).group_by(YarnBatch.yarn_type, YarnBatch.colour).all()

    items = []
    total_inventory_kg = 0.0
    total_inventory_value = 0.0

    for s in summaries:
        total_kg = round(float(s.total_kg_available or 0.0), 1)
        avg_cost = round(float(s.avg_cost_per_kg or 0.0), 2)
        total_inventory_kg += total_kg
        total_inventory_value += (total_kg * avg_cost)

        group_batches = db.query(YarnBatch).filter(
            YarnBatch.yarn_type == s.yarn_type,
            YarnBatch.colour == s.colour
        ).all()
        supplier_names = list(dict.fromkeys([b.supplier.name for b in group_batches if b.supplier]))
        batch_codes = [b.batch_code for b in group_batches]

        items.append({
            "yarn_type": s.yarn_type,
            "colour": s.colour,
            "available_kg": total_kg,
            "avg_cost_per_kg": avg_cost,
            "batches_count": s.batch_count,
            "is_low_stock": total_kg < threshold,
            "threshold_kg": threshold,
            "suppliers": supplier_names,
            "supplier_name": ", ".join(supplier_names) if supplier_names else None,
            "batch_codes": batch_codes,
            "batch_id": ", ".join(batch_codes) if batch_codes else None
        })

    return {
        "summary_items": items,
        "total_inventory_kg": round(total_inventory_kg, 1),
        "total_inventory_value": round(total_inventory_value, 2),
        "low_stock_threshold_kg": threshold
    }

@router.post("/yarn/arrival", response_model=YarnBatchResponse)
def log_yarn_arrival(payload: YarnArrivalCreate, db: Session = Depends(get_db)):
    if payload.kg_received <= 0:
        raise HTTPException(status_code=400, detail="Received kg must be greater than 0.")
    if payload.cost_per_kg <= 0:
        raise HTTPException(status_code=400, detail="Cost per kg must be greater than 0.")

    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    # Generate sequential unique batch code: YB-YYYYMMDD-XXX
    today_str = datetime.utcnow().strftime("%Y%m%d")
    count_today = db.query(YarnBatch).filter(YarnBatch.batch_code.like(f"YB-{today_str}-%")).count() + 1
    batch_code = f"YB-{today_str}-{count_today:03d}"

    batch = YarnBatch(
        batch_code=batch_code,
        supplier_id=payload.supplier_id,
        yarn_type=payload.yarn_type,
        colour=payload.colour,
        kg_received=payload.kg_received,
        kg_remaining=payload.kg_received,
        cost_per_kg=payload.cost_per_kg,
        linked_order_id=payload.linked_order_id,
        received_at=datetime.utcnow(),
        received_by=payload.received_by
    )
    db.add(batch)
    db.flush()

    # Log to AuditLog
    audit = AuditLog(
        user=payload.received_by,
        action="CREATE",
        entity="YarnBatch",
        entity_id=batch.id,
        before_state=None,
        after_state=f"Batch {batch_code} received: {payload.kg_received}kg {payload.yarn_type} ({payload.colour}) from {supplier.name} at ₹{payload.cost_per_kg}/kg"
    )
    db.add(audit)
    db.commit()
    db.refresh(batch)

    return YarnBatchResponse(
        id=batch.id,
        batch_code=batch.batch_code,
        supplier_id=batch.supplier_id,
        supplier_name=supplier.name,
        yarn_type=batch.yarn_type,
        colour=batch.colour,
        kg_received=batch.kg_received,
        kg_remaining=batch.kg_remaining,
        cost_per_kg=batch.cost_per_kg,
        linked_order_id=batch.linked_order_id,
        received_at=batch.received_at,
        received_by=batch.received_by,
        is_low_stock=False
    )

@router.post("/check-feasibility")
def check_yarn_feasibility(req: OrderFeasibilityCheckRequest, db: Session = Depends(get_db)):
    # Standard rule: 1 metre of fabric requires approx 0.22 kg yarn (adjustable by GSM)
    required_kg = round(req.quantity_m * 0.22, 1)

    # Check available stock matching colour (and optionally yarn_type)
    query = db.query(func.sum(YarnBatch.kg_remaining)).filter(
        YarnBatch.colour == req.colour
    )
    if req.yarn_type:
        query = query.filter(YarnBatch.yarn_type == req.yarn_type)
    
    available_kg = query.scalar() or 0.0
    available_kg = round(float(available_kg), 1)

    is_sufficient = available_kg >= required_kg
    shortfall_kg = max(0.0, round(required_kg - available_kg, 1))

    # Draft purchase request to copy
    draft_po_text = (
        f"PURCHASE REQUISITION - EVEREST TEXTILE MILLS\n"
        f"Date: {date.today().strftime('%d %b %Y')}\n"
        f"Item: Yarn {req.yarn_type or 'Standard Weft/Warp'}\n"
        f"Shade/Colour: {req.colour}\n"
        f"Required Quantity: {shortfall_kg} kg (Deficit for {req.quantity_m:.0f}m order)\n"
        f"Target Delivery: Urgent (Within 48 hours)\n"
        f"Contact: Purchase Dept, Everest Textile Mills"
    )

    return {
        "is_sufficient": is_sufficient,
        "required_yarn_kg": required_kg,
        "available_yarn_kg": available_kg,
        "shortfall_kg": shortfall_kg,
        "can_start_immediately": is_sufficient,
        "draft_po_text": draft_po_text if not is_sufficient else None
    }
