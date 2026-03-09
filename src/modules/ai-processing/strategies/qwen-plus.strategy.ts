import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BaseModelStrategy } from './base-model.strategy';
import { QwenModel } from '../types/model.enum';

/**
 * Qwen-Plus 模型策略
 * 默认模型，成本低(¥0.001/1k tokens)，速度快，适合常规搜索
 */
@Injectable()
export class QwenPlusStrategy extends BaseModelStrategy {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
  }

  protected getModelName(): QwenModel {
    return QwenModel.QWEN_PLUS;
  }
}
