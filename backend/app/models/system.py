from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from backend.app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user = Column(String, default="System", nullable=False)
    action = Column(String, nullable=False)  # CREATE, UPDATE, DELETE, DISPATCH, OVERRIDE_DYE_LOT, etc.
    entity = Column(String, nullable=False, index=True)  # YarnBatch, Roll, Dispatch, Wage, etc.
    entity_id = Column(Integer, nullable=True, index=True)
    before_state = Column(Text, nullable=True)  # JSON or text summary
    after_state = Column(Text, nullable=True)   # JSON or text summary
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
