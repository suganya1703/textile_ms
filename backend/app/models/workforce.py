from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    work_date = Column(Date, nullable=False, index=True)
    shift = Column(String, nullable=False)  # morning, evening, night
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    hours_worked = Column(Float, default=8.0)
    status = Column(String, default="present")  # present, absent, leave

    __table_args__ = (
        UniqueConstraint("worker_id", "work_date", "shift", name="uq_worker_date_shift"),
    )

    worker = relationship("Worker", back_populates="attendances")

class JobAssignment(Base):
    __tablename__ = "job_assignments"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    production_job_id = Column(Integer, ForeignKey("production_jobs.id"), nullable=False)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    work_date = Column(Date, nullable=False, index=True)
    shift = Column(String, nullable=False)  # morning, evening, night
    hours_on_job = Column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("worker_id", "work_date", "shift", "production_job_id", name="uq_worker_job_shift"),
    )

    worker = relationship("Worker")
    production_job = relationship("ProductionJob")
    machine = relationship("Machine")

class Wage(Base):
    __tablename__ = "wages"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    production_job_id = Column(Integer, ForeignKey("production_jobs.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True)
    work_date = Column(Date, nullable=False, index=True)
    shift = Column(String, nullable=False)  # morning, evening, night
    regular_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    rate = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    wage_type = Column(String, nullable=False)  # job, idle, general
    paid_status = Column(String, default="pending")  # pending, paid
    paid_at = Column(DateTime, nullable=True)

    worker = relationship("Worker", back_populates="wages")
    order = relationship("Order", back_populates="wages")
    production_job = relationship("ProductionJob")
    machine = relationship("Machine")
