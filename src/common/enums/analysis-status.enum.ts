/**
 * 分析状态枚举
 * 用于 KnowledgeModule 的分析记录状态管理
 * 状态流转：PENDING → PROCESSING → COMPLETED/FAILED
 */
export enum AnalysisStatus {
  /** 待处理 */
  PENDING = 'pending',
  /** 处理中 */
  PROCESSING = 'processing',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 失败 */
  FAILED = 'failed',
}
