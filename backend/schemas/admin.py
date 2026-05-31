from datetime import datetime

from pydantic import BaseModel, Field

from schemas.auth import UserOut


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8)
    role: str = Field(default="member", pattern="^(admin|member)$")


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=8)
    role: str | None = Field(default=None, pattern="^(admin|member)$")
    is_active: bool | None = None


class UsersResponse(BaseModel):
    items: list[UserOut]
    total: int


class StatsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    total_users: int
    monthly_queries: int
    total_tokens: int


class ConfigOut(BaseModel):
    system_prompt: str
    default_top_k: int
    rate_limit_per_minute: int


class ConfigUpdate(BaseModel):
    system_prompt: str | None = None
    default_top_k: int | None = Field(default=None, ge=1, le=10)
    rate_limit_per_minute: int | None = Field(default=None, ge=1, le=1000)


class AuditLogOut(BaseModel):
    id: int
    user_id: int | None
    action: str
    detail: str
    ip: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogsResponse(BaseModel):
    items: list[AuditLogOut]
    total: int
