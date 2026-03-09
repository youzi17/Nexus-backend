import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeEntry } from './entities/knowledge-entry.entity';
import { AnalysisRecord } from './entities/analysis-record.entity';
import { KnowledgeEntryService } from './knowledge-entry.service';
import { KnowledgeEntryController } from './knowledge-entry.controller';
import { KnowledgeAnalysisService } from './knowledge-analysis.service';
import { KnowledgeAnalysisController } from './knowledge-analysis.controller';
import { AiProcessingModule } from '../ai-processing/ai-processing.module';
import { SearchAggregatorModule } from '../search-aggregator/search-aggregator.module';

/**
 * 知识点模块 (M9)
 *
 * 职责：知识点 CRUD、按天查询、触发 AI 分析、分析记录管理
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeEntry, AnalysisRecord]),
    AiProcessingModule,
    SearchAggregatorModule,
  ],
  controllers: [KnowledgeEntryController, KnowledgeAnalysisController],
  providers: [KnowledgeEntryService, KnowledgeAnalysisService],
  exports: [KnowledgeEntryService],
})
export class KnowledgeModule {}
