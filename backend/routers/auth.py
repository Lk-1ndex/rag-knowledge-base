from redis.asyncio import Redis
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from middleware.auth_middleware import get_current_user
from middleware.rate_limiter import ensure_not_banned, record_auth_failure
from models.user import User
from schemas.auth import LoginRequest, LoginResponse, UserOut
from services.api_key_service import create_access_token, verify_password
from services.audit import client_ip, write_audit_log

router = APIRouter(prefix="/api/auth", tags=["认证"])
redis = Redis.from_url(settings.redis_url, decode_responses=True)


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    ip = client_ip(request)
    await ensure_not_banned(redis, ip)
    stmt = select(User).where(User.username == payload.username)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(payload.password, user.hashed_password):
        await record_auth_failure(redis, ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    token = create_access_token(user)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.jwt_expire_days * 24 * 3600,
    )
    await write_audit_log(db, user, "login", "用户登录", request)
    return LoginResponse(user=UserOut.model_validate(user))


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"detail": "已登出"}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
