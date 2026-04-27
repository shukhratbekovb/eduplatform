"""File upload API — direct multipart upload to Google Cloud Storage."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from src.api.dependencies import CurrentUser
from src.infrastructure.services.storage_service import storage_service

router = APIRouter(prefix="/files", tags=["Files"])

ALLOWED_FOLDERS = {"materials", "homework", "avatars", "receipts", "documents"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


class FileResponse(BaseModel):
    key: str
    url: str
    filename: str
    contentType: str
    sizeBytes: int


@router.post("/upload", response_model=FileResponse)
async def upload_file(
    current_user: CurrentUser,
    file: UploadFile = File(...),
    folder: str = Form(default="materials"),
) -> FileResponse:
    if folder not in ALLOWED_FOLDERS:
        raise HTTPException(status_code=400, detail=f"Folder must be one of {sorted(ALLOWED_FOLDERS)}")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB)")
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "file"

    try:
        result = storage_service.upload(folder, filename, data, content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    return FileResponse(
        key=result.s3_key,
        url=result.url,
        filename=result.filename,
        contentType=result.content_type,
        sizeBytes=result.size_bytes,
    )


@router.get("/url")
async def get_download_url(
    current_user: CurrentUser,
    key: str,
    filename: str | None = Query(None),
) -> dict:
    """Get a fresh signed download URL for a file by its storage key."""
    try:
        url = storage_service.get_download_url(key, filename)
        return {"url": url, "key": key}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {e}")


@router.get("/download")
async def download_file(
    current_user: CurrentUser,
    key: str,
    filename: str | None = Query(None),
) -> Response:
    """Proxy-download: streams file content directly from GCS through the backend."""
    try:
        data, content_type = storage_service.download(key)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {e}")

    safe_name = filename or key.rsplit("/", 1)[-1]
    from urllib.parse import quote

    encoded_name = quote(safe_name)
    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}",
        },
    )


@router.post("/upload-multiple", response_model=list[FileResponse])
async def upload_multiple_files(
    current_user: CurrentUser,
    files: list[UploadFile] = File(...),
    folder: str = Form(default="materials"),
) -> list[FileResponse]:
    if folder not in ALLOWED_FOLDERS:
        raise HTTPException(status_code=400, detail=f"Folder must be one of {sorted(ALLOWED_FOLDERS)}")

    results = []
    for f in files:
        data = await f.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File {f.filename} too large (max 50 MB)")
        if len(data) == 0:
            continue

        content_type = f.content_type or "application/octet-stream"
        filename = f.filename or "file"

        try:
            result = storage_service.upload(folder, filename, data, content_type)
            results.append(
                FileResponse(
                    key=result.s3_key,
                    url=result.url,
                    filename=result.filename,
                    contentType=result.content_type,
                    sizeBytes=result.size_bytes,
                )
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Upload failed for {filename}: {e}")

    return results
