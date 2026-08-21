from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    ENV: Literal["development", "test", "production"] = "development"
    PORT: int = 8000

    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "learning_management"

    # JWT — no default; a fallback secret here would be forgeable.
    JWT_SECRET: str
    JWT_REFRESH_SECRET: str
    JWT_AUTH_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    LLM_PROVIDER: Literal["nvidia", "anthropic", "openai", "gemini"]
    LLM_API_KEY: str
    LLM_MODEL: str = "openai/gpt-oss-20b"
    # Only needed for OpenAI-compatible providers with a non-default endpoint (NVIDIA, Gemini).
    LLM_BASE_URL: str | None = None

    BUBBLE_DETECTION_PROVIDER: Literal["opencv"] = "opencv"

    # Handwriting OCR (e.g. the submission header's NAME field) — Cloud Vision for now,
    # swappable for another provider later without touching any caller of IOcrService.
    OCR_PROVIDER: Literal["google_vision"] = "google_vision"
    VISION_API_KEY: str = ""

    # Object storage — "local" writes to disk for dev, no cloud credentials needed
    STORAGE_PROVIDER: Literal["local", "s3"] = "local"
    LOCAL_STORAGE_PATH: str = "./uploads"

    S3_BUCKET: str = ""
    S3_REGION: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""


settings = Settings()
