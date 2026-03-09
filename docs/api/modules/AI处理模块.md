# AI 处理模块 (M4 - AiProcessingModule)

> 调用阿里云通义千问进行内容分析和流式生成，纯服务模块，不暴露 HTTP 接口

## 模块定位

- **职责边界**: 封装通义千问 API 调用、模型策略选择、提示词模板管理、AI 结果缓存、流式生成
- **不负责**: 业务编排（由 KnowledgeModule 负责）、联网搜索（由 SearchAggregatorModule 负责）
- **纯服务模块**: 无 Controller，不直接暴露 HTTP 端点，仅通过 Service 被其他模块调用
- **依赖模块**:
  - `HttpModule` — 调用 DashScope API
  - `CacheModule` — Redis 缓存 AI 结果
- **被依赖**: `KnowledgeModule` — 知识点分析流程调用 `AiProcessingService.generateStream()`

## 核心类型定义

类型定义集中在 `types/ai.types.ts`，不使用独立 DTO 文件：

| 接口 | 说明 |
|------|------|
| `AiGenerateOptions` | 生成选项：context、model、enableCache、timeout、skipPromptBuild |
| `AiGenerateResult` | 非流式生成结果：content、model、tokenUsage、processingTimeMs、fromCache |
| `AiContext` | 上下文：query、fileContents、sources、outputStyle |
| `StreamEvent` | 流式事件：type + data |
| `IModelStrategy` | 模型策略接口：generate() + generateStream() |
| `TokenUsage` | Token 统计：inputTokens、outputTokens、totalTokens、model、totalCost |

### 流式事件类型（StreamEventType）

| 事件 | 说明 |
|------|------|
| `start` | 开始：返回 taskId、model、startTime |
| `chunk` | 内容块：逐字返回生成内容 |
| `sources` | 来源：返回引用来源列表（有外部数据源时） |
| `done` | 完成：返回 tokenUsage、processingTimeMs |
| `cancelled` | 取消：返回 partialContent |
| `error` | 错误：返回 message、code |

## 模型策略

| 策略 | 模型 ID | 成本 | 最大上下文 | 适用场景 |
|------|---------|------|-----------|---------|
| `QwenPlusStrategy` | `qwen-plus` | ¥0.001/1k tokens | 32k | 默认模型，常规分析 |
| `QwenMaxStrategy` | `qwen-max` | ¥0.01/1k tokens | 128k | 长文本/复杂分析 |
| `QwenVlStrategy` | `qwen-vl-plus` | ¥0.008/1k tokens | 32k | 图文混合（预留） |

自动选择逻辑（`selectModel()`）：query 长度 > 1000 字符 → Qwen-Max，否则 → Qwen-Plus

## 提示词模板

| 模板类型 | 文件路径 | 说明 |
|---------|---------|------|
| `search` | `prompts/templates/search.template.ts` | 搜索分析模板 |
| `summary` | `prompts/templates/summary.template.ts` | 摘要生成模板 |
| `analysis` | `prompts/templates/analysis.template.ts` | 通用分析模板 |
| `knowledge-analysis` | `prompts/templates/knowledge-analysis.template.ts` | 知识点聚合分析模板 |

通过 `PromptTemplateService.buildPrompt(type, params)` 统一调用

## 核心业务逻辑

### 非流式生成（generate）

```
AiGenerateOptions 传入
    ↓
selectModel() 自动选择模型
    ↓
检查 Redis 缓存（enableCache=true 时）
    ↓
buildPrompt() 构建提示词
    ↓
callWithRetry() 调用模型（最多 3 次，指数退避 1s→2s→4s）
    ↓
calculateTokenUsage() 计算 Token 消耗
    ↓
写入缓存 → 返回 AiGenerateResult
```

### 流式生成（generateStream）

```
AiGenerateOptions 传入
    ↓
selectModel() → yield start 事件
    ↓
构建提示词（skipPromptBuild=true 时直接使用 context.query）
    ↓
strategy.generateStream() 逐字生成 → yield chunk 事件
    ↓
yield sources 事件（有外部数据源时）
    ↓
calculateTokenUsage() → yield done 事件
    ↓
异常时 → yield error 事件
```

### 缓存策略

- 缓存键：`ai:{model}:{contextHash}`（SHA256 哈希）
- 按模型动态 TTL：Plus 30 分钟、Max 2 小时、VL 1 小时
- 由 `AiCacheService` 管理

## 模块协作

- **被 KnowledgeModule 调用**: `KnowledgeAnalysisService` 调用 `generateStream({ context, skipPromptBuild: true })`，传入已构建好的知识点分析提示词
- **导出**: `AiProcessingService`、`AiCacheService`、`PromptTemplateService`

## 文件结构

```
src/modules/ai-processing/
├── cache/
│   └── ai-cache.service.ts             # Redis 缓存（SHA256 哈希键、按模型 TTL）
├── prompts/
│   ├── templates/
│   │   ├── analysis.template.ts        # 通用分析模板
│   │   ├── knowledge-analysis.template.ts  # 知识点聚合分析模板
│   │   ├── search.template.ts          # 搜索分析模板
│   │   └── summary.template.ts         # 摘要生成模板
│   └── prompt-template.service.ts      # 模板路由服务
├── strategies/
│   ├── base-model.strategy.ts          # 基础策略（DashScope HTTP 调用）
│   ├── qwen-max.strategy.ts            # Qwen-Max 策略
│   ├── qwen-plus.strategy.ts           # Qwen-Plus 策略
│   └── qwen-vl.strategy.ts            # Qwen-VL 策略
├── types/
│   ├── ai.types.ts                     # 核心类型定义（替代独立 DTO）
│   ├── model.enum.ts                   # QwenModel 枚举 + 成本/上下文配置
│   └── output-style.enum.ts            # OutputStyle 枚举
├── ai-processing.module.ts             # 模块定义（无 Controller）
└── ai-processing.service.ts            # AI 处理服务（generate + generateStream）
```

## 注意事项

- **无 HTTP 接口**: 本模块是纯服务模块，不注册 Controller，所有能力通过 Service 导出
- **环境变量**: `DASHSCOPE_API_KEY`、`AI_MAX_RETRIES`(默认 3)、`AI_RETRY_DELAY`(默认 1000ms)、`AI_REQUEST_TIMEOUT`(默认 60000ms)
- **Token 计算**: 当前使用简化估算（中文 1 字符 ≈ 1.5 tokens），非精确计算

---

**文档版本**: v2.0
**更新日期**: 2026-03-01
**维护人**: Backend Team
