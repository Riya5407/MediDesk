"""Tests for the meta endpoints: /api/health, /api/meta, /api/categories."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data == {"status": "ok"}


@pytest.mark.asyncio
async def test_meta(client: AsyncClient):
    resp = await client.get("/api/meta")
    assert resp.status_code == 200
    data = resp.json()
    assert "payment_modes" in data
    assert isinstance(data["payment_modes"], list)
    assert "po_statuses" in data
    assert data["po_statuses"] == ["Pending", "Delivered", "Cancelled"]
    assert "low_stock_threshold" in data
    assert isinstance(data["low_stock_threshold"], int)
    assert "expiry_warning_days" in data
    assert isinstance(data["expiry_warning_days"], int)


@pytest.mark.asyncio
async def test_meta_fields_match_spec(client: AsyncClient):
    """Verify /api/meta returns exactly the four fields from API_SPEC section 2."""
    resp = await client.get("/api/meta")
    data = resp.json()
    expected_keys = {"payment_modes", "po_statuses", "low_stock_threshold", "expiry_warning_days"}
    assert set(data.keys()) == expected_keys


@pytest.mark.asyncio
async def test_categories(client: AsyncClient):
    resp = await client.get("/api/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # categories should be sorted
    assert data == sorted(data)


@pytest.mark.asyncio
async def test_categories_requires_auth(client: AsyncClient):
    """Verify that /api/categories is protected behind authentication (returns 401 when no token provided)."""
    resp = await client.get("/api/categories", headers={"Authorization": ""})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_health_db_failure(client: AsyncClient):
    """When the DB query fails, /api/health should return an error."""
    from app.db import get_db
    from app.main import app

    class BrokenConn:
        async def execute(self, *args, **kwargs):
            raise ConnectionError("DB is down")

    async def _broken_db():
        yield BrokenConn()

    original_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = _broken_db
    try:
        resp = await client.get("/api/health")
        assert resp.status_code == 500
        assert "detail" in resp.json()
    finally:
        if original_override:
            app.dependency_overrides[get_db] = original_override
        else:
            app.dependency_overrides.pop(get_db, None)

