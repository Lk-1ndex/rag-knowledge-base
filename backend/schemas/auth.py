from datetime import datetime

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    user: UserOut


class ApiKeyCreate(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    expires_at: datetime | None = None


class ApiKeyOut(BaseModel):
    id: int
    prefix: str
    label: str
    expires_at: datetime | None
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreateResponse(BaseModel):
    key: str
    api_key: ApiKeyOut
