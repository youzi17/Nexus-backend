/**
 * 摘要提示词模板
 * 用于提取关键信息，生成简洁摘要
 */
export function buildSummaryPrompt(params: {
  content: string;
  maxLength?: number;
}): string {
  const { content, maxLength = 200 } = params;

  return `你是一个专业的内容摘要助手，擅长提取关键信息，生成简洁准确的摘要。

## 原始内容
${content}

## 输出要求
1. **长度限制**: 摘要不超过 ${maxLength} 字
2. **关键信息**: 提取最重要的核心信息
3. **准确性**: 忠实于原文，不添加原文没有的信息
4. **简洁性**: 使用简洁的语言，避免冗余
5. **格式**: 使用 Markdown 格式

请生成摘要：`;
}
