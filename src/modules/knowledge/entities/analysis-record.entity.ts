import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { AnalysisStatus } from '../../../common/enums/analysis-status.enum';
import { TokenUsage } from '../../ai-processing/types/ai.types';

/**
 * 分析记录实体
 *
 * 存储每次 AI 分析的结果，与用户和日期关联。
 * 索引设计：
 * - idx_ar_user_date: 复合索引，按用户+日期查询（高频场景）
 */
@Entity('analysis_records')
@Index('idx_ar_user_date', ['userId', 'date'])
export class AnalysisRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 分析的目标日期 */
  @Column({ type: 'date' })
  date: string;

  /** 参与分析的知识点 ID 列表 */
  @Column({ type: 'jsonb', name: 'knowledge_entry_ids', default: [] })
  knowledgeEntryIds: string[];

  /** AI 分析结果（Markdown 格式） */
  @Column({ type: 'text', name: 'result_content', nullable: true })
  resultContent: string | null;

  /** 是否启用了联网搜索 */
  @Column({ type: 'boolean', name: 'web_search_enabled', default: false })
  webSearchEnabled: boolean;

  /** 分析状态 */
  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    default: AnalysisStatus.PENDING,
  })
  status: AnalysisStatus;

  /** Token 消耗统计 */
  @Column({ type: 'jsonb', name: 'token_usage', nullable: true })
  tokenUsage: TokenUsage | null;

  /** 处理耗时（毫秒） */
  @Column({ type: 'int', name: 'processing_time_ms', nullable: true })
  processingTimeMs: number | null;

  /** 错误信息 */
  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
