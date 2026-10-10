from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Dispatch(Base):
    __tablename__ = "dispatches"

    id = Column(Integer, primary_key=True, index=True)
    dispatch_number = Column(String, unique=True, nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=False)
    vehicle_no = Column(String, nullable=False)
    notes = Column(String, nullable=True)
    dispatched_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, nullable=False)

    buyer = relationship("Buyer", back_populates="dispatches")
    rolls = relationship("Roll", back_populates="dispatch")
    invoice = relationship("Invoice", back_populates="dispatch", uselist=False)

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    dispatch_id = Column(Integer, ForeignKey("dispatches.id"), nullable=False, unique=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=False)
    invoice_no = Column(String, unique=True, nullable=False, index=True)
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String, default="unpaid")  # unpaid, paid, partial
    issued_at = Column(DateTime, default=datetime.utcnow)

    dispatch = relationship("Dispatch", back_populates="invoice")
    buyer = relationship("Buyer", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    amount = Column(Float, nullable=False)
    paid_at = Column(DateTime, default=datetime.utcnow)
    method = Column(String, nullable=False)  # cash, bank_transfer, cheque, upi

    buyer = relationship("Buyer", back_populates="payments")
    invoice = relationship("Invoice", back_populates="payments")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False)  # yarn_bill, overhead, maintenance, other
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    incurred_at = Column(DateTime, default=datetime.utcnow)
