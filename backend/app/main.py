"""PDF Symbol Extractor - FastAPI Application"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import init_db
from app.core.config import settings
from app.api import upload, symbols, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and output directory on startup."""
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    await init_db()
    yield


app = FastAPI(
    title="PDF Symbol Extractor",
    description="Extract symbols from PDFs using computer vision",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static output files
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
app.mount("/output", StaticFiles(directory=settings.OUTPUT_DIR), name="output")

# Routers
app.include_router(health.router, tags=["health"])
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(symbols.router, prefix="/api", tags=["symbols"])
