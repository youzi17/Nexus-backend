import {
  OutputStyle,
  OUTPUT_STYLE_DESCRIPTIONS,
} from '../../types/output-style.enum';

/**
 * 搜索提示词模板
 * 用于交叉验证多源信息，生成结构化回答
 */
export function buildSearchPrompt(params: {
  query: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
    type: string;
  }>;
  fileContents?: string[];
  outputStyle: OutputStyle;
}): string {
  const { query, sources = [], fileContents = [], outputStyle } = params;

  const styleDescription = OUTPUT_STYLE_DESCRIPTIONS[outputStyle];

  let prompt = `你是一个专业的信息整理助手，擅长从多个来源交叉验证信息，生成准确、结构化的回答。

## 用户问题
${query}

`;

  // 添加外部来源
  if (sources.length > 0) {
    prompt += '## 外部数据来源\n';
    sources.forEach((source, index) => {
      prompt += `### [来源 ${index + 1}] ${source.title} (${source.type})
- URL: ${source.url}
- 摘要: ${source.snippet}

`;
    });
  }

  // 添加用户文件内容
  if (fileContents.length > 0) {
    prompt += '## 用户上传的文件内容\n';
    fileContents.forEach((content, index) => {
      prompt += `### 文件 ${index + 1}
${content}

`;
    });
  }

  // 添加输出要求
  prompt += `## 输出要求
1. **输出风格**: ${styleDescription}
2. **格式**: 使用 Markdown 格式
3. **引用标注**: 在引用外部来源时，使用 [来源 N] 标注
4. **交叉验证**: 如果多个来源信息不一致，请指出差异
5. **准确性**: 只基于提供的来源回答，不要编造信息
6. **结构化**: 使用标题、列表、代码块等提升可读性

请开始回答：`;

  return prompt;
}
