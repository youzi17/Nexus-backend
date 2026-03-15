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

---

## 一、系统架构说明

### 1.1 整体架构设计

系统采用**分层架构 + 模块化设计**，遵循 NestJS 最佳实践：

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│              (Frontend / Mobile App)                     │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/SSE
┌─────────────────────▼───────────────────────────────────┐
│                  Controller Layer                        │
│   - KnowledgeAnalysisController (SSE 流式分析)           │
│   - KnowledgeEntryController (知识点 CRUD)               │
│   - AuthController (认证鉴权)                            │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   Service Layer                          │
│   - KnowledgeAnalysisService (业务编排)                  │
│   - AiProcessingService (AI 调用)                        │
│   - SearchAggregatorService (联网搜索)                   │
│   - AiCacheService (结果缓存)                            │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                Infrastructure Layer                      │
│   - PostgreSQL (持久化存储)                              │
│   - Redis (缓存层)                                       │
│   - Qwen API (AI 模型调用)                               │
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心模块职责

| 模块 | 职责 | 关键技术 |
|------|------|----------|
| **auth** | JWT 认证、Token 刷新、用户角色管理 | Passport.js、JWT Strategy |
| **knowledge** | 知识点 CRUD、按天查询、软删除 | TypeORM、QueryBuilder |
| **ai-processing** | AI 模型调用、流式生成、提示词管理 | SSE、Strategy Pattern、Cache |
| **search-aggregator** | 外部搜索 API 聚合、结果清洗 | HTTP Client、数据标准化 |

### 1.3 数据流设计

**知识点分析流程**（核心业务）：

```
用户触发分析
    ↓
Controller 校验请求 → 查询当天知识点
    ↓
Service 判断是否联网搜索
    ├─ 是 → SearchAggregatorService 调用搜索 API
    └─ 否 → 直接构建 AI Context
    ↓
AiProcessingService 流式生成
    ├─ PromptTemplateService 构建提示词
    ├─ QwenStrategy 调用通义千问 API
    └─ 实时返回 SSE 事件流
    ↓
保存分析记录到 PostgreSQL
    ↓
前端实时展示分析结果
```

---

## 二、关键 Prompt 与 Vibe 思路

### 2.1 Vibe Coding 开发理念

本项目采用 **AI 辅助全流程开发**（Vibe Coding）模式，核心理念：

> 用自然语言描述意图，让 AI 理解上下文后生成代码，开发者负责架构决策和质量把关。

**实践方式**：

1. **文档驱动开发** — 先用 AI 生成架构文档和 API 设计文档，确认设计方向后再编码
2. **渐进式实现** — 每个模块先让 AI 理解已有代码模式，再生成新模块代码，保持风格一致
3. **对话式调试** — 遇到问题时描述现象，让 AI 分析根因并给出修复方案
4. **约束式生成** — 通过 `CLAUDE.md` 定义严格的编码规范（禁止 any、最简原则、类型复用），AI 在生成代码时自动遵循
5. **全流程描述** — 使用 superpowers 框架调用各种 skills，完成完整流程

**关键决策点**（人工主导）：

- **技术选型**：SSE vs WebSocket → 选择 SSE（单向流式输出，实现简单，自动重连）
- **架构模式**：LangChain vs 自实现 AI 调用 → 选择自实现（逻辑简单，更可控）
- **Prompt 策略**：不同任务采用不同提示词模板和模型选择策略
- **缓存策略**：Redis 缓存相同查询结果，降低 AI 调用成本

### 2.2 Prompt 设计理念

系统采用**结构化提示词模板**，通过 `PromptTemplateService` 统一管理，核心设计原则：

1. **角色设定明确**：定义 AI 为"专业的知识管理分析师"
2. **任务拆解清晰**：将复杂分析拆解为 4 个步骤（分类、关联、脉络、盲区）
3. **输出格式标准化**：强制 Markdown 格式，便于前端渲染
4. **防幻觉机制**：明确要求"基于用户实际录入的知识点，不编造内容"

### 2.3 核心提示词模板示例

**知识点聚合分析模板**（`knowledge-analysis.template.ts`）：

