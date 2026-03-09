# FlowGenAll Backend

知识点聚合分析系统后端服务 - 基于 NestJS + TypeScript + PostgreSQL + Redis

## 项目简介

FlowGenAll 当前版本（v2.0）定位为知识点聚合分析系统。用户可录入知识点，按天查询，并触发 AI 流式分析；支持可选联网搜索增强，分析结果持久化保存。

### 核心功能

- 用户注册/登录、JWT 鉴权、Token 刷新
- 知识点管理（单条创建、批量创建、按天查询、软删除）
- 知识点分析（`POST /api/knowledge/analyze`，SSE 流式输出）
- 外部数据聚合（可选联网搜索增强）
- 分析历史记录查询

### 技术栈

- **框架**: NestJS + TypeScript + Node.js
- **数据库**: PostgreSQL（主数据）、Redis（缓存）
- **AI 引擎**: 阿里云通义千问（Qwen）
- **部署**: Docker + Nginx + PM2

## 快速开始

### 环境要求

- Node.js >= 20
- PostgreSQL >= 16
- Redis >= 7
- Docker & Docker Compose（可选）

### 安装依赖

```bash
npm install
```

### 环境配置

复制环境变量模板并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库、Redis、AI API 等信息。

### 使用 Docker Compose 启动（推荐）

```bash
# 启动所有服务（PostgreSQL、Redis、MinIO、Backend）
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 停止服务
docker-compose down
```

### 本地开发

```bash
# 开发模式（热重载）
npm run start:dev

# 生产模式
npm run start:prod

# 调试模式
npm run start:debug
```

### 构建

```bash
npm run build
```

## 项目结构

```
backend/
├── src/
│   ├── config/              # 配置文件
│   │   ├── database.config.ts
│   │   └── redis.config.ts
│   ├── modules/             # 业务模块
│   │   ├── users/           # 用户模块
│   │   ├── auth/            # 认证模块
│   │   ├── ai-processing/   # AI 处理模块
│   │   ├── search-aggregator/ # 外部数据聚合模块
│   │   └── knowledge/       # 知识点模块
│   ├── common/              # 公共组件（DTO/过滤器/枚举）
│   ├── app.module.ts
│   └── main.ts
├── docs/                    # 项目文档
├── test/                    # 测试文件
├── docker-compose.yml       # Docker 编排配置
├── Dockerfile              # Docker 镜像配置
└── .env.example            # 环境变量模板
```

## 数据库实体

### User（用户）
- 支持三种角色：普通用户、高级用户、管理员
- 邮箱 + 密码认证

### KnowledgeEntry（知识点）
- 知识点内容、标签、所属用户
- 支持软删除与按天查询

### AnalysisRecord（分析记录）
- 按日期保存分析结果
- 记录状态、token 消耗、处理耗时、错误信息

## API 文档

启动服务后访问：`http://localhost:3000/api`

## 测试

```bash
# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

## 代码规范

```bash
# 格式化代码
npm run format

# 代码检查
npm run lint
```

## 部署

### Docker 部署

```bash
# 构建生产镜像
docker build -t flowgenall-backend:latest .

# 运行容器
docker run -d -p 3000:3000 --env-file .env flowgenall-backend:latest
```

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/main.js --name flowgenall-backend

# 查看状态
pm2 status

# 查看日志
pm2 logs flowgenall-backend
```

## 开发路线图

- [x] V0.1: 项目初始化、基础架构搭建
- [x] V2.0: 改造为知识点聚合分析系统（M9）
- [ ] V2.1: 分析结果可视化与前端交互优化
- [ ] V2.2: 支持私有知识库接入、企业级权限管理
- [ ] V3.0: 支持语音输入、实时协作编辑

## 许可证

UNLICENSED
