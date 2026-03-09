/**
 * AI 模型枚举
 * 支持的阿里云通义千问模型
 */
export enum QwenModel {
  /** Qwen-Plus: 默认模型，成本低(¥0.001/1k tokens)，速度快，适合常规搜索 */
  QWEN_PLUS = 'qwen-plus',

  /** Qwen-Max: 复杂任务，精度高(¥0.01/1k tokens)，适合深度分析 */
  QWEN_MAX = 'qwen-max',

  /** Qwen-VL: 图像理解任务，支持图文混合输入(¥0.008/1k tokens) */
  QWEN_VL = 'qwen-vl-plus',
}

/**
 * 模型成本配置（单位：人民币/1k tokens）
 */
export const MODEL_COSTS: Record<QwenModel, number> = {
  [QwenModel.QWEN_PLUS]: 0.001,
  [QwenModel.QWEN_MAX]: 0.01,
  [QwenModel.QWEN_VL]: 0.008,
};

/**
 * 模型最大上下文长度（单位：tokens）
 */
export const MODEL_MAX_CONTEXT: Record<QwenModel, number> = {
  [QwenModel.QWEN_PLUS]: 32000,
  [QwenModel.QWEN_MAX]: 128000,
  [QwenModel.QWEN_VL]: 32000,
};
