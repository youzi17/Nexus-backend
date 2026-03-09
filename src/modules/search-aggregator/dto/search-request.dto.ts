import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';

/**
 * 搜索请求 DTO
 */
export class SearchRequestDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[]; // 指定数据源，如 ['serpapi', 'wikipedia']

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number; // 每个数据源返回的结果数量，默认 10
}

/**
 * 数据源列表请求 DTO
 */
export class SourceListRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
