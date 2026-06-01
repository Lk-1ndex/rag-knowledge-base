from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User
from services.api_key_service import decode_access_token, verify_api_key


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> User:
    user: User | None = None
    if x_api_key:
        user = await verify_api_key(db, x_api_key)
    else:
        token = request.cookies.get("access_token")
        user_id = decode_access_token(token) if token else None
        if user_id:
            user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未认证")
    return user


async def require_group(user: User = Depends(get_current_user)) -> User:
    if user.group_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="请先加入或创建小组")
    return user


async def require_group_admin(user: User = Depends(require_group)) -> User:
    if user.group_role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要小组管理员权限")
    return user
