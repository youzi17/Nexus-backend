import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SearchAggregatorController } from './search-aggregator.controller';
import { SearchAggregatorService } from './services/search-aggregator.service';
import { SearchCacheService } from './services/search-cache.service';
import { BaiduSearchAdapter } from './adapters/baidu-search.adapter';
import { WikipediaAdapter } from './adapters/wikipedia.adapter';
import { SearchSource } from './entities/search-source.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SearchSource])],
  controllers: [SearchAggregatorController],
  providers: [
    SearchAggregatorService,
    SearchCacheService,
    BaiduSearchAdapter,
    WikipediaAdapter,
  ],
  exports: [SearchAggregatorService],
})
export class SearchAggregatorModule {}
