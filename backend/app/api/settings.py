from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Dict, Any, List

from backend.app.core.database import get_db
from backend.app.models.master import Setting, Machine
from backend.app.models.system import AuditLog
from backend.app.models.quality import Roll
from backend.app.models.yarn_order import Order, YarnBatch
from backend.app.services.odoo_export import (
    export_odoo_products_csv,
    export_odoo_lots_csv,
    export_odoo_stock_csv,
    export_odoo_invoices_csv
)

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("")
def get_all_settings(db: Session = Depends(get_db)):
    settings = db.query(Setting).all()
    return {s.key: {"value": s.value, "description": s.description} for s in settings}

@router.put("")
def update_settings(payload: Dict[str, str], db: Session = Depends(get_db)):
    for key, val in payload.items():
        s = db.query(Setting).filter(Setting.key == key).first()
        if s:
            old_val = s.value
            s.value = str(val)
            s.updated_at = datetime.utcnow()
            db.add(AuditLog(
                user="Admin",
                action="UPDATE_SETTING",
                entity="Setting",
                entity_id=None,
                before_state=f"{key}: {old_val}",
                after_state=f"{key}: {val}"
            ))
        else:
            db.add(Setting(key=key, value=str(val)))

    db.commit()
    return {"status": "success", "message": "Settings updated successfully."}

@router.get("/audit-trail")
def get_audit_trail(entity: str = None, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(AuditLog)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    logs = query.order_by(AuditLog.id.desc()).limit(limit).all()
    
    return [
        {
            "id": l.id,
            "user": l.user,
            "action": l.action,
            "entity": l.entity,
            "entity_id": l.entity_id,
            "before_state": l.before_state,
            "after_state": l.after_state,
            "timestamp": l.timestamp.isoformat()
        }
        for l in logs
    ]

@router.get("/shift-handover-report")
def get_shift_handover_report(db: Session = Depends(get_db)):
    """
    1-click printable summary of shift:
    - Metres produced today
    - Active machine breakdowns
    - Pending QC rolls
    - Low stock yarns
    - Delayed orders
    """
    # 1. Output summary
    rolls_today = db.query(Roll).all()
    total_m_today = sum(r.length_m for r in rolls_today)
    
    # 2. Breakdowns
    breakdown_machines = db.query(Machine).filter(Machine.status == "breakdown").all()
    
    # 3. Pending QC
    pending_qc = db.query(Roll).filter(Roll.qc_status == "pending").all()
    
    # 4. Low stock yarn
    threshold_setting = db.query(Setting).filter(Setting.key == "low_stock_threshold_kg").first()
    threshold = float(threshold_setting.value) if threshold_setting else 100.0
    low_stock = db.query(YarnBatch).filter(YarnBatch.kg_remaining < threshold).all()

    # 5. Delayed orders
    orders_overdue = db.query(Order).filter(Order.status != "Dispatched", Order.deadline <= date.today()).all()

    company_name = db.query(Setting).filter(Setting.key == "company_name").first()

    return {
        "report_title": "Shift Handover & Operations Summary",
        "company_name": company_name.value if company_name else "Everest Textile Mills",
        "generated_at": datetime.utcnow().strftime("%d %b %Y, %I:%M %p"),
        "total_metres_produced": round(total_m_today, 1),
        "total_rolls_produced": len(rolls_today),
        "breakdown_machines": [
            {"id": m.id, "name": m.name, "stage": m.stage, "status_since": m.status_updated_at.strftime("%I:%M %p") if m.status_updated_at else ""}
            for m in breakdown_machines
        ],
        "pending_qc_count": len(pending_qc),
        "pending_qc_rolls": [
            {"roll_number": r.roll_number, "length_m": r.length_m, "dye_lot": r.dye_lot}
            for r in pending_qc[:5]
        ],
        "low_stock_yarns": [
            {"batch_code": y.batch_code, "yarn_type": y.yarn_type, "colour": y.colour, "remaining_kg": y.kg_remaining}
            for y in low_stock
        ],
        "delayed_orders": [
            {"order_number": o.order_number, "buyer": o.buyer.name if o.buyer else "", "deadline": o.deadline.strftime("%d %b %Y")}
            for o in orders_overdue
        ]
    }

@router.get("/odoo-export/{export_type}")
def get_odoo_export(export_type: str, db: Session = Depends(get_db)):
    if export_type == "products":
        csv_content = export_odoo_products_csv(db)
        filename = "loomdo_odoo_products.csv"
    elif export_type == "lots":
        csv_content = export_odoo_lots_csv(db)
        filename = "loomdo_odoo_lots.csv"
    elif export_type == "stock":
        csv_content = export_odoo_stock_csv(db)
        filename = "loomdo_odoo_stock.csv"
    elif export_type == "invoices":
        csv_content = export_odoo_invoices_csv(db)
        filename = "loomdo_odoo_invoices.csv"
    else:
        raise HTTPException(status_code=400, detail="Invalid export type. Must be products, lots, stock, or invoices.")

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
