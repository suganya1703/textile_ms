from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from typing import List

from backend.app.core.database import get_db
from backend.app.models.master import Supplier, Setting
from backend.app.models.yarn_order import YarnBatch, Order, YarnDamageRecord, SupplierClaim, YarnConsumption
from backend.app.models.dispatch_finance import Expense
from backend.app.models.system import AuditLog
from backend.app.schemas.schemas import (
    YarnArrivalCreate,
    YarnBatchResponse,
    OrderFeasibilityCheckRequest,
    YarnDamageCreate,
    SupplierClaimCreate,
    SupplierClaimStatusUpdate
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

@router.post("/yarn/{batch_id}/damage")
def report_yarn_damage(batch_id: int, payload: YarnDamageCreate, db: Session = Depends(get_db)):
    batch = db.query(YarnBatch).filter(YarnBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Yarn batch not found.")

    # 1. Validations: kg > 0, not more than kg_remaining, reason required
    if payload.kg_damaged <= 0:
        raise HTTPException(status_code=400, detail="Damaged kg must be greater than 0.")

    if payload.kg_damaged > batch.kg_remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Damaged kg ({payload.kg_damaged:.1f} kg) cannot exceed remaining batch stock ({batch.kg_remaining:.1f} kg)."
        )

    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Damage reason is required.")

    if any(v < 0 for v in [payload.salvaged_kg, payload.waste_kg, payload.waste_sale_amount, payload.supplier_return_kg, payload.destroyed_kg]):
        raise HTTPException(status_code=400, detail="Disposition quantities and values cannot be negative.")

    # 2. Split verification: must equal damaged kg
    total_disposition = round(payload.salvaged_kg + payload.waste_kg + payload.supplier_return_kg + payload.destroyed_kg, 2)
    damaged_target = round(payload.kg_damaged, 2)
    if abs(total_disposition - damaged_target) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"The kg across dispositions ({total_disposition:.1f} kg) must add up to the damaged kg ({damaged_target:.1f} kg)."
        )

    # 3. Stock Reduction: Reduce kg_remaining by non-salvaged kg
    non_salvaged_kg = round(payload.kg_damaged - payload.salvaged_kg, 2)
    old_kg_remaining = batch.kg_remaining
    batch.kg_remaining = round(max(0.0, batch.kg_remaining - non_salvaged_kg), 2)

    # 4. Expense calculation: Net loss = (non-salvaged kg x cost_per_kg) minus waste sale value
    gross_loss = round(non_salvaged_kg * batch.cost_per_kg, 2)
    net_loss = round(gross_loss - payload.waste_sale_amount, 2)
    if net_loss > 0:
        expense = Expense(
            category="yarn_loss",
            supplier_id=batch.supplier_id,
            amount=net_loss,
            description=f"Yarn loss on batch {batch.batch_code} ({payload.reason}): {non_salvaged_kg:.1f}kg write-off (gross ₹{gross_loss:.2f} less ₹{payload.waste_sale_amount:.2f} waste sale)",
            incurred_at=datetime.utcnow()
        )
        db.add(expense)

    # 5. Supplier Claim if supplier_return_kg > 0
    supplier_claim = None
    if payload.supplier_return_kg > 0:
        supplier_claim = SupplierClaim(
            supplier_id=batch.supplier_id,
            yarn_batch_id=batch.id,
            kg=payload.supplier_return_kg,
            claim_amount=round(payload.supplier_return_kg * batch.cost_per_kg, 2),
            reason=f"{payload.reason} - Damaged yarn return ({payload.note})" if payload.note else f"{payload.reason} - Damaged yarn return",
            status="Draft",
            created_at=datetime.utcnow()
        )
        db.add(supplier_claim)

    # 6. Record Damage Record
    damage_rec = YarnDamageRecord(
        yarn_batch_id=batch.id,
        kg_damaged=payload.kg_damaged,
        reason=payload.reason,
        note=payload.note,
        reported_by=payload.reported_by,
        salvaged_kg=payload.salvaged_kg,
        waste_kg=payload.waste_kg,
        waste_sale_amount=payload.waste_sale_amount,
        supplier_return_kg=payload.supplier_return_kg,
        destroyed_kg=payload.destroyed_kg,
        created_at=datetime.utcnow()
    )
    db.add(damage_rec)

    # 7. AuditLog entry
    audit = AuditLog(
        user=payload.reported_by,
        action="YARN_DAMAGE_WRITEOFF",
        entity="YarnBatch",
        entity_id=batch.id,
        before_state=f"kg_remaining: {old_kg_remaining:.1f}",
        after_state=(
            f"kg_remaining: {batch.kg_remaining:.1f}; "
            f"damaged: {payload.kg_damaged:.1f}kg; "
            f"salvaged: {payload.salvaged_kg:.1f}kg; "
            f"waste_sold: {payload.waste_kg:.1f}kg (₹{payload.waste_sale_amount:.2f}); "
            f"supplier_return: {payload.supplier_return_kg:.1f}kg; "
            f"destroyed: {payload.destroyed_kg:.1f}kg; "
            f"net_loss: ₹{net_loss:.2f}; "
            f"reason: {payload.reason}"
        )
    )
    db.add(audit)
    db.commit()
    db.refresh(batch)
    db.refresh(damage_rec)

    # 8. Immediately re-run "Can we start this order?" check for every open order that uses this yarn type and colour
    open_orders = db.query(Order).filter(Order.status.notin_(["Dispatched", "Cancelled"])).all()
    # Available stock matching this yarn type and colour across all batches
    avail_kg = db.query(func.sum(YarnBatch.kg_remaining)).filter(
        YarnBatch.yarn_type == batch.yarn_type,
        YarnBatch.colour == batch.colour
    ).scalar() or 0.0
    avail_kg = round(float(avail_kg), 1)

    affected_orders = []
    for o in open_orders:
        matches_yarn = (
            o.colour.lower() == batch.colour.lower() or
            (batch.yarn_type.lower() in o.fabric_type.lower() or o.fabric_type.lower() in batch.yarn_type.lower())
        )
        if matches_yarn:
            shortfall = max(0.0, round(o.yarn_required_kg - avail_kg, 1))
            if shortfall > 0:
                affected_orders.append({
                    "order_id": o.id,
                    "order_number": o.order_number,
                    "buyer_name": o.buyer.name if o.buyer else "Unknown",
                    "fabric_type": o.fabric_type,
                    "colour": o.colour,
                    "quantity_m": o.quantity_m,
                    "yarn_required_kg": o.yarn_required_kg,
                    "available_yarn_kg": avail_kg,
                    "shortfall_kg": shortfall
                })

    total_shortfall = round(sum(o["shortfall_kg"] for o in affected_orders), 1)
    draft_po_text = None
    if affected_orders:
        order_nums = ", ".join(f"#{o['order_number']}" for o in affected_orders)
        draft_po_text = (
            f"PURCHASE REQUISITION - EVEREST TEXTILE MILLS\n"
            f"Date: {date.today().strftime('%d %b %Y')}\n"
            f"Item: Yarn {batch.yarn_type}\n"
            f"Shade/Colour: {batch.colour}\n"
            f"Required Quantity: {total_shortfall:.1f} kg\n"
            f"Impacted Orders: {order_nums}\n"
            f"Reason: Stock deficit following yarn damage write-off in batch {batch.batch_code} ({payload.reason})\n"
            f"Target Delivery: Urgent (Within 48 hours)\n"
            f"Contact: Purchase Dept, Everest Textile Mills"
        )

    return {
        "status": "success",
        "message": f"Successfully reported {payload.kg_damaged:.1f}kg damage for batch {batch.batch_code}.",
        "batch_id": batch.id,
        "batch_code": batch.batch_code,
        "kg_remaining": batch.kg_remaining,
        "non_salvaged_kg": non_salvaged_kg,
        "net_loss": net_loss,
        "damage_record_id": damage_rec.id,
        "supplier_claim_id": supplier_claim.id if supplier_claim else None,
        "affected_orders": affected_orders,
        "has_shortfall": len(affected_orders) > 0,
        "total_shortfall_kg": total_shortfall,
        "draft_po_text": draft_po_text
    }

