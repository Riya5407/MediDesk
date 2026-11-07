from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from psycopg import AsyncConnection

from app.db import get_db
from app.auth import require_roles
from app.schemas.medicines import (
    MedicineCreate,
    MedicineUpdate,
    MedicineDetailOut,
    PaginatedMedicines,
)
from app.repositories import medicines as med_repo

router = APIRouter(prefix="/api/medicines", tags=["medicines"])


@router.get("", response_model=PaginatedMedicines)
async def list_medicines(
    search: Optional[str] = Query(None, description="Search by name or manufacturer"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status (in_stock, low_stock, out_of_stock)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    conn: AsyncConnection = Depends(get_db),
    _user: dict = Depends(require_roles("admin", "pharmacist", "cashier")),
):
    """List medicines with filters and pagination."""
    return await med_repo.get_medicines(
        conn, search=search, category=category, status=status, page=page, page_size=page_size
    )


@router.get("/{med_no}", response_model=MedicineDetailOut)
async def get_medicine(
    med_no: int,
    conn: AsyncConnection = Depends(get_db),
    _user: dict = Depends(require_roles("admin", "pharmacist", "cashier")),
):
    """Get single medicine by ID with its batches."""
    return await med_repo.get_medicine_by_id(conn, med_no)


@router.post("", response_model=MedicineDetailOut, status_code=status.HTTP_201_CREATED)
async def create_medicine(
    payload: MedicineCreate,
    conn: AsyncConnection = Depends(get_db),
    _user: dict = Depends(require_roles("admin", "pharmacist")),
):
    """Create a new medicine."""
    return await med_repo.create_medicine(conn, payload.model_dump())


@router.put("/{med_no}", response_model=MedicineDetailOut)
async def update_medicine(
    med_no: int,
    payload: MedicineUpdate,
    conn: AsyncConnection = Depends(get_db),
    _user: dict = Depends(require_roles("admin", "pharmacist")),
):
    """Update an existing medicine."""
    return await med_repo.update_medicine(conn, med_no, payload.model_dump())


@router.delete("/{med_no}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medicine(
    med_no: int,
    conn: AsyncConnection = Depends(get_db),
    _user: dict = Depends(require_roles("admin", "pharmacist")),
):
    """Delete a medicine. Fails with 409 if referenced by batches, sales, etc."""
    await med_repo.delete_medicine(conn, med_no)
