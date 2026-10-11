from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class YarnBatch(Base):
    __tablename__ = "yarn_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String, unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    yarn_type = Column(String, nullable=False)  # Cotton 30s, Cotton 40s, Polyester, Poly-cotton
    colour = Column(String, nullable=False)
    kg_received = Column(Float, nullable=False)
    kg_remaining = Column(Float, nullable=False)
    cost_per_kg = Column(Float, nullable=False)
    linked_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow)
    received_by = Column(String, nullable=False)

    supplier = relationship("Supplier", back_populates="yarn_batches")
    consumptions = relationship("YarnConsumption", back_populates="yarn_batch")
    rolls = relationship("Roll", back_populates="yarn_batch")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=False)
    fabric_type = Column(String, nullable=False)
    colour = Column(String, nullable=False)
    quantity_m = Column(Float, nullable=False)
    deadline = Column(Date, nullable=False)
    price_per_m = Column(Float, nullable=False)
    status = Column(String, default="Created")  # Created, Yarn reserved, Spinning, Weaving, Dyeing, QC, Ready, Dispatched
    yarn_required_kg = Column(Float, nullable=False)
    expected_delivery = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    buyer = relationship("Buyer", back_populates="orders")
    production_jobs = relationship("ProductionJob", back_populates="order")
    consumptions = relationship("YarnConsumption", back_populates="order")
    rolls = relationship("Roll", back_populates="order")
    wages = relationship("Wage", back_populates="order")

class ProductionJob(Base):
    __tablename__ = "production_jobs"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    stage = Column(String, nullable=False)  # spinning, weaving, dyeing
    progress_pct = Column(Float, default=0.0)
    output_today_m = Column(Float, default=0.0)
    shift = Column(String, nullable=False)  # morning, evening, night
    operator_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="active")  # active, interrupted, transferred, completed
    transferred_from_job_id = Column(Integer, ForeignKey("production_jobs.id"), nullable=True)
    transferred_to_job_id = Column(Integer, ForeignKey("production_jobs.id"), nullable=True)

    order = relationship("Order", back_populates="production_jobs")
    machine = relationship("Machine", back_populates="jobs")
    operator = relationship("Worker")
    consumptions = relationship("YarnConsumption", back_populates="production_job")
    rolls = relationship("Roll", back_populates="production_job")

class YarnConsumption(Base):
    __tablename__ = "yarn_consumptions"

    id = Column(Integer, primary_key=True, index=True)
    yarn_batch_id = Column(Integer, ForeignKey("yarn_batches.id"), nullable=False)
    production_job_id = Column(Integer, ForeignKey("production_jobs.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    kg_issued = Column(Float, nullable=False)
    kg_returned = Column(Float, default=0.0)
    issued_at = Column(DateTime, default=datetime.utcnow)

    yarn_batch = relationship("YarnBatch", back_populates="consumptions")
    production_job = relationship("ProductionJob", back_populates="consumptions")
    order = relationship("Order", back_populates="consumptions")
