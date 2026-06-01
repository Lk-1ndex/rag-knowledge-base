from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    invite_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    system_prompt: Mapped[str] = mapped_column(Text, default="")
    default_top_k: Mapped[int] = mapped_column(Integer, default=5)
    rate_limit_per_minute: Mapped[int] = mapped_column(Integer, default=30)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    members = relationship("User", back_populates="group")
    documents = relationship("Document", back_populates="group", cascade="all, delete-orphan")
