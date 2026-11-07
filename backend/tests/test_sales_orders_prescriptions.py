"""Tests for Modules 6 (Sales/POS), 7 (Purchase Orders), 8 (Prescriptions).

Uses the `client` fixture from conftest.py which injects a real DB transaction
that rolls back at teardown — no data persists in Pharmacy_Management.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_pos_search_returns_list(client: AsyncClient):
    """GET /api/pos/medicines returns a JSON list."""
    resp = await client.get("/api/pos/medicines?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_pos_search_filter(client: AsyncClient):
    """GET /api/pos/medicines?q=a returns medicines with 'a' in name."""
    resp = await client.get("/api/pos/medicines?q=a&limit=20")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for med in data:
        assert "a" in med["med_name"].lower()


@pytest.mark.asyncio
async def test_list_sales_paginated(client: AsyncClient):
    """GET /api/sales returns paginated result."""
    resp = await client.get("/api/sales?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_get_sale_not_found(client: AsyncClient):
    """GET /api/sales/999999 returns 404."""
    resp = await client.get("/api/sales/999999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_purchase_orders_paginated(client: AsyncClient):
    """GET /api/purchase-orders returns paginated result."""
    resp = await client.get("/api/purchase-orders?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_get_purchase_order_not_found(client: AsyncClient):
    """GET /api/purchase-orders/999999 returns 404."""
    resp = await client.get("/api/purchase-orders/999999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_purchase_orders_status_filter(client: AsyncClient):
    """GET /api/purchase-orders?status=Pending returns only Pending orders."""
    resp = await client.get("/api/purchase-orders?status=Pending&page_size=20")
    assert resp.status_code == 200
    data = resp.json()
    for po in data["items"]:
        assert po["status"] == "Pending"


@pytest.mark.asyncio
async def test_list_prescriptions_paginated(client: AsyncClient):
    """GET /api/prescriptions returns paginated result."""
    resp = await client.get("/api/prescriptions?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_get_prescription_not_found(client: AsyncClient):
    """GET /api/prescriptions/999999 returns 404."""
    resp = await client.get("/api/prescriptions/999999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_update_delete_prescription(client: AsyncClient):
    """Full CRUD cycle for a prescription — all within a single rolled-back transaction."""
    # Create
    payload = {
        "pres_date": "2025-06-15",
        "doc_name": "Dr. Test Integration",
        "diagnosis": "Test Diagnosis",
        "items": [],
    }
    create_resp = await client.post("/api/prescriptions", json=payload)
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["doc_name"] == "Dr. Test Integration"
    pres_no = created["pres_no"]

    # Read
    get_resp = await client.get(f"/api/prescriptions/{pres_no}")
    assert get_resp.status_code == 200
    assert get_resp.json()["pres_no"] == pres_no

    # Update
    update_payload = {
        "pres_date": "2025-06-15",
        "doc_name": "Dr. Updated",
        "diagnosis": "Updated Diagnosis",
        "items": [],
    }
    update_resp = await client.put(f"/api/prescriptions/{pres_no}", json=update_payload)
    assert update_resp.status_code == 200
    assert update_resp.json()["doc_name"] == "Dr. Updated"

    # Delete
    del_resp = await client.delete(f"/api/prescriptions/{pres_no}")
    assert del_resp.status_code == 204

    # Verify gone (within same transaction, the row is deleted)
    gone_resp = await client.get(f"/api/prescriptions/{pres_no}")
    assert gone_resp.status_code == 404
