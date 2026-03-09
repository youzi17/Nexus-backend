import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QwenModel, MODEL_COSTS, MODEL_MAX_CONTEXT } from './types/model.enum';
import { OutputStyle } from './types/output-style.enum';
import {
  AiContext,
  AiGenerateOptions,
  AiGenerateResult,
  TokenUsage,
  StreamEvent,
  StreamEventType,
} from './types/ai.types';
import { QwenPlusStrategy } from './strategies/qwen-plus.strategy';
import { QwenMaxStrategy } from './strategies/qwen-max.strategy';
import { QwenVlStrategy } from './strategies/qwen-vl.strategy';
import { PromptTemplateService } from './prompts/prompt-template.service';
import { AiCacheService } from './cache/ai-cache.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * AI 处理服务
 * 负责调用阿里云通义千问大模型进行内容分析、结构化生成和多模态理解
 */
@Injectable()
export class AiProcessingService {
  private readonly logger = new Logger(AiProcessingService.name);
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly defaultTimeout: number;

  constructor(
    private readonly qwenPlusStrategy: QwenPlusStrategy,
    private readonly qwenMaxStrategy: QwenMaxStrategy,
    private readonly qwenVlStrategy: QwenVlStrategy,
    private readonly promptTemplateService: PromptTemplateService,
    private readonly aiCacheService: AiCacheService,
    private readonly configService: ConfigService,
  ) {
    this.maxRetries = this.configService.get<number>('AI_MAX_RETRIES', 3);
    this.retryDelay = this.configService.get<number>('AI_RETRY_DELAY', 1000);
    this.defaultTimeout = this.configService.get<number>(
      'AI_REQUEST_TIMEOUT',
      60000,
    );
  }

  /**
   * 生成 AI 内容（非流式）
   */
  async generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const startTime = Date.now();
    const {
      context,
      model: specifiedModel,
      enableCache = true,
      timeout = this.defaultTimeout,
    } = options;

    // 选择模型
    const model = specifiedModel || this.selectModel(context);
    this.logger.log(`Using model: ${model}`);

    // 检查缓存
    if (enableCache) {
      const contextHash = this.aiCacheService.generateContextHash(
        context.query,
        [],
        context.sources || [],
      );
      const cached = await this.aiCacheService.getCachedResult(
        model,
        contextHash,
      );
      if (cached) {
        this.logger.log(`Cache hit for model: ${model}`);
        return cached;
      }
    }

    // 构建提示词
    const prompt = this.buildPrompt(context);

    // 调用 AI 模型
    const strategy = this.getStrategy(model);
    const content = await this.callWithRetry(() =>
      strategy.generate(prompt, { timeout }),
    );

    // 计算 Token 使用
    const tokenUsage = this.calculateTokenUsage(prompt, content, model);

    // 构建结果
    const result: AiGenerateResult = {
      content,
      model,
      tokenUsage,
      processingTimeMs: Date.now() - startTime,
      fromCache: false,
      sources: context.sources,
    };

    // 写入缓存
    if (enableCache) {
      const contextHash = this.aiCacheService.generateContextHash(
        context.query,
        [],
        context.sources || [],
      );
      await this.aiCacheService.setCachedResult(model, contextHash, result);
    }

