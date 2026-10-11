from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime

# Master Schemas
class SupplierBase(BaseModel):
    name: str
    contact: str
    phone: str
    city: str

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class BuyerBase(BaseModel):
    name: str
    contact: str
    phone: str
    city: str
    credit_limit: float = Field(gt=0, default=500000.0)

class BuyerResponse(BuyerBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class MachineResponse(BaseModel):
    id: int
    name: str
    stage: str
    status: str
    capacity_m_per_hour: float
    floor_x: float
    floor_y: float
    status_updated_at: datetime
    current_job: Optional[Dict[str, Any]] = None
    class Config:
        from_attributes = True

class MachineStatusUpdate(BaseModel):
    status: str  # running, idle, breakdown

# Inventory Schemas
class YarnArrivalCreate(BaseModel):
    supplier_id: int
    yarn_type: str
    colour: str
    kg_received: float = Field(gt=0, description="Gross received kg must be positive")
    cost_per_kg: float = Field(gt=0, description="Cost per kg must be positive")
    linked_order_id: Optional[int] = None
    received_by: str = "Store Incharge"

class YarnBatchResponse(BaseModel):
    id: int
    batch_code: str
    supplier_id: int
    supplier_name: Optional[str] = None
    yarn_type: str
    colour: str
    kg_received: float
    kg_remaining: float
    cost_per_kg: float
    linked_order_id: Optional[int] = None
    received_at: datetime
    received_by: str
    is_low_stock: bool = False
    class Config:
        from_attributes = True

class OrderFeasibilityCheckRequest(BaseModel):
    fabric_type: str
    colour: str
    quantity_m: float = Field(gt=0)
    yarn_type: Optional[str] = None

# Order Schemas
class OrderCreate(BaseModel):
    buyer_id: int
    fabric_type: str
    colour: str
    quantity_m: float = Field(gt=0)
    deadline: date
    price_per_m: float = Field(gt=0)
    yarn_required_kg: float = Field(gt=0)
    expected_delivery: date

    @field_validator('deadline')
    def deadline_must_be_future(cls, v):
        if v < date.today():
            raise ValueError('Deadline cannot be in the past')
        return v

class OrderResponse(BaseModel):
    id: int
    order_number: str
    buyer_id: int
    buyer_name: Optional[str] = None
    fabric_type: str
    colour: str
    quantity_m: float
    deadline: date
    price_per_m: float
    status: str
    yarn_required_kg: float
    expected_delivery: date
    created_at: datetime
    progress_pct: float = 0.0
    produced_m: float = 0.0
    class Config:
        from_attributes = True

class OrderFeasibilityQuoteRequest(BaseModel):
    fabric_type: str
    colour: str
    quantity_m: float = Field(gt=0)
    deadline: date
    offered_price_per_m: float = Field(gt=0)

# Quality Schemas
class DefectCreate(BaseModel):
    type: str  # hole, colour_mismatch, uneven_weave, stain, other
    size_in: float = Field(gt=0)

class RollCreate(BaseModel):
    order_id: int
    machine_id: int
    yarn_batch_id: int
    production_job_id: int
    dye_lot: str
    shade_value: str
    length_m: float = Field(gt=0)
    width_in: float = Field(gt=0, default=58.0)
    shift: str = "morning"
    operator_id: int

class RollResponse(BaseModel):
    id: int
    roll_number: str
    order_id: int
    order_number: Optional[str] = None
    buyer_name: Optional[str] = None
    fabric_type: Optional[str] = None
    machine_id: int
    machine_name: Optional[str] = None
    yarn_batch_id: int
    dye_lot: str
    shade_value: str
    length_m: float
    width_in: float
    shift: str
    operator_id: int
    operator_name: Optional[str] = None
    qc_status: str
    grade: Optional[str] = None
    defect_points: int
    inspected_area_sq_yd: float
    dispatched: bool
    created_at: datetime
    defects_count: int = 0
    class Config:
        from_attributes = True

# Dispatch Schemas
class DispatchCreate(BaseModel):
    buyer_id: int
    roll_ids: List[int] = Field(min_length=1)
    vehicle_no: str
    notes: Optional[str] = None
    created_by: str = "Dispatch Clerk"
    override_dye_lot_warning: bool = False
    override_reason: Optional[str] = None

class DispatchResponse(BaseModel):
    id: int
    dispatch_number: str
    buyer_id: int
    buyer_name: str
    vehicle_no: str
    notes: Optional[str]
    dispatched_at: datetime
    created_by: str
    roll_count: int
    total_metres: float
    invoice_no: Optional[str] = None
    invoice_total: Optional[float] = None
    class Config:
        from_attributes = True

# Workforce Schemas
class AttendanceCreate(BaseModel):
    worker_id: int
    work_date: date
    shift: str
    status: str = "present"  # present, absent, leave
    hours_worked: float = Field(default=8.0, ge=0)

class JobAssignmentCreate(BaseModel):
    worker_id: int
    production_job_id: int
    machine_id: int
    work_date: date
    shift: str
    hours_on_job: float = Field(gt=0)

class GenerateWagesRequest(BaseModel):
    work_date: date
    shift: str

# Production Job Schemas
class JobAssignRequest(BaseModel):
    order_id: int
    machine_id: int
    stage: str
    shift: str
    operator_id: int

class JobProgressUpdate(BaseModel):
    progress_pct: Optional[float] = None
    output_increment_m: Optional[float] = None

class JobTransferRequest(BaseModel):
    target_machine_id: int
    operator_id: Optional[int] = None
    shift: Optional[str] = None

class BuyerTrackingRequest(BaseModel):
    identifier: str
    phone_last4: str


