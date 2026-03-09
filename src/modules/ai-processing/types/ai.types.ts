import { QwenModel } from './model.enum';
import { OutputStyle } from './output-style.enum';

/**
 * Token 使用统计
 */
export interface TokenUsage {
  /** 输入 token 数量 */
  inputTokens: number;

  /** 输出 token 数量 */
  outputTokens: number;

  /** 总 token 数量 */
  totalTokens: number;

  /** 使用的模型 */
  model: QwenModel;

  /** 总成本（人民币） */
  totalCost: number;
}

/**
 * AI 生成上下文
 */
export interface AiContext {
  /** 用户查询文本 */
  query: string;

  /** 上传文件的提取内容 */
  fileContents?: string[];

  /** 外部数据源的搜索结果 */
  sources?: ExternalSource[];

  /** 输出风格 */
  outputStyle?: OutputStyle;
}

/**
 * 外部数据源
 */
export interface ExternalSource {
  /** 来源标题 */
  title: string;

  /** 来源 URL */
  url: string;

  /** 来源内容摘要 */
  snippet: string;

  /** 来源类型（serpapi/wikipedia/arxiv等） */
  type: string;
}

/**
 * AI 生成选项
 */
export interface AiGenerateOptions {
  /** 上下文 */
  context: AiContext;

  /** 指定使用的模型（可选，不指定则自动选择） */
  model?: QwenModel;

  /** 是否启用缓存（默认 true） */
  enableCache?: boolean;

  /** 超时时间（毫秒，默认 60000） */
  timeout?: number;

  /** 跳过内部提示词模板构建，直接使用 context.query 作为提示词 */
  skipPromptBuild?: boolean;
}

/**
 * AI 生成结果
 */
export interface AiGenerateResult {
  /** 生成的内容（Markdown 格式） */
  content: string;

  /** 使用的模型 */
  model: QwenModel;

  /** Token 使用统计 */
  tokenUsage: TokenUsage;

  /** 处理耗时（毫秒） */
  processingTimeMs: number;

  /** 是否来自缓存 */
  fromCache: boolean;

  /** 引用的来源列表 */
  sources?: ExternalSource[];
}

/**
 * 流式响应事件类型
 */
export enum StreamEventType {
  /** 开始：返回任务 ID 和元数据 */
  START = 'start',

  /** 内容块：逐字返回生成内容 */
  CHUNK = 'chunk',

  /** 来源：返回引用来源列表 */
  SOURCES = 'sources',

  /** 完成：返回 token 统计和总耗时 */
  DONE = 'done',

  /** 取消：请求被取消 */
  CANCELLED = 'cancelled',

  /** 错误：发生错误 */
  ERROR = 'error',
}

/**
 * 流式响应事件
 */
export interface StreamEvent {
  /** 事件类型 */
  type: StreamEventType;

  /** 事件数据 */
  data:
    | StreamStartData
    | StreamChunkData
    | StreamSourcesData
    | StreamDoneData
    | StreamCancelledData
    | StreamErrorData;
}

/**
 * 流式响应 - 开始事件数据
 */
export interface StreamStartData {
  /** 任务 ID */
  taskId: string;

  /** 使用的模型 */
  model: QwenModel;

  /** 开始时间 */
  startTime: string;
}

/**
 * 流式响应 - 内容块事件数据
 */
export interface StreamChunkData {
  /** 内容块 */
  content: string;
}

/**
 * 流式响应 - 来源事件数据
 */
export interface StreamSourcesData {
  /** 引用来源列表 */
  sources: ExternalSource[];
}

/**
 * 流式响应 - 完成事件数据
 */
export interface StreamDoneData {
  /** Token 使用统计 */
  tokenUsage: TokenUsage;

  /** 处理耗时（毫秒） */
  processingTimeMs: number;
}

/**
 * 流式响应 - 取消事件数据
 */
export interface StreamCancelledData {
  /** 已生成的部分内容 */
  partialContent: string;

  /** 取消时间 */
  cancelledAt: string;

  /** 已消耗的 Token */
  tokenUsage?: TokenUsage;
}

/**
 * 流式响应 - 错误事件数据
 */
export interface StreamErrorData {
  /** 错误消息 */
  message: string;

  /** 错误代码 */
  code?: string;
}

/**
 * 模型策略接口
 */
export interface IModelStrategy {
  /**
   * 生成内容
   * @param prompt 提示词
   * @param options 生成选项
   * @returns 生成的内容
   */
  generate(prompt: string, options: ModelStrategyOptions): Promise<string>;

  /**
   * 流式生成内容
   * @param prompt 提示词
   * @param options 生成选项
   * @returns 异步迭代器，逐字返回生成内容
   */
  generateStream(
    prompt: string,
    options: ModelStrategyOptions,
  ): AsyncIterable<string>;
}

/**
 * 模型策略选项
 */
export interface ModelStrategyOptions {
  /** 超时时间（毫秒） */
  timeout?: number;

  /** 取消控制器 */
  abortController?: AbortController;

  /** 最大 token 数 */
  maxTokens?: number;

  /** 温度参数（0-1） */
  temperature?: number;
}
