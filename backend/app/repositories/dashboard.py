"""Dashboard repository — section 3 of API_SPEC.md."""
from datetime import date, timedelta
from typing import Any, Dict, List
from psycopg import AsyncConnection
from app.config import settings


async def get_summary(conn: AsyncConnection) -> Dict[str, Any]:
    cur = await conn.execute("""
        SELECT COUNT(*) AS total_medicines FROM medicine
    """)
    row = await cur.fetchone()
    total_medicines = row["total_medicines"]

    today = date.today()

    cur2 = await conn.execute("""
        SELECT
            COALESCE(SUM(total_amt), 0)::float  AS todays_sales,
            COUNT(*)::int                        AS todays_bills
        FROM sale
        WHERE sale_date = %s
    """, (today,))
    row2 = await cur2.fetchone()

    threshold = settings.LOW_STOCK_THRESHOLD
    warning_days = settings.EXPIRY_WARNING_DAYS
    soon_date = today + timedelta(days=warning_days)

    cur3 = await conn.execute("""
        SELECT
            COUNT(*) FILTER (
                WHERE exp_date >= CURRENT_DATE
                AND qty_in_stock > 0
                AND qty_in_stock <= %s
                AND exp_date > CURRENT_DATE + INTERVAL '1 day' * %s
            )::int AS low_stock_count,
            COUNT(*) FILTER (
                WHERE exp_date >= CURRENT_DATE
                AND exp_date <= %s
                AND qty_in_stock > 0
            )::int AS expiring_soon_count,
            COUNT(*) FILTER (
                WHERE exp_date < CURRENT_DATE
                AND qty_in_stock > 0
            )::int AS expired_count
        FROM medicine_batch
    """, (threshold, warning_days, soon_date))
    row3 = await cur3.fetchone()

    return {
        "total_medicines": total_medicines,
        "todays_sales": float(row2["todays_sales"]),
        "todays_bills": row2["todays_bills"],
        "low_stock_count": row3["low_stock_count"],
        "expiring_soon_count": row3["expiring_soon_count"],
        "expired_count": row3["expired_count"],
    }


async def get_sales_trend(conn: AsyncConnection, days: int = 7) -> List[Dict[str, Any]]:
    """Return one row per day for the last `days` days, zero-filling missing dates."""
    cur = await conn.execute("""
        WITH date_series AS (
            SELECT generate_series(
                CURRENT_DATE - INTERVAL '1 day' * (%s - 1),
                CURRENT_DATE,
                INTERVAL '1 day'
            )::date AS dt
        ),
        daily AS (
            SELECT sale_date, COALESCE(SUM(total_amt), 0)::float AS total
            FROM sale
            WHERE sale_date >= CURRENT_DATE - INTERVAL '1 day' * (%s - 1)
            GROUP BY sale_date
        )
        SELECT
            ds.dt::text AS date,
            COALESCE(d.total, 0)::float AS total
        FROM date_series ds
        LEFT JOIN daily d ON d.sale_date = ds.dt
        ORDER BY ds.dt ASC
    """, (days, days))
    rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def get_stock_alerts(conn: AsyncConnection, limit: int = 10) -> List[Dict[str, Any]]:
    """Batches not in_stock, worst status first (expired > out_of_stock > expiring_soon > low_stock)."""
    threshold = settings.LOW_STOCK_THRESHOLD
    warning_days = settings.EXPIRY_WARNING_DAYS

    cur = await conn.execute("""
        SELECT
            b.batch_no,
            b.med_no,
            m.med_name,
            b.mfg_date,
            b.exp_date,
            b.qty_in_stock,
            b.pur_price,
            (b.exp_date - CURRENT_DATE)::int AS days_to_expiry,
            CASE
                WHEN b.exp_date < CURRENT_DATE THEN 'expired'
                WHEN b.qty_in_stock = 0 THEN 'out_of_stock'
                WHEN b.exp_date <= CURRENT_DATE + INTERVAL '1 day' * %s THEN 'expiring_soon'
                WHEN b.qty_in_stock <= %s THEN 'low_stock'
                ELSE 'in_stock'
            END AS status
        FROM medicine_batch b
        JOIN medicine m ON m.med_no = b.med_no
        WHERE
            b.exp_date < CURRENT_DATE
            OR b.qty_in_stock = 0
            OR (b.exp_date <= CURRENT_DATE + INTERVAL '1 day' * %s AND b.qty_in_stock > 0)
            OR (b.qty_in_stock <= %s AND b.qty_in_stock > 0)
        ORDER BY
            CASE
                WHEN b.exp_date < CURRENT_DATE THEN 1
                WHEN b.qty_in_stock = 0 THEN 2
                WHEN b.exp_date <= CURRENT_DATE + INTERVAL '1 day' * %s THEN 3
                ELSE 4
            END ASC,
            b.exp_date ASC
        LIMIT %s
    """, (warning_days, threshold, warning_days, threshold, warning_days, limit))
    rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def get_category_stock(conn: AsyncConnection) -> List[Dict[str, Any]]:
    """Return total available medicine units grouped by medicine category, excluding expired and zero-stock batches."""
    cur = await conn.execute("""
        SELECT
            TRIM(m.category) AS category,
            SUM(b.qty_in_stock)::int AS total_stock
        FROM medicine m
        JOIN medicine_batch b ON b.med_no = m.med_no
        WHERE b.qty_in_stock > 0
          AND (b.exp_date IS NULL OR b.exp_date >= CURRENT_DATE)
        GROUP BY TRIM(m.category)
        HAVING SUM(b.qty_in_stock) > 0
        ORDER BY total_stock DESC
    """)
    rows = await cur.fetchall()
    return [dict(r) for r in rows]

