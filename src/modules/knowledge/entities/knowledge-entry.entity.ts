import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/user.entity';

/**
 * 知识点条目实体
 *
 * 用户录入的单条知识点，按天聚合查询是核心场景。
 * 索引设计：
 * - idx_ke_user_created: 复合索引，按用户+时间查询（高频场景）
 */
@Entity('knowledge_entries')
@Index('idx_ke_user_created', ['userId', 'createdAt'])
export class KnowledgeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 知识点内容（纯文字） */
  @Column({ type: 'text' })
  content: string;

  /** 用户自定义标签 */
  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  /** 软删除时间戳 */
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

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
