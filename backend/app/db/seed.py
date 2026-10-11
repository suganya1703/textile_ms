"""
Realistic Seed Data Script for Loomdo
Client: Everest Textile Mills
Event: Odoo x NMIT Bangalore Hackathon 2026

Planted Story points:
1. Loom W-03 has 3x average defect points (worn shuttle snarls).
2. Yarn Batch YB-2026-0412 has high scrap wastage (14.5% vs 5% standard).
3. Order ORD-2026-003 flagged RED by delay-risk engine (needs 48 m/day, running at 19 m/day -> suggests idle Loom W-05).
4. Machine Loom W-04 in breakdown state.
5. Cotton 30s Dyed Black is below low-stock threshold (42 kg remaining vs 100 kg threshold).
6. Order ORD-2026-006 has rolls from clashing dye lots (LOT-101 and LOT-102).
7. Thursday night shift had heavy overtime.
8. Order ORD-2026-008 is loss-making (red margin alert).
"""

from datetime import datetime, date, timedelta
import random
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models.master import Supplier, Buyer, Machine, Worker, Setting
from backend.app.models.yarn_order import YarnBatch, Order, ProductionJob, YarnConsumption, YarnDamageRecord, SupplierClaim
from backend.app.models.quality import Roll, Defect
from backend.app.models.dispatch_finance import Dispatch, Invoice, Payment, Expense
from backend.app.models.workforce import Attendance, JobAssignment, Wage
from backend.app.models.system import AuditLog
from backend.app.services.grading import calculate_defect_points, evaluate_roll_grade
from backend.app.services.wages import generate_shift_wages

