"""Tests for employees, customers, and suppliers modules."""
import pytest
from httpx import AsyncClient


# ==================== EMPLOYEES ====================
@pytest.mark.asyncio
async def test_employees_crud(client: AsyncClient):
    # 1. List
    resp = await client.get("/api/employees")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data

    # 2. Create
    payload = {
        "emp_name": "Test Pharmacist",
        "emp_role": "Pharmacist",
        "salary": 35000.0,
        "phone_no": "9876543210",
    }
    c_resp = await client.post("/api/employees", json=payload)
    assert c_resp.status_code == 201
    created = c_resp.json()
    emp_no = created["emp_no"]
    assert created["emp_name"] == payload["emp_name"]

    # 3. Update
    u_payload = {
        "emp_name": "Updated Pharmacist",
        "emp_role": "Senior Pharmacist",
        "salary": 45000.0,
        "phone_no": "9876543210",
    }
    u_resp = await client.put(f"/api/employees/{emp_no}", json=u_payload)
    assert u_resp.status_code == 200
    assert u_resp.json()["emp_name"] == "Updated Pharmacist"

    # 4. Delete
    d_resp = await client.delete(f"/api/employees/{emp_no}")
    assert d_resp.status_code == 204

    # 5. Verify 404
    get_del = await client.get(f"/api/employees/{emp_no}")
    assert get_del.status_code == 404


# ==================== CUSTOMERS ====================
@pytest.mark.asyncio
async def test_customers_crud_and_history(client: AsyncClient):
    # 1. List
    resp = await client.get("/api/customers")
    assert resp.status_code == 200
    assert "items" in resp.json()

    # 2. Create
    payload = {
        "cust_name": "John Doe",
        "age": 35,
        "phone_no": "9988776655",
        "address": "123 Main St",
    }
    c_resp = await client.post("/api/customers", json=payload)
    assert c_resp.status_code == 201
    created = c_resp.json()
    cust_no = created["cust_no"]
    assert created["cust_name"] == "John Doe"

    # 3. Update
    u_payload = {
        "cust_name": "Johnathan Doe",
        "age": 36,
        "phone_no": "9988776655",
        "address": "456 Elm St",
    }
    u_resp = await client.put(f"/api/customers/{cust_no}", json=u_payload)
    assert u_resp.status_code == 200
    assert u_resp.json()["cust_name"] == "Johnathan Doe"

    # 4. History
    h_resp = await client.get(f"/api/customers/{cust_no}/history")
    assert h_resp.status_code == 200
    assert "sales" in h_resp.json()
    assert "prescriptions" in h_resp.json()

    # 5. Delete
    d_resp = await client.delete(f"/api/customers/{cust_no}")
    assert d_resp.status_code == 204


# ==================== SUPPLIERS ====================
@pytest.mark.asyncio
async def test_suppliers_crud(client: AsyncClient):
    # 1. List
    resp = await client.get("/api/suppliers")
    assert resp.status_code == 200
    assert "items" in resp.json()

    # 2. Create with phones
    payload = {
        "sup_name": "Global Pharma Supply",
        "address": "Industrial Area, Phase 2",
        "gst_no": "27AABCU9603R1ZM",
        "phones": ["022-12345678", "022-87654321"],
    }
    c_resp = await client.post("/api/suppliers", json=payload)
    assert c_resp.status_code == 201
    created = c_resp.json()
    sup_no = created["sup_no"]
    assert created["sup_name"] == "Global Pharma Supply"
    assert len(created["phones"]) == 2

    # 3. Update with new phone list
    u_payload = {
        "sup_name": "Global Pharma Supply Ltd",
        "address": "Industrial Area, Phase 2",
        "gst_no": "27AABCU9603R1ZM",
        "phones": ["022-99998888"],
    }
    u_resp = await client.put(f"/api/suppliers/{sup_no}", json=u_payload)
    assert u_resp.status_code == 200
    updated = u_resp.json()
    assert updated["sup_name"] == "Global Pharma Supply Ltd"
    assert updated["phones"] == ["022-99998888"]

    # 4. Delete
    d_resp = await client.delete(f"/api/suppliers/{sup_no}")
    assert d_resp.status_code == 204

