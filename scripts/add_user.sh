#!/bin/bash
set -e

USERNAME=$1
PASSWORD=$2
ROLE=${3:-member}

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "用法: $0 <用户名> <密码> [admin|member]"
  exit 1
fi

docker compose exec backend python -c "
import asyncio
from database import AsyncSessionLocal
from models.user import User
from services.api_key_service import hash_password

async def main():
    async with AsyncSessionLocal() as db:
        db.add(User(username='$USERNAME', hashed_password=hash_password('$PASSWORD'), role='$ROLE'))
        await db.commit()
        print('用户创建成功')

asyncio.run(main())
"
