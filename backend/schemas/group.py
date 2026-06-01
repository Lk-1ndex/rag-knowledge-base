from datetime import datetime

from pydantic import BaseModel, Field


class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=64)
    description: str = Field(default="", max_length=500)
    invite_code: str = Field(min_length=4, max_length=64)


class GroupJoin(BaseModel):
    invite_code: str = Field(min_length=1, max_length=64)


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=64)
    description: str | None = Field(default=None, max_length=500)
    invite_code: str | None = Field(default=None, min_length=4, max_length=64)
    system_prompt: str | None = None
    default_top_k: int | None = Field(default=None, ge=1, le=10)
    rate_limit_per_minute: int | None = Field(default=None, ge=1, le=1000)


class GroupOut(BaseModel):
    id: int
    name: str
    description: str
    invite_code: str
    system_prompt: str
    default_top_k: int
    rate_limit_per_minute: int
    created_at: datetime
    member_count: int = 0
    document_count: int = 0

    model_config = {"from_attributes": True}


class GroupMemberOut(BaseModel):
    id: int
    username: str
    display_name: str
    group_role: str
    joined_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
