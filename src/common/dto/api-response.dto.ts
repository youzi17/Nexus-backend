import { HttpStatus } from '@nestjs/common';

export class ApiResponseDto<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code: number;
  timestamp: string;

  private constructor(
    success: boolean,
    message: string,
    data?: T,
    code: number = HttpStatus.OK,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }

  /**
   * 成功响应
   */
  static success<T>(
    message: string,
    data?: T,
    code: number = HttpStatus.OK,
  ): ApiResponseDto<T> {
    return new ApiResponseDto<T>(true, message, data, code);
  }

  /**
   * 错误响应
   */
  static error(
    message: string,
    code: number = HttpStatus.INTERNAL_SERVER_ERROR,
  ): ApiResponseDto {
    return new ApiResponseDto(false, message, undefined, code);
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    message: string,
    items: T[],
    total: number,
    page: number,
    limit: number,
    code: number = HttpStatus.OK,
  ): ApiResponseDto<{
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const totalPages = Math.ceil(total / limit);
    return new ApiResponseDto(
      true,
      message,
      {
        items,
        total,
        page,
        limit,
        totalPages,
      },
      code,
    );
  }
}
