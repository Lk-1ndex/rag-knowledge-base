import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from models.conversation import Conversation
from models.message import Message
from models.user import User
from schemas.query import QueryRequest, QueryResponse
from services.audit import write_audit_log
from services.rag_chain import RagChain, sse_line

router = APIRouter(prefix="/api/query", tags=["问答"])


async def ensure_conversation(db: AsyncSession, user: User, question: str, conversation_id: str | None) -> Conversation:
    if conversation_id:
        existing = await db.get(Conversation, conversation_id)
        if existing and existing.user_id == user.id:
            return existing
    conversation = Conversation(
        id=f"conv_{uuid.uuid4().hex}",
        user_id=user.id,
        title=question[:40],
        updated_at=datetime.utcnow(),
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def save_turn(db: AsyncSession, conversation: Conversation, question: str, answer: str, sources: list[dict]) -> None:
    conversation.updated_at = datetime.utcnow()
    db.add(Message(conversation_id=conversation.id, role="user", content=question, sources_json="[]"))
    db.add(
        Message(
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
            sources_json=json.dumps(sources, ensure_ascii=False),
        )
    )
    await db.commit()


@router.post("", response_model=QueryResponse)
async def query(
    payload: QueryRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await ensure_conversation(db, user, payload.question, payload.conversation_id)
    result = await RagChain().answer(db, payload.question, payload.top_k, payload.categories, conversation.id)
    await save_turn(db, conversation, payload.question, result["answer"], result["sources"])
    await write_audit_log(db, user, "query", payload.question[:200], request)
    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        conversation_id=conversation.id,
        usage=result["usage"],
    )


@router.post("/stream")
async def query_stream(
    payload: QueryRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await ensure_conversation(db, user, payload.question, payload.conversation_id)

    async def event_generator():
        answer_parts: list[str] = []
        sources: list[dict] = []
        async for event in RagChain().stream_answer(db, payload.question, payload.top_k, payload.categories, conversation.id):
            if event["type"] == "delta":
                answer_parts.append(event["content"])
            if event["type"] == "sources":
                sources = event["sources"]
            if event["type"] == "done":
                event["conversation_id"] = conversation.id
            yield sse_line(event)
        await save_turn(db, conversation, payload.question, "".join(answer_parts), sources)
        await write_audit_log(db, user, "query.stream", payload.question[:200], request)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
