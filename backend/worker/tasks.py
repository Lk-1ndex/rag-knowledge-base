"""arq 后台任务：文档解析 → 分块 → 向量化 → 入库。

从 documents.py 的 BackgroundTasks 迁移而来，改为独立 worker 进程执行，
避免 API 进程重启时丢失正在处理的任务。
"""

from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import select

from config import settings
from database import AsyncSessionLocal
from models.document import Document
from services.document_processor import chunk_pages, extract_text_pages
from services.embedder import Embedder
from services.vector_store import VectorStore


async def process_document(ctx: dict, document_id: str) -> None:
    """处理单个文档。ctx 由 arq 注入（含共享资源），此处只用 document_id。"""
    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, document_id)
        if doc is None:
            return
        try:
            pages = extract_text_pages(Path(doc.stored_path), doc.file_type)
            chunks = chunk_pages(pages)
            vectors = await Embedder().embed_texts([chunk.text for chunk in chunks])
            await VectorStore().upsert_chunks(doc.id, doc.title, doc.category, doc.group_id, chunks, vectors)
            doc.chunk_count = len(chunks)
            doc.status = "ready"
            doc.error_message = ""
        except Exception as exc:  # noqa: BLE001 - 处理失败需落库供前端展示
            doc.status = "error"
            doc.error_message = str(exc)
        await db.commit()


async def recover_stale_documents() -> int:
    """启动时恢复残留在 processing 的文档：超时的重新投递，避免永久卡住。

    返回重新投递的文档数。由后端 lifespan 调用。
    """
    from worker.queue import enqueue_document

    cutoff = datetime.utcnow() - timedelta(seconds=settings.document_processing_timeout)
    requeued = 0
    async with AsyncSessionLocal() as db:
        stmt = select(Document).where(
            Document.status == "processing",
            Document.upload_time < cutoff,
        )
        stale = list((await db.execute(stmt)).scalars().all())

    for doc in stale:
        try:
            await enqueue_document(doc.id)
            requeued += 1
        except Exception:  # noqa: BLE001 - 队列不可用时标记为 error 兜底
            async with AsyncSessionLocal() as db:
                fresh = await db.get(Document, doc.id)
                if fresh and fresh.status == "processing":
                    fresh.status = "error"
                    fresh.error_message = "处理超时且重新入队失败，请重新上传"
                    await db.commit()
    return requeued
