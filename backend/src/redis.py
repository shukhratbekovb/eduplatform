import redis.asyncio as aioredis

from src.config import settings

# Глобальный пул соединений
redis_pool = aioredis.ConnectionPool.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
    max_connections=20,
)


def get_redis() -> aioredis.Redis:
    """FastAPI dependency: возвращает Redis клиент из пула."""
    return aioredis.Redis(connection_pool=redis_pool)
