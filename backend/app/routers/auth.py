"""Authentication endpoints: login, logout, me, verify, with sliding-window rate limiting."""
import time
from collections import defaultdict
from typing import Dict, List
from fastapi import APIRouter, Request, Response, HTTPException, status, Depends
from pydantic import BaseModel

from app.auth import (
    get_user_by_username,
    verify_password,
    create_access_token,
    generate_csrf_token,
    set_auth_cookies,
    clear_auth_cookies,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# In-memory sliding-window rate limiter for failed login attempts
# Tracks timestamp (float) of each failed attempt per IP and per username
_failed_ip_attempts: Dict[str, List[float]] = defaultdict(list)
_failed_user_attempts: Dict[str, List[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60.0  # 60 seconds
RATE_LIMIT_MAX_FAILED_ATTEMPTS = 5


def get_client_ip(request: Request) -> str:
    """Extract client address using the proxy-aware request.client host.
    Stop blindly trusting untrusted X-Forwarded-For headers from the client."""
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def _prune_stale_records(now: float) -> None:
    """Remove expired records to prevent unbounded memory growth."""
    cutoff = now - RATE_LIMIT_WINDOW
    stale_ips = [ip for ip, attempts in _failed_ip_attempts.items() if not attempts or attempts[-1] <= cutoff]
    for ip in stale_ips:
        _failed_ip_attempts.pop(ip, None)

    stale_users = [u for u, attempts in _failed_user_attempts.items() if not attempts or attempts[-1] <= cutoff]
    for u in stale_users:
        _failed_user_attempts.pop(u, None)


def check_rate_limit(ip: str, username: str = "") -> None:
    """Enforce maximum 5 failed login attempts per client IP or per username within 60 seconds."""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW

    # Check IP rate limit
    active_ip_attempts = [t for t in _failed_ip_attempts[ip] if t > cutoff]
    _failed_ip_attempts[ip] = active_ip_attempts
    if len(active_ip_attempts) >= RATE_LIMIT_MAX_FAILED_ATTEMPTS:
        retry_after = max(1, int(RATE_LIMIT_WINDOW - (now - active_ip_attempts[0])) + 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    # Check Username rate limit
    normalized_user = username.strip().lower() if username else ""
    if normalized_user:
        active_user_attempts = [t for t in _failed_user_attempts[normalized_user] if t > cutoff]
        _failed_user_attempts[normalized_user] = active_user_attempts
        if len(active_user_attempts) >= RATE_LIMIT_MAX_FAILED_ATTEMPTS:
            retry_after = max(1, int(RATE_LIMIT_WINDOW - (now - active_user_attempts[0])) + 1)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts for this account. Please try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )


def record_failed_attempt(ip: str, username: str = "") -> None:
    """Record a failed login attempt for the given IP and username, and clean up old entries."""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW

    active_ip = [t for t in _failed_ip_attempts[ip] if t > cutoff]
    active_ip.append(now)
    _failed_ip_attempts[ip] = active_ip

    normalized_user = username.strip().lower() if username else ""
    if normalized_user:
        active_user = [t for t in _failed_user_attempts[normalized_user] if t > cutoff]
        active_user.append(now)
        _failed_user_attempts[normalized_user] = active_user

    if len(_failed_ip_attempts) > 200 or len(_failed_user_attempts) > 200:
        _prune_stale_records(now)


def clear_failed_attempts(ip: str, username: str = "") -> None:
    """Reset failed attempts upon successful login."""
    _failed_ip_attempts.pop(ip, None)
    normalized_user = username.strip().lower() if username else ""
    if normalized_user:
        _failed_user_attempts.pop(normalized_user, None)


def reset_rate_limiter() -> None:
    """Utility to clear all rate limiter state (used in testing)."""
    _failed_ip_attempts.clear()
    _failed_user_attempts.clear()


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthUserResponse(BaseModel):
    username: str
    role: str


class LoginResponse(BaseModel):
    username: str
    role: str
    access_token: str
    csrf_token: str


class VerifyResponse(BaseModel):
    valid: bool
    username: str
    role: str


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request, response: Response):
    """Authenticate user with username and password, issuing JWT in cookie and body."""
    client_ip = get_client_ip(request)
    check_rate_limit(client_ip, payload.username)

    user = get_user_by_username(payload.username)
    if not user or not verify_password(user["password_hash"], payload.password):
        record_failed_attempt(client_ip, payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Successful login: reset failed attempts for this client IP and username
    clear_failed_attempts(client_ip, payload.username)

    token = create_access_token({"username": user["username"], "role": user["role"]})
    csrf_token = generate_csrf_token()
    set_auth_cookies(response, token, csrf_token)

    return {
        "username": user["username"],
        "role": user["role"],
        "access_token": token,
        "csrf_token": csrf_token,
    }


@router.get("/me", response_model=AuthUserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return currently authenticated user information."""
    return current_user


@router.get("/verify", response_model=VerifyResponse)
async def verify_session(current_user: dict = Depends(get_current_user)):
    """Verify currently active session token."""
    return {
        "valid": True,
        "username": current_user["username"],
        "role": current_user["role"],
    }


@router.post("/logout")
async def logout(response: Response):
    """Clear authentication cookies and end session."""
    clear_auth_cookies(response)
    return {"status": "logged_out"}

