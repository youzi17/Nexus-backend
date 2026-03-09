import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisRecord } from './entities/analysis-record.entity';
import { KnowledgeEntryService } from './knowledge-entry.service';
import { AiProcessingService } from '../ai-processing/ai-processing.service';
import { PromptTemplateService } from '../ai-processing/prompts/prompt-template.service';
import { SearchAggregatorService } from '../search-aggregator/services/search-aggregator.service';
import { AnalysisStatus } from '../../common/enums/analysis-status.enum';
import {
  StreamEvent,
  StreamEventType,
  StreamDoneData,
} from '../ai-processing/types/ai.types';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';

/**
 * 知识点分析服务
 *
 * 职责：编排知识点分析流程（查询知识点 → 可选联网搜索 → AI 分析 → 保存记录）
 */
@Injectable()
export class KnowledgeAnalysisService {
  private readonly logger = new Logger(KnowledgeAnalysisService.name);

  constructor(
    @InjectRepository(AnalysisRecord)
    private readonly analysisRecordRepo: Repository<AnalysisRecord>,
    private readonly knowledgeEntryService: KnowledgeEntryService,
    private readonly aiProcessingService: AiProcessingService,
    private readonly promptTemplateService: PromptTemplateService,
    private readonly searchAggregatorService: SearchAggregatorService,
  ) {}

  /**
   * 前置校验：检查指定日期是否有知识点可供分析
   * 在 Controller 层调用，避免在 generator 内抛出 HTTP 异常
   */
  async validateAnalyzeRequest(
    userId: string,
    dto: AnalyzeRequestDto,
  ): Promise<void> {
    const date = dto.date || new Date().toISOString().split('T')[0];
    const entries = await this.knowledgeEntryService.findByDate(userId, date);
    if (entries.length === 0) {
      throw new BadRequestException(`${date} 没有录入知识点，无法分析`);
    }
  }

  /**
   * 触发知识点分析（流式输出）
   * 返回 AsyncIterable<StreamEvent>，由 Controller 转为 SSE
   * 注意：调用前必须先调用 validateAnalyzeRequest 进行前置校验
   */
  async *analyze(
    userId: string,
    dto: AnalyzeRequestDto,
  ): AsyncIterable<StreamEvent> {
    const date = dto.date || new Date().toISOString().split('T')[0];
    const webSearchEnabled = dto.webSearchEnabled ?? false;

    this.logger.log(
      `开始分析: userId=${userId}, date=${date}, webSearch=${webSearchEnabled}`,
    );

    // 1. 查询当天知识点
    const entries = await this.knowledgeEntryService.findByDate(userId, date);

    // 2. 创建分析记录（状态：处理中）
    const record = this.analysisRecordRepo.create({
      date,
      knowledgeEntryIds: entries.map((e) => e.id),
      webSearchEnabled,
      status: AnalysisStatus.PROCESSING,
      userId,
    });
    const savedRecord = await this.analysisRecordRepo.save(record);

    try {
      // 3. 可选联网搜索
      let webSearchResults: Array<{
        title: string;
        url: string;
        snippet: string;
      }> = [];

      if (webSearchEnabled) {
        webSearchResults = await this.performWebSearch(entries);
      }

      // 4. 构建提示词
      const prompt = this.promptTemplateService.buildPrompt(
        'knowledge-analysis',
        {
          knowledgeEntries: entries.map((e) => ({
            id: e.id,
            content: e.content,
            tags: e.tags,
          })),
          date,
          webSearchResults,
        },
      );

      // 5. 调用 AI 流式生成
      let fullContent = '';

      for await (const event of this.aiProcessingService.generateStream({
        context: {
          query: prompt,
        },
        enableCache: false,
        skipPromptBuild: true,
      })) {
        // 透传所有事件给 Controller
        yield event;

        // 收集完整内容用于保存
        if (event.type === StreamEventType.CHUNK) {
          const chunkData = event.data as { content: string };
          fullContent += chunkData.content;
        }

        // 完成时更新分析记录
        if (event.type === StreamEventType.DONE) {
          const doneData = event.data as StreamDoneData;
          await this.analysisRecordRepo.update(savedRecord.id, {
            resultContent: fullContent,
            status: AnalysisStatus.COMPLETED,
            tokenUsage: doneData.tokenUsage,
            processingTimeMs: doneData.processingTimeMs,
          });
        }
      }
    } catch (error) {
      // 更新分析记录为失败状态
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.analysisRecordRepo.update(savedRecord.id, {
        status: AnalysisStatus.FAILED,
        errorMessage,
      });

      // 发送错误事件
      yield {
        type: StreamEventType.ERROR,
        data: {
          message: errorMessage,
          code: 'ANALYSIS_ERROR',
        },
      };
    }
  }

  /** 联网搜索超时时间（毫秒） */
  private static readonly WEB_SEARCH_TIMEOUT_MS = 10_000;

  /**
   * 联网搜索（辅助功能，失败不阻塞分析）
   * 提取知识点关键词进行搜索，10s 超时
   */
  private async performWebSearch(
    entries: Array<{ content: string }>,
  ): Promise<Array<{ title: string; url: string; snippet: string }>> {
    try {
      // 提取前 3 条知识点的关键内容作为搜索词
      const searchQuery = entries
        .slice(0, 3)
        .map((e) => e.content.slice(0, 50))
        .join(' ');

      this.logger.log(`联网搜索: query="${searchQuery.slice(0, 100)}..."`);

      // 使用 Promise.race 实现超时控制
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('联网搜索超时')),
          KnowledgeAnalysisService.WEB_SEARCH_TIMEOUT_MS,
        ),
      );

      const searchResult = await Promise.race([
        this.searchAggregatorService.aggregateSearch(searchQuery),
        timeoutPromise,
      ]);

      // 扁平化搜索结果
      const results: Array<{
        title: string;
        url: string;
        snippet: string;
      }> = [];

      for (const sourceName of Object.keys(searchResult.sources)) {
        const sourceData = searchResult.sources[sourceName];
        if (!sourceData.error) {
          for (const item of sourceData.results.slice(0, 3)) {
            results.push({
              title: item.title,
              url: item.url,
              snippet: item.snippet,
            });
          }
        }
      }

      this.logger.log(`联网搜索完成: ${results.length} 条结果`);
      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`联网搜索失败（不阻塞分析）: ${errorMessage}`);
      return [];
    }
  }

  /**
   * 查询历史分析记录列表
   */
  async getAnalysisHistory(
    userId: string,
  ): Promise<AnalysisRecord[]> {
    return this.analysisRecordRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * 查询单条分析记录
   */
  async getAnalysisById(
    id: string,
    userId: string,
  ): Promise<AnalysisRecord | null> {
    return this.analysisRecordRepo.findOne({
      where: { id, userId },
    });
  }
}
