from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from config import settings
from database import AsyncSessionLocal, init_db
from middleware.rate_limiter import RateLimitMiddleware
from routers import admin, api_keys, auth, conversations, documents, query
from services.api_key_service import ensure_admin_user
from services.system_config import ensure_default_configs
from services.vector_store import VectorStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    await init_db()
    async with AsyncSessionLocal() as db:
        await ensure_admin_user(db)
        await ensure_default_configs(db)
    try:
        await VectorStore().ensure_collection()
    except Exception:
        # Qdrant 在本地开发时可能尚未启动，/health 会暴露真实状态。
        pass
    yield


app = FastAPI(title=settings.app_title, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

app.include_router(auth.router)
app.include_router(api_keys.router)
app.include_router(documents.router)
app.include_router(query.router)
app.include_router(conversations.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    redis_ok = False
    try:
        qdrant_ok = await VectorStore().health()
    except Exception:
        qdrant_ok = False
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        redis_ok = bool(await redis.ping())
    except Exception:
        redis_ok = False
    finally:
        await redis.aclose()
    return {"status": "ok" if redis_ok and qdrant_ok else "degraded", "redis": redis_ok, "qdrant": qdrant_ok}
