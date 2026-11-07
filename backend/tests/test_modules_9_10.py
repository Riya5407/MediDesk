"""Tests for Modules 9 (Dashboard) and 10 (Reports)."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_summary(client: AsyncClient):
    """GET /api/dashboard/summary returns total_medicines, todays_sales, counts."""
    resp = await client.get("/api/dashboard/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_medicines" in data
    assert "todays_sales" in data
    assert "todays_bills" in data
    assert "low_stock_count" in data
    assert "expiring_soon_count" in data
    assert "expired_count" in data


@pytest.mark.asyncio
async def test_dashboard_sales_trend(client: AsyncClient):
    """GET /api/dashboard/sales-trend?days=7 returns zero-filled daily series."""
    resp = await client.get("/api/dashboard/sales-trend?days=7")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 7
    for item in data:
        assert "date" in item
        assert "total" in item


@pytest.mark.asyncio
async def test_dashboard_stock_alerts(client: AsyncClient):
    """GET /api/dashboard/stock-alerts?limit=5 returns worst status first."""
    resp = await client.get("/api/dashboard/stock-alerts?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for batch in data:
        assert batch["status"] in ("expired", "out_of_stock", "expiring_soon", "low_stock")


@pytest.mark.asyncio
async def test_dashboard_category_stock(client: AsyncClient):
    """GET /api/dashboard/category-stock returns stock aggregation by category."""
    resp = await client.get("/api/dashboard/category-stock")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for item in data:
        assert "category" in item
        assert "total_stock" in item
        assert item["total_stock"] > 0


@pytest.mark.asyncio
async def test_reports_sales_by_date(client: AsyncClient):
    """GET /api/reports/sales-by-date returns sales by date rows."""
    resp = await client.get("/api/reports/sales-by-date?from=2020-01-01&to=2030-01-01")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_reports_sales_by_date_csv(client: AsyncClient):
    """GET /api/reports/sales-by-date?format=csv returns CSV content."""
    resp = await client.get("/api/reports/sales-by-date?from=2020-01-01&to=2030-01-01&format=csv")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_reports_top_medicines(client: AsyncClient):
    """GET /api/reports/top-medicines returns top medicines list."""
    resp = await client.get("/api/reports/top-medicines?limit=5&from=2020-01-01&to=2030-01-01")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_reports_expired_stock(client: AsyncClient):
    """GET /api/reports/expired-stock returns items and total_value."""
    resp = await client.get("/api/reports/expired-stock")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total_value" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_reports_purchases_by_supplier(client: AsyncClient):
    """GET /api/reports/purchases-by-supplier returns supplier summaries."""
    resp = await client.get("/api/reports/purchases-by-supplier?from=2020-01-01&to=2030-01-01")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

