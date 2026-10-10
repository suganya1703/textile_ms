from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List

from backend.app.core.database import get_db
from backend.app.models.quality import Roll
from backend.app.models.master import Buyer, Setting
from backend.app.models.dispatch_finance import Dispatch, Invoice
from backend.app.models.system import AuditLog
from backend.app.schemas.schemas import DispatchCreate, DispatchResponse

router = APIRouter(prefix="/dispatch", tags=["Dispatch"])

@router.get("/finished-stock")
def get_finished_stock(db: Session = Depends(get_db)):
    """
    Derived Finished Goods Query:
    NO separate FinishedGoods table!
    Finished Stock = Rolls WHERE qc_status='pass' AND dispatched=false.
    Dispatched Stock = Rolls WHERE dispatched=true.
    """
    # Active undispatched rolls on the shelves
    available_rolls = db.query(Roll).filter(
        Roll.qc_status == "pass",
        Roll.dispatched == False
    ).all()

    # Dispatched rolls
    dispatched_rolls = db.query(Roll).filter(
        Roll.dispatched == True
    ).all()

    # Group available rolls by fabric_type, colour, dye_lot, grade
    grouped = {}
    for r in available_rolls:
        order = r.order
        fabric = order.fabric_type if order else "Standard Fabric"
        colour = order.colour if order else "Natural"
        key = (fabric, colour, r.dye_lot, r.grade or "A")

        if key not in grouped:
            grouped[key] = {
                "fabric_type": fabric,
                "colour": colour,
                "dye_lot": r.dye_lot,
                "grade": r.grade or "A",
                "roll_count": 0,
                "total_metres": 0.0,
                "buyer_names": set(),
                "roll_ids": []
            }
        grouped[key]["roll_count"] += 1
        grouped[key]["total_metres"] += r.length_m
        if order and order.buyer:
            grouped[key]["buyer_names"].add(order.buyer.name)
        grouped[key]["roll_ids"].append(r.id)

    shelf_summary = []
    for g in grouped.values():
        shelf_summary.append({
            "fabric_type": g["fabric_type"],
            "colour": g["colour"],
            "dye_lot": g["dye_lot"],
            "grade": g["grade"],
            "roll_count": g["roll_count"],
            "total_metres": round(g["total_metres"], 1),
            "buyers": list(g["buyer_names"]),
            "roll_ids": g["roll_ids"]
        })

    return {
        "shelf_stock": shelf_summary,
        "total_available_rolls": len(available_rolls),
        "total_available_metres": round(sum(r.length_m for r in available_rolls), 1),
        "total_dispatched_rolls": len(dispatched_rolls),
        "total_dispatched_metres": round(sum(r.length_m for r in dispatched_rolls), 1)
    }

@router.get("/eligible-rolls/{buyer_id}")
def get_eligible_rolls_for_buyer(buyer_id: int, db: Session = Depends(get_db)):
    """
    Fetch all rolls that have PASSED QC, are NOT yet dispatched,
    and belong to active orders placed by this buyer.
    """
    rolls = db.query(Roll).join(Roll.order).filter(
        Roll.order.has(buyer_id=buyer_id),
        Roll.qc_status == "pass",
        Roll.dispatched == False
    ).order_by(Roll.id.asc()).all()

    results = []
    dye_lots_map = {}

    for r in rolls:
        results.append({
            "id": r.id,
            "roll_number": r.roll_number,
            "order_number": r.order.order_number,
            "fabric_type": r.order.fabric_type,
            "colour": r.order.colour,
            "dye_lot": r.dye_lot,
            "shade_value": r.shade_value,
            "length_m": r.length_m,
            "grade": r.grade,
            "price_per_m": r.order.price_per_m
        })
        dye_lots_map[r.dye_lot] = dye_lots_map.get(r.dye_lot, 0) + r.length_m

    return {
        "rolls": results,
        "dye_lot_distribution": dye_lots_map,
        "distinct_lots_count": len(dye_lots_map)
    }

@router.get("/history", response_model=List[DispatchResponse])
def get_dispatch_history(db: Session = Depends(get_db)):
    dispatches = db.query(Dispatch).order_by(Dispatch.id.desc()).all()
    results = []
    for d in dispatches:
        roll_count = len(d.rolls)
        total_m = sum(r.length_m for r in d.rolls)
        results.append(DispatchResponse(
            id=d.id,
            dispatch_number=d.dispatch_number,
            buyer_id=d.buyer_id,
            buyer_name=d.buyer.name if d.buyer else "Unknown",
            vehicle_no=d.vehicle_no,
            notes=d.notes,
            dispatched_at=d.dispatched_at,
            created_by=d.created_by,
            roll_count=roll_count,
            total_metres=round(total_m, 1),
            invoice_no=d.invoice.invoice_no if d.invoice else None,
            invoice_total=d.invoice.total if d.invoice else None
        ))
    return results

