"""Meta endpoints: /api/health, /api/meta, /api/categories."""
from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.db import get_db
from app.auth import require_roles

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
async def health(conn=Depends(get_db)):
    """Health check that does not require auth and does not leak database/internal details."""
    try:
        await conn.execute("SELECT 1")
        return {"status": "ok"}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Health check failed",
        )


@router.get("/meta")
async def meta():
    """Return application-level constants."""
    return {
        "payment_modes": [m.strip() for m in settings.PAYMENT_MODES.split(",")],
        "po_statuses": ["Pending", "Delivered", "Cancelled"],
        "low_stock_threshold": settings.LOW_STOCK_THRESHOLD,
        "expiry_warning_days": settings.EXPIRY_WARNING_DAYS,
    }


@router.get("/categories")
async def categories(
    conn=Depends(get_db),
    _user: dict = Depends(require_roles("admin", "pharmacist", "cashier")),
):
    """Return distinct medicine categories (requires authentication)."""
    cur = await conn.execute(
        "SELECT DISTINCT category FROM medicine ORDER BY category"
    )
    rows = await cur.fetchall()
    return [row["category"] for row in rows]
