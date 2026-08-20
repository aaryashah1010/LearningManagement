from pathlib import Path
from typing import Protocol

from app.config.settings import settings
from app.utils.errors import ERRORS, AppError
from app.utils.result import Result, err, ok


class IStorageService(Protocol):
    async def upload(self, file: bytes, key: str, content_type: str) -> Result[str, "AppError"]: ...


class LocalStorageService:
    """Writes to local disk under settings.LOCAL_STORAGE_PATH. Dev/test only — not
    durable across deploys, not what production should run on."""

    async def upload(self, file: bytes, key: str, content_type: str) -> Result[str, "AppError"]:
        if ".." in key or key.startswith("/"):
            return err(ERRORS["STORAGE_UPLOAD_FAILED"])
        try:
            path = Path(settings.LOCAL_STORAGE_PATH) / key
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(file)
        except OSError:
            return err(ERRORS["STORAGE_UPLOAD_FAILED"])
        return ok(str(path))


class S3StorageService:
    """Not implemented — no S3 credentials configured yet. Same interface as
    LocalStorageService; swap in via STORAGE_PROVIDER once real credentials exist."""

    async def upload(self, file: bytes, key: str, content_type: str) -> Result[str, "AppError"]:
        raise NotImplementedError("S3StorageService not implemented yet — see backend-architecture.md § 5")


def get_storage_service() -> IStorageService:
    if settings.STORAGE_PROVIDER == "local":
        return LocalStorageService()
    if settings.STORAGE_PROVIDER == "s3":
        return S3StorageService()
    raise ValueError(f"Unknown STORAGE_PROVIDER: {settings.STORAGE_PROVIDER}")