@router.get("/yarn/{batch_id}/ledger")
def get_yarn_batch_ledger(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(YarnBatch).filter(YarnBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Yarn batch not found.")

    events = []

    # 1. Arrival event
    events.append({
        "timestamp": batch.received_at.isoformat(),
        "event_type": "Arrival",
        "description": f"Gate intake from {batch.supplier.name if batch.supplier else 'Supplier'}",
        "kg_change": round(batch.kg_received, 1),
        "operator": batch.received_by,
        "details": f"Cost: ₹{batch.cost_per_kg:.2f}/kg"
    })

    # 2. Consumptions
    for c in batch.consumptions:
        net_consumed = round(c.kg_issued - (c.kg_returned or 0.0), 1)
        events.append({
            "timestamp": c.issued_at.isoformat(),
            "event_type": "Consumption",
            "description": f"Issued for Order #{c.order.order_number if c.order else c.order_id}",
            "kg_change": -net_consumed,
            "operator": f"Job #{c.production_job_id}",
            "details": f"Issued: {c.kg_issued:.1f}kg, Returned: {c.kg_returned or 0.0:.1f}kg"
        })

    # 3. Damage records
    for d in batch.damage_records:
        net_deduction = round(d.kg_damaged - d.salvaged_kg, 1)
        disposition_details = []
        if d.salvaged_kg > 0:
            disposition_details.append(f"Salvaged: {d.salvaged_kg:.1f}kg")
        if d.waste_kg > 0:
            disposition_details.append(f"Waste Sold: {d.waste_kg:.1f}kg (₹{d.waste_sale_amount:.2f})")
        if d.supplier_return_kg > 0:
            disposition_details.append(f"Supplier Return: {d.supplier_return_kg:.1f}kg")
        if d.destroyed_kg > 0:
            disposition_details.append(f"Destroyed: {d.destroyed_kg:.1f}kg")

        events.append({
            "timestamp": d.created_at.isoformat(),
            "event_type": "Damage Write-Off",
            "description": f"Damage: {d.reason}" + (f" ({d.note})" if d.note else ""),
            "kg_change": -net_deduction,
            "operator": d.reported_by,
            "details": f"Damaged: {d.kg_damaged:.1f}kg | " + "; ".join(disposition_details)
        })

    # Sort events by timestamp
    events.sort(key=lambda x: x["timestamp"])

    return {
        "batch_id": batch.id,
        "batch_code": batch.batch_code,
        "yarn_type": batch.yarn_type,
        "colour": batch.colour,
        "supplier_name": batch.supplier.name if batch.supplier else "Unknown",
        "kg_received": batch.kg_received,
        "kg_remaining": batch.kg_remaining,
        "cost_per_kg": batch.cost_per_kg,
        "events": events
    }

@router.get("/supplier-claims")
def get_supplier_claims(db: Session = Depends(get_db)):
    claims = db.query(SupplierClaim).order_by(SupplierClaim.id.desc()).all()
    results = []
    for c in claims:
        results.append({
            "id": c.id,
            "supplier_id": c.supplier_id,
            "supplier_name": c.supplier.name if c.supplier else "Unknown",
            "supplier_city": c.supplier.city if c.supplier else None,
            "supplier_phone": c.supplier.phone if c.supplier else None,
            "yarn_batch_id": c.yarn_batch_id,
            "batch_code": c.yarn_batch.batch_code if c.yarn_batch else "Unknown",
            "kg": c.kg,
            "claim_amount": c.claim_amount,
            "reason": c.reason,
            "status": c.status,
            "created_at": c.created_at.isoformat()
        })
    return results

@router.post("/supplier-claims")
def create_supplier_claim(payload: SupplierClaimCreate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    batch = db.query(YarnBatch).filter(YarnBatch.id == payload.yarn_batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Yarn batch not found.")

    claim = SupplierClaim(
        supplier_id=payload.supplier_id,
        yarn_batch_id=payload.yarn_batch_id,
        kg=payload.kg,
        claim_amount=payload.claim_amount,
        reason=payload.reason,
        status=payload.status or "Draft",
        created_at=datetime.utcnow()
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return {
        "id": claim.id,
        "supplier_id": claim.supplier_id,
        "supplier_name": supplier.name,
        "yarn_batch_id": claim.yarn_batch_id,
        "batch_code": batch.batch_code,
        "kg": claim.kg,
        "claim_amount": claim.claim_amount,
        "reason": claim.reason,
        "status": claim.status,
        "created_at": claim.created_at.isoformat()
    }

@router.patch("/supplier-claims/{claim_id}/status")
def update_supplier_claim_status(claim_id: int, payload: SupplierClaimStatusUpdate, db: Session = Depends(get_db)):
    valid_statuses = ["Draft", "Raised", "Credited", "Rejected"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(valid_statuses)}")

    claim = db.query(SupplierClaim).filter(SupplierClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Supplier claim not found.")

    old_status = claim.status
    claim.status = payload.status

    db.add(AuditLog(
        user="Store Incharge",
        action="UPDATE_CLAIM_STATUS",
        entity="SupplierClaim",
        entity_id=claim.id,
        before_state=f"status: {old_status}",
        after_state=f"status: {claim.status}"
    ))
    db.commit()
    db.refresh(claim)
    return {
        "id": claim.id,
        "supplier_id": claim.supplier_id,
        "supplier_name": claim.supplier.name if claim.supplier else "Unknown",
        "batch_code": claim.yarn_batch.batch_code if claim.yarn_batch else "Unknown",
        "kg": claim.kg,
        "claim_amount": claim.claim_amount,
        "reason": claim.reason,
        "status": claim.status,
        "created_at": claim.created_at.isoformat()
    }
