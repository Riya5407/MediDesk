from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


class CustomerBase(BaseModel):
    cust_name: str = Field(..., min_length=1)
    age: Optional[int] = Field(None, ge=0, le=150)
    phone_no: Optional[str] = None
    address: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    cust_no: int


class PaginatedCustomers(BaseModel):
    items: List[CustomerOut]
    total: int
    page: int
    page_size: int


class CustomerHistorySale(BaseModel):
    bill_no: int
    sale_date: date
    cust_name: Optional[str] = None
    emp_name: Optional[str] = None
    payment_mode: str
    total_amt: float
    item_count: int


class CustomerHistoryPrescription(BaseModel):
    pres_no: int
    cust_no: int
    cust_name: Optional[str] = None
    doc_name: Optional[str] = None
    pres_date: date
    diagnosis: Optional[str] = None
    item_count: int


class CustomerHistoryOut(BaseModel):
    sales: List[CustomerHistorySale] = []
    prescriptions: List[CustomerHistoryPrescription] = []

