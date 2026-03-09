import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { KnowledgeEntryService } from './knowledge-entry.service';
import {
  CreateKnowledgeEntryDto,
  BatchCreateKnowledgeEntryDto,
} from './dto/create-knowledge-entry.dto';
import { KnowledgeQueryDto } from './dto/knowledge-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('知识点')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeEntryController {
  private readonly logger = new Logger(KnowledgeEntryController.name);

  constructor(
    private readonly knowledgeEntryService: KnowledgeEntryService,
  ) {}

  /**
   * 创建单条知识点
   */
  @Post()
  @ApiOperation({ summary: '创建知识点' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '创建成功' })
  async create(
    @Body() dto: CreateKnowledgeEntryDto,
    @CurrentUser() user: User,
  ) {
    const entry = await this.knowledgeEntryService.create(user.id, dto);
    this.logger.log(`知识点创建: userId=${user.id}`);
    return ApiResponseDto.success('创建知识点成功', entry, HttpStatus.CREATED);
  }

  /**
   * 批量创建知识点
   */
  @Post('batch')
  @ApiOperation({ summary: '批量创建知识点' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '批量创建成功' })
  async batchCreate(
    @Body() dto: BatchCreateKnowledgeEntryDto,
    @CurrentUser() user: User,
  ) {
    const entries = await this.knowledgeEntryService.batchCreate(
      user.id,
      dto.entries,
    );
    this.logger.log(`批量创建知识点: userId=${user.id}, count=${entries.length}`);
    return ApiResponseDto.success(
      '批量创建知识点成功',
      entries,
      HttpStatus.CREATED,
    );
  }

  /**
   * 按天查询知识点列表
   */
  @Get()
  @ApiOperation({ summary: '按天查询知识点列表' })
  @ApiResponse({ status: HttpStatus.OK, description: '查询成功' })
  async findByDate(
    @Query() query: KnowledgeQueryDto,
    @CurrentUser() user: User,
  ) {
    const entries = await this.knowledgeEntryService.findByDate(
      user.id,
      query.date,
    );
    return ApiResponseDto.success('查询知识点成功', entries);
  }

  /**
   * 删除知识点（软删除）
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除知识点' })
  @ApiResponse({ status: HttpStatus.OK, description: '删除成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '知识点不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权删除' })
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.knowledgeEntryService.delete(id, user.id);
    return ApiResponseDto.success('删除知识点成功');
  }
}
