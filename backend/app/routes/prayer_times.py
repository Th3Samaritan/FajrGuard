from fastapi import APIRouter, Query
from ..services.aladhan import fetch_prayer_times, fetch_prayer_times_by_city
from ..services.cache import get_cached, set_cached

router = APIRouter()

@router.get("/prayer-times")
async def get_prayer_times(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    date: str = Query(None, description="Date in YYYY-MM-DD format"),
    method: int = Query(2, description="Calculation method"),
):
    cache_key = f"prayer_times:{lat}:{lng}:{date}:{method}"
    cached = await get_cached(cache_key)
    if cached:
        return cached

    data = await fetch_prayer_times(lat, lng, date, method)
    await set_cached(cache_key, data, ttl=86400)
    return data

@router.get("/prayer-times/city")
async def get_prayer_times_city(
    city: str = Query(..., description="City name"),
    country: str = Query("", description="Country code"),
    method: int = Query(2, description="Calculation method"),
):
    cache_key = f"prayer_times_city:{city}:{country}:{method}"
    cached = await get_cached(cache_key)
    if cached:
        return cached

    data = await fetch_prayer_times_by_city(city, country, method)
    await set_cached(cache_key, data, ttl=86400)
    return data
