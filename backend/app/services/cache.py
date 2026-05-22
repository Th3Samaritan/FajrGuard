import json
from typing import Optional

_cache_store: dict = {}

async def get_cached(key: str) -> Optional[dict]:
    return _cache_store.get(key)

async def set_cached(key: str, value: dict, ttl: int = 3600) -> None:
    _cache_store[key] = value
