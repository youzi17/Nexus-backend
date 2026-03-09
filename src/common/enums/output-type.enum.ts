/**
 * 输出类型枚举
 * 定义搜索结果的输出类型
 * 跨模块共享，M5 和 M6 统一使用
 */
export enum OutputType {
  /** 文本输出（Markdown 格式） */
  TEXT = 'text',
  /** 思维导图（未来支持） */
  MINDMAP = 'mindmap',
  /** 信息图表（未来支持） */
  INFOGRAPHIC = 'infographic',
}
