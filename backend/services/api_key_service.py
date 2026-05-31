import hashlib
import secrets
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.api_key import ApiKey
from models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)


def create_access_token(user: User) -> str:
    expires_at = datetime.utcnow() + timedelta(days=settings.jwt_expire_days)
    payload = {"sub": str(user.id), "username": user.username, "role": user.role, "exp": expires_at}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


def generate_api_key() -> str:
    return f"rkb_{secrets.token_hex(16)}"


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


async def create_api_key(db: AsyncSession, user: User, label: str, expires_at: datetime | None) -> tuple[str, ApiKey]:
    raw_key = generate_api_key()
    api_key = ApiKey(
        user_id=user.id,
        key_hash=hash_api_key(raw_key),
        prefix=raw_key[:12],
        label=label,
        expires_at=expires_at,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return raw_key, api_key


async def verify_api_key(db: AsyncSession, raw_key: str) -> User | None:
    if not raw_key.startswith("rkb_"):
        return None
    stmt = select(ApiKey).where(ApiKey.prefix == raw_key[:12], ApiKey.revoked_at.is_(None))
    api_key = (await db.execute(stmt)).scalar_one_or_none()
    if api_key is None or api_key.key_hash != hash_api_key(raw_key):
        return None
    if api_key.expires_at and api_key.expires_at < datetime.utcnow():
        return None
    user = await db.get(User, api_key.user_id)
    if user is None or not user.is_active:
        return None
    api_key.last_used_at = datetime.utcnow()
    await db.commit()
    return user


async def ensure_admin_user(db: AsyncSession) -> None:
    stmt = select(User).where(User.username == settings.admin_username)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return
    user = User(
        username=settings.admin_username,
        hashed_password=hash_password(settings.admin_password),
        role="admin",
        is_active=True,
    )
    db.add(user)
    await db.commit()
