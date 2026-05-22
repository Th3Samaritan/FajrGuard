import httpx

BASE_URL = "https://api.aladhan.com/v1/timings"

async def fetch_prayer_times(lat: float, lng: float, date: str = None, method: int = 2) -> dict:
    from datetime import date as dt_date
    date_str = date or dt_date.today().isoformat()

    url = f"{BASE_URL}/{date_str}?latitude={lat}&longitude={lng}&method={method}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()

    timings = data.get("data", {}).get("timings", {})
    return {
        "fajr": timings.get("Fajr", ""),
        "dhuhr": timings.get("Dhuhr", ""),
        "asr": timings.get("Asr", ""),
        "maghrib": timings.get("Maghrib", ""),
        "isha": timings.get("Isha", ""),
    }

async def fetch_prayer_times_by_city(city: str, country: str = "", method: int = 2) -> dict:
    from datetime import date as dt_date
    date_str = dt_date.today().isoformat()

    url = f"{BASE_URL}/{date_str}ByCity?city={city}&country={country}&method={method}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()

    timings = data.get("data", {}).get("timings", {})
    return {
        "fajr": timings.get("Fajr", ""),
        "dhuhr": timings.get("Dhuhr", ""),
        "asr": timings.get("Asr", ""),
        "maghrib": timings.get("Maghrib", ""),
        "isha": timings.get("Isha", ""),
    }
