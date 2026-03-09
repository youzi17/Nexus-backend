import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { SearchAggregatorService } from './services/search-aggregator.service';
import { SearchRequestDto } from './dto/search-request.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

// 公开端点装饰器
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * 搜索聚合控制器
 * 职责：联网搜索能力，为知识点分析提供外部资料增强
 */
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchAggregatorController {
  private readonly logger = new Logger(SearchAggregatorController.name);

  constructor(
    private readonly searchAggregatorService: SearchAggregatorService,
  ) {}

  /**
   * 聚合搜索接口
   * POST /api/search/aggregate
   */
  @Post('aggregate')
  async aggregateSearch(
    @Body() searchDto: SearchRequestDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(
      `Aggregate search: userId=${user.id}, query="${searchDto.query}"`,
    );

    const result = await this.searchAggregatorService.aggregateSearch(
      searchDto.query,
      searchDto.sources,
      searchDto.limit || 10,
    );

    return ApiResponseDto.success('搜索成功', result);
  }

  /**
   * 获取数据源列表
   * GET /api/search/sources
   */
  @Get('sources')
  async getSources() {
    const sources = await this.searchAggregatorService.getAllSources();
    return ApiResponseDto.success('获取数据源列表成功', sources);
  }

  /**
   * 检查适配器可用性
   * GET /api/search/health
   */
  @Get('health')
  async checkHealth() {
    const availability =
      await this.searchAggregatorService.checkAdaptersAvailability();
    return ApiResponseDto.success('健康检查完成', availability);
  }

  /**
   * 更新数据源状态
   * POST /api/search/sources/:name/toggle
   */
  @Post('sources/:name/toggle')
  async toggleSource(
    @Param('name') name: string,
    @Body('enabled') enabled: boolean,
  ) {
    const source = await this.searchAggregatorService.updateSourceStatus(
      name,
      enabled,
    );
    return ApiResponseDto.success('更新数据源状态成功', source);
  }
}
