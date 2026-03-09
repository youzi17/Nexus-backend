import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AiProcessingService } from './ai-processing.service';
import { QwenPlusStrategy } from './strategies/qwen-plus.strategy';
import { QwenMaxStrategy } from './strategies/qwen-max.strategy';
import { QwenVlStrategy } from './strategies/qwen-vl.strategy';
import { PromptTemplateService } from './prompts/prompt-template.service';
import { AiCacheService } from './cache/ai-cache.service';

/**
 * AI 处理模块
 * 负责调用阿里云通义千问大模型进行内容分析、结构化生成和多模态理解
 */
@Module({
  imports: [HttpModule, ConfigModule, CacheModule.register()],
  providers: [
    AiProcessingService,
    QwenPlusStrategy,
    QwenMaxStrategy,
    QwenVlStrategy,
    PromptTemplateService,
    AiCacheService,
  ],
  exports: [AiProcessingService, AiCacheService, PromptTemplateService],
})
export class AiProcessingModule {}
