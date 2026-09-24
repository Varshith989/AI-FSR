import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    APP_PORT: int = 8000
    TENANT_ENFORCEMENT: str = "strict"  # "strict" or "permissive"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://safefood_user:safefood_pass_2026@localhost:5432/safefood_db"
    ASYNC_DATABASE_URL: Optional[str] = None

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage (S3 / MinIO)
    S3_ENDPOINT_URL: Optional[str] = "http://localhost:9000"
    AWS_ACCESS_KEY_ID: str = "minioadmin"
    AWS_SECRET_ACCESS_KEY: str = "miniopassword"
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_NAME: str = "safefood-documents"

    # OpenSearch
    OPENSEARCH_HOST: str = "http://localhost:9200"
    OPENSEARCH_INDEX_PREFIX: str = "safefood_"

    # Security
    JWT_SECRET_KEY: str = "dev-insecure-secret-key-change-in-production-123456789"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MFA_ENFORCED: bool = False

    # AI & Embeddings
    LLM_PROVIDER: str = "mock"  # mock, openai, gemini, anthropic
    LLM_API_KEY: Optional[str] = None
    EMBEDDING_PROVIDER: str = "mock"
    EMBEDDING_API_KEY: Optional[str] = None
    EMBEDDING_DIMENSION: int = 1536
    AI_CONFIDENCE_THRESHOLD: float = 0.85

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
