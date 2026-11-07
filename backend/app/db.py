"""Database pool and dependency for FastAPI."""
from typing import AsyncGenerator

from psycopg import AsyncConnection
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from fastapi import Request


async def create_pool(dsn: str) -> AsyncConnectionPool:
    """Create and return an async connection pool configured for resilience with serverless databases."""
    pool = AsyncConnectionPool(
        conninfo=dsn,
        min_size=1,
        max_size=10,
        open=False,
        check=AsyncConnectionPool.check_connection,
        max_idle=300.0,
        max_lifetime=1800.0,
        kwargs={"row_factory": dict_row, "autocommit": False},
    )
    await pool.open(wait=False)
    return pool


async def get_db(request: Request) -> AsyncGenerator[AsyncConnection, None]:
    """FastAPI dependency: yield a connection that auto-commits on success,
    auto-rolls-back on exception. Routers must NEVER call commit() themselves."""
    pool: AsyncConnectionPool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise ConnectionError("Database connection pool is not available")
    async with pool.connection() as conn:
        try:
            yield conn
            await conn.commit()
        except Exception:
            await conn.rollback()
            raise
