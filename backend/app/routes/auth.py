from fastapi import APIRouter, Header, HTTPException
from ..config import settings
from supabase import create_client

router = APIRouter()

@router.get("/auth/verify")
async def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.replace("Bearer ", "")
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_service_key)
        user = supabase.auth.get_user(token)
        return {"valid": True, "user_id": user.user.id}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
