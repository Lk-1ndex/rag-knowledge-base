from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    group_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("groups.id"), nullable=True, index=True)
    group_role: Mapped[str | None] = mapped_column(String(16), nullable=True)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    group = relationship("Group", back_populates="members", foreign_keys=[group_id])
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="uploader", foreign_keys="Document.uploaded_by")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
