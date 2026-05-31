#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "用法: $0 <备份文件路径>"
  exit 1
fi

echo "此操作将覆盖现有数据，是否继续？(y/N)"
read -r confirm
if [ "$confirm" != "y" ]; then
  echo "已取消"
  exit 0
fi

docker compose stop backend
tar -xzf "$1" -C .
docker compose start backend
echo "恢复完成"
