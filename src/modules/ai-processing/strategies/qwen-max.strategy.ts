import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BaseModelStrategy } from './base-model.strategy';
import { QwenModel } from '../types/model.enum';

/**
 * Qwen-Max 模型策略
 * 复杂任务，精度高(¥0.01/1k tokens)，适合深度分析
 */
@Injectable()
export class QwenMaxStrategy extends BaseModelStrategy {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
  }

  protected getModelName(): QwenModel {
    return QwenModel.QWEN_MAX;
  }
}
