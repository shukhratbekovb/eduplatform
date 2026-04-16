"""File upload API — presigned URL pattern."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.api.dependencies import CurrentUser
from src.infrastructure.services.s3_service import s3_service

router = APIRouter(prefix="/files", tags=["Files"])

ALLOWED_FOLDERS = {"materials", "homework", "avatars", "receipts"}


class PresignRequest(BaseModel):
    folder: str          # e.g. "materials", "homework"
    filename: str
    content_type: str


class PresignResponse(BaseModel):
    s3_key: str
    upload_url: str
    fields: dict  # type: ignore[type-arg]
    expires_in: int


class ConfirmResponse(BaseModel):
    s3_key: str
    url: str
    content_type: str
    size_bytes: int


@router.post("/presign", response_model=PresignResponse)
async def presign_upload(body: PresignRequest, current_user: CurrentUser) -> PresignResponse:
    if body.folder not in ALLOWED_FOLDERS:
        raise HTTPException(status_code=400, detail=f"Folder must be one of {sorted(ALLOWED_FOLDERS)}")

    try:
        result = await s3_service.generate_presigned_upload(
            folder=body.folder,
            filename=body.filename,
            content_type=body.content_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return PresignResponse(
        s3_key=result.s3_key,
        upload_url=result.upload_url,
        fields=result.fields,
        expires_in=result.expires_in,
    )


@router.get("/presign/{s3_key:path}", response_model=dict)  # type: ignore[type-arg]
async def presign_download(s3_key: str, current_user: CurrentUser) -> dict:  # type: ignore[type-arg]
    """Generate a short-lived presigned GET URL for downloading a file."""
    try:
        url = await s3_service.generate_presigned_get(s3_key)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return {"url": url}


@router.post("/confirm/{s3_key:path}", response_model=ConfirmResponse)
async def confirm_upload(s3_key: str, current_user: CurrentUser) -> ConfirmResponse:
    """Call after a successful presigned upload to verify the file exists on S3."""
    try:
        info = await s3_service.head(s3_key)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found on S3 — upload may have failed")
    return ConfirmResponse(
        s3_key=info.s3_key,
        url=info.url,
        content_type=info.content_type,
        size_bytes=info.size_bytes,
    )
