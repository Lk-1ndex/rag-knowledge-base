from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from models.audit_log import AuditLog
from models.user import User


def client_ip(request: Request | None) -> str:
    if request is None:
        return ""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


async def write_audit_log(
    db: AsyncSession,
    user: User | None,
    action: str,
    detail: str = "",
    request: Request | None = None,
) -> None:
    db.add(AuditLog(user_id=user.id if user else None, action=action, detail=detail, ip=client_ip(request)))
    await db.commit()
