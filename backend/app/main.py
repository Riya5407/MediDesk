"""MediDesk FastAPI application."""
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from psycopg.errors import DatabaseError

from app.config import settings
from app.db import create_pool
from app.errors import NotFoundError, db_exception_handler
from app.routers import (
    auth,
    meta,
    medicines,
    batches,
    employees,
    customers,
    suppliers,
    sales,
    purchase_orders,
    prescriptions,
    dashboard,
    reports,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create the connection pool on startup if DB is reachable, close it on shutdown."""
    try:
        app.state.pool = await asyncio.wait_for(create_pool(settings.DATABASE_URL), timeout=15.0)
    except Exception:
        app.state.pool = None
    yield
    if getattr(app.state, "pool", None) is not None:
        await app.state.pool.close()


is_prod = settings.ENVIRONMENT.lower() in ("production", "prod")

app = FastAPI(
    title="MediDeck API",
    lifespan=lifespan,
    docs_url=None if is_prod else "/docs",
    redoc_url=None if is_prod else "/redoc",
    openapi_url=None if is_prod else "/openapi.json",
)

# CORS configuration supporting credentials (cookies)
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(NotFoundError, db_exception_handler)
app.add_exception_handler(DatabaseError, db_exception_handler)
app.add_exception_handler(Exception, db_exception_handler)

# Routers
app.include_router(auth.router)
app.include_router(meta.router)
app.include_router(medicines.router)
app.include_router(batches.router)
app.include_router(employees.router)
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(sales.router)
app.include_router(purchase_orders.router)
app.include_router(prescriptions.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
