"""Redis cache helpers — simple get/set/delete with JSON serialisation."""
from __future__ import annotations

import json
from typing import Any

from redis.asyncio import Redis

from src.config import settings


async def cache_get(redis: Redis, key: str) -> Any:
    raw = await redis.get(key)
    if raw is None:
        return None
    return json.loads(raw)


async def cache_set(redis: Redis, key: str, value: Any, ttl: int | None = None) -> None:
    serialised = json.dumps(value, default=str)
    await redis.set(key, serialised, ex=ttl or settings.CACHE_TTL_SECONDS)


async def cache_delete(redis: Redis, key: str) -> None:
    await redis.delete(key)


async def cache_delete_pattern(redis: Redis, pattern: str) -> None:
    """Delete all keys matching a glob pattern (e.g. 'leaderboard:*')."""
    keys = await redis.keys(pattern)
    if keys:
        await redis.delete(*keys)


def leaderboard_key(metric: str, limit: int) -> str:
    return f"leaderboard:{metric}:{limit}"


def student_key(student_id: str) -> str:
    return f"student:{student_id}"


def funnel_key(funnel_id: str) -> str:
    return f"funnel:{funnel_id}"
