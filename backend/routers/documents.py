import json
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import AsyncSessionLocal, get_db
from middleware.auth_middleware import get_current_user
from models.document import Document
from models.user import User
from schemas.document import DocumentListResponse, DocumentOut, DocumentUploadResponse
from services.audit import write_audit_log
from services.document_processor import (
    chunk_pages,
    extract_text_pages,
    file_type_from_name,
    parse_tags,
    secure_filename,
    validate_magic_bytes,
)
from services.embedder import Embedder
from services.vector_store import VectorStore

router = APIRouter(prefix="/api/documents", tags=["文档"])


def serialize_document(doc: Document) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        title=doc.title,
        filename=doc.filename,
        file_type=doc.file_type,
        category=doc.category,
        uploaded_by=doc.uploaded_by,
        upload_time=doc.upload_time,
        status=doc.status,
        chunk_count=doc.chunk_count,
        tags=json.loads(doc.tags or "[]"),
        description=doc.description,
        file_size=doc.file_size,
        error_message=doc.error_message,
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    category: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document)
    count_stmt = select(func.count()).select_from(Document)
    if category:
        stmt = stmt.where(Document.category == category)
        count_stmt = count_stmt.where(Document.category == category)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Document.title.like(pattern))
        count_stmt = count_stmt.where(Document.title.like(pattern))
    stmt = stmt.order_by(Document.upload_time.desc()).offset(offset).limit(limit)
    items = [serialize_document(doc) for doc in (await db.execute(stmt)).scalars().all()]
    total = (await db.execute(count_stmt)).scalar_one()
    return DocumentListResponse(items=items, total=total)


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    category: str = Form(default="其他"),
    tags: str | None = Form(default=None),
    description: str = Form(default=""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    max_size = settings.max_file_size_mb * 1024 * 1024
    if len(data) > max_size:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="文件过大")
    try:
        validate_magic_bytes(file.filename or "", data)
        file_type = file_type_from_name(file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    document_id = f"doc_{uuid.uuid4().hex}"
    filename = secure_filename(file.filename or "upload")
    stored_name = f"{document_id}_{filename}"
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    stored_path = settings.upload_path / stored_name
    async with aiofiles.open(stored_path, "wb") as out:
        await out.write(data)

    doc = Document(
        id=document_id,
        title=title or Path(filename).stem,
        filename=filename,
        stored_path=str(stored_path),
        file_type=file_type,
        category=category,
        uploaded_by=user.id,
        tags=parse_tags(tags),
        description=description,
        file_size=len(data),
    )
    db.add(doc)
    await db.commit()
    background_tasks.add_task(process_document_task, document_id)
    await write_audit_log(db, user, "document.upload", document_id, request)
    return DocumentUploadResponse(document_id=document_id, status="processing")


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文档不存在")
    return serialize_document(doc)


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文档不存在")
    if user.role != "admin" and doc.uploaded_by != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权删除该文档")
    await VectorStore().delete_document(doc_id)
    await db.delete(doc)
    await db.commit()
    await write_audit_log(db, user, "document.delete", doc_id, request)
    return {"detail": "已删除"}


async def process_document_task(document_id: str) -> None:
    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, document_id)
        if doc is None:
            return
        try:
            pages = extract_text_pages(Path(doc.stored_path), doc.file_type)
            chunks = chunk_pages(pages)
            vectors = await Embedder().embed_texts([chunk.text for chunk in chunks])
            await VectorStore().upsert_chunks(doc.id, doc.title, doc.category, chunks, vectors)
            doc.chunk_count = len(chunks)
            doc.status = "ready"
            doc.error_message = ""
        except Exception as exc:
            doc.status = "error"
            doc.error_message = str(exc)
        await db.commit()
