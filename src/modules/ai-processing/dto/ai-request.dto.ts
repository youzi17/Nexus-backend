import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QwenModel } from '../types/model.enum';
import { OutputStyle } from '../types/output-style.enum';

/**
 * 外部数据源 DTO
 */
export class ExternalSourceDto {
  @ApiProperty({ description: '来源标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '来源 URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: '来源内容摘要' })
  @IsString()
  snippet: string;

  @ApiProperty({ description: '来源类型（serpapi/wikipedia/arxiv等）' })
  @IsString()
  type: string;
}

/**
 * AI 生成请求 DTO
 */
export class AiGenerateRequestDto {
  @ApiProperty({ description: '用户查询文本' })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: '上传文件的提取内容',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileContents?: string[];

  @ApiPropertyOptional({
    description: '外部数据源的搜索结果',
    type: [ExternalSourceDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalSourceDto)
  sources?: ExternalSourceDto[];

  @ApiPropertyOptional({
    description: '输出风格',
    enum: OutputStyle,
    default: OutputStyle.DETAILED,
  })
  @IsOptional()
  @IsEnum(OutputStyle)
  outputStyle?: OutputStyle;

  @ApiPropertyOptional({
    description: '指定使用的模型（可选，不指定则自动选择）',
    enum: QwenModel,
  })
  @IsOptional()
  @IsEnum(QwenModel)
  model?: QwenModel;

  @ApiPropertyOptional({
    description: '是否启用缓存',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableCache?: boolean;

  @ApiPropertyOptional({
    description: '超时时间（毫秒）',
    default: 60000,
    minimum: 1000,
    maximum: 300000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number;
}
