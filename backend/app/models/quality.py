from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Roll(Base):
    __tablename__ = "rolls"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, unique=True, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    yarn_batch_id = Column(Integer, ForeignKey("yarn_batches.id"), nullable=False)
    production_job_id = Column(Integer, ForeignKey("production_jobs.id"), nullable=False)
    dye_lot = Column(String, nullable=False, index=True)
    shade_value = Column(String, nullable=False)
    length_m = Column(Float, nullable=False)
    width_in = Column(Float, nullable=False)
    shift = Column(String, nullable=False)  # morning, evening, night
    operator_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    qc_status = Column(String, default="pending", nullable=False)  # pending, pass, rework, reject
    grade = Column(String, nullable=True)  # A, B, reject, None
    defect_points = Column(Integer, default=0)
    inspected_area_sq_yd = Column(Float, default=0.0)
    dispatched = Column(Boolean, default=False, nullable=False)
    dispatch_id = Column(Integer, ForeignKey("dispatches.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_rolls_qc_dispatched", "qc_status", "dispatched"),
    )

    order = relationship("Order", back_populates="rolls")
    machine = relationship("Machine", back_populates="rolls")
    yarn_batch = relationship("YarnBatch", back_populates="rolls")
    production_job = relationship("ProductionJob", back_populates="rolls")
    operator = relationship("Worker")
    dispatch = relationship("Dispatch", back_populates="rolls")
    defects = relationship("Defect", back_populates="roll", cascade="all, delete-orphan")

class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    roll_id = Column(Integer, ForeignKey("rolls.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # hole, colour_mismatch, uneven_weave, stain, other
    size_in = Column(Float, nullable=False)
    points = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    roll = relationship("Roll", back_populates="defects")
