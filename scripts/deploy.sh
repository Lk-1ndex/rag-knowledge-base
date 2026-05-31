#!/bin/bash
set -e

echo "=== 研究组知识库 部署脚本 ==="

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker 未安装，请先安装 Docker"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "已创建 .env，请填写 SECRET_KEY、ADMIN_PASSWORD、DEEPSEEK_API_KEY 后重新运行"
  exit 1
fi

mkdir -p data/qdrant data/sqlite data/uploads data/redis data/certbot/conf data/certbot/www
docker compose build
docker compose up -d
sleep 10
curl -sf http://localhost/health >/dev/null && echo "部署成功：http://localhost" || {
  echo "健康检查失败，请查看 docker compose logs"
  exit 1
}
