/**
 * 分析提示词模板
 * 用于深度分析，提供背景、原理、应用
 */
export function buildAnalysisPrompt(params: {
  topic: string;
  context?: string;
}): string {
  const { topic, context = '' } = params;

  let prompt = `你是一个专业的技术分析师，擅长深度分析技术主题，提供全面的背景、原理和应用说明。

## 分析主题
${topic}

`;

  if (context) {
    prompt += `## 上下文信息
${context}

`;
  }

  prompt += `## 输出要求
1. **背景**: 介绍主题的背景和发展历史
2. **原理**: 解释核心原理和工作机制
3. **应用**: 说明实际应用场景和案例
4. **优缺点**: 分析优势和局限性
5. **最佳实践**: 提供使用建议和注意事项
6. **格式**: 使用 Markdown 格式，包含标题、列表、代码示例等

请开始分析：`;

  return prompt;
}
