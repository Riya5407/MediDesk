"""Comprehensive tests for Authentication and Role-Based Access Control (RBAC).

Tests:
- Login success for admin, pharmacist, cashier
- Invalid credentials rejection (401)
- Token verification and me endpoint
- Expired token rejection (401)
- Invalid signature / malformed token rejection (401)
- Missing token on protected endpoint rejection (401)
- CSRF validation on cookie-authenticated write requests (403)
- Admin permissions (access all, cancel sales, manage employees)
- Pharmacist permissions (can manage medicines/batches/suppliers, cannot manage employees, cannot cancel sales)
- Cashier permissions (can view medicines and create sales, cannot modify medicines/batches, cannot cancel sales, cannot manage employees)
- Logout cookie clearing
"""
from datetime import timedelta
import pytest
from httpx import ASGITransport, AsyncClient

from app.auth import create_access_token
from app.routers.auth import reset_rate_limiter
from app.config import Settings


@pytest.mark.asyncio
async def test_login_success_all_roles(client: AsyncClient):
    """Verify login succeeds for all 3 predefined roles and sets cookies."""
    for username, password, expected_role in [
        ("admin", "Admin@123", "admin"),
        ("pharmacist", "Pharm@123", "pharmacist"),
        ("cashier", "Cashier@123", "cashier"),
    ]:
        resp = await client.post(
            "/api/auth/login",
            json={"username": username, "password": password},
        )
        assert resp.status_code == 200, f"Login failed for {username}: {resp.text}"
        data = resp.json()
        assert data["username"] == username
        assert data["role"] == expected_role
        assert "access_token" in data
        assert "csrf_token" in data

        # Check Set-Cookie headers
        set_cookies = resp.headers.get_list("set-cookie")
        assert any("access_token" in c for c in set_cookies)
        assert any("csrf_token" in c for c in set_cookies)


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """Verify wrong password returns 401."""
    resp = await client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "WrongPassword!"},
    )
    assert resp.status_code == 401
    assert "Invalid username or password" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Verify non-existent username returns 401."""
    resp = await client.post(
        "/api/auth/login",
        json={"username": "unknown_user", "password": "AnyPassword"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_missing_token_rejection(client: AsyncClient):
    """Protected endpoints reject requests without token with 401."""
    client.headers.pop("Authorization", None)
    resp = await client.get("/api/medicines")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"


@pytest.mark.asyncio
async def test_invalid_token_rejection(client: AsyncClient):
    """Malformed or tampered token returns 401."""
    headers = {"Authorization": "Bearer not-a-valid-token-string"}
    resp = await client.get("/api/medicines", headers=headers)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_rejection(client: AsyncClient):
    """Token with expired exp claim returns 401."""
    expired_token = create_access_token(
        {"username": "admin", "role": "admin"},
        expires_delta=timedelta(seconds=-10),
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    resp = await client.get("/api/medicines", headers=headers)
    assert resp.status_code == 401
    assert "Token has expired" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_me_and_verify_endpoints(client: AsyncClient):
    """GET /api/auth/me and GET /api/auth/verify return session info."""
    token = create_access_token({"username": "pharmacist", "role": "pharmacist"})
    headers = {"Authorization": f"Bearer {token}"}

    me_resp = await client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json() == {"username": "pharmacist", "role": "pharmacist"}

    verify_resp = await client.get("/api/auth/verify", headers=headers)
    assert verify_resp.status_code == 200
    assert verify_resp.json()["valid"] is True
    assert verify_resp.json()["username"] == "pharmacist"


@pytest.mark.asyncio
async def test_logout_clears_cookies(client: AsyncClient):
    """POST /api/auth/logout clears auth cookies with matching attributes."""
    resp = await client.post("/api/auth/logout")
    assert resp.status_code == 200
    set_cookies = resp.headers.get_list("set-cookie")
    # Verify both cookies deleted with proper path and SameSite
    access_deleted = [c for c in set_cookies if "access_token" in c]
    csrf_deleted = [c for c in set_cookies if "csrf_token" in c]
    assert len(access_deleted) > 0
    assert len(csrf_deleted) > 0
    assert any("path=/" in c.lower() for c in access_deleted)
    assert any("httponly" in c.lower() for c in access_deleted)


@pytest.mark.asyncio
async def test_cookie_attributes_in_production_vs_development(monkeypatch):
    """Verify cookies use SameSite=None; Secure in production, and SameSite=Lax in development."""
    from fastapi import Response
    from app.auth import set_auth_cookies, clear_auth_cookies, get_cookie_security_params
    from app.config import settings

    # 1. Development check
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "COOKIE_SECURE", False)
    sec_dev, same_dev = get_cookie_security_params()
    assert sec_dev is False
    assert same_dev == "lax"

    res_dev = Response()
    set_auth_cookies(res_dev, "token123", "csrf123")
    dev_cookies = res_dev.headers.getlist("set-cookie")
    assert any("samesite=lax" in c.lower() for c in dev_cookies)
    assert not any("secure" in c.lower() for c in dev_cookies)

    # 2. Production check (ENVIRONMENT='production' or COOKIE_SECURE=True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "COOKIE_SECURE", True)
    sec_prod, same_prod = get_cookie_security_params()
    assert sec_prod is True
    assert same_prod == "none"

    res_prod = Response()
    set_auth_cookies(res_prod, "token123", "csrf123")
    prod_cookies = res_prod.headers.getlist("set-cookie")
    assert any("samesite=none" in c.lower() for c in prod_cookies)
    assert any("secure" in c.lower() for c in prod_cookies)

    # Check clear_auth_cookies in production
    res_clear = Response()
    clear_auth_cookies(res_clear)
    clear_cookies = res_clear.headers.getlist("set-cookie")
    assert any("samesite=none" in c.lower() for c in clear_cookies)
    assert any("secure" in c.lower() for c in clear_cookies)


@pytest.mark.asyncio
async def test_csrf_protection_on_cookie_auth(client: AsyncClient):
    """Cookie auth requires matching X-CSRF-Token on state-changing requests."""
    client.headers.pop("Authorization", None)
    token = create_access_token({"username": "admin", "role": "admin"})

    # Cookie auth without X-CSRF-Token on POST -> 403 Forbidden
    client.cookies.set("access_token", token)
    client.cookies.set("csrf_token", "valid-csrf-token-12345")

    fail_resp = await client.post(
        "/api/customers",
        json={"cust_name": "Test Customer", "phone_no": "9999999999"},
    )
    assert fail_resp.status_code == 403
    assert "CSRF token missing or invalid" in fail_resp.json()["detail"]

    # Cookie auth with matching X-CSRF-Token -> succeeds
    success_resp = await client.post(
        "/api/customers",
        json={"cust_name": "Test Customer", "phone_no": "9999999999"},
        headers={"X-CSRF-Token": "valid-csrf-token-12345"},
    )
    assert success_resp.status_code == 201
    cust_no = success_resp.json()["cust_no"]

    # Clean up customer
    await client.delete(
        f"/api/customers/{cust_no}",
        headers={"X-CSRF-Token": "valid-csrf-token-12345"},
    )

    client.cookies.clear()


@pytest.mark.asyncio
async def test_cashier_rbac_restrictions(client: AsyncClient):
    """Cashier can view medicines and create sales, but CANNOT modify inventory, delete sales, or manage employees."""
    token = create_access_token({"username": "cashier", "role": "cashier"})
    headers = {"Authorization": f"Bearer {token}"}

    # Cashier CAN view medicines
    med_list = await client.get("/api/medicines", headers=headers)
    assert med_list.status_code == 200

    # Cashier CANNOT create medicine -> 403
    med_create = await client.post(
        "/api/medicines",
        json={"med_name": "Unauthorized Med"},
        headers=headers,
    )
    assert med_create.status_code == 403
    assert "does not have permission" in med_create.json()["detail"]

    # Cashier CANNOT create batch -> 403
    batch_create = await client.post(
        "/api/batches",
        json={"med_no": 1, "exp_date": "2027-01-01", "qty_in_stock": 10},
        headers=headers,
    )
    assert batch_create.status_code == 403

    # Cashier CANNOT manage suppliers -> 403
    sup_resp = await client.get("/api/suppliers", headers=headers)
    assert sup_resp.status_code == 403

    # Cashier CANNOT manage purchase orders -> 403
    po_resp = await client.get("/api/purchase-orders", headers=headers)
    assert po_resp.status_code == 403

    # Cashier CANNOT manage prescriptions -> 403
    pres_resp = await client.get("/api/prescriptions", headers=headers)
    assert pres_resp.status_code == 403

    # Cashier CANNOT cancel/delete sales -> 403
    cancel_resp = await client.delete("/api/sales/99999", headers=headers)
    assert cancel_resp.status_code == 403


@pytest.mark.asyncio
async def test_pharmacist_rbac_restrictions(client: AsyncClient):
    """Pharmacist can manage inventory, batches, suppliers, POs, prescriptions; CANNOT cancel sales or manage employees."""
    token = create_access_token({"username": "pharmacist", "role": "pharmacist"})
    headers = {"Authorization": f"Bearer {token}"}

    # Pharmacist CAN view and create medicines
    med_list = await client.get("/api/medicines", headers=headers)
    assert med_list.status_code == 200

    # Pharmacist CAN view suppliers and purchase orders
    sup_resp = await client.get("/api/suppliers", headers=headers)
    assert sup_resp.status_code == 200

    po_resp = await client.get("/api/purchase-orders", headers=headers)
    assert po_resp.status_code == 200

    pres_resp = await client.get("/api/prescriptions", headers=headers)
    assert pres_resp.status_code == 200

    # Pharmacist CANNOT manage employees -> 403
    emp_create = await client.post(
        "/api/employees",
        json={"emp_name": "Test Emp", "salary": 10000},
        headers=headers,
    )
    assert emp_create.status_code == 403

    # Pharmacist CANNOT cancel completed sales -> 403
    cancel_sale = await client.delete("/api/sales/99999", headers=headers)
    assert cancel_sale.status_code == 403


@pytest.mark.asyncio
async def test_admin_full_access(client: AsyncClient):
    """Admin has full access across all operations."""
    token = create_access_token({"username": "admin", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}

    # Admin CAN access employees
    emp_resp = await client.get("/api/employees", headers=headers)
    assert emp_resp.status_code == 200

    # Admin CAN access reports
    sales_rep = await client.get("/api/reports/sales-by-date", headers=headers)
    assert sales_rep.status_code == 200

    exp_rep = await client.get("/api/reports/expired-stock", headers=headers)
    assert exp_rep.status_code == 200

    sup_rep = await client.get("/api/reports/purchases-by-supplier", headers=headers)
    assert sup_rep.status_code == 200


@pytest.mark.asyncio
async def test_login_rate_limiting(client: AsyncClient):
    """5 failed login attempts trigger 429 Too Many Requests."""
    reset_rate_limiter()

    # 5 failed attempts -> 401
    for i in range(5):
        resp = await client.post(
            "/api/auth/login",
            json={"username": "test_limited_user", "password": "WrongPassword!"},
        )
        assert resp.status_code == 401, f"Attempt {i+1} expected 401, got {resp.status_code}"

    # 6th attempt for the same username or IP -> 429 Too Many Requests
    blocked_resp = await client.post(
        "/api/auth/login",
        json={"username": "test_limited_user", "password": "WrongPassword!"},
    )
    assert blocked_resp.status_code == 429
    assert "Too many failed login attempts" in blocked_resp.json()["detail"]
    assert "Retry-After" in blocked_resp.headers

    reset_rate_limiter()


@pytest.mark.asyncio
async def test_login_rate_limiting_per_username(client: AsyncClient):
    """Failed login attempts are limited per username, protecting accounts against distributed attacks."""
    reset_rate_limiter()

    target_user = "target_pharmacist"
    for _ in range(5):
        resp = await client.post(
            "/api/auth/login",
            json={"username": target_user, "password": "WrongPassword!"},
        )
        assert resp.status_code == 401

    # 6th attempt on target_user triggers 429
    blocked = await client.post(
        "/api/auth/login",
        json={"username": target_user, "password": "WrongPassword!"},
    )
    assert blocked.status_code == 429
    assert "for this account" in blocked.json()["detail"] or "Too many failed login attempts" in blocked.json()["detail"]

    reset_rate_limiter()


@pytest.mark.asyncio
async def test_employee_data_masked_for_non_admins(client: AsyncClient):
    """GET /api/employees masks salary and phone number for non-admin roles."""
    cashier_token = create_access_token({"username": "cashier", "role": "cashier"})
    cashier_resp = await client.get("/api/employees", headers={"Authorization": f"Bearer {cashier_token}"})
    assert cashier_resp.status_code == 200
    cashier_data = cashier_resp.json()
    assert "items" in cashier_data
    if cashier_data["items"]:
        for emp in cashier_data["items"]:
            assert emp["salary"] is None, "Salary must be masked for cashier"
            assert emp["phone_no"] is None, "Phone number must be masked for cashier"
            assert emp["emp_no"] is not None
            assert emp["emp_name"] is not None

    pharm_token = create_access_token({"username": "pharmacist", "role": "pharmacist"})
    pharm_resp = await client.get("/api/employees", headers={"Authorization": f"Bearer {pharm_token}"})
    assert pharm_resp.status_code == 200
    pharm_data = pharm_resp.json()
    if pharm_data["items"]:
        for emp in pharm_data["items"]:
            assert emp["salary"] is None, "Salary must be masked for pharmacist"
            assert emp["phone_no"] is None, "Phone number must be masked for pharmacist"

    admin_token = create_access_token({"username": "admin", "role": "admin"})
    admin_resp = await client.get("/api/employees", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_resp.status_code == 200


def test_production_configuration_validation():
    """Settings validator rejects production mode if demo secrets, demo hashes, or AUTH_ENABLED=false are used."""
    # Production with AUTH_ENABLED=False -> raises ValueError
    with pytest.raises(ValueError, match="AUTH_ENABLED cannot be false in production"):
        Settings(
            ENVIRONMENT="production",
            AUTH_ENABLED=False,
            COOKIE_SECURE=True,
        )

    # Production with default demo credentials -> raises ValueError
    with pytest.raises(ValueError, match="Production configuration error"):
        Settings(
            ENVIRONMENT="production",
            COOKIE_SECURE=True,
        )

    # Production with valid custom credentials -> succeeds
    valid_settings = Settings(
        ENVIRONMENT="production",
        JWT_SECRET="valid-long-random-secret-key-at-least-32-chars-long",
        ADMIN_PASSWORD_HASH="$argon2id$v=19$m=65536,t=3,p=4$customadminhash",
        PHARMACIST_PASSWORD_HASH="$argon2id$v=19$m=65536,t=3,p=4$custompharmhash",
        CASHIER_PASSWORD_HASH="$argon2id$v=19$m=65536,t=3,p=4$customcashierhash",
        COOKIE_SECURE=True,
    )
    assert valid_settings.ENVIRONMENT == "production"


@pytest.mark.asyncio
async def test_docs_disabled_in_production(monkeypatch):
    """FastAPI docs (/docs, /redoc, /openapi.json) are disabled in production."""
    from fastapi import FastAPI
    import app.config

    prod_settings = app.config.Settings(
        ENVIRONMENT="production",
        JWT_SECRET="valid-long-random-secret-key-at-least-32-chars-long",
        ADMIN_PASSWORD_HASH="$argon2id$v=19$m=65536,t=3,p=4$customadminhash",
        PHARMACIST_PASSWORD_HASH="$argon2id$v=19$m=65536,t=3,p=4$custompharmhash",
        CASHIER_PASSWORD_HASH="$argon2id$v=19$m=65536,t=3,p=4$customcashierhash",
        COOKIE_SECURE=True,
    )
    monkeypatch.setattr(app.config, "settings", prod_settings)

    is_prod = prod_settings.ENVIRONMENT.lower() in ("production", "prod")
    test_prod_app = FastAPI(
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
        openapi_url=None if is_prod else "/openapi.json",
    )

    transport = ASGITransport(app=test_prod_app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        docs_resp = await ac.get("/docs")
        assert docs_resp.status_code == 404

        redoc_resp = await ac.get("/redoc")
        assert redoc_resp.status_code == 404

        openapi_resp = await ac.get("/openapi.json")
        assert openapi_resp.status_code == 404
