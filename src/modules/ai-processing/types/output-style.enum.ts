/**
 * AI 输出风格枚举
 * 控制生成内容的详细程度和格式
 */
export enum OutputStyle {
  /** 简洁：3-5段，快速回答 */
  CONCISE = 'concise',

  /** 详细：包含背景、原理、应用 */
  DETAILED = 'detailed',

  /** 报告体：带目录、结论 */
  REPORT = 'report',

  /** 思维导图：大纲格式 */
  MINDMAP = 'mindmap',
}

/**
 * 输出风格描述（用于提示词构建）
 */
export const OUTPUT_STYLE_DESCRIPTIONS: Record<OutputStyle, string> = {
  [OutputStyle.CONCISE]: '简洁回答，3-5段，直接给出核心信息',
  [OutputStyle.DETAILED]: '详细回答，包含背景、原理、应用场景',
  [OutputStyle.REPORT]: '报告格式，包含目录、正文、结论',
  [OutputStyle.MINDMAP]: '思维导图大纲格式，使用层级结构',
};
