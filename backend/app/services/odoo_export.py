import csv
import io
from sqlalchemy.orm import Session
from backend.app.core.odoo_config import ODOO_HEADERS
from backend.app.models.quality import Roll
from backend.app.models.yarn_order import YarnBatch, Order
from backend.app.models.dispatch_finance import Invoice

def export_odoo_products_csv(db: Session) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(ODOO_HEADERS["products"])

    # Unique fabric types from Orders and YarnBatches
    orders = db.query(Order).all()
    seen_products = set()

    for order in orders:
        key = f"{order.fabric_type} ({order.colour})"
        if key not in seen_products:
            seen_products.add(key)
            writer.writerow([
                f"prod_{order.id}",
                key,
                "product",
                "Fabrics",
                f"{order.price_per_m:.2f}",
                f"{order.price_per_m * 0.7:.2f}",  # standard estimated cost
                "Meters"
            ])

    return output.getvalue()

def export_odoo_lots_csv(db: Session) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(ODOO_HEADERS["lots"])

    rolls = db.query(Roll).all()
    for roll in rolls:
        product_name = f"{roll.order.fabric_type} ({roll.order.colour})" if roll.order else "Textile Roll"
        writer.writerow([
            roll.roll_number,
            product_name,
            roll.dye_lot,
            "Everest Textile Mills"
        ])

    return output.getvalue()

def export_odoo_stock_csv(db: Session) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(ODOO_HEADERS["stock"])

    # Finished Stock = Rolls WHERE qc_status='pass' AND dispatched=false
    rolls = db.query(Roll).filter(Roll.qc_status == 'pass', Roll.dispatched == False).all()
    for roll in rolls:
        product_name = f"{roll.order.fabric_type} ({roll.order.colour})" if roll.order else "Textile Roll"
        writer.writerow([
            product_name,
            "WH/Stock/FinishedGoods",
            roll.length_m,
            roll.roll_number
        ])

    return output.getvalue()

def export_odoo_invoices_csv(db: Session) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(ODOO_HEADERS["invoices"])

    invoices = db.query(Invoice).all()
    for inv in invoices:
        buyer_name = inv.buyer.name if inv.buyer else "Unknown Buyer"
        inv_date = inv.issued_at.strftime("%Y-%m-%d") if inv.issued_at else ""
        
        # Line item summary
        dispatched_rolls = inv.dispatch.rolls if inv.dispatch else []
        total_m = sum(r.length_m for r in dispatched_rolls)
        avg_rate = (inv.subtotal / total_m) if total_m > 0 else 0.0

        writer.writerow([
            inv.invoice_no,
            buyer_name,
            inv_date,
            f"Finished Fabric Rolls ({len(dispatched_rolls)} rolls)",
            f"{total_m:.1f}",
            f"{avg_rate:.2f}"
        ])

    return output.getvalue()
