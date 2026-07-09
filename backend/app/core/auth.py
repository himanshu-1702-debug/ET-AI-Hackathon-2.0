import time
import jwt
from fastapi import Header, HTTPException, Depends

from app.core.config import settings

JWT_SECRET = settings.ANTHROPIC_API_KEY[:16] if settings.has_valid_key else "dev-secret-change-me"
JWT_ALGORITHM = "HS256"
TOKEN_TTL_SECONDS = 8 * 60 * 60

PERMISSIONS = {
    "maintenance_lead": {
        "documents:upload", "copilot:query", "rca:run", "onboarding:generate",
        "audit:view", "jobs:view",
    },
    "compliance_officer": {
        "documents:upload", "copilot:query", "compliance:check", "compliance:evidence",
        "findings:acknowledge", "audit:view", "jobs:view", "jobs:replay",
    },
    "safety_officer": {
        "documents:upload", "copilot:query", "rca:run", "lessons:scan",
        "findings:acknowledge", "audit:view", "jobs:view",
    },
    "plant_manager": {
        "documents:upload", "copilot:query", "compliance:check", "compliance:evidence",
        "rca:run", "lessons:scan", "onboarding:generate", "findings:acknowledge",
        "audit:view", "jobs:view", "jobs:replay", "system:reset", "system:observability",
    },
}

DEMO_USERS = {
    "maintenance.lead": {"password": "demo123", "role": "maintenance_lead", "name": "R. Sharma"},
    "compliance.officer": {"password": "demo123", "role": "compliance_officer", "name": "A. Nair"},
    "safety.officer": {"password": "demo123", "role": "safety_officer", "name": "K. Reddy"},
    "plant.manager": {"password": "demo123", "role": "plant_manager", "name": "S. Iyer"},
}


def authenticate(username: str, password: str) -> dict:
    user = DEMO_USERS.get(username)
    if not user or user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    payload = {
        "sub": username,
        "role": user["role"],
        "name": user["name"],
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token, "role": user["role"], "name": user["name"], "username": username}


def verify_token(authorization: str = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session token.")
    return payload


def require_role(*allowed_roles: str):
    def checker(user: dict = Depends(verify_token)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"This action requires one of: {', '.join(allowed_roles)}.")
        return user
    return checker


def require_permission(permission: str):
    def checker(user: dict = Depends(verify_token)) -> dict:
        role_permissions = PERMISSIONS.get(user["role"], set())
        if permission not in role_permissions:
            raise HTTPException(status_code=403, detail=f"Your role does not have the '{permission}' permission.")
        return user
    return checker