```typescript
你是一位专业的知识管理分析师，擅长对零散的知识点进行系统化整理、分类归组和关联关系分析。

## 任务说明
以下是用户在 ${date} 录入的 ${knowledgeEntries.length} 条知识点，请对这些知识点进行深度分析。

## 知识点列表
1. [知识点内容] [标签: 标签1, 标签2]
2. [知识点内容] [标签: 标签3]
...

## 联网搜索补充资料（可选）
### [资料 1] 标题
- URL: https://...
- 摘要: ...

## 输出要求
### 1. 知识点分类
将知识点按主题/领域归组，每组给出组名和包含的知识点编号。

### 2. 关联关系分析
分析知识点之间的逻辑联系，说明哪些知识点相互关联、如何关联（因果、递进、对比、互补等）。

### 3. 逻辑脉络梳理
从整体视角梳理这些知识点构成的知识结构，描述它们之间的层次关系和学习路径。

### 4. 知识盲区提示（可选）
如果发现知识点之间存在明显的知识缺口或值得深入的方向，简要提示。

## 注意事项
- 分析必须基于用户实际录入的知识点，不要编造不存在的内容
- 如果知识点数量较少（≤3条），适当简化分析结构，不必强行归类
- 如果有联网搜索资料，用 [资料 N] 标注引用
- 语言简洁专业，避免空泛的套话
```

---

## 三、AI 调用逻辑

### 3.1 流式生成（SSE）实现

**技术方案**：POST + Server-Sent Events（SSE）

**为什么选择 POST + SSE 而非 WebSocket？**

| 对比维度 | POST + SSE | WebSocket |
|---------|-----------|-----------|
| 适用场景 | 单向流式输出（服务器→客户端） | 双向实时通信 |
| 实现复杂度 | 低（基于 HTTP） | 高（需握手、心跳） |
| 断线重连 | 浏览器自动重连 | 需手动实现 |
| 兼容性 | 完美支持 POST 请求体 | 需额外处理参数传递 |

**核心代码实现**：

```typescript
// Controller: 设置 SSE 响应头
@Post('analyze')
@Header('Content-Type', 'text/event-stream')
@Header('Cache-Control', 'no-cache')
@Header('Connection', 'keep-alive')
async analyze(@Body() dto: AnalyzeRequestDto, @CurrentUser() user: User) {
  return from(this.streamToObservable(
    this.knowledgeAnalysisService.analyze(user.id, dto)
  ));
}

// Service: 流式生成 AsyncIterable
async *analyze(userId: string, dto: AnalyzeRequestDto): AsyncIterable<StreamEvent> {
  // 1. 发送 START 事件
  yield { type: 'start', data: { taskId, model } };

  // 2. 流式生成内容
  for await (const chunk of aiService.generateStream(prompt)) {
    yield { type: 'chunk', data: { content: chunk } };
  }

  // 3. 发送完成事件
  yield { type: 'done', data: { tokenUsage, processingTimeMs } };
}
```

**SSE 事件类型定义**：

```typescript
enum StreamEventType {
  START = 'start',        // 任务开始
  CHUNK = 'chunk',        // 内容块
  SOURCES = 'sources',    // 参考来源
  DONE = 'done',          // 任务完成
  ERROR = 'error'         // 错误事件
}
```

### 3.2 智能模型选择策略

系统根据任务复杂度自动选择最优模型：

```typescript
selectModel(context: AiContext): QwenModel {
  // 包含图片 → Qwen-VL（多模态模型）
  if (context.hasImages) return QwenModel.QWEN_VL;

  // 查询长度 > 1000 字符 → Qwen-Max（高精度模型）
  if (context.query.length > 1000) return QwenModel.QWEN_MAX;

  // 默认 → Qwen-Plus（性价比模型）
  return QwenModel.QWEN_PLUS;
}
```

**模型对比**：

| 模型 | 适用场景 | 成本（元/千tokens） | 最大上下文 |
|------|---------|-------------------|-----------|
| Qwen-Plus | 日常分析、快速响应 | 0.004 | 32K |
| Qwen-Max | 复杂推理、长文本分析 | 0.12 | 32K |
| Qwen-VL | 图片理解、多模态分析 | 0.008 | 16K |

### 3.3 成本优化机制

**缓存策略**：

```typescript
// 相同查询直接返回缓存
const contextHash = generateContextHash(query, sources);
const cached = await cacheService.get(model, contextHash);
if (cached) return cached;
```

