import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  MessageEvent,
  Logger,
  HttpStatus,
  NotFoundException,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Observable, from } from 'rxjs';
import { KnowledgeAnalysisService } from './knowledge-analysis.service';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { StreamEvent } from '../ai-processing/types/ai.types';

/**
 * 知识点分析控制器
 * 提供 SSE 流式分析接口和分析记录查询
 */
@ApiTags('知识点分析')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeAnalysisController {
  private readonly logger = new Logger(KnowledgeAnalysisController.name);

  constructor(
    private readonly knowledgeAnalysisService: KnowledgeAnalysisService,
  ) {}

  /**
   * 触发知识点分析（SSE 流式响应）
   * POST /api/knowledge/analyze
   * 使用 POST + fetch ReadableStream 实现 SSE（非标准 EventSource）
   */
  @Post('analyze')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @ApiOperation({ summary: '触发知识点分析（SSE 流式响应）' })
  @ApiResponse({ status: HttpStatus.OK, description: 'SSE 流式响应' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '当天无知识点' })
  async analyze(
    @Body() dto: AnalyzeRequestDto,
    @CurrentUser() user: User,
  ): Promise<Observable<MessageEvent>> {
    this.logger.log(`分析请求: userId=${user.id}, date=${dto.date || '今天'}`);

    // 前置校验：在 generator 外部抛出 HTTP 异常，确保 NestJS 能正确处理
    await this.knowledgeAnalysisService.validateAnalyzeRequest(user.id, dto);

    // 将 AsyncIterable 转为 Observable<MessageEvent>
    const streamToObservable = async function* (
      stream: AsyncIterable<StreamEvent>,
    ): AsyncIterable<MessageEvent> {
      for await (const event of stream) {
        yield {
          type: event.type,
          data: event.data,
        } as MessageEvent;
      }
    };

    return from(
      streamToObservable(
        this.knowledgeAnalysisService.analyze(user.id, dto),
      ),
    );
  }

  /**
   * 查询历史分析记录列表
   * GET /api/knowledge/analysis-history
   */
  @Get('analysis-history')
  @ApiOperation({ summary: '查询历史分析记录列表' })
  @ApiResponse({ status: HttpStatus.OK, description: '查询成功' })
  async getAnalysisHistory(
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<unknown>> {
    const records =
      await this.knowledgeAnalysisService.getAnalysisHistory(user.id);
    return ApiResponseDto.success('查询分析记录成功', records);
  }

  /**
   * 查询单条分析记录
   * GET /api/knowledge/analysis/:id
   */
  @Get('analysis/:id')
  @ApiOperation({ summary: '查询单条分析记录' })
  @ApiResponse({ status: HttpStatus.OK, description: '查询成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '记录不存在' })
  async getAnalysisById(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponseDto<unknown>> {
    const record = await this.knowledgeAnalysisService.getAnalysisById(
      id,
      user.id,
    );

    if (!record) {
      throw new NotFoundException('分析记录不存在');
    }

    return ApiResponseDto.success('查询分析记录成功', record);
  }
}
