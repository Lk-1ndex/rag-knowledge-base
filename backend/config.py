from functools import lru_cache
import os
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

os.environ.setdefault("NO_PROXY", "localhost,127.0.0.1")


class Settings(BaseSettings):
    """集中读取环境变量，避免配置散落在业务代码里。

    设计要点：
    - LLM 默认走 DeepSeek 官方；保留 OPENAI_* 作为可选网关（设置后优先）。
    - Embedding 完全独立，走硅基流动托管的 BGE-M3（免费，OpenAI 兼容），与 LLM 不共用 base_url。
      原因：DeepSeek 官方不提供 embedding 接口，向量化交由专门的 embedding 服务负责；
      用托管 API 而非本地模型，云端部署无需 GPU。
    """

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ===== LLM：DeepSeek 官方（默认）=====
    deepseek_api_key: str = Field("", alias="DEEPSEEK_API_KEY")
    deepseek_base_url: str = Field("https://api.deepseek.com", alias="DEEPSEEK_BASE_URL")
    deepseek_chat_model: str = Field("deepseek-v4-flash", alias="DEEPSEEK_CHAT_MODEL")
    # 思考模式：off（快速，默认）/ on（多步推理，配合 reasoning_effort）
    deepseek_thinking_mode: str = Field("off", alias="DEEPSEEK_THINKING_MODE")
    deepseek_reasoning_effort: str = Field("high", alias="DEEPSEEK_REASONING_EFFORT")

    # ===== LLM：可选 OpenAI 兼容网关（设置 OPENAI_API_KEY 后优先于 DeepSeek）=====
    openai_api_key: str = Field("", alias="OPENAI_API_KEY")
    openai_base_url: str = Field("", alias="OPENAI_BASE_URL")
    openai_chat_model: str = Field("", alias="OPENAI_CHAT_MODEL")
    # 协议：chat_completions（DeepSeek/多数网关）/ responses（OpenAI 新接口）
    openai_wire_api: str = Field("chat_completions", alias="OPENAI_WIRE_API")
    openai_reasoning_effort: str = Field("", alias="OPENAI_REASONING_EFFORT")
    openai_disable_response_storage: bool = Field(True, alias="OPENAI_DISABLE_RESPONSE_STORAGE")

    # ===== Embedding：硅基流动托管 BGE-M3（免费，OpenAI 兼容），与 LLM 独立 =====
    embedding_base_url: str = Field("https://api.siliconflow.cn/v1", alias="EMBEDDING_BASE_URL")
    embedding_api_key: str = Field("", alias="EMBEDDING_API_KEY")
    embedding_model: str = Field("BAAI/bge-m3", alias="EMBEDDING_MODEL")
    # BGE-M3 输出 1024 维；换模型时必须同步修改，并与 Qdrant collection 维度一致
    embedding_dim: int = Field(1024, alias="EMBEDDING_DIM")
    embedding_batch_size: int = Field(32, alias="EMBEDDING_BATCH_SIZE")

    secret_key: str = Field("dev-only-change-me", alias="SECRET_KEY")
    jwt_expire_days: int = Field(7, alias="JWT_EXPIRE_DAYS")
    # 生产环境务必置 true（仅 HTTPS 传输 Cookie）
    cookie_secure: bool = Field(False, alias="COOKIE_SECURE")

    admin_username: str = Field("admin", alias="ADMIN_USERNAME")
    admin_password: str = Field("ChangeMe123456", alias="ADMIN_PASSWORD")

    qdrant_host: str = Field("localhost", alias="QDRANT_HOST")
    qdrant_port: int = Field(6333, alias="QDRANT_PORT")
    qdrant_collection: str = Field("research_kb", alias="QDRANT_COLLECTION")

    redis_url: str = Field("redis://localhost:6379/0", alias="REDIS_URL")
    rate_limit_per_minute: int = Field(30, alias="RATE_LIMIT_PER_MINUTE")
    max_auth_failures: int = Field(5, alias="MAX_AUTH_FAILURES")
    auth_ban_minutes: int = Field(15, alias="AUTH_BAN_MINUTES")

    max_file_size_mb: int = Field(50, alias="MAX_FILE_SIZE_MB")
    upload_dir: str = Field("data/uploads", alias="UPLOAD_DIR")
    sqlite_path: str = Field("data/sqlite/db.sqlite3", alias="SQLITE_PATH")
    # 文档处理超时（秒），启动恢复时据此判定残留 processing 文档
    document_processing_timeout: int = Field(600, alias="DOCUMENT_PROCESSING_TIMEOUT")

    app_title: str = Field("研究组知识库", alias="APP_TITLE")
    allowed_origins: str = Field("http://localhost:5173,http://localhost", alias="ALLOWED_ORIGINS")
    default_top_k: int = Field(5, alias="DEFAULT_TOP_K")
    default_chunk_size: int = Field(800, alias="DEFAULT_CHUNK_SIZE")
    default_chunk_overlap: int = Field(150, alias="DEFAULT_CHUNK_OVERLAP")

    @field_validator("deepseek_thinking_mode")
    @classmethod
    def validate_thinking_mode(cls, value: str) -> str:
        if value not in {"off", "on"}:
            raise ValueError("DEEPSEEK_THINKING_MODE 只能是 off / on")
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

    # ===== LLM provider 解析（OpenAI 网关优先，否则 DeepSeek）=====
    @property
    def provider_api_key(self) -> str:
        return self.openai_api_key or self.deepseek_api_key

    @property
    def provider_base_url(self) -> str:
        return self.openai_base_url or self.deepseek_base_url

    @property
    def chat_model(self) -> str:
        return self.openai_chat_model or self.deepseek_chat_model

    @property
    def use_openai_gateway(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def qdrant_vector_size(self) -> int:
        """Qdrant collection 维度始终等于 embedding 输出维度。"""
        return self.embedding_dim


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
