from datetime import datetime

from redis.asyncio import Redis
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from database import get_db
from middleware.auth_middleware import get_current_user
from middleware.rate_limiter import ensure_not_banned, record_auth_failure
from models.user import User
from schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserOut
from services.api_key_service import create_access_token, hash_password, verify_password
from services.audit import client_ip, write_audit_log

router = APIRouter(prefix="/api/auth", tags=["认证"])
redis = Redis.from_url(settings.redis_url, decode_responses=True)


def _set_token_cookie(response: Response, user: User) -> None:
    token = create_access_token(user)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.jwt_expire_days * 24 * 3600,
    )


async def _load_user_with_group(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).options(selectinload(User.group)).where(User.id == user_id))
    return result.scalar_one()


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    ip = client_ip(request)
    await ensure_not_banned(redis, ip)
    stmt = select(User).where(User.username == payload.username)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(payload.password, user.hashed_password):
        await record_auth_failure(redis, ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    _set_token_cookie(response, user)
    await write_audit_log(db, user, "login", "用户登录", request)
    fresh = await _load_user_with_group(db, user.id)
    return LoginResponse(user=UserOut.model_validate(fresh))


@router.post("/register", response_model=LoginResponse)
async def register(payload: RegisterRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    if (await db.execute(select(User).where(User.username == payload.username))).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="登录账号已存在")
    if (await db.execute(select(User).where(User.display_name == payload.display_name))).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="昵称已被使用，请换一个")
    user = User(
        username=payload.username,
        display_name=payload.display_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="注册失败，请稍后重试")
    await db.refresh(user)
    _set_token_cookie(response, user)
    await write_audit_log(db, user, "register", "用户注册", request)
    fresh = await _load_user_with_group(db, user.id)
    return LoginResponse(user=UserOut.model_validate(fresh))


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"detail": "已登出"}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    fresh = await _load_user_with_group(db, user.id)
    return UserOut.model_validate(fresh)
