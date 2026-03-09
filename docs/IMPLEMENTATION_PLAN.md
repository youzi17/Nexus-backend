# Implementation Plan: 知识点聚合分析系统改造

## Overview
将现有 AI 工作流平台改造为知识点聚合分析系统。用户可随时录入知识点条目，也可批量粘贴，点击分析时 AI 对当天知识点进行分类、关联关系梳理，可选联网搜索增强，结果以结构化文字（含逻辑关系图谱描述）呈现。

**改造策略**：
- 删除：FilesModule（文件上传）、WorkflowsModule（工作流）、ExportModule（导出）
- 改造：SearchModule → KnowledgeModule（知识点管理 + 分析）
- 保留：SearchHistoryModule（改为 AnalysisHistoryModule）、SearchAggregatorModule（联网搜索）、AiProcessingModule（AI 核心）

---

## Stages

### Stage 1: 数据层 - 知识点实体 & 分析记录实体
**Goal**: 建立新的数据模型，替换旧的 Search 实体
**Files to modify**:
- `src/app.module.ts` - 移除 FilesModule、WorkflowsModule、ExportModule，注册 KnowledgeModule
**Files to create**:
- `src/modules/knowledge/entities/knowledge-entry.entity.ts` - 知识点条目实体
- `src/modules/knowledge/entities/analysis-record.entity.ts` - 分析记录实体（替代 Search 实体）
**Success Criteria**:
- [ ] 知识点实体包含：id, content, tags, userId, createdAt（按天查询索引）
- [ ] 分析记录实体包含：id, date, knowledgeEntryIds, resultContent, resultType, webSearchEnabled, tokenUsage, status, userId
- [ ] TypeORM synchronize 自动建表
**Status**: Complete

### Stage 2: 知识点 CRUD 模块
**Goal**: 实现知识点的增删查（按天查询）接口
**Files to create**:
- `src/modules/knowledge/dto/create-knowledge-entry.dto.ts`
- `src/modules/knowledge/dto/knowledge-entry-response.dto.ts`
- `src/modules/knowledge/knowledge-entry.service.ts`
- `src/modules/knowledge/knowledge-entry.controller.ts`
- `src/modules/knowledge/knowledge.module.ts`
**Success Criteria**:
- [ ] POST /api/knowledge - 创建知识点（单条或批量）
- [ ] GET /api/knowledge?date=2026-02-25 - 按天查询知识点列表
- [ ] DELETE /api/knowledge/:id - 删除知识点
- [ ] 所有接口使用 ApiResponse DTO 统一返回
**Status**: Complete

### Stage 3: AI 分析提示词模板
**Goal**: 新增知识点聚合分析专用提示词模板
**Files to modify**:
- `src/modules/ai-processing/prompts/prompt-template.service.ts` - 添加 knowledge-analysis 模板类型
**Files to create**:
- `src/modules/ai-processing/prompts/templates/knowledge-analysis.template.ts` - 知识点分析模板
**Success Criteria**:
- [ ] 提示词引导 AI 输出：知识点分类、关联关系、逻辑脉络
- [ ] 支持联网搜索结果融合
- [ ] 输出格式为结构化 Markdown（含关系描述段落）
**Status**: Complete

### Stage 4: 知识点分析服务（核心）
**Goal**: 实现按天分析知识点的核心业务逻辑
**Files to create**:
- `src/modules/knowledge/dto/analyze-request.dto.ts`
- `src/modules/knowledge/dto/analyze-response.dto.ts`
- `src/modules/knowledge/knowledge-analysis.service.ts`
- `src/modules/knowledge/knowledge-analysis.controller.ts`
**Files to modify**:
- `src/modules/knowledge/knowledge.module.ts` - 注册分析服务和控制器，导入 AiProcessingModule、SearchAggregatorModule
**Success Criteria**:
- [ ] POST /api/knowledge/analyze - 触发当天知识点分析
  - 参数：date（默认今天）、webSearchEnabled（是否联网）
  - 流程：查询当天知识点 → 可选联网搜索 → AI 分析 → 保存分析记录
- [ ] GET /api/knowledge/analysis-history - 查询历史分析记录列表
- [ ] GET /api/knowledge/analysis/:id - 查询单条分析结果
- [ ] SSE 流式返回分析进度和结果
**Status**: Complete

### Stage 5: 清理旧模块 & 更新文档
**Goal**: 移除不再需要的模块，确保编译通过
**Files to delete**:
- `src/modules/files/` - 整个文件管理模块
- `src/modules/workflows/` - 整个工作流模块
- `src/modules/export/` - 整个导出模块
- `src/modules/search/` - 整个旧搜索模块（被 knowledge 模块替代）
- `src/modules/search-history/` - 旧搜索历史模块（分析记录已内置到 knowledge 模块）
**Files to modify**:
- `src/app.module.ts` - 最终清理，只保留必要模块
- `docs/` - 更新项目文档
**Success Criteria**:
- [ ] `npx tsc --noEmit` 无编译错误
- [ ] 所有旧模块引用已清除
- [ ] 文档更新完毕
**Status**: Complete

---

## Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| SearchHistoryModule 被其他模块引用 | Stage 5 前先检查所有 import，统一替换 |
| FilesModule 被 SearchModule 依赖 | Stage 5 删除时同步移除 SearchModule 对 FilesModule 的引用 |
| AI 分析结果过长导致 SSE 超时 | 使用真正的流式生成（generateStream），而非模拟分块 |
| 联网搜索失败影响分析 | 沿用现有超时机制，失败不阻塞 AI 分析 |

## Key Decisions
- 知识点分析记录直接内置在 KnowledgeModule 中，不单独建模块，保持简洁
- 不使用知识图谱可视化库（成本高、前端复杂），改用结构化 Markdown 文字描述关系
- 分析结果使用真正的 SSE 流式输出，复用现有 AiProcessingService.generateStream
- 删除 FilesModule 时同步删除 MinIO/OSS 相关配置依赖
