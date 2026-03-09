import { ApiProperty } from '@nestjs/swagger';
import { StreamEventType } from '../types/ai.types';
import { QwenModel } from '../types/model.enum';
import { TokenUsageDto } from './ai-response.dto';
import { ExternalSourceDto } from './ai-request.dto';

/**
 * 流式响应 - 开始事件数据 DTO
 */
export class StreamStartDataDto {
  @ApiProperty({ description: '任务 ID' })
  taskId: string;

  @ApiProperty({ description: '使用的模型', enum: QwenModel })
  model: QwenModel;

  @ApiProperty({ description: '开始时间' })
  startTime: string;
}

/**
 * 流式响应 - 内容块事件数据 DTO
 */
export class StreamChunkDataDto {
  @ApiProperty({ description: '内容块' })
  content: string;
}

/**
 * 流式响应 - 来源事件数据 DTO
 */
export class StreamSourcesDataDto {
  @ApiProperty({
    description: '引用来源列表',
    type: [ExternalSourceDto],
  })
  sources: ExternalSourceDto[];
}

/**
 * 流式响应 - 完成事件数据 DTO
 */
export class StreamDoneDataDto {
  @ApiProperty({ description: 'Token 使用统计', type: TokenUsageDto })
  tokenUsage: TokenUsageDto;

  @ApiProperty({ description: '处理耗时（毫秒）' })
  processingTimeMs: number;
}

/**
 * 流式响应 - 取消事件数据 DTO
 */
export class StreamCancelledDataDto {
  @ApiProperty({ description: '已生成的部分内容' })
  partialContent: string;

  @ApiProperty({ description: '取消时间' })
  cancelledAt: string;

  @ApiProperty({ description: '已消耗的 Token', type: TokenUsageDto })
  tokenUsage?: TokenUsageDto;
}

/**
 * 流式响应 - 错误事件数据 DTO
 */
export class StreamErrorDataDto {
  @ApiProperty({ description: '错误消息' })
  message: string;

  @ApiProperty({ description: '错误代码' })
  code?: string;
}

/**
 * 流式响应事件 DTO
 */
export class StreamEventDto {
  @ApiProperty({
    description: '事件类型',
    enum: StreamEventType,
  })
  type: StreamEventType;

  @ApiProperty({
    description: '事件数据',
    oneOf: [
      { $ref: '#/components/schemas/StreamStartDataDto' },
      { $ref: '#/components/schemas/StreamChunkDataDto' },
      { $ref: '#/components/schemas/StreamSourcesDataDto' },
      { $ref: '#/components/schemas/StreamDoneDataDto' },
      { $ref: '#/components/schemas/StreamCancelledDataDto' },
      { $ref: '#/components/schemas/StreamErrorDataDto' },
    ],
  })
  data:
    | StreamStartDataDto
    | StreamChunkDataDto
    | StreamSourcesDataDto
    | StreamDoneDataDto
    | StreamCancelledDataDto
    | StreamErrorDataDto;
}