def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    print("Seeding Everest Textile Mills data...")

    # 1. Settings
    settings_data = [
        ("company_name", "Everest Textile Mills", "Active mill tenant name"),
        ("low_stock_threshold_kg", "100.0", "Yarn stock threshold triggering low-stock warning"),
        ("overhead_rate_per_hour", "250.0", "Factory machine overhead allocation per hour (₹)"),
        ("four_point_grade_a_max", "20.0", "Max defect points per 100 sq yd for Grade A pass (ASTM D5430)"),
        ("four_point_grade_b_max", "40.0", "Max defect points per 100 sq yd for Grade B concession (ASTM D5430)"),
        ("expected_yield_ratio", "0.95", "Expected fabric yield ratio from yarn (0.95 = 5% normal process loss)"),
        ("tax_rate_pct", "5.0", "Applicable GST tax rate percentage on fabric dispatches"),
        ("four_point_standard_source", "ASTM D5430 - 4-Point System (American Society for Testing and Materials)", "Standard reference"),
        ("auto_suggest_reassignment", "true", "Automatically suggest candidate idle machines on breakdown")
    ]
    for k, v, d in settings_data:
        db.add(Setting(key=k, value=v, description=d))
    db.commit()

    # 2. Suppliers (6)
    suppliers = [
        Supplier(name="Coimbatore Yarn Traders", contact="K. Ramaswamy", phone="+91 94431 22891", city="Coimbatore"),
        Supplier(name="Malabar Spinners Ltd", contact="Amit Sharma", phone="+91 98140 55412", city="Ludhiana"),
        Supplier(name="Deccan Cotton Mills", contact="Mehul Patel", phone="+91 98250 88914", city="Ahmedabad"),
        Supplier(name="Sutlej Spun Mills", contact="Sanjay Verma", phone="+91 97790 33418", city="Barnala"),
        Supplier(name="Salem Tex Spinners", contact="P. Shanmugam", phone="+91 94422 77123", city="Salem"),
        Supplier(name="Erode Cotton Hub", contact="V. Murugesan", phone="+91 94433 99281", city="Erode")
    ]
    db.add_all(suppliers)
    db.commit()

    # 3. Buyers (8)
    buyers = [
        Buyer(name="Meridian Apparel", contact="Rajiv Mehra", phone="+91 98110 44521", city="New Delhi", credit_limit=800000.0),
        Buyer(name="Kaveri Fashions", contact="Vikram Singhania", phone="+91 98200 66329", city="Mumbai", credit_limit=1500000.0),
        Buyer(name="Southern Weave Exports", contact="Deepak Nair", phone="+91 98450 11982", city="Bengaluru", credit_limit=1200000.0),
        Buyer(name="Chola Textiles Export", contact="Anand Ahuja", phone="+91 98100 77234", city="Faridabad", credit_limit=2000000.0),
        Buyer(name="Nilgiri Lifestyle Brands", contact="Siddharth Mehta", phone="+91 98240 33891", city="Ahmedabad", credit_limit=900000.0),
        Buyer(name="Tirupur Knits & Weaves", contact="M. Prakash", phone="+91 94430 88219", city="Tirupur", credit_limit=600000.0),
        Buyer(name="Kongu Apparel Hub", contact="S. Natarajan", phone="+91 94431 55672", city="Coimbatore", credit_limit=750000.0),
        Buyer(name="Local Garment Hub", contact="G. Senthil", phone="+91 94421 33481", city="Salem", credit_limit=350000.0)
    ]
    db.add_all(buyers)
    db.commit()

    # 4. Machines (12)
    # Story: Loom W-04 is in breakdown!
    # Story: Loom W-03 is running but will produce 3x defects!
    machines = [
        # Spinning Shed
        Machine(name="SP-01 (Ring Frame A)", stage="spinning", status="running", capacity_m_per_hour=35.0, floor_x=60, floor_y=80),
        Machine(name="SP-02 (Ring Frame B)", stage="spinning", status="running", capacity_m_per_hour=35.0, floor_x=60, floor_y=180),
        Machine(name="SP-03 (Open End Rotor)", stage="spinning", status="idle", capacity_m_per_hour=45.0, floor_x=60, floor_y=280),
        # Weaving Shed
        Machine(name="Loom W-01 (Airjet)", stage="weaving", status="running", capacity_m_per_hour=28.0, floor_x=370, floor_y=80),
        Machine(name="Loom W-02 (Rapier Fast)", stage="weaving", status="running", capacity_m_per_hour=22.0, floor_x=370, floor_y=180),
        Machine(name="Loom W-03 (Rapier Snarl)", stage="weaving", status="running", capacity_m_per_hour=20.0, floor_x=370, floor_y=280), # High Defect Anomaly
        Machine(name="Loom W-04 (Airjet Broken)", stage="weaving", status="breakdown", capacity_m_per_hour=26.0, floor_x=530, floor_y=80), # Breakdown Anomaly
        Machine(name="Loom W-05 (Projectile)", stage="weaving", status="idle", capacity_m_per_hour=24.0, floor_x=530, floor_y=180), # Idle loom for suggestion
        # Dye House
        Machine(name="Dye Vat D-01 (Soft Flow)", stage="dyeing", status="running", capacity_m_per_hour=50.0, floor_x=810, floor_y=80),
        Machine(name="Dye Vat D-02 (Jigger Vat)", stage="dyeing", status="running", capacity_m_per_hour=40.0, floor_x=810, floor_y=180),
        Machine(name="Dye Vat D-03 (Winch Dyer)", stage="dyeing", status="idle", capacity_m_per_hour=35.0, floor_x=810, floor_y=280),
        Machine(name="Perch Table P-01 (Inspection)", stage="dyeing", status="running", capacity_m_per_hour=60.0, floor_x=930, floor_y=180)
    ]
    db.add_all(machines)
    db.commit()

    # 5. Workers (18)
    workers = [
        Worker(name="Rajesh Kumar", role="Weaver", skill_level="skilled", hourly_rate=120.0, overtime_multiplier=1.5, default_shift="morning"),
        Worker(name="M. Selvam", role="Weaver", skill_level="master", hourly_rate=140.0, overtime_multiplier=1.5, default_shift="morning"),
        Worker(name="P. Ramesh", role="Weaver", skill_level="semi_skilled", hourly_rate=100.0, overtime_multiplier=1.5, default_shift="evening"),
        Worker(name="K. Vijay", role="Weaver", skill_level="skilled", hourly_rate=120.0, overtime_multiplier=1.5, default_shift="evening"),
        Worker(name="S. Karthik", role="Weaver", skill_level="trainee", hourly_rate=80.0, overtime_multiplier=1.5, default_shift="night"),
        Worker(name="A. Velu", role="Spinner", skill_level="skilled", hourly_rate=110.0, overtime_multiplier=1.5, default_shift="morning"),
        Worker(name="G. Mani", role="Spinner", skill_level="semi_skilled", hourly_rate=95.0, overtime_multiplier=1.5, default_shift="evening"),
        Worker(name="R. Palani", role="Spinner", skill_level="skilled", hourly_rate=110.0, overtime_multiplier=1.5, default_shift="night"),
        Worker(name="N. Senthil", role="Dyer", skill_level="master", hourly_rate=145.0, overtime_multiplier=1.5, default_shift="morning"),
        Worker(name="T. Kumar", role="Dyer", skill_level="skilled", hourly_rate=125.0, overtime_multiplier=1.5, default_shift="evening"),
        Worker(name="M. Chinnasamy", role="Dyer", skill_level="semi_skilled", hourly_rate=100.0, overtime_multiplier=1.5, default_shift="night"),
        Worker(name="Anitha Parthiban", role="QC Inspector", skill_level="master", hourly_rate=150.0, overtime_multiplier=1.5, default_shift="morning"),
        Worker(name="K. Meena", role="QC Inspector", skill_level="skilled", hourly_rate=130.0, overtime_multiplier=1.5, default_shift="evening"),
        Worker(name="S. Priya", role="QC Inspector", skill_level="semi_skilled", hourly_rate=105.0, overtime_multiplier=1.5, default_shift="night"),
        Worker(name="Venkatesh K.", role="Supervisor", skill_level="master", hourly_rate=180.0, overtime_multiplier=1.5, default_shift="morning"),
        Worker(name="B. Saravanan", role="Supervisor", skill_level="master", hourly_rate=180.0, overtime_multiplier=1.5, default_shift="evening"),
        Worker(name="D. Arumugam", role="Maintenance", skill_level="master", hourly_rate=160.0, overtime_multiplier=1.5, default_shift="morning"),
        Worker(name="K. Murugesan", role="Store Incharge", skill_level="skilled", hourly_rate=125.0, overtime_multiplier=1.5, default_shift="morning")
    ]
    db.add_all(workers)
    db.commit()

    # 6. Yarn Batches (including Planted Stories 2 & 5)
    # Story 5: Cotton 30s Dyed Black has only 42kg remaining (< 100kg threshold)!
    # Story 2: YB-2026-0412 has high wastage!
    yarn_batches = [
        YarnBatch(batch_code="YB-2026-0410", supplier_id=1, yarn_type="Cotton 40s Combed", colour="Raw White", kg_received=800.0, kg_remaining=420.0, cost_per_kg=255.0, received_by="K. Murugesan"),
        YarnBatch(batch_code="YB-2026-0411", supplier_id=2, yarn_type="Cotton 30s Carded", colour="Navy Blue", kg_received=600.0, kg_remaining=310.0, cost_per_kg=225.0, received_by="K. Murugesan"),
        YarnBatch(batch_code="YB-2026-0412", supplier_id=5, yarn_type="Cotton 30s Carded", colour="Navy Blue", kg_received=500.0, kg_remaining=120.0, cost_per_kg=210.0, received_by="K. Murugesan"), # High Wastage Story
        YarnBatch(batch_code="YB-2026-0413", supplier_id=3, yarn_type="Poly-Cotton 65/35", colour="Crimson Red", kg_received=450.0, kg_remaining=240.0, cost_per_kg=195.0, received_by="K. Murugesan"),
        YarnBatch(batch_code="YB-2026-0414", supplier_id=4, yarn_type="Polyester Filament", colour="Olive Green", kg_received=400.0, kg_remaining=210.0, cost_per_kg=165.0, received_by="K. Murugesan"),
        YarnBatch(batch_code="YB-2026-0415", supplier_id=6, yarn_type="Cotton 30s Carded", colour="Jet Black", kg_received=300.0, kg_remaining=42.0, cost_per_kg=230.0, received_by="K. Murugesan"), # Low Stock Story (< 100kg)
        YarnBatch(batch_code="YB-2026-0416", supplier_id=1, yarn_type="Cotton 40s Combed", colour="Charcoal Grey", kg_received=550.0, kg_remaining=360.0, cost_per_kg=260.0, received_by="K. Murugesan"),
        YarnBatch(batch_code="YB-2026-0417", supplier_id=2, yarn_type="Cotton 40s Combed", colour="Navy Blue", kg_received=700.0, kg_remaining=550.0, cost_per_kg=258.0, received_by="K. Murugesan"),
    ]
    db.add_all(yarn_batches)
    db.commit()

    # 7. Orders across the pipeline (including Stories 3, 6, 8)
    today = date.today()
    orders = [
        # ORD-1: Dispatched
        Order(order_number="ORD-2026-001", buyer_id=1, fabric_type="Cotton Twill 2/1", colour="Raw White", quantity_m=1200.0, deadline=today - timedelta(days=2), price_per_m=115.0, status="Dispatched", yarn_required_kg=264.0, expected_delivery=today - timedelta(days=2)),
        # ORD-2: Ready for Dispatch
        Order(order_number="ORD-2026-002", buyer_id=2, fabric_type="Poplin 40s", colour="Navy Blue", quantity_m=900.0, deadline=today + timedelta(days=4), price_per_m=135.0, status="Ready", yarn_required_kg=198.0, expected_delivery=today + timedelta(days=2)),
        # ORD-3: Story 3: LATE ORDER / DELAY RISK (needs 48m/day, currently running at 19m/day -> Red delay risk)
        Order(order_number="ORD-2026-003", buyer_id=1, fabric_type="Oxford Weave 30s", colour="Crimson Red", quantity_m=1000.0, deadline=today + timedelta(days=3), price_per_m=128.0, status="Weaving", yarn_required_kg=220.0, expected_delivery=today + timedelta(days=7)),
        # ORD-4: In Dyeing
        Order(order_number="ORD-2026-004", buyer_id=3, fabric_type="Sheeting Poly-Cotton", colour="Olive Green", quantity_m=800.0, deadline=today + timedelta(days=8), price_per_m=105.0, status="Dyeing", yarn_required_kg=176.0, expected_delivery=today + timedelta(days=7)),
        # ORD-5: In QC Perch
        Order(order_number="ORD-2026-005", buyer_id=4, fabric_type="Drill Heavy Weave", colour="Charcoal Grey", quantity_m=1100.0, deadline=today + timedelta(days=5), price_per_m=145.0, status="QC", yarn_required_kg=242.0, expected_delivery=today + timedelta(days=4)),
        # ORD-6: Story 6: DYE-LOT CLASH ORDER (Order has rolls in Lot L-101 and Lot L-102)
        Order(order_number="ORD-2026-006", buyer_id=2, fabric_type="Poplin 40s Premium", colour="Navy Blue", quantity_m=750.0, deadline=today + timedelta(days=6), price_per_m=140.0, status="Ready", yarn_required_kg=165.0, expected_delivery=today + timedelta(days=4)),
        # ORD-7: Yarn reserved
        Order(order_number="ORD-2026-007", buyer_id=5, fabric_type="Cambric 60s", colour="Raw White", quantity_m=650.0, deadline=today + timedelta(days=12), price_per_m=155.0, status="Yarn reserved", yarn_required_kg=143.0, expected_delivery=today + timedelta(days=10)),
        # ORD-8: Story 8: LOSS-MAKING ORDER (Sold at low price ₹85/m while yarn+labour costs ₹98/m)
        Order(order_number="ORD-2026-008", buyer_id=8, fabric_type="Coarse Sheeting 20s", colour="Raw White", quantity_m=1500.0, deadline=today + timedelta(days=10), price_per_m=82.0, status="Weaving", yarn_required_kg=375.0, expected_delivery=today + timedelta(days=9)),
    ]
    db.add_all(orders)
    db.commit()

    # 8. Production Jobs
    jobs = [
        # Job on W-01 for ORD-003
        ProductionJob(order_id=3, machine_id=4, stage="weaving", progress_pct=42.0, output_today_m=19.0, shift="morning", operator_id=1, started_at=datetime.utcnow() - timedelta(days=2), status="active"),
        # Job on W-02 for ORD-008 (Loss-making order)
        ProductionJob(order_id=8, machine_id=5, stage="weaving", progress_pct=35.0, output_today_m=28.0, shift="morning", operator_id=2, started_at=datetime.utcnow() - timedelta(days=3), status="active"),
        # Job on W-03 (High Defect Loom) for ORD-005
        ProductionJob(order_id=5, machine_id=6, stage="weaving", progress_pct=68.0, output_today_m=22.0, shift="morning", operator_id=3, started_at=datetime.utcnow() - timedelta(days=3), status="active"),
        # Job on D-01 for ORD-004
        ProductionJob(order_id=4, machine_id=9, stage="dyeing", progress_pct=55.0, output_today_m=48.0, shift="morning", operator_id=9, started_at=datetime.utcnow() - timedelta(days=1), status="active"),
        # Completed Job on W-01 for ORD-001
        ProductionJob(order_id=1, machine_id=4, stage="weaving", progress_pct=100.0, output_today_m=120.0, shift="morning", operator_id=1, started_at=datetime.utcnow() - timedelta(days=6), completed_at=datetime.utcnow() - timedelta(days=3), status="completed"),
        # Completed Job on W-02 for ORD-002
        ProductionJob(order_id=2, machine_id=5, stage="weaving", progress_pct=100.0, output_today_m=100.0, shift="morning", operator_id=2, started_at=datetime.utcnow() - timedelta(days=5), completed_at=datetime.utcnow() - timedelta(days=2), status="completed"),
        # Completed Job on W-01 for ORD-006 (Dye-lot clash order)
        ProductionJob(order_id=6, machine_id=4, stage="weaving", progress_pct=100.0, output_today_m=95.0, shift="morning", operator_id=1, started_at=datetime.utcnow() - timedelta(days=4), completed_at=datetime.utcnow() - timedelta(days=1), status="completed"),
    ]
    db.add_all(jobs)
    db.commit()

    # 9. Yarn Consumptions (including High Wastage batch YB-2026-0412)
    consumptions = [
        YarnConsumption(yarn_batch_id=1, production_job_id=5, order_id=1, kg_issued=275.0, kg_returned=9.0),
        YarnConsumption(yarn_batch_id=2, production_job_id=6, order_id=2, kg_issued=210.0, kg_returned=8.0),
        # Story 2: Batch YB-2026-0412 issued 180kg, returned 0kg, high wastage!
        YarnConsumption(yarn_batch_id=3, production_job_id=7, order_id=6, kg_issued=180.0, kg_returned=0.0),
        YarnConsumption(yarn_batch_id=4, production_job_id=1, order_id=3, kg_issued=110.0, kg_returned=2.0),
        YarnConsumption(yarn_batch_id=6, production_job_id=3, order_id=5, kg_issued=170.0, kg_returned=5.0),
    ]
    db.add_all(consumptions)
    db.commit()

    # 10. Rolls & Defect Logs (65+ rolls across all orders and states)
    # Story 1: Loom W-03 (id=6) rolls have high defect points!
    # Story 6: ORD-006 has rolls in LOT-101 and LOT-102!
    rolls = []
    defects = []
    roll_idx = 1

    # ORD-001 (Dispatched Rolls - 12 rolls)
    for i in range(12):
        roll_num = f"ROLL-20261001-{roll_idx:04d}"
        r = Roll(
            roll_number=roll_num,
            order_id=1,
            machine_id=4, # W-01
            yarn_batch_id=1,
            production_job_id=5,
            dye_lot="LOT-091",
            shade_value="RAW-01",
            length_m=100.0,
            width_in=58.0,
            shift="morning",
            operator_id=1,
            qc_status="pass",
            grade="A",
            defect_points=random.randint(2, 6),
            inspected_area_sq_yd=176.08,
            dispatched=True,
            dispatch_id=None # will attach to Dispatch 1
        )
        rolls.append(r)
        roll_idx += 1

    # ORD-002 (Ready Rolls on the Shelf - 9 rolls)
    for i in range(9):
        roll_num = f"ROLL-20261002-{roll_idx:04d}"
        pts = random.randint(3, 8)
        r = Roll(
            roll_number=roll_num,
            order_id=2,
            machine_id=5, # W-02
            yarn_batch_id=2,
            production_job_id=6,
            dye_lot="LOT-095",
            shade_value="NAVY-02",
            length_m=100.0,
            width_in=58.0,
            shift="morning" if i % 2 == 0 else "evening",
            operator_id=2,
            qc_status="pass",
            grade="A",
            defect_points=pts,
            inspected_area_sq_yd=176.08,
            dispatched=False
        )
        rolls.append(r)
        roll_idx += 1

    # ORD-006 (Story 6: Clashing Dye Lots! 5 rolls in LOT-101, 3 rolls in LOT-102)
    for i in range(8):
        roll_num = f"ROLL-20261006-{roll_idx:04d}"
        lot = "LOT-101" if i < 5 else "LOT-102"
        shade = "NAVY-101" if i < 5 else "NAVY-102" # Visible shade variation!
        r = Roll(
            roll_number=roll_num,
            order_id=6,
            machine_id=4,
            yarn_batch_id=3, # Batch with colour mismatch
            production_job_id=7,
            dye_lot=lot,
            shade_value=shade,
            length_m=95.0,
            width_in=58.0,
            shift="morning",
            operator_id=1,
            qc_status="pass",
            grade="A" if i < 6 else "B",
            defect_points=random.randint(4, 14),
            inspected_area_sq_yd=167.28,
            dispatched=False
        )
        rolls.append(r)
        roll_idx += 1

    # ORD-005 (W-03 Rolls - Story 1: High Defect Loom Anomaly! 10 rolls)
    for i in range(10):
        roll_num = f"ROLL-20261005-{roll_idx:04d}"
        # W-03 produces lots of defect points!
        pts = random.randint(28, 48)
        grade = "B" if pts <= 36 else "reject"
        qc = "rework" if pts <= 36 else "reject"
        if i == 0:
            qc = "pending" # One pending inspection on perch table!
        r = Roll(
            roll_number=roll_num,
            order_id=5,
            machine_id=6, # Loom W-03
            yarn_batch_id=6,
            production_job_id=3,
            dye_lot="LOT-099",
            shade_value="GREY-04",
            length_m=110.0,
            width_in=58.0,
            shift="night" if i % 2 == 1 else "evening",
            operator_id=3,
            qc_status=qc,
            grade=grade if qc != "pending" else None,
            defect_points=pts if qc != "pending" else 0,
            inspected_area_sq_yd=193.69,
            dispatched=False
        )
        rolls.append(r)
        roll_idx += 1

    # ORD-003 (In Progress Rolls - 6 rolls)
    for i in range(6):
        roll_num = f"ROLL-20261003-{roll_idx:04d}"
        r = Roll(
            roll_number=roll_num,
            order_id=3,
            machine_id=4,
            yarn_batch_id=4,
            production_job_id=1,
            dye_lot="LOT-104",
            shade_value="RED-03",
            length_m=100.0,
            width_in=58.0,
            shift="morning",
            operator_id=1,
            qc_status="pass" if i < 4 else "pending",
            grade="A" if i < 4 else None,
            defect_points=4 if i < 4 else 0,
            inspected_area_sq_yd=176.08,
            dispatched=False
        )
        rolls.append(r)
        roll_idx += 1

    # More finished rolls across orders to reach 65+ total rolls
    for b_idx in range(22):
        roll_num = f"ROLL-20261008-{roll_idx:04d}"
        r = Roll(
            roll_number=roll_num,
            order_id=8 if b_idx < 12 else 4,
            machine_id=5 if b_idx < 12 else 9,
            yarn_batch_id=1 if b_idx < 12 else 5,
            production_job_id=2 if b_idx < 12 else 4,
            dye_lot=f"LOT-10{b_idx%4 + 5}",
            shade_value="STD-01",
            length_m=random.choice([80.0, 90.0, 100.0, 110.0]),
            width_in=58.0,
            shift=random.choice(["morning", "evening", "night"]),
            operator_id=random.choice([1, 2, 3, 9, 10]),
            qc_status="pass" if b_idx < 18 else "pending",
            grade="A" if b_idx < 18 else None,
            defect_points=random.randint(2, 9) if b_idx < 18 else 0,
            inspected_area_sq_yd=176.08,
            dispatched=False
        )
        rolls.append(r)
        roll_idx += 1

    db.add_all(rolls)
    db.commit()

    # Add Defects to rolls, especially on Loom W-03 rolls (rolls 30 to 39)
    for r in rolls:
        if r.machine_id == 6: # Loom W-03
            # Add multiple snarl and uneven weave defects
            defects.append(Defect(roll_id=r.id, type="uneven_weave", size_in=7.5, points=3))
            defects.append(Defect(roll_id=r.id, type="uneven_weave", size_in=10.0, points=4))
            defects.append(Defect(roll_id=r.id, type="hole", size_in=0.5, points=2))
            defects.append(Defect(roll_id=r.id, type="stain", size_in=4.0, points=2))
        elif r.yarn_batch_id == 3: # Batch YB-0412
            # Add colour mismatch defects
            defects.append(Defect(roll_id=r.id, type="colour_mismatch", size_in=8.0, points=3))
        elif r.qc_status in ["pass", "rework"] and random.random() < 0.4:
            defects.append(Defect(roll_id=r.id, type=random.choice(["hole", "stain", "other"]), size_in=random.choice([1.5, 3.2, 5.0]), points=random.choice([1, 2])))

    db.add_all(defects)
    db.commit()

    # 11. Dispatches & Invoices (Paid, Partially Paid, and Completely Unpaid)
    # Dispatch 1: 10 rolls to Meridian Apparel (Fully Paid)
    dispatched_rolls_1 = rolls[:10]
    for r in dispatched_rolls_1:
        r.dispatched = True
    total_dsp_m1 = sum(r.length_m for r in dispatched_rolls_1)
    subtotal_inv1 = total_dsp_m1 * 115.0
    tax_inv1 = subtotal_inv1 * 0.05
    total_inv1 = subtotal_inv1 + tax_inv1

    dispatch_1 = Dispatch(
        dispatch_number="DSP-20261008-001",
        buyer_id=1,  # Meridian Apparel
        vehicle_no="TN-38-CY-4821",
        notes="Standard container dispatch. Passed ASTM 4-point inspection.",
        dispatched_at=datetime.utcnow() - timedelta(days=3),
        created_by="Venkatesh K."
    )
    db.add(dispatch_1)
    db.flush()

    for r in dispatched_rolls_1:
        r.dispatch_id = dispatch_1.id

    invoice_1 = Invoice(
        dispatch_id=dispatch_1.id,
        buyer_id=1,
        invoice_no="INV-20261008-001",
        subtotal=round(subtotal_inv1, 2),
        tax=round(tax_inv1, 2),
        total=round(total_inv1, 2),
        status="paid",
        issued_at=datetime.utcnow() - timedelta(days=3)
    )
    db.add(invoice_1)
    db.flush()

    payment_1 = Payment(
        buyer_id=1,
        invoice_id=invoice_1.id,
        amount=round(total_inv1, 2),
        paid_at=datetime.utcnow() - timedelta(days=2),
        method="bank_transfer"
    )
    db.add(payment_1)

    # Dispatch 2: 6 rolls to Kaveri Fashions (Partially Paid)
    dispatched_rolls_2 = rolls[10:16]
    for r in dispatched_rolls_2:
        r.dispatched = True
    total_dsp_m2 = sum(r.length_m for r in dispatched_rolls_2)
    subtotal_inv2 = total_dsp_m2 * 115.0
    tax_inv2 = subtotal_inv2 * 0.05
    total_inv2 = subtotal_inv2 + tax_inv2

    dispatch_2 = Dispatch(
        dispatch_number="DSP-20261009-002",
        buyer_id=2,  # Kaveri Fashions
        vehicle_no="TN-33-AA-9102",
        notes="Urgent consignment dispatched for garment sample line.",
        dispatched_at=datetime.utcnow() - timedelta(days=2),
        created_by="Venkatesh K."
    )
    db.add(dispatch_2)
    db.flush()

    for r in dispatched_rolls_2:
        r.dispatch_id = dispatch_2.id

    invoice_2 = Invoice(
        dispatch_id=dispatch_2.id,
        buyer_id=2,
        invoice_no="INV-20261009-002",
        subtotal=round(subtotal_inv2, 2),
        tax=round(tax_inv2, 2),
        total=round(total_inv2, 2),
        status="partial",
        issued_at=datetime.utcnow() - timedelta(days=2)
    )
    db.add(invoice_2)
    db.flush()

    # Partial payment of ₹40,000 against invoice_2
    payment_2 = Payment(
        buyer_id=2,
        invoice_id=invoice_2.id,
        amount=40000.0,
        paid_at=datetime.utcnow() - timedelta(days=1),
        method="neft"
    )
    db.add(payment_2)

    # Dispatch 3: 6 rolls to Southern Weave Exports (Completely Unpaid)
    dispatched_rolls_3 = rolls[16:22]
    for r in dispatched_rolls_3:
        r.dispatched = True
    total_dsp_m3 = sum(r.length_m for r in dispatched_rolls_3)
    subtotal_inv3 = total_dsp_m3 * 115.0
    tax_inv3 = subtotal_inv3 * 0.05
    total_inv3 = subtotal_inv3 + tax_inv3

    dispatch_3 = Dispatch(
        dispatch_number="DSP-20261010-003",
        buyer_id=3,  # Southern Weave Exports
        vehicle_no="TN-38-EX-1044",
        notes="High-count combed fabric consignment awaiting buyer LC clearance.",
        dispatched_at=datetime.utcnow() - timedelta(days=1),
        created_by="Venkatesh K."
    )
    db.add(dispatch_3)
    db.flush()

    for r in dispatched_rolls_3:
        r.dispatch_id = dispatch_3.id

    invoice_3 = Invoice(
        dispatch_id=dispatch_3.id,
        buyer_id=3,
        invoice_no="INV-20261010-003",
        subtotal=round(subtotal_inv3, 2),
        tax=round(tax_inv3, 2),
        total=round(total_inv3, 2),
        status="unpaid",
        issued_at=datetime.utcnow() - timedelta(days=1)
    )
    db.add(invoice_3)
    db.commit()

    # 12. 1 Week of Attendance, Job Assignments & Generated Wages
    # Story 7: Thursday Night Shift had heavy overtime (e.g. 12.5 hours worked)!
    start_date = today - timedelta(days=6)
    shifts = ["morning", "evening", "night"]

    for d_offset in range(7):
        cur_date = start_date + timedelta(days=d_offset)
        is_thursday = (cur_date.weekday() == 3)

        for w in workers:
            for s in [w.default_shift]:
                # Status
                if w.id == 5 and cur_date.weekday() == 6: # Selvam off on Sunday
                    att_status = "leave"
                    hours = 0.0
                elif w.id == 4 and cur_date.weekday() == 2:
                    att_status = "absent"
                    hours = 0.0
                else:
                    att_status = "present"
                    # Heavy overtime on Thursday night shift
                    if is_thursday and s == "night" and w.role == "Weaver":
                        hours = 12.5 # 4.5 hours overtime!
                    elif random.random() < 0.2:
                        hours = 10.0 # 2 hours overtime
                    else:
                        hours = 8.0

                att = Attendance(
                    worker_id=w.id,
                    work_date=cur_date,
                    shift=s,
                    check_in=datetime.combine(cur_date, datetime.min.time()),
                    check_out=datetime.combine(cur_date, datetime.min.time()) + timedelta(hours=hours),
                    hours_worked=hours,
                    status=att_status
                )
                db.add(att)

                # Job assignment for weavers and dyers if present
                if att_status == "present" and w.role in ["Weaver", "Dyer", "Spinner"]:
                    # Assign to machine 4 or 5
                    m_id = 4 if w.id % 2 == 1 else 5
                    job_id = 1 if w.id % 2 == 1 else 2
                    
                    # Machine 7 (Loom W-04) is broken down!
                    # If worker was on broken machine, give 0 hours on job -> 100% idle wage!
                    if w.id == 3 and cur_date >= today - timedelta(days=2):
                        # Worker 3 assigned to broken loom W-04 -> No job assignment -> 100% idle wage!
                        pass
                    else:
                        assign = JobAssignment(
                            worker_id=w.id,
                            production_job_id=job_id,
                            machine_id=m_id,
                            work_date=cur_date,
                            shift=s,
                            hours_on_job=min(hours, 8.0)
                        )
                        db.add(assign)

    db.commit()

    # Generate all shift wages
    for d_offset in range(7):
        cur_date = start_date + timedelta(days=d_offset)
        for s in shifts:
            generate_shift_wages(db, cur_date, s)

    # 13. Planted Story: 50 kg Insect Damage on Batch YB-2026-0410
    # 50kg damaged: 20kg salvaged, 20kg waste sold (₹900), 10kg returned to supplier (draft claim)
    damage_seed = YarnDamageRecord(
        yarn_batch_id=1,  # YB-2026-0410
        kg_damaged=50.0,
        reason="insect damage",
        note="Outer layer yarn cones affected by silverfish during monsoon storage in Bay 2",
        reported_by="K. Murugesan",
        salvaged_kg=20.0,
        waste_kg=20.0,
        waste_sale_amount=900.0,
        supplier_return_kg=10.0,
        destroyed_kg=0.0,
        created_at=datetime.utcnow() - timedelta(days=4)
    )
    db.add(damage_seed)

    # Net loss expense: (30kg non-salvaged * ₹255) - ₹900 = ₹6,750
    yarn_loss_exp = Expense(
        category="yarn_loss",
        supplier_id=1,
        amount=6750.0,
        description="Yarn damage loss: 50kg insect damage on YB-2026-0410 (20kg salvaged, 20kg waste sold, 10kg return)",
        incurred_at=datetime.utcnow() - timedelta(days=4)
    )
    db.add(yarn_loss_exp)

    # Draft supplier claim for 10kg returned
    claim_seed = SupplierClaim(
        supplier_id=1,
        yarn_batch_id=1,
        kg=10.0,
        claim_amount=2550.0,
        reason="Insect damage - 10kg defective cones returned to supplier",
        status="Draft",
        created_at=datetime.utcnow() - timedelta(days=4)
    )
    db.add(claim_seed)

    # 14. Audit Trail logs
    audits = [
        AuditLog(user="K. Murugesan", action="CREATE_BATCH", entity="YarnBatch", entity_id=1, before_state=None, after_state="Received 800kg Cotton 40s from Coimbatore Yarn Traders"),
        AuditLog(user="K. Murugesan", action="YARN_DAMAGE_WRITEOFF", entity="YarnBatch", entity_id=1, before_state="kg_remaining: 450.0", after_state="kg_remaining: 420.0; Damaged: 50kg (20kg salvaged, 20kg waste sold, 10kg returned); net loss ₹6,750.00"),
        AuditLog(user="Venkatesh K.", action="ASSIGN_JOB", entity="ProductionJob", entity_id=1, before_state=None, after_state="Assigned Order ORD-2026-003 to Loom W-01"),
        AuditLog(user="D. Arumugam", action="REPORT_BREAKDOWN", entity="Machine", entity_id=7, before_state="running", after_state="Loom W-04 motor bearing seized. Marked BREAKDOWN."),
        AuditLog(user="Anitha Parthiban", action="INSPECT_ROLL", entity="Roll", entity_id=30, before_state="pending", after_state="Evaluated Roll on Perch Table P-01: Uneven weave snarls detected. Points: 34 -> Grade B (concession)."),
        AuditLog(user="Venkatesh K.", action="DISPATCH", entity="Dispatch", entity_id=1, before_state=None, after_state="Dispatched 10 rolls to Meridian Apparel on vehicle TN-38-CY-4821. Invoice: INV-20261008-001 (₹120,750).")
    ]
    db.add_all(audits)
    db.commit()

    db.close()
    print("Everest Textile Mills seed completed successfully with all 8 planted story points!")

if __name__ == "__main__":
    seed()
