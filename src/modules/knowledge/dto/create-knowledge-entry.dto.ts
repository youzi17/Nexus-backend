import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 创建知识点 DTO
 */
export class CreateKnowledgeEntryDto {
  @ApiProperty({
    description: '知识点内容',
    example: 'TypeScript 的泛型约束可以用 extends 关键字限制类型参数的范围',
  })
  @IsString()
  @IsNotEmpty({ message: '知识点内容不能为空' })
  @MaxLength(5000, { message: '知识点内容不能超过 5000 字' })
  content: string;

  @ApiProperty({
    description: '标签列表',
    example: ['TypeScript', '泛型'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * 批量创建知识点 DTO
 */
export class BatchCreateKnowledgeEntryDto {
  @ApiProperty({
    description: '知识点列表',
    type: [CreateKnowledgeEntryDto],
  })
  @IsArray()
  @IsNotEmpty({ message: '知识点列表不能为空' })
  @ValidateNested({ each: true })
  @Type(() => CreateKnowledgeEntryDto)
  entries: CreateKnowledgeEntryDto[];
}