    return result;
  }

  /**
   * 流式生成 AI 内容
   */
  async *generateStream(
    options: AiGenerateOptions,
  ): AsyncIterable<StreamEvent> {
    const startTime = Date.now();
    const taskId = uuidv4();
    const {
      context,
      model: specifiedModel,
      timeout = this.defaultTimeout,
      skipPromptBuild = false,
    } = options;

    // 选择模型
    const model = specifiedModel || this.selectModel(context);
    this.logger.log(
      `Stream generation started, taskId: ${taskId}, model: ${model}`,
    );

    // 发送开始事件
    yield {
      type: StreamEventType.START,
      data: {
        taskId,
        model,
        startTime: new Date().toISOString(),
      },
    };

    try {
      // 构建提示词（支持跳过模板构建，直接使用 query）
      const prompt = skipPromptBuild
        ? context.query
        : this.buildPrompt(context);

      // 创建取消控制器
      const abortController = new AbortController();

      // 调用 AI 模型流式生成
      const strategy = this.getStrategy(model);
      let fullContent = '';
      let chunkCount = 0;

      for await (const chunk of strategy.generateStream(prompt, {
        timeout,
        abortController,
      })) {
        fullContent += chunk;
        chunkCount++;

        // 发送内容块事件
        yield {
          type: StreamEventType.CHUNK,
          data: {
            content: chunk,
          },
        };
      }

      // 发送来源事件
      if (context.sources && context.sources.length > 0) {
        yield {
          type: StreamEventType.SOURCES,
          data: {
            sources: context.sources,
          },
        };
      }

      // 计算 Token 使用
      const tokenUsage = this.calculateTokenUsage(prompt, fullContent, model);

      // 发送完成事件
      yield {
        type: StreamEventType.DONE,
        data: {
          tokenUsage,
          processingTimeMs: Date.now() - startTime,
        },
      };

      this.logger.log(
        `Stream generation completed, taskId: ${taskId}, chunks: ${chunkCount}`,
      );
    } catch (error) {
      this.logger.error(`Stream generation failed, taskId: ${taskId}`, error);

      // 发送错误事件
      yield {
        type: StreamEventType.ERROR,
        data: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'GENERATION_ERROR',
        },
      };
    }
  }

  /**
   * 选择最优模型
   */
  private selectModel(context: AiContext): QwenModel {
    // 包含图片文件 → Qwen-VL
    // 注意：这里简化处理，实际应该检查文件类型
    // 在实际使用中，应该从 fileContents 的元数据中判断是否包含图片

    // 查询长度 > 1000 字符 → Qwen-Max
    if (context.query.length > 1000) {
      return QwenModel.QWEN_MAX;
    }

    // 默认 → Qwen-Plus
    return QwenModel.QWEN_PLUS;
  }

  /**
   * 获取模型策略
   */
  private getStrategy(model: QwenModel) {
    switch (model) {
      case QwenModel.QWEN_PLUS:
        return this.qwenPlusStrategy;
      case QwenModel.QWEN_MAX:
        return this.qwenMaxStrategy;
      case QwenModel.QWEN_VL:
        return this.qwenVlStrategy;
      default:
        throw new Error(`Unknown model: ${String(model)}`);
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(context: AiContext): string {
    const {
      query,
      fileContents = [],
      sources = [],
      outputStyle = OutputStyle.DETAILED,
    } = context;

    return this.promptTemplateService.buildPrompt('search', {
      query,
      sources,
      fileContents,
      outputStyle,
    });
  }

  /**
   * 计算 Token 使用
   */
  private calculateTokenUsage(
    prompt: string,
    content: string,
    model: QwenModel,
  ): TokenUsage {
    // 简化的 Token 计算（实际应该使用 tiktoken 或类似库）
    // 中文：1 字符 ≈ 1.5 tokens
    // 英文：1 单词 ≈ 1.3 tokens
    const inputTokens = Math.ceil(prompt.length * 1.5);
    const outputTokens = Math.ceil(content.length * 1.5);
    const totalTokens = inputTokens + outputTokens;

    const costPerToken = MODEL_COSTS[model] / 1000;
    const totalCost = totalTokens * costPerToken;

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      model,
      totalCost,
    };
  }

  /**
   * 带重试的调用
   */
  private async callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        this.logger.warn(
          `Attempt ${attempt}/${this.maxRetries} failed: ${lastError.message}`,
        );

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // 指数退避
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * 获取支持的模型列表
   */
  getAvailableModels(): Array<{
    model: QwenModel;
    cost: number;
    maxContext: number;
  }> {
    return Object.values(QwenModel).map((model) => ({
      model,
      cost: MODEL_COSTS[model],
      maxContext: MODEL_MAX_CONTEXT[model],
    }));
  }
}
