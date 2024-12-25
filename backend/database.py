import os
import asyncpg
import logging
from typing import Any, List, Optional, Union
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get DATABASE_URL from environment variables with a fallback
DATABASE_URL = os.getenv('DATABASE_URL')
print(DATABASE_URL)

class Database:
    _pool: Optional[asyncpg.Pool] = None
    _min_size: int = 2
    _max_size: int = 10
    _timeout: float = 30.0  # Connection timeout in seconds

    @classmethod
    async def get_pool(cls) -> asyncpg.Pool:
        """Get or create the database connection pool"""
        if cls._pool is None:
            try:
                cls._pool = await asyncpg.create_pool(
                    DATABASE_URL,
                    min_size=cls._min_size,
                    max_size=cls._max_size,
                    timeout=cls._timeout,
                    command_timeout=cls._timeout
                )
                logger.info("Database connection pool created successfully")
            except Exception as e:
                logger.error(f"Failed to create database pool: {str(e)}")
                raise
        return cls._pool

    @classmethod
    async def execute(cls, query: str, *args, timeout: Optional[float] = None) -> str:
        """Execute a SQL query and return the status"""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            try:
                return await conn.execute(query, *args, timeout=timeout)
            except asyncpg.PostgresError as e:
                logger.error(f"Database execution error: {str(e)}\nQuery: {query}")
                raise

    @classmethod
    async def fetch(cls, query: str, *args, timeout: Optional[float] = None) -> List[asyncpg.Record]:
        """Fetch all rows from a query"""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            try:
                return await conn.fetch(query, *args, timeout=timeout)
            except asyncpg.PostgresError as e:
                logger.error(f"Database fetch error: {str(e)}\nQuery: {query}")
                raise

    @classmethod
    async def fetchrow(cls, query: str, *args, timeout: Optional[float] = None) -> Optional[asyncpg.Record]:
        """Fetch a single row from a query"""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            try:
                return await conn.fetchrow(query, *args, timeout=timeout)
            except asyncpg.PostgresError as e:
                logger.error(f"Database fetchrow error: {str(e)}\nQuery: {query}")
                raise

    @classmethod
    async def fetchval(cls, query: str, *args, timeout: Optional[float] = None) -> Any:
        """Fetch a single value from a query"""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            try:
                return await conn.fetchval(query, *args, timeout=timeout)
            except asyncpg.PostgresError as e:
                logger.error(f"Database fetchval error: {str(e)}\nQuery: {query}")
                raise

    @classmethod
    async def transaction(cls) -> asyncpg.Connection:
        """Get a connection for transaction management"""
        pool = await cls.get_pool()
        return await pool.acquire()

async def init_db() -> None:
    """Initialize the database connection pool"""
    try:
        await Database.get_pool()
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise

async def close_db() -> None:
    """Close the database connection pool"""
    if Database._pool:
        try:
            await Database._pool.close()
            Database._pool = None
            logger.info("Database connection pool closed successfully")
        except Exception as e:
            logger.error(f"Error closing database pool: {str(e)}")
            raise