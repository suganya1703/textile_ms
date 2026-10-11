from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date

from backend.app.core.database import get_db
from backend.app.models.quality import Roll
from backend.app.models.master import Machine, Setting
from backend.app.models.yarn_order import Order, ProductionJob
from backend.app.models.dispatch_finance import Invoice, Payment
from backend.app.models.workforce import Wage

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_owner_dashboard(db: Session = Depends(get_db)):
    # 1. Metres produced
    all_rolls = db.query(Roll).all()
    total_metres_produced = sum(r.length_m for r in all_rolls)
    passed_metres = sum(r.length_m for r in all_rolls if r.qc_status == 'pass')

    # 2. Machine utilization & status agreement
    machines = db.query(Machine).order_by(Machine.id.asc()).all()
    running_machines = 0
    machine_outputs = []

    for m in machines:
        active_job = db.query(ProductionJob).filter(
            ProductionJob.machine_id == m.id,
            ProductionJob.completed_at == None
        ).first()
        effective_status = "breakdown" if m.status == "breakdown" else ("running" if active_job else "idle")
        if effective_status == "running":
            running_machines += 1

        rolls_for_machine = [r for r in all_rolls if r.machine_id == m.id]
        total_m = sum(r.length_m for r in rolls_for_machine)
        machine_outputs.append({
            "machine_id": m.id,
            "machine_name": m.name,
            "stage": m.stage,
            "status": effective_status,
            "total_output_m": round(total_m, 1)
        })

    machine_utilization_pct = round((running_machines / len(machines) * 100), 1) if machines else 0.0

    # 3. Financials & Invoices
    invoices = db.query(Invoice).all()
    total_invoiced = sum(i.total for i in invoices)
    
    payments = db.query(Payment).all()
    total_payments_received = sum(p.amount for p in payments)
    outstanding_receivables = max(0.0, total_invoiced - total_payments_received)

    # 4. Wages Breakdown & Reconciliation
    wages = db.query(Wage).all()
    order_direct_labour = sum(w.amount for w in wages if w.wage_type == "job")
    idle_labour_cost = sum(w.amount for w in wages if w.wage_type == "idle")
    general_labour_cost = sum(w.amount for w in wages if w.wage_type == "general")
    total_wages_paid = sum(w.amount for w in wages)

    # Reconciliation invariant:
    # sum of order labour + idle/general labour = total wages
    reconciled_sum = order_direct_labour + idle_labour_cost + general_labour_cost
    is_reconciled = abs(reconciled_sum - total_wages_paid) < 0.01

    # 5. Rough Monthly P&L
    # Revenue = total invoiced
    # Expenses = Yarn (approx 45% of invoiced), Labour (total wages), Overhead (approx ₹35,000)
    estimated_yarn_expense = total_invoiced * 0.45
    estimated_overhead_expense = 35000.0
    total_operational_expense = round(estimated_yarn_expense + total_wages_paid + estimated_overhead_expense, 2)
    net_operating_profit = round(total_invoiced - total_operational_expense, 2)

    # 6. Loss-making order margin alerts
    orders = db.query(Order).all()
    margin_alerts = []
    for o in orders:
        passed_m = sum(r.length_m for r in o.rolls if r.qc_status == 'pass')
        order_wage = sum(w.amount for w in wages if w.order_id == o.id)
        est_yarn = o.yarn_required_kg * 240.0
        est_overhead = (passed_m / 25.0) * 60.0
        order_cost = est_yarn + order_wage + est_overhead
        revenue = o.quantity_m * o.price_per_m
        if order_cost > revenue:
            margin_alerts.append({
                "order_number": o.order_number,
                "buyer": o.buyer.name if o.buyer else "Unknown",
                "cost": round(order_cost, 2),
                "revenue": round(revenue, 2),
                "loss_amount": round(order_cost - revenue, 2)
            })

    return {
        "kpis": {
            "total_metres_produced": round(total_metres_produced, 1),
            "passed_metres": round(passed_metres, 1),
            "running_machines": running_machines,
            "total_machines": len(machines),
            "machine_utilization_pct": machine_utilization_pct,
            "total_invoiced_revenue": round(total_invoiced, 2),
            "payments_received": round(total_payments_received, 2),
            "outstanding_receivables": round(outstanding_receivables, 2)
        },
        "pl_statement": {
            "gross_revenue": round(total_invoiced, 2),
            "yarn_expense": round(estimated_yarn_expense, 2),
            "direct_labour_wages": round(order_direct_labour, 2),
            "idle_labour_cost": round(idle_labour_cost, 2),
            "general_labour_wages": round(general_labour_cost, 2),
            "total_wages": round(total_wages_paid, 2),
            "factory_overhead": round(estimated_overhead_expense, 2),
            "total_expenses": total_operational_expense,
            "net_profit": net_operating_profit
        },
        "labour_reconciliation": {
            "order_direct_labour": round(order_direct_labour, 2),
            "idle_labour_cost": round(idle_labour_cost, 2),
            "general_labour_cost": round(general_labour_cost, 2),
            "total_wages_for_period": round(total_wages_paid, 2),
            "is_verified": is_reconciled
        },
        "margin_alerts": margin_alerts,
        "machine_outputs": machine_outputs
    }
