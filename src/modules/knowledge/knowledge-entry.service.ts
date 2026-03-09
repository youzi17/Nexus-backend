import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { KnowledgeEntry } from './entities/knowledge-entry.entity';
import { CreateKnowledgeEntryDto } from './dto/create-knowledge-entry.dto';

/**
 * 知识点条目服务
 *
 * 职责：知识点的增删查，按天聚合查询
 */
@Injectable()
export class KnowledgeEntryService {
  private readonly logger = new Logger(KnowledgeEntryService.name);

  constructor(
    @InjectRepository(KnowledgeEntry)
    private readonly knowledgeEntryRepo: Repository<KnowledgeEntry>,
  ) {}

  /**
   * 创建单条知识点
   */
  async create(
    userId: string,
    dto: CreateKnowledgeEntryDto,
  ): Promise<KnowledgeEntry> {
    const entry = this.knowledgeEntryRepo.create({
      content: dto.content,
      tags: dto.tags ?? [],
      userId,
    });

    const saved = await this.knowledgeEntryRepo.save(entry);
    this.logger.log(`知识点创建成功: id=${saved.id}, userId=${userId}`);
    return saved;
  }

  /**
   * 批量创建知识点
   */
  async batchCreate(
    userId: string,
    dtos: CreateKnowledgeEntryDto[],
  ): Promise<KnowledgeEntry[]> {
    const entries = dtos.map((dto) =>
      this.knowledgeEntryRepo.create({
        content: dto.content,
        tags: dto.tags ?? [],
        userId,
      }),
    );

    const saved = await this.knowledgeEntryRepo.save(entries);
    this.logger.log(
      `批量创建知识点成功: count=${saved.length}, userId=${userId}`,
    );
    return saved;
  }

  /**
   * 按天查询知识点列表
   * @param date 日期字符串 YYYY-MM-DD，默认今天
   */
  async findByDate(userId: string, date?: string): Promise<KnowledgeEntry[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 构建当天的时间范围（使用本地时区，避免 UTC 偏移导致查询结果不准确）
    const startOfDay = new Date(`${targetDate}T00:00:00.000`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999`);

    return this.knowledgeEntryRepo.find({
      where: {
        userId,
        createdAt: Between(startOfDay, endOfDay),
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 删除知识点（软删除）
   */
  async delete(id: string, userId: string): Promise<void> {
    const entry = await this.knowledgeEntryRepo.findOne({ where: { id } });

    if (!entry) {
      throw new NotFoundException('知识点不存在');
    }

    if (entry.userId !== userId) {
      throw new ForbiddenException('无权删除此知识点');
    }

    await this.knowledgeEntryRepo.softDelete(id);
    this.logger.log(`知识点删除成功: id=${id}, userId=${userId}`);
  }
}