**Token 实时计算**：

```typescript
// 中文：1 字符 ≈ 1.5 tokens
// 英文：1 单词 ≈ 1.3 tokens
const inputTokens = Math.ceil(prompt.length * 1.5);
const outputTokens = Math.ceil(content.length * 1.5);
const totalCost = (inputTokens + outputTokens) * costPerToken;
```

### 3.4 错误处理与重试机制

**指数退避重试**：

```typescript
async callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        await sleep(delay);
      }
    }
  }
  throw lastError;
}
```

**错误分类处理**：

- **网络错误**：自动重试
- **API 限流**：延迟重试 + 降级模型
- **业务错误**：直接返回错误信息

---

## 四、部署步骤说明

### 4.1 环境要求

- Node.js >= 20
- PostgreSQL >= 16
- Redis >= 7
- Docker & Docker Compose（推荐）
- 域名 + SSL 证书（生产环境）

### 4.2 快速部署（Docker Compose）

#### 步骤 1：克隆项目

```bash
git clone https://github.com/your-username/flowgenall-backend.git
cd flowgenall-backend
```

#### 步骤 2：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
DB_DATABASE=flowgenall

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379

# AI API 配置
QWEN_API_KEY=your_qwen_api_key
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 应用配置
NODE_ENV=production
PORT=3000
```

#### 步骤 3：启动服务

```bash
# 启动所有服务（PostgreSQL、Redis、MinIO、Backend）
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 检查服务状态
docker-compose ps
```

#### 步骤 4：验证部署

```bash
# 健康检查
curl http://localhost:3000/api/health

# API 文档
访问 http://localhost:3000/api
```

### 4.3 生产环境部署（含 DNS/HTTPS）

#### 步骤 1：购买域名并配置 DNS

**推荐服务商**：阿里云、腾讯云、Cloudflare

**DNS 解析配置**：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| A | @ | 服务器公网 IP | 600 |
| A | www | 服务器公网 IP | 600 |
| CNAME | api | your-domain.com | 600 |

#### 步骤 2：申请 SSL 证书

**方案 A：Let's Encrypt（免费，推荐）**

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 申请证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

**方案 B：阿里云/腾讯云 SSL 证书（付费）**

1. 购买证书并下载 Nginx 版本
2. 上传到服务器 `/etc/nginx/ssl/` 目录
3. 配置 Nginx SSL

#### 步骤 3：配置 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/flowgenall
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 反向代理到后端服务
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # SSE 支持（关键配置）
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;

        # 常规代理头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时配置（SSE 需要长连接）
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain application/json;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/flowgenall /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 步骤 4：配置防火墙

```bash
# 开放端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

#### 步骤 5：PM2 进程守护（可选）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/main.js --name flowgenall-backend

# 开机自启
pm2 startup
pm2 save

# 监控
pm2 monit
```

### 4.4 部署检查清单

- [ ] 数据库连接正常
- [ ] Redis 连接正常
- [ ] AI API 调用正常
- [ ] HTTPS 证书有效
- [ ] Nginx 反向代理配置正确
- [ ] SSE 流式接口正常工作
- [ ] 日志输出正常
- [ ] 监控告警配置完成

---

## 五、本地开发

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

### 本地开发命令

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

---

## 六、项目结构

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

---

## 七、数据库实体

### User（用户）
- 支持三种角色：普通用户、高级用户、管理员
- 邮箱 + 密码认证

### KnowledgeEntry（知识点）
- 知识点内容、标签、所属用户
- 支持软删除与按天查询

### AnalysisRecord（分析记录）
- 按日期保存分析结果
- 记录状态、token 消耗、处理耗时、错误信息

---

## 八、API 文档

启动服务后访问：`http://localhost:3000/api`

---

## 九、测试

```bash
# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

---

## 十、代码规范

```bash
# 格式化代码
npm run format

# 代码检查
npm run lint
```

---

## 十一、开发路线图

- [x] V0.1: 项目初始化、基础架构搭建
- [x] V2.0: 改造为知识点聚合分析系统（M9）
- [ ] V2.1: 分析结果可视化与前端交互优化
- [ ] V2.2: 支持私有知识库接入、企业级权限管理
- [ ] V3.0: 支持语音输入、实时协作编辑

---

## 十二、许可证

UNLICENSED
