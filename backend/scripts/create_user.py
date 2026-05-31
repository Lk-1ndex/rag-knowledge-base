"""命令行创建用户（部署初期或忘记密码时使用）。

通过环境变量读取参数，避免把用户名/密码拼进 shell 或 Python 源码，
防止注入，也避免密码出现在进程列表/历史记录中。

用法（见 scripts/add_user.sh）：
    NEW_USERNAME=... NEW_PASSWORD=... NEW_ROLE=member python -m scripts.create_user
"""

import asyncio
import os
import sys

from database import AsyncSessionLocal
from models.user import User
from services.api_key_service import hash_password
from sqlalchemy import select


async def main() -> int:
    username = os.environ.get("NEW_USERNAME", "").strip()
    password = os.environ.get("NEW_PASSWORD", "")
    role = os.environ.get("NEW_ROLE", "member").strip() or "member"

    if not username or not password:
        print("错误：需要环境变量 NEW_USERNAME 和 NEW_PASSWORD", file=sys.stderr)
        return 1
    if role not in {"admin", "member"}:
        print("错误：NEW_ROLE 只能是 admin 或 member", file=sys.stderr)
        return 1

    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(select(User).where(User.username == username))
        ).scalar_one_or_none()
        if existing is not None:
            print(f"用户 {username!r} 已存在，未做改动", file=sys.stderr)
            return 1
        db.add(
            User(
                username=username,
                hashed_password=hash_password(password),
                role=role,
                is_active=True,
            )
        )
        await db.commit()
    print(f"用户创建成功：{username}（{role}）")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