@router.post("", response_model=DispatchResponse)
def execute_dispatch(payload: DispatchCreate, db: Session = Depends(get_db)):
    """
    ONE DATABASE TRANSACTION ATOMIC DISPATCH:
    1. Lock rolls (with_for_update).
    2. Re-verify each roll is qc_status='pass' and dispatched=false.
    3. Check dye-lot clash: if multiple lots present without override confirmation, reject.
    4. Set dispatched=true and assign dispatch_id.
    5. Calculate subtotal, tax, total and create Invoice.
    6. Write AuditLog.
    7. Commit transaction; rollback if ANY check fails.
    """
    if not payload.roll_ids:
        raise HTTPException(status_code=400, detail="Must select at least one roll to dispatch.")

    buyer = db.query(Buyer).filter(Buyer.id == payload.buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found.")

    with db.begin_nested():
        # Step 1: Query rolls with lock
        rolls = db.query(Roll).filter(Roll.id.in_(payload.roll_ids)).with_for_update().all()

        if len(rolls) != len(payload.roll_ids):
            raise HTTPException(status_code=400, detail="One or more specified rolls do not exist in the database.")

        # Step 2: Strict verification of QC status and dispatched flag
        for roll in rolls:
            if roll.qc_status != "pass":
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot dispatch roll {roll.roll_number}: QC status is '{roll.qc_status}'. Only passed rolls can be dispatched."
                )
            if roll.dispatched:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot dispatch roll {roll.roll_number}: Roll has ALREADY been dispatched."
                )
            if roll.order and roll.order.buyer_id != payload.buyer_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Roll {roll.roll_number} belongs to Order {roll.order.order_number} for another buyer."
                )

        # Step 3: Dye-lot guard
        distinct_lots = list({r.dye_lot for r in rolls})
        if len(distinct_lots) > 1 and not payload.override_dye_lot_warning:
            lot_summary = ", ".join(distinct_lots)
            raise HTTPException(
                status_code=400,
                detail=f"DYE-LOT CLASH WARNING: Selected rolls belong to {len(distinct_lots)} different dye lots ({lot_summary}). "
                       f"Mixing dye lots may cause visible fabric shading. Please select rolls of the same dye lot, "
                       f"or provide an explicit confirmation and override reason."
            )

        # Step 4: Generate unique dispatch number: DSP-YYYYMMDD-XXX
        date_str = datetime.utcnow().strftime("%Y%m%d")
        count_today = db.query(Dispatch).filter(Dispatch.dispatch_number.like(f"DSP-{date_str}-%")).count() + 1
        dispatch_number = f"DSP-{date_str}-{count_today:03d}"

        new_dispatch = Dispatch(
            dispatch_number=dispatch_number,
            buyer_id=payload.buyer_id,
            vehicle_no=payload.vehicle_no,
            notes=payload.notes,
            dispatched_at=datetime.utcnow(),
            created_by=payload.created_by
        )
        db.add(new_dispatch)
        db.flush()

        # Step 5: Mark rolls dispatched
        subtotal = 0.0
        total_metres = 0.0
        for roll in rolls:
            roll.dispatched = True
            roll.dispatch_id = new_dispatch.id
            price = roll.order.price_per_m if roll.order else 100.0
            subtotal += (roll.length_m * price)
            total_metres += roll.length_m

            # Update order pipeline status if all rolls ready/dispatched
            order = roll.order
            if order:
                remaining_undispatched = db.query(Roll).filter(
                    Roll.order_id == order.id,
                    Roll.dispatched == False
                ).count()
                if remaining_undispatched == 0:
                    order.status = "Dispatched"

        # Step 6: Create matching Invoice
        tax_setting = db.query(Setting).filter(Setting.key == "tax_rate_pct").first()
        tax_pct = float(tax_setting.value) if tax_setting else 5.0
        tax = round((subtotal * tax_pct) / 100.0, 2)
        total = round(subtotal + tax, 2)

        inv_count_today = db.query(Invoice).filter(Invoice.invoice_no.like(f"INV-{date_str}-%")).count() + 1
        invoice_no = f"INV-{date_str}-{inv_count_today:03d}"

        invoice = Invoice(
            dispatch_id=new_dispatch.id,
            buyer_id=payload.buyer_id,
            invoice_no=invoice_no,
            subtotal=round(subtotal, 2),
            tax=tax,
            total=total,
            status="unpaid",
            issued_at=datetime.utcnow()
        )
        db.add(invoice)

        # Step 7: Write to AuditLog
        override_note = f" (Dye-lot clash overridden: '{payload.override_reason}')" if (len(distinct_lots) > 1 and payload.override_dye_lot_warning) else ""
        audit = AuditLog(
            user=payload.created_by,
            action="DISPATCH",
            entity="Dispatch",
            entity_id=new_dispatch.id,
            before_state=None,
            after_state=f"Dispatched {len(rolls)} rolls ({total_metres:.1f}m) to {buyer.name} on {payload.vehicle_no}. Generated Invoice {invoice_no} (₹{total:,.2f}){override_note}"
        )
        db.add(audit)

    db.commit()
    db.refresh(new_dispatch)

    return DispatchResponse(
        id=new_dispatch.id,
        dispatch_number=new_dispatch.dispatch_number,
        buyer_id=new_dispatch.buyer_id,
        buyer_name=buyer.name,
        vehicle_no=new_dispatch.vehicle_no,
        notes=new_dispatch.notes,
        dispatched_at=new_dispatch.dispatched_at,
        created_by=new_dispatch.created_by,
        roll_count=len(rolls),
        total_metres=round(total_metres, 1),
        invoice_no=invoice_no,
        invoice_total=total
    )
