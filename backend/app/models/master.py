from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    city = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    yarn_batches = relationship("YarnBatch", back_populates="supplier")

class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    city = Column(String, nullable=False)
    credit_limit = Column(Float, default=500000.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="buyer")
    dispatches = relationship("Dispatch", back_populates="buyer")
    invoices = relationship("Invoice", back_populates="buyer")
    payments = relationship("Payment", back_populates="buyer")

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    stage = Column(String, nullable=False)  # spinning, weaving, dyeing
    status = Column(String, default="idle")  # running, idle, breakdown
    capacity_m_per_hour = Column(Float, nullable=False)
    floor_x = Column(Float, nullable=False)
    floor_y = Column(Float, nullable=False)
    status_updated_at = Column(DateTime, default=datetime.utcnow)

    jobs = relationship("ProductionJob", back_populates="machine")
    rolls = relationship("Roll", back_populates="machine")

class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Spinner, Weaver, Dyer, QC Inspector, Supervisor
    skill_level = Column(String, nullable=False)  # trainee, semi_skilled, skilled, master
    hourly_rate = Column(Float, nullable=False)
    overtime_multiplier = Column(Float, default=1.5)
    default_shift = Column(String, default="morning")  # morning, evening, night

    attendances = relationship("Attendance", back_populates="worker")
    wages = relationship("Wage", back_populates="worker")

class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
