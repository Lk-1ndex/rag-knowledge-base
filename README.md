# 研究组 RAG 知识库系统

面向高校研究组的私有化 RAG 知识库系统，支持文献 PDF、组内论文、组会笔记、技术文档上传，提供 Web 问答和 API Key 调用。

## 技术栈

- 后端：FastAPI、SQLAlchemy async、SQLite、Redis、Qdrant、OpenAI SDK 兼容 DeepSeek API
- 前端：React 18、TypeScript、Vite、Tailwind CSS、React Query、Zustand
- 部署：Docker Compose、Nginx

## 快速开始

```bash
cp .env.example .env
# 编辑 .env，填写 DEEPSEEK_API_KEY、SECRET_KEY、ADMIN_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

开发环境访问：

- 前端：http://localhost:5173
- 后端：http://localhost:8000
- 健康检查：http://localhost:8000/health

## 核心流程

1. 首次启动会根据 `.env` 自动创建管理员账号。
2. 管理员或组员登录后上传 PDF、DOCX、MD、TXT。
3. 后端保存原文件并异步解析、分块、Embedding、写入 Qdrant。
4. 用户在问答页提问，系统检索相关 chunk，调用 DeepSeek 生成回答并保存对话历史。
5. 用户可创建 `rkb_` 开头的系统 API Key，通过 `X-API-Key` 请求头调用接口。

## 主要接口

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/keys`
- `POST /api/keys`
- `DELETE /api/keys/{key_id}`
- `GET /api/documents`
- `POST /api/documents/upload`
- `GET /api/documents/{doc_id}`
- `DELETE /api/documents/{doc_id}`
- `POST /api/query`
- `POST /api/query/stream`
- `GET /api/conversations`
- `GET /api/conversations/{id}`
- `DELETE /api/conversations/{id}`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/{id}`
- `GET /api/admin/stats`
- `GET /api/admin/logs`
- `GET /api/admin/config`
- `PATCH /api/admin/config`
- `GET /health`

## 测试

```bash
cd backend
pip install -r requirements.txt
pytest ../tests -v --cov=. --cov-report=html
```

## 运维

```bash
./scripts/deploy.sh
./scripts/backup.sh
./scripts/restore.sh ./backups/backup_YYYYMMDD_HHMMSS.tar.gz
./scripts/add_user.sh zhangsan StrongPassword123 member
```

生产环境需要替换 Nginx 域名并启用 HTTPS 配置，`.env` 中必须使用强 `SECRET_KEY` 和强管理员密码。
