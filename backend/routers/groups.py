from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user, require_group, require_group_admin
from models.document import Document
from models.group import Group
from models.user import User
from schemas.group import GroupCreate, GroupJoin, GroupMemberOut, GroupOut, GroupUpdate
from services.audit import write_audit_log
from services.rag_chain import DEFAULT_SYSTEM_PROMPT
from services.vector_store import VectorStore

router = APIRouter(prefix="/api/groups", tags=["小组"])


async def _build_group_out(db: AsyncSession, group: Group) -> GroupOut:
    member_count = (
        await db.execute(select(func.count()).select_from(User).where(User.group_id == group.id))
    ).scalar_one()
    document_count = (
        await db.execute(select(func.count()).select_from(Document).where(Document.group_id == group.id))
    ).scalar_one()
    out = GroupOut.model_validate(group)
    out.member_count = member_count
    out.document_count = document_count
    return out


@router.post("", response_model=GroupOut)
async def create_group(
    payload: GroupCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.group_id is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="你已加入了一个小组，请先退出")
    if (await db.execute(select(Group).where(Group.name == payload.name))).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="组名已存在")
    if (await db.execute(select(Group).where(Group.invite_code == payload.invite_code))).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="邀请码已被使用，请换一个")
    group = Group(
        name=payload.name,
        description=payload.description,
        invite_code=payload.invite_code,
        system_prompt=DEFAULT_SYSTEM_PROMPT,
    )
    db.add(group)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="创建失败，请重试")
    await db.refresh(group)
    user.group_id = group.id
    user.group_role = "admin"
    user.joined_at = datetime.utcnow()
    await db.commit()
    await write_audit_log(db, user, "group.create", group.name, request)
    return await _build_group_out(db, group)


@router.post("/join", response_model=GroupOut)
async def join_group(
    payload: GroupJoin,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.group_id is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="你已在小组中，请先退出")
    group = (await db.execute(select(Group).where(Group.invite_code == payload.invite_code))).scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="邀请码无效")
    user.group_id = group.id
    user.group_role = "member"
    user.joined_at = datetime.utcnow()
    await db.commit()
    await write_audit_log(db, user, "group.join", group.name, request)
    return await _build_group_out(db, group)


@router.get("/me", response_model=GroupOut)
async def my_group(user: User = Depends(require_group), db: AsyncSession = Depends(get_db)):
    group = await db.get(Group, user.group_id)
    return await _build_group_out(db, group)


@router.patch("/me", response_model=GroupOut)
async def update_group(
    payload: GroupUpdate,
    request: Request,
    user: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await db.get(Group, user.group_id)
    if payload.name is not None and payload.name != group.name:
        clash = (await db.execute(select(Group).where(Group.name == payload.name, Group.id != group.id))).scalar_one_or_none()
        if clash:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="组名已存在")
        group.name = payload.name
    if payload.description is not None:
        group.description = payload.description
    if payload.invite_code is not None and payload.invite_code != group.invite_code:
        clash = (await db.execute(select(Group).where(Group.invite_code == payload.invite_code, Group.id != group.id))).scalar_one_or_none()
        if clash:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="邀请码已被使用")
        group.invite_code = payload.invite_code
    if payload.system_prompt is not None:
        group.system_prompt = payload.system_prompt
    if payload.default_top_k is not None:
        group.default_top_k = payload.default_top_k
    if payload.rate_limit_per_minute is not None:
        group.rate_limit_per_minute = payload.rate_limit_per_minute
    await db.commit()
    await write_audit_log(db, user, "group.update", group.name, request)
    return await _build_group_out(db, group)


@router.post("/leave")
async def leave_group(
    request: Request,
    user: User = Depends(require_group),
    db: AsyncSession = Depends(get_db),
):
    if user.group_role == "admin":
        admin_count = (
            await db.execute(
                select(func.count()).select_from(User).where(User.group_id == user.group_id, User.group_role == "admin")
            )
        ).scalar_one()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="你是最后一个管理员，请先把别人提升为管理员，或解散小组",
            )
    group_name = user.group.name if user.group else ""
    user.group_id = None
    user.group_role = None
    user.joined_at = None
    await db.commit()
    await write_audit_log(db, user, "group.leave", group_name, request)
    return {"detail": "已退出小组"}


@router.delete("/me")
async def dissolve_group(
    request: Request,
    user: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await db.get(Group, user.group_id)
    group_id = group.id
    group_name = group.name

    docs = list((await db.execute(select(Document).where(Document.group_id == group_id))).scalars().all())
    upload_dir = Path()
    for doc in docs:
        try:
            Path(doc.stored_path).unlink(missing_ok=True)
        except Exception:
            pass
    try:
        await VectorStore().delete_group(group_id)
    except Exception:
        pass

    members = list((await db.execute(select(User).where(User.group_id == group_id))).scalars().all())
    for m in members:
        m.group_id = None
        m.group_role = None
        m.joined_at = None

    for doc in docs:
        await db.delete(doc)
    await db.delete(group)
    await db.commit()
    await write_audit_log(db, user, "group.dissolve", group_name, request)
    return {"detail": "小组已解散"}


@router.get("/me/members", response_model=list[GroupMemberOut])
async def list_members(user: User = Depends(require_group), db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.group_id == user.group_id).order_by(User.joined_at.asc())
    members = list((await db.execute(stmt)).scalars().all())
    return [GroupMemberOut.model_validate(m) for m in members]


def _get_target_member(target_id: int, current: User, db: AsyncSession):
    return db.execute(select(User).where(User.id == target_id, User.group_id == current.group_id))


@router.post("/me/members/{user_id}/promote", response_model=GroupMemberOut)
async def promote_member(
    user_id: int,
    request: Request,
    user: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    target = (await _get_target_member(user_id, user, db)).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="成员不存在")
    if target.group_role == "admin":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该成员已是管理员")
    target.group_role = "admin"
    await db.commit()
    await write_audit_log(db, user, "group.promote", target.username, request)
    return GroupMemberOut.model_validate(target)


@router.post("/me/members/{user_id}/demote", response_model=GroupMemberOut)
async def demote_self(
    user_id: int,
    request: Request,
    user: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理员不能降级他人，只能自己降级")
    admin_count = (
        await db.execute(
            select(func.count()).select_from(User).where(User.group_id == user.group_id, User.group_role == "admin")
        )
    ).scalar_one()
    if admin_count <= 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="你是最后一个管理员，请先提升别人")
    user.group_role = "member"
    await db.commit()
    await write_audit_log(db, user, "group.demote", user.username, request)
    return GroupMemberOut.model_validate(user)


@router.delete("/me/members/{user_id}")
async def kick_member(
    user_id: int,
    request: Request,
    user: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="不能踢自己，请使用退出小组")
    target = (await _get_target_member(user_id, user, db)).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="成员不存在")
    if target.group_role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理员之间不能互相移出")
    target_name = target.username
    target.group_id = None
    target.group_role = None
    target.joined_at = None
    await db.commit()
    await write_audit_log(db, user, "group.kick", target_name, request)
    return {"detail": "已移出该成员"}
