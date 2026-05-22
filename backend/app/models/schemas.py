from pydantic import BaseModel
from typing import Optional

class PrayerTimesResponse(BaseModel):
    fajr: str
    dhuhr: str
    asr: str
    maghrib: str
    isha: str

class PrayerTimesByCityRequest(BaseModel):
    city: str
    country: str = ""
    method: int = 2

class DatasetContribution(BaseModel):
    label: str
    image_url: Optional[str] = None

class DatasetStats(BaseModel):
    total_wet: int
    total_dry: int
    contributors: int
