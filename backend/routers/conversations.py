import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from models.conversation import Conversation
from models.message import Message
from models.user import User
from schemas.query import ConversationDetail, ConversationSummary, MessageOut

router = APIRouter(prefix="/api/conversations", tags=["对话"])


@router.get("", response_model=list[ConversationSummary])
async def list_conversations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Conversation).where(Conversation.user_id == user.id).order_by(Conversation.updated_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [
        ConversationSummary(
            id=row.id,
            title=row.title,
            created_at=row.created_at.isoformat(),
            updated_at=row.updated_at.isoformat(),
        )
        for row in rows
    ]


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None or conversation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    stmt = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    messages = [
        MessageOut(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            sources=json.loads(msg.sources_json or "[]"),
            created_at=msg.created_at.isoformat(),
        )
        for msg in (await db.execute(stmt)).scalars().all()
    ]
    return ConversationDetail(id=conversation.id, title=conversation.title, messages=messages)


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None or conversation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    await db.delete(conversation)
    await db.commit()
    return {"detail": "已删除"}
