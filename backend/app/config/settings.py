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

    # Issued to every new student account created via POST /api/accounts/students/bulk.
    DEFAULT_STUDENT_PASSWORD: str

    LLM_PROVIDER: Literal["anthropic", "openai", "gemini"]
    LLM_API_KEY: str

    # Object storage
    S3_BUCKET: str
    S3_REGION: str
    S3_ACCESS_KEY_ID: str
    S3_SECRET_ACCESS_KEY: str


settings = Settings()
