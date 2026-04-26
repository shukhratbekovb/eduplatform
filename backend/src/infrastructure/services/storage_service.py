"""Google Cloud Storage service for file uploads.

Upload flow:
  1. Client sends file via multipart POST to /files/upload
  2. Backend uploads to GCS, returns signed URL + metadata
  3. Signed URLs expire after 7 days — client can request fresh URL via /files/url/{key}
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import timedelta

from src.config import settings


@dataclass
class UploadResult:
    s3_key: str
    url: str
    content_type: str
    size_bytes: int
    filename: str


class StorageService:
    SIGNED_URL_EXPIRY = timedelta(days=7)

    def __init__(self) -> None:
        self._client = None
        self._bucket_obj = None

    def _get_client(self):
        if self._client is None:
            from google.cloud import storage as gcs
            if settings.GCS_CREDENTIALS_JSON:
                self._client = gcs.Client.from_service_account_json(settings.GCS_CREDENTIALS_JSON)
            else:
                self._client = gcs.Client()
        return self._client

    def _get_bucket(self):
        if self._bucket_obj is None:
            self._bucket_obj = self._get_client().bucket(settings.GCS_BUCKET_NAME)
        return self._bucket_obj

    def _make_key(self, folder: str, filename: str) -> str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
        return f"{folder}/{uuid.uuid4()}.{ext}"

    def _signed_url(self, key: str, filename: str | None = None) -> str:
        """Generate a signed URL for reading a blob with Content-Disposition: attachment."""
        bucket = self._get_bucket()
        blob = bucket.blob(key)
        disposition = f'attachment; filename="{filename}"' if filename else "attachment"
        return blob.generate_signed_url(
            version="v4",
            expiration=self.SIGNED_URL_EXPIRY,
            method="GET",
            response_disposition=disposition,
        )

    def upload(self, folder: str, filename: str, data: bytes, content_type: str) -> UploadResult:
        key = self._make_key(folder, filename)
        bucket = self._get_bucket()
        blob = bucket.blob(key)
        blob.upload_from_string(data, content_type=content_type)
        url = self._signed_url(key, filename)
        return UploadResult(
            s3_key=key,
            url=url,
            content_type=content_type,
            size_bytes=len(data),
            filename=filename,
        )

    def get_download_url(self, key: str, filename: str | None = None) -> str:
        """Get a fresh signed URL for an existing file."""
        return self._signed_url(key, filename)

    def download(self, key: str) -> tuple[bytes, str]:
        """Download file content and return (data, content_type)."""
        bucket = self._get_bucket()
        blob = bucket.blob(key)
        blob.reload()
        data = blob.download_as_bytes()
        return data, blob.content_type or "application/octet-stream"

    def delete(self, key: str) -> None:
        bucket = self._get_bucket()
        blob = bucket.blob(key)
        blob.delete()


storage_service = StorageService()
