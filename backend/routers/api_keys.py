from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from models.api_key import ApiKey
from models.user import User
from schemas.auth import ApiKeyCreate, ApiKeyCreateResponse, ApiKeyOut
from services.api_key_service import create_api_key
from services.audit import write_audit_log

router = APIRouter(prefix="/api/keys", tags=["API Key"])


@router.get("", response_model=list[ApiKeyOut])
async def list_keys(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.revoked_at.is_(None)).order_by(ApiKey.created_at.desc())
    return list((await db.execute(stmt)).scalars().all())


@router.post("", response_model=ApiKeyCreateResponse)
async def create_key(
    payload: ApiKeyCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw_key, api_key = await create_api_key(db, user, payload.label, payload.expires_at)
    await write_audit_log(db, user, "api_key.create", payload.label, request)
    return ApiKeyCreateResponse(key=raw_key, api_key=ApiKeyOut.model_validate(api_key))


@router.delete("/{key_id}")
async def revoke_key(
    key_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    api_key = await db.get(ApiKey, key_id)
    if api_key is None or api_key.user_id != user.id or api_key.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API Key 不存在")
    api_key.revoked_at = datetime.utcnow()
    await db.commit()
    await write_audit_log(db, user, "api_key.revoke", api_key.prefix, request)
    return {"detail": "已撤销"}
