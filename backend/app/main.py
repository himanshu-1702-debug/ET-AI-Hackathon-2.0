import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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


@app.exception_handler(Exception)
async def catch_all_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled error on {request.url.path}: {exc}")
    traceback.print_exc()
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Something went wrong: {str(exc)[:200]}"},
    )
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


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
