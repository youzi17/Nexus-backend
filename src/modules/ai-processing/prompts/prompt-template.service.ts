import { Injectable } from '@nestjs/common';
import { OutputStyle } from '../types/output-style.enum';
import { buildSearchPrompt } from './templates/search.template';
import { buildSummaryPrompt } from './templates/summary.template';
import { buildAnalysisPrompt } from './templates/analysis.template';
import { buildKnowledgeAnalysisPrompt } from './templates/knowledge-analysis.template';

/**
 * 提示词模板类型
 */
export type PromptTemplateType =
  | 'search'
  | 'summary'
  | 'analysis'
  | 'knowledge-analysis';

/**
 * 搜索模板参数
 */
export interface SearchPromptParams {
  query: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
    type: string;
  }>;
  fileContents?: string[];
  outputStyle: OutputStyle;
}

/**
 * 摘要模板参数
 */
export interface SummaryPromptParams {
  content: string;
  maxLength?: number;
}

/**
 * 分析模板参数
 */
export interface AnalysisPromptParams {
  topic: string;
  context?: string;
}

/**
 * 知识点聚合分析模板参数
 */
export interface KnowledgeAnalysisPromptParams {
  knowledgeEntries: Array<{
    id: string;
    content: string;
    tags: string[];
  }>;
  date: string;
  webSearchResults?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

/**
 * 提示词模板服务
 * 统一管理不同场景的提示词模板
 */
@Injectable()
export class PromptTemplateService {
  /**
   * 构建提示词
   * @param templateType 模板类型
   * @param params 模板参数
   * @returns 构建好的提示词
   */
  buildPrompt(
    templateType: PromptTemplateType,
    params:
      | SearchPromptParams
      | SummaryPromptParams
      | AnalysisPromptParams
      | KnowledgeAnalysisPromptParams,
  ): string {
    switch (templateType) {
      case 'search':
        return buildSearchPrompt(params as SearchPromptParams);
      case 'summary':
        return buildSummaryPrompt(params as SummaryPromptParams);
      case 'analysis':
        return buildAnalysisPrompt(params as AnalysisPromptParams);
      case 'knowledge-analysis':
        return buildKnowledgeAnalysisPrompt(
          params as KnowledgeAnalysisPromptParams,
        );
      default:
        throw new Error(`Unknown template type: ${String(templateType)}`);
    }
  }
}
