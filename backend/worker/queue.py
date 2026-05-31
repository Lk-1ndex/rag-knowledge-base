"""arq 投递池管理：创建 Redis 连接池、投递文档处理任务。

FastAPI lifespan 中调用 create_pool() 初始化，存入 app.state.arq_pool。
上传接口通过 enqueue_document() 投递任务。
"""

from arq import ArqRedis, create_pool
from arq.connections import RedisSettings

from config import settings

_pool: ArqRedis | None = None


async def init_pool() -> ArqRedis | None:
    """创建 arq Redis 连接池。Redis 不可用时返回 None（降级为进程内处理）。"""
    global _pool
    try:
        _pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    except Exception:
        _pool = None
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.aclose()
        _pool = None


async def enqueue_document(document_id: str) -> bool:
    """投递文档处理任务。成功返回 True，队列不可用返回 False。"""
    if _pool is None:
        return False
    try:
        await _pool.enqueue_job("process_document", document_id, _job_id=f"doc:{document_id}")
        return True
    except Exception:
        return False
