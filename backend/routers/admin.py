from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, Request

from database import get_db
from middleware.auth_middleware import require_admin
from models.audit_log import AuditLog
from models.document import Document
from models.message import Message
from models.user import User
from schemas.admin import (
    AuditLogsResponse,
    ConfigOut,
    ConfigUpdate,
    StatsResponse,
    UserCreate,
    UsersResponse,
    UserUpdate,
)
from schemas.auth import UserOut
from services.api_key_service import hash_password
from services.audit import write_audit_log
from services.system_config import get_config_value, set_config_value

router = APIRouter(prefix="/api/admin", tags=["管理员"])


@router.get("/users", response_model=UsersResponse)
async def list_users(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    users = list((await db.execute(select(User).order_by(User.created_at.desc()))).scalars().all())
    total = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    return UsersResponse(items=[UserOut.model_validate(user) for user in users], total=total)


@router.post("/users", response_model=UserOut)
async def create_user(
    payload: UserCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = User(username=payload.username, hashed_password=hash_password(payload.password), role=payload.role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await write_audit_log(db, admin, "admin.user.create", payload.username, request)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="用户不存在")
    if payload.password:
        user.hashed_password = hash_password(payload.password)
    if payload.role:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)
    await write_audit_log(db, admin, "admin.user.update", user.username, request)
    return user


@router.get("/stats", response_model=StatsResponse)
async def stats(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    total_documents = (await db.execute(select(func.count()).select_from(Document))).scalar_one()
    total_chunks = (await db.execute(select(func.coalesce(func.sum(Document.chunk_count), 0)))).scalar_one()
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    monthly_queries = (
        await db.execute(select(func.count()).select_from(AuditLog).where(AuditLog.action.like("query%")))
    ).scalar_one()
    return StatsResponse(
        total_documents=total_documents,
        total_chunks=total_chunks,
        total_users=total_users,
        monthly_queries=monthly_queries,
        total_tokens=0,
    )


@router.get("/config", response_model=ConfigOut)
async def get_config(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    return ConfigOut(
        system_prompt=await get_config_value(db, "system_prompt"),
        default_top_k=int(await get_config_value(db, "default_top_k")),
        rate_limit_per_minute=int(await get_config_value(db, "rate_limit_per_minute")),
    )


@router.patch("/config", response_model=ConfigOut)
async def update_config(
    payload: ConfigUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if payload.system_prompt is not None:
        await set_config_value(db, "system_prompt", payload.system_prompt)
    if payload.default_top_k is not None:
        await set_config_value(db, "default_top_k", str(payload.default_top_k))
    if payload.rate_limit_per_minute is not None:
        await set_config_value(db, "rate_limit_per_minute", str(payload.rate_limit_per_minute))
    await write_audit_log(db, admin, "admin.config.update", "系统配置更新", request)
    return await get_config(admin, db)


@router.get("/logs", response_model=AuditLogsResponse)
async def logs(
    user_id: int | None = None,
    action: str | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditLog)
    count_stmt = select(func.count()).select_from(AuditLog)
    if user_id is not None:
        stmt = stmt.where(AuditLog.user_id == user_id)
        count_stmt = count_stmt.where(AuditLog.user_id == user_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
        count_stmt = count_stmt.where(AuditLog.action == action)
    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(100)
    return AuditLogsResponse(
        items=list((await db.execute(stmt)).scalars().all()),
        total=(await db.execute(count_stmt)).scalar_one(),
    )
