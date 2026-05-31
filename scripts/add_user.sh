#!/bin/bash
# 命令行创建用户（部署初期或忘记密码时使用）
# 用法: ./scripts/add_user.sh <用户名> <密码> [admin|member]
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "用法: $0 <用户名> <密码> [admin|member]"
  exit 1
fi

# 通过环境变量传值，绝不拼进 Python 源码（防注入），
# 密码也不会出现在 Python 命令行 / ps / shell history 中。
# -T 关闭伪 TTY，避免管道场景报错。
NEW_USERNAME="$1" NEW_PASSWORD="$2" NEW_ROLE="${3:-member}" \
  docker compose exec -T \
  -e NEW_USERNAME -e NEW_PASSWORD -e NEW_ROLE \
  backend python -m scripts.create_user
