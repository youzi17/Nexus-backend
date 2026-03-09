import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AiProcessingModule } from './modules/ai-processing/ai-processing.module';
import { SearchAggregatorModule } from './modules/search-aggregator/search-aggregator.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(databaseConfig()),
    UsersModule,
    AuthModule,
    AiProcessingModule,
    SearchAggregatorModule,
    KnowledgeModule, // M9 - 知识点模块
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
