"""arq WorkerSettings：定义 worker 连接和注册的任务函数。

启动方式：arq worker.settings.WorkerSettings
"""

from arq.connections import RedisSettings

from config import settings
from database import init_db
from services.vector_store import VectorStore
from worker.tasks import process_document


async def startup(ctx: dict) -> None:
    """worker 启动时初始化数据库和 Qdrant collection。"""
    await init_db()
    try:
        await VectorStore().ensure_collection()
    except Exception:
        pass


async def shutdown(ctx: dict) -> None:
    pass


class WorkerSettings:
    functions = [process_document]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 4
    job_timeout = settings.document_processing_timeout
