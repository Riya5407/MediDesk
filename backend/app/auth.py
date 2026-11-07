"""Authentication, JWT token handling, password verification, CSRF, and RBAC."""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import argon2
import jwt
from fastapi import Request, Response, HTTPException, status, Depends

from app.config import settings

# Argon2id password hasher
ph = argon2.PasswordHasher(type=argon2.Type.ID)


def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    return ph.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """Verify password against Argon2id hash."""
    try:
        return ph.verify(password_hash, password)
    except Exception:
        return False


def get_user_by_username(username: str) -> Optional[Dict[str, str]]:
    """Look up predefined user from environment settings."""
    u = username.strip()
    if u == settings.ADMIN_USERNAME:
        return {"username": settings.ADMIN_USERNAME, "role": "admin", "password_hash": settings.ADMIN_PASSWORD_HASH}
    elif u == settings.PHARMACIST_USERNAME:
        return {"username": settings.PHARMACIST_USERNAME, "role": "pharmacist", "password_hash": settings.PHARMACIST_PASSWORD_HASH}
    elif u == settings.CASHIER_USERNAME:
        return {"username": settings.CASHIER_USERNAME, "role": "cashier", "password_hash": settings.CASHIER_PASSWORD_HASH}
    return None


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": now,
        "sub": to_encode.get("username", ""),
    })
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def generate_csrf_token() -> str:
    """Generate cryptographically secure CSRF token."""
    return secrets.token_urlsafe(32)


def get_cookie_security_params() -> tuple[bool, str]:
    """Determine (secure, samesite) settings based on environment.
    
    In production / when COOKIE_SECURE is enabled, cookies are transmitted cross-site
    (e.g., frontend on Vercel, backend on Render), which requires SameSite=None and Secure=True.
    In local development, SameSite=Lax and Secure=False allows plain HTTP localhost testing.
    """
    is_prod = (
        settings.ENVIRONMENT.lower() in ("production", "prod")
        or settings.COOKIE_SECURE
    )
    if is_prod:
        return True, "none"
    return False, "lax"


def set_auth_cookies(response: Response, token: str, csrf_token: str) -> None:
    """Set secure HttpOnly authentication cookie and readable CSRF cookie."""
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    secure, samesite = get_cookie_security_params()
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=max_age,
        path="/",
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,  # JavaScript must be able to read this to include in X-CSRF-Token header
        secure=secure,
        samesite=samesite,
        max_age=max_age,
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear auth and CSRF cookies, matching original creation attributes."""
    secure, samesite = get_cookie_security_params()
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=secure,
        samesite=samesite,
    )
    response.delete_cookie(
        key="csrf_token",
        path="/",
        httponly=False,
        secure=secure,
        samesite=samesite,
    )


async def get_current_user(request: Request) -> Dict[str, Any]:
    """Dependency: retrieve and validate the authenticated user from header or cookie."""
    if not settings.AUTH_ENABLED:
        return {"username": "admin", "role": "admin"}

    token: Optional[str] = None
    auth_header = request.headers.get("Authorization")
    is_bearer = False
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        is_bearer = True
    elif "access_token" in request.cookies:
        token = request.cookies["access_token"]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    username: Optional[str] = payload.get("username") or payload.get("sub")
    role: Optional[str] = payload.get("role")

    if not username or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # CSRF check for state-changing methods if authenticated via cookie
    if not is_bearer and request.method in ("POST", "PUT", "PATCH", "DELETE"):
        # Login and logout endpoints handle their own credentials or CSRF
        if not request.url.path.endswith("/login") and not request.url.path.endswith("/logout"):
            csrf_header = request.headers.get("X-CSRF-Token")
            csrf_cookie = request.cookies.get("csrf_token")
            if not csrf_header or not csrf_cookie or not secrets.compare_digest(csrf_header, csrf_cookie):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token missing or invalid",
                )

    return {"username": user["username"], "role": user["role"]}


def require_roles(*allowed_roles: str):
    """Factory dependency to enforce role-based access control."""
    def _role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if not settings.AUTH_ENABLED:
            return user
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: role '{user.get('role')}' does not have permission for this resource",
            )
        return user
    return _role_checker

