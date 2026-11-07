from datetime import date
from typing import Optional, List
from pydantic import BaseModel


class PrescriptionItemInput(BaseModel):
    med_no: int
    dosage: Optional[str] = None
    duration: Optional[str] = None


class PrescriptionCreate(BaseModel):
    cust_no: Optional[int] = None
    doc_name: Optional[str] = None
    pres_date: date
    diagnosis: Optional[str] = None
    items: List[PrescriptionItemInput] = []


class PrescriptionUpdate(PrescriptionCreate):
    pass


class PrescriptionItemOut(BaseModel):
    med_no: int
    med_name: str
    dosage: Optional[str] = None
    duration: Optional[str] = None


class PrescriptionOut(BaseModel):
    pres_no: int
    cust_no: Optional[int] = None
    cust_name: Optional[str] = None
    doc_name: Optional[str] = None
    pres_date: date
    diagnosis: Optional[str] = None
    items: List[PrescriptionItemOut] = []


class PrescriptionListItem(BaseModel):
    pres_no: int
    cust_no: Optional[int] = None
    cust_name: Optional[str] = None
    doc_name: Optional[str] = None
    pres_date: date
    diagnosis: Optional[str] = None
    item_count: int


class PaginatedPrescriptions(BaseModel):
    items: List[PrescriptionListItem]
    total: int
    page: int
    page_size: int

