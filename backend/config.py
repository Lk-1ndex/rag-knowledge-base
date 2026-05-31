from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """集中读取环境变量，避免配置散落在业务代码里。"""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    deepseek_api_key: str = Field("", alias="DEEPSEEK_API_KEY")
    deepseek_base_url: str = Field("https://api.deepseek.com", alias="DEEPSEEK_BASE_URL")
    deepseek_embedding_model: str = Field("text-embedding-3-small", alias="DEEPSEEK_EMBEDDING_MODEL")
    deepseek_chat_model: str = Field("deepseek-v4-pro", alias="DEEPSEEK_CHAT_MODEL")
    deepseek_thinking_mode: str = Field("non-think", alias="DEEPSEEK_THINKING_MODE")

    openai_api_key: str = Field("", alias="OPENAI_API_KEY")
    openai_base_url: str = Field("", alias="OPENAI_BASE_URL")
    openai_embedding_model: str = Field("", alias="OPENAI_EMBEDDING_MODEL")
    openai_chat_model: str = Field("", alias="OPENAI_CHAT_MODEL")
    openai_wire_api: str = Field("chat_completions", alias="OPENAI_WIRE_API")
    openai_reasoning_effort: str = Field("", alias="OPENAI_REASONING_EFFORT")
    openai_disable_response_storage: bool = Field(True, alias="OPENAI_DISABLE_RESPONSE_STORAGE")

    secret_key: str = Field("dev-only-change-me", alias="SECRET_KEY")
    jwt_expire_days: int = Field(7, alias="JWT_EXPIRE_DAYS")

    admin_username: str = Field("admin", alias="ADMIN_USERNAME")
    admin_password: str = Field("ChangeMe123456", alias="ADMIN_PASSWORD")

    qdrant_host: str = Field("localhost", alias="QDRANT_HOST")
    qdrant_port: int = Field(6333, alias="QDRANT_PORT")
    qdrant_collection: str = Field("research_kb", alias="QDRANT_COLLECTION")
    qdrant_vector_size: int = 1536

    redis_url: str = Field("redis://localhost:6379/0", alias="REDIS_URL")
    rate_limit_per_minute: int = Field(30, alias="RATE_LIMIT_PER_MINUTE")
    max_auth_failures: int = Field(5, alias="MAX_AUTH_FAILURES")
    auth_ban_minutes: int = Field(15, alias="AUTH_BAN_MINUTES")

    max_file_size_mb: int = Field(50, alias="MAX_FILE_SIZE_MB")
    upload_dir: str = Field("data/uploads", alias="UPLOAD_DIR")
    sqlite_path: str = Field("data/sqlite/db.sqlite3", alias="SQLITE_PATH")

    app_title: str = Field("研究组知识库", alias="APP_TITLE")
    allowed_origins: str = Field("http://localhost:5173,http://localhost", alias="ALLOWED_ORIGINS")
    default_top_k: int = Field(5, alias="DEFAULT_TOP_K")
    default_chunk_size: int = Field(800, alias="DEFAULT_CHUNK_SIZE")
    default_chunk_overlap: int = Field(150, alias="DEFAULT_CHUNK_OVERLAP")

    @field_validator("deepseek_thinking_mode")
    @classmethod
    def validate_thinking_mode(cls, value: str) -> str:
        if value not in {"non-think", "think-high", "think-max"}:
            raise ValueError("DEEPSEEK_THINKING_MODE 只能是 non-think / think-high / think-max")
        return value

    @property
    def database_url(self) -> str:
        db_path = Path(self.sqlite_path)
        if not db_path.is_absolute():
            db_path = db_path.resolve()
        return f"sqlite+aiosqlite:///{db_path.as_posix()}"

    @property
    def origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)

    @property
    def provider_api_key(self) -> str:
        return self.openai_api_key or self.deepseek_api_key

    @property
    def provider_base_url(self) -> str:
        return self.openai_base_url or self.deepseek_base_url

    @property
    def embedding_model(self) -> str:
        return self.openai_embedding_model or self.deepseek_embedding_model

    @property
    def chat_model(self) -> str:
        return self.openai_chat_model or self.deepseek_chat_model


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
