from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from config import settings
from database import AsyncSessionLocal, init_db
from middleware.rate_limiter import RateLimitMiddleware
from routers import api_keys, auth, conversations, documents, groups, query
from services.api_key_service import ensure_admin_user
from services.vector_store import VectorStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    await init_db()
    async with AsyncSessionLocal() as db:
        await ensure_admin_user(db)
    try:
        await VectorStore().ensure_collection()
    except Exception:
        pass
    # 初始化 arq 任务队列连接池
    from worker.queue import init_pool, close_pool
    await init_pool()
    # 恢复残留在 processing 的文档（容器重启后可能有）
    from worker.tasks import recover_stale_documents
    try:
        recovered = await recover_stale_documents()
        if recovered:
            import logging
            logging.getLogger(__name__).info("恢复了 %d 个残留 processing 文档", recovered)
    except Exception:
        pass
    yield
    await close_pool()


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
app.include_router(groups.router)


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
