/**
 * 知识点聚合分析提示词模板
 * 引导 AI 对当天知识点进行分类、关联关系分析和逻辑脉络梳理
 */
export function buildKnowledgeAnalysisPrompt(params: {
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
}): string {
  const { knowledgeEntries, date, webSearchResults = [] } = params;

  let prompt = `你是一位专业的知识管理分析师，擅长对零散的知识点进行系统化整理、分类归组和关联关系分析。

## 任务说明
以下是用户在 ${date} 录入的 ${knowledgeEntries.length} 条知识点，请对这些知识点进行深度分析。

## 知识点列表
`;

  // 添加知识点
  knowledgeEntries.forEach((entry, index) => {
    const tagsStr = entry.tags.length > 0 ? ` [标签: ${entry.tags.join(', ')}]` : '';
    prompt += `${index + 1}. ${entry.content}${tagsStr}\n`;
  });

  // 添加联网搜索结果
  if (webSearchResults.length > 0) {
    prompt += `\n## 联网搜索补充资料\n`;
    webSearchResults.forEach((result, index) => {
      prompt += `### [资料 ${index + 1}] ${result.title}
- URL: ${result.url}
- 摘要: ${result.snippet}

`;
    });
  }

  prompt += `
## 输出要求
请按以下结构输出分析结果，使用 Markdown 格式：

### 1. 知识点分类
将知识点按主题/领域归组，每组给出组名和包含的知识点编号。

### 2. 关联关系分析
分析知识点之间的逻辑联系，说明哪些知识点相互关联、如何关联（因果、递进、对比、互补等）。

### 3. 逻辑脉络梳理
从整体视角梳理这些知识点构成的知识结构，描述它们之间的层次关系和学习路径。

### 4. 知识盲区提示（可选）
如果发现知识点之间存在明显的知识缺口或值得深入的方向，简要提示。

## 注意事项
- 分析必须基于用户实际录入的知识点，不要编造不存在的内容
- 如果知识点数量较少（≤3条），适当简化分析结构，不必强行归类
- 如果有联网搜索资料，用 [资料 N] 标注引用
- 语言简洁专业，避免空泛的套话

请开始分析：`;

  return prompt;
}
