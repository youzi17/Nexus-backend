import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QwenModel } from '../types/model.enum';
import { ExternalSourceDto } from './ai-request.dto';

/**
 * Token 使用统计 DTO
 */
export class TokenUsageDto {
  @ApiProperty({ description: '输入 token 数量' })
  inputTokens: number;

  @ApiProperty({ description: '输出 token 数量' })
  outputTokens: number;

  @ApiProperty({ description: '总 token 数量' })
  totalTokens: number;

  @ApiProperty({ description: '使用的模型', enum: QwenModel })
  model: QwenModel;

  @ApiProperty({ description: '总成本（人民币）' })
  totalCost: number;
}

/**
 * AI 生成响应 DTO
 */
export class AiGenerateResponseDto {
  @ApiProperty({ description: '生成的内容（Markdown 格式）' })
  content: string;

  @ApiProperty({ description: '使用的模型', enum: QwenModel })
  model: QwenModel;

  @ApiProperty({ description: 'Token 使用统计', type: TokenUsageDto })
  tokenUsage: TokenUsageDto;

  @ApiProperty({ description: '处理耗时（毫秒）' })
  processingTimeMs: number;

  @ApiProperty({ description: '是否来自缓存' })
  fromCache: boolean;

  @ApiPropertyOptional({
    description: '引用的来源列表',
    type: [ExternalSourceDto],
  })
  sources?: ExternalSourceDto[];
}
