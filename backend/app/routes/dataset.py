from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from ..config import settings
from supabase import create_client
import uuid
import hashlib

router = APIRouter()

@router.post("/dataset/contribute")
async def contribute_to_dataset(
    image: UploadFile = File(...),
    label: str = Form(...),
    authorization: str = Form(""),
):
    if label not in ("wet", "dry"):
        raise HTTPException(status_code=400, detail="Label must be 'wet' or 'dry'")

    contents = await image.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 2MB")

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    file_id = str(uuid.uuid4())
    content_hash = hashlib.md5(contents).hexdigest()

    bucket = "dataset"
    path = f"{label}/{file_id}.jpg"
    supabase.storage.from_(bucket).upload(path, contents, {
        "content-type": "image/jpeg",
    })

    return {
        "status": "success",
        "file_id": file_id,
        "label": label,
        "hash": content_hash,
    }

@router.get("/dataset/stats")
async def get_dataset_stats():
    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    wet_files = supabase.storage.from_("dataset").list("wet")
    dry_files = supabase.storage.from_("dataset").list("dry")

    return {
        "total_wet": len(wet_files),
        "total_dry": len(dry_files),
        "contributors": 0,
    }
