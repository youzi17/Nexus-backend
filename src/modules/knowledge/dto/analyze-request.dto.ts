import { IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 知识点分析请求 DTO
 */
export class AnalyzeRequestDto {
  @ApiProperty({
    description: '分析的目标日期（YYYY-MM-DD），默认今天',
    example: '2026-02-25',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    description: '是否启用联网搜索增强',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  webSearchEnabled?: boolean;
}
