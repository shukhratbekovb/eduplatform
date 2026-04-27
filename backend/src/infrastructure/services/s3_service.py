"""S3 / MinIO file storage service using aioboto3.

Upload flow (presigned URL strategy):
  1. Client calls POST /files/presign → gets {upload_url, s3_key, fields}
  2. Client uploads directly to S3 using presigned POST
  3. Client calls POST /files/confirm with s3_key → backend validates & records
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

import aioboto3

from src.config import settings

_ALLOWED_CONTENT_TYPES = {
    # Documents
    "application/pdf",
    # Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    # Audio
    "audio/mpeg",
    "audio/ogg",
    "audio/mp4",
    # Video
    "video/mp4",
    "video/webm",
    "video/quicktime",
    # Archives
    "application/zip",
}

_MAX_SIZE_BYTES = 200 * 1024 * 1024  # 200 MB


@dataclass
class PresignedUpload:
    s3_key: str
    upload_url: str
    fields: dict  # type: ignore[type-arg]
    expires_in: int


@dataclass
class FileInfo:
    s3_key: str
    url: str
    content_type: str
    size_bytes: int


class S3Service:
    def __init__(self) -> None:
        self._session = aioboto3.Session()
        self._bucket = settings.AWS_BUCKET_NAME
        self._endpoint = settings.AWS_ENDPOINT_URL

    def _client_kwargs(self) -> dict:  # type: ignore[type-arg]
        kw: dict = {  # type: ignore[type-arg]
            "region_name": settings.AWS_REGION,
            "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
        }
        if self._endpoint:
            kw["endpoint_url"] = self._endpoint
        return kw

    def _make_key(self, folder: str, filename: str) -> str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
        return f"{folder}/{uuid.uuid4()}.{ext}"

    async def generate_presigned_upload(
        self,
        folder: str,
        filename: str,
        content_type: str,
        expires_in: int = 900,  # 15 minutes
    ) -> PresignedUpload:
        if content_type not in _ALLOWED_CONTENT_TYPES:
            raise ValueError(f"Content type not allowed: {content_type!r}")

        s3_key = self._make_key(folder, filename)

        async with self._session.client("s3", **self._client_kwargs()) as s3:
            response = await s3.generate_presigned_post(
                Bucket=self._bucket,
                Key=s3_key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 1, _MAX_SIZE_BYTES],
                ],
                ExpiresIn=expires_in,
            )

        return PresignedUpload(
            s3_key=s3_key,
            upload_url=response["url"],
            fields=response["fields"],
            expires_in=expires_in,
        )

    async def generate_presigned_get(self, s3_key: str, expires_in: int = 3600) -> str:
        """Generate a presigned GET URL for downloading a private file."""
        async with self._session.client("s3", **self._client_kwargs()) as s3:
            url: str = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": s3_key},
                ExpiresIn=expires_in,
            )
        return url

    async def delete(self, s3_key: str) -> None:
        async with self._session.client("s3", **self._client_kwargs()) as s3:
            await s3.delete_object(Bucket=self._bucket, Key=s3_key)

    async def head(self, s3_key: str) -> FileInfo:
        """Get metadata for an already-uploaded file (used for confirmation)."""
        async with self._session.client("s3", **self._client_kwargs()) as s3:
            resp = await s3.head_object(Bucket=self._bucket, Key=s3_key)

        content_type = resp.get("ContentType", "application/octet-stream")
        size = resp.get("ContentLength", 0)

        # Build public/presigned URL
        if self._endpoint:
            url = f"{self._endpoint}/{self._bucket}/{s3_key}"
        else:
            url = f"https://{self._bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"

        return FileInfo(
            s3_key=s3_key,
            url=url,
            content_type=content_type,
            size_bytes=size,
        )


# Singleton — reuse the same session across requests
s3_service = S3Service()
