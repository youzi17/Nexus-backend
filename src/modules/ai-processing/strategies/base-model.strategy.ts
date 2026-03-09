import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { IModelStrategy, ModelStrategyOptions } from '../types/ai.types';
import { QwenModel } from '../types/model.enum';
import { firstValueFrom } from 'rxjs';

/**
 * 阿里云 DashScope API 请求体
 */
interface DashScopeRequest {
  model: string;
  input: {
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
  };
  parameters?: {
    result_format?: 'text' | 'message';
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    enable_search?: boolean;
  };
}

/**
 * 阿里云 DashScope API 响应体
 */
interface DashScopeResponse {
  output: {
    text?: string;
    choices?: Array<{
      message: {
        role: string;
        content: string;
      };
    }>;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  request_id: string;
}

/**
 * 阿里云 DashScope API 流式响应块
 */
interface DashScopeStreamChunk {
  output: {
    text?: string;
    choices?: Array<{
      message: {
        role: string;
        content: string;
      };
      finish_reason?: string;
    }>;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

/**
 * 模型策略基类
 * 封装阿里云通义千问 API 调用逻辑
 */
@Injectable()
export abstract class BaseModelStrategy implements IModelStrategy {
  protected readonly apiKey: string;
  protected readonly apiUrl =
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('DASHSCOPE_API_KEY', '');
    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY is not configured');
    }
  }

  /**
   * 获取模型名称
   */
  protected abstract getModelName(): QwenModel;

  /**
   * 生成内容（非流式）
   */
  async generate(
    prompt: string,
    options: ModelStrategyOptions = {},
  ): Promise<string> {
    const {
      timeout = 60000,
      abortController,
      maxTokens,
      temperature = 0.7,
    } = options;

    const requestBody: DashScopeRequest = {
      model: this.getModelName(),
      input: {
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      parameters: {
        result_format: 'message',
        max_tokens: maxTokens,
        temperature,
      },
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- firstValueFrom 类型推断问题
      const axiosResponse = await firstValueFrom(
        this.httpService.post<DashScopeResponse>(this.apiUrl, requestBody, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout,
          signal: abortController?.signal,
        }),
      );

      // 类型守卫：确保响应数据存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- axios 响应类型问题
      const response = axiosResponse.data;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- axios 响应类型问题
      if (!response || !response.output) {
        throw new Error('Invalid response from DashScope API');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- axios 响应类型问题
      const content =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- axios 响应类型问题
        response.output.choices?.[0]?.message?.content ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- axios 响应类型问题
        response.output.text ||
        '';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- axios 响应类型问题
      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`AI generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 流式生成内容
   */
  async *generateStream(
    prompt: string,
    options: ModelStrategyOptions = {},
  ): AsyncIterable<string> {
    const {
      timeout = 60000,
      abortController,
      maxTokens,
      temperature = 0.7,
    } = options;

    const requestBody: DashScopeRequest = {
      model: this.getModelName(),
      input: {
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      parameters: {
        result_format: 'message',
        max_tokens: maxTokens,
        temperature,
      },
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- firstValueFrom 类型推断问题
      const axiosResponse = await firstValueFrom(
        this.httpService.post<NodeJS.ReadableStream>(this.apiUrl, requestBody, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-SSE': 'enable',
          },
          timeout,
          signal: abortController?.signal,
          responseType: 'stream',
        }),
      );

      // 类型守卫：确保响应数据是可读流
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- axios 响应类型问题
      const stream = axiosResponse.data;
      if (!stream || typeof stream !== 'object') {
        throw new Error('Invalid stream response from DashScope API');
      }

      let buffer = '';

      for await (const chunk of stream as AsyncIterable<Buffer>) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') {
              return;
            }

            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- JSON.parse 返回类型
              const parsed: DashScopeStreamChunk = JSON.parse(data);
              const content =
                parsed.output.choices?.[0]?.message?.content ||
                parsed.output.text ||
                '';
              if (content) {
                yield content;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`AI stream generation failed: ${error.message}`);
      }
      throw error;
    }
  }
}
