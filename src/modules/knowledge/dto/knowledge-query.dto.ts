import { IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 知识点查询 DTO
 * 核心场景：按天查询
 */
export class KnowledgeQueryDto {
  @ApiProperty({
    description: '查询日期（YYYY-MM-DD 格式），默认今天',
    example: '2026-02-25',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
