import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BaseModelStrategy } from './base-model.strategy';
import { QwenModel } from '../types/model.enum';

/**
 * Qwen-VL 模型策略
 * 图像理解任务，支持图文混合输入(¥0.008/1k tokens)
 */
@Injectable()
export class QwenVlStrategy extends BaseModelStrategy {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
  }

  protected getModelName(): QwenModel {
    return QwenModel.QWEN_VL;
  }
}
