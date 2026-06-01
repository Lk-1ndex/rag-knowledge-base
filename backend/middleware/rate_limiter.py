import time
from collections.abc import Awaitable, Callable

from fastapi import HTTPException, Request, status
from redis.asyncio import Redis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from config import settings
from services.api_key_service import decode_access_token


def _identity(request: Request) -> str:
    """优先按用户身份限流，未登录走 IP 兜底（防爆破）。"""
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return f"k:{api_key[:12]}"
    token = request.cookies.get("access_token")
    if token:
        user_id = decode_access_token(token)
        if user_id:
            return f"u:{user_id}"
    return f"ip:{request.client.host if request.client else 'unknown'}"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """基于 Redis 的简单滑动窗口限流，Redis 不可用时放行避免误伤可用性。"""

    def __init__(self, app, redis: Redis | None = None) -> None:
        super().__init__(app)
        self.redis = redis or Redis.from_url(settings.redis_url, decode_responses=True)

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        if request.url.path == "/health":
            return await call_next(request)
        identity = _identity(request)
        try:
            allowed, retry_after = await check_rate(self.redis, f"rl:{identity}", settings.rate_limit_per_minute)
        except Exception:
            allowed, retry_after = True, 0
        if not allowed:
            return Response(
                content='{"detail":"请求过于频繁"}',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json",
                headers={"Retry-After": str(retry_after)},
            )
        return await call_next(request)


async def check_rate(redis: Redis, key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
    now = int(time.time() * 1000)
    window_start = now - window_seconds * 1000
    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zcard(key)
    pipe.zadd(key, {f"{now}:{time.perf_counter_ns()}": now})
    pipe.expire(key, window_seconds)
    _, count, _, _ = await pipe.execute()
    if int(count) >= limit:
        retry_after = max(1, window_seconds - int((now - window_start) / 1000))
        return False, retry_after
    return True, 0


async def record_auth_failure(redis: Redis, ip: str) -> None:
    try:
        key = f"auth_fail:{ip}"
        count = await redis.incr(key)
        await redis.expire(key, settings.auth_ban_minutes * 60)
        if count >= settings.max_auth_failures:
            await redis.setex(f"auth_ban:{ip}", settings.auth_ban_minutes * 60, "1")
    except Exception:
        return


async def ensure_not_banned(redis: Redis, ip: str) -> None:
    try:
        banned = await redis.get(f"auth_ban:{ip}")
    except Exception:
        return
    if banned:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未认证")
