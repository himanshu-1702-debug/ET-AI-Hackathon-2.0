from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.services.seed import run_seed_if_needed

app = FastAPI(
    title="Plant Brain API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.on_event("startup")
def seed_on_startup():
    run_seed_if_needed()


@app.get("/")
def root():
    return {
        "service": "Plant Brain API",
        "status": "running",
        "llm_configured": settings.has_valid_key,
        "docs": "/docs",
    }
