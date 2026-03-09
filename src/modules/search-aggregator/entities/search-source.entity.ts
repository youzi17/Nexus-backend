import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 搜索数据源实体
 */
@Entity('search_source_configs')
@Index('idx_search_source_configs_name', ['name'], { unique: true })
@Index('idx_search_source_configs_enabled', ['enabled'])
@Index('idx_search_source_configs_priority', ['priority'])
export class SearchSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  description: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number; // 优先级，数值越大优先级越高

  @Column({ type: 'int', default: 100 })
  rateLimit: number; // 每分钟请求限制

  @Column({ type: 'jsonb', nullable: true })
  config: {
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    [key: string]: string | number | boolean | undefined;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
