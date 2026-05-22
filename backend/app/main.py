from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import prayer_times, auth, dataset, health

app = FastAPI(
    title="FajrGuard API",
    description="Backend for FajrGuard - Islamic prayer reminder with wudu verification",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(prayer_times.router, prefix="/api/v1", tags=["prayer-times"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(dataset.router, prefix="/api/v1", tags=["dataset"])
