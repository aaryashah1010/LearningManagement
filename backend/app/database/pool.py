import asyncio
from collections.abc import Generator, Sequence
from contextlib import contextmanager
from typing import Any

from mysql.connector import Error as MySQLError
from mysql.connector import pooling
from mysql.connector.pooling import PooledMySQLConnection

from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger("database")

_pool: pooling.MySQLConnectionPool | None = None


def get_pool() -> pooling.MySQLConnectionPool:
    # Setting conn.autocommit after get_connection() doesn't reliably reach the server on pooled connections.
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="lm_pool",
            pool_size=10,
            autocommit=True,
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
        )
    return _pool


async def connect_to_database(retries: int = 10, delay_seconds: float = 2.0) -> None:
    for attempt in range(1, retries + 1):
        try:
            get_pool().get_connection().close()
            logger.info(f"Database pool connected successfully to database: {settings.DB_NAME}")
            return
        except MySQLError as e:
            if attempt == retries:
                logger.error(f"Database connection failed after {retries} attempts: {e}")
                raise
            logger.warning(f"Database connection attempt {attempt}/{retries} failed: {e}")
            await asyncio.sleep(delay_seconds)


def fetch_all(query: str, params: Sequence[Any] = ()) -> list[dict]:
    conn = get_pool().get_connection()
    try:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()
    finally:
        conn.close()


def fetch_one(query: str, params: Sequence[Any] = ()) -> dict | None:
    conn = get_pool().get_connection()
    try:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(query, params)
            return cursor.fetchone()
    finally:
        conn.close()


def execute(query: str, params: Sequence[Any] = ()) -> int:
    conn = get_pool().get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            return cursor.lastrowid
    finally:
        conn.close()


@contextmanager
def transaction() -> Generator[PooledMySQLConnection, None, None]:
    # start_transaction()/commit()/rollback(), not conn.autocommit — reliable on a pooled connection.
    # Use conn's own cursor inside this block — fetch_all/fetch_one/execute grab a different connection.
    conn = get_pool().get_connection()
    try:
        conn.start_transaction()
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
