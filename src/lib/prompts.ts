/**
 * LLM prompt templates for PrincipAI learning package generation
 */

export const SYSTEM_PROMPT = `你是 PrincipAI 的 AI 引擎 — 一个专注于「第一性原理学习」的教学设计师。

你的核心使命：
- 帮助学习者在接触内容之前建立认知框架
- 生成高质量的第一性原理问题（不是计算题，是理解题）
- 拆解内容的编排逻辑，揭示章节之间的因果关系
- 预测学习者会遇到的认知误区

你的输出风格：
- 深度优先，拒绝表面总结
- 用具体例子说明抽象概念
- 问题要"可达成但有惊喜感"
- 用中文回复，术语保留英文原文

第一性原理问题的标准：
1. 必须是理解题，不是计算题或记忆题
2. 答案需要把握本质，不是复述定义
3. 能帮学习者建立跨章节的联系
4. 学完后能回答这个问题，说明真正理解了

常见误区预警的标准：
1. 具体描述大部分人会怎么误解（不是"要注意理解"）
2. 解释为什么会产生这个误解
3. 给出验证标准：真正理解应该是什么样的`;

function formatDurationHint(durationSeconds?: number): string {
  if (!durationSeconds || durationSeconds <= 0) return "";
  const m = Math.floor(durationSeconds / 60);
  const s = Math.round(durationSeconds % 60);
  return `- 视频总时长: ${m}分${s}秒（共 ${Math.round(durationSeconds)} 秒）`;
}

function timestampRule(durationSeconds?: number): string {
  const bound =
    durationSeconds && durationSeconds > 0
      ? `所有 start_time / end_time 必须是 0 到 ${Math.round(
          durationSeconds
        )} 之间的秒数，绝不能超过视频总时长。`
      : "所有 start_time / end_time 必须落在视频真实时长之内。";
  return `**时间戳铁律**：${bound}只能使用上面字幕里真实出现的 [mm:ss] 时间戳，按 分×60+秒 换算成秒。严禁编造、估算或外推字幕中不存在的时间。如果某段无法在字幕中定位到时间戳，就省略该段的 start_time，而不是猜一个。`;
}

export function buildSingleVideoPrompt(
  videoTitle: string,
  videoId: string,
  transcript: string,
  seriesContext?: string,
  videoDuration?: number
): string {
  const context = seriesContext
    ? `\n\n## 所属系列上下文\n${seriesContext}\n`
    : "";
  const durationHint = formatDurationHint(videoDuration);

  return `## 任务
为一个 YouTube 视频生成「学习导向包」。

## 视频信息
- 标题: ${videoTitle}
- ID: ${videoId}
${durationHint ? durationHint + "\n" : ""}${context}
## 视频字幕/内容摘要
${transcript}

## 输出要求

请生成以下四个模块的内容：

### 1. 编排逻辑拆解 (narrative_logic)
分析这个视频/章节在整体知识体系中的位置。回答：
- 作者为什么选择这个切入点？
- 这一讲在补什么拼图？
- 与前后章节的因果关系是什么？
- 核心叙事主线是什么？

用 3-5 段话说明，每段聚焦一个逻辑层次。

### 2. 第一性原理前置问题 (questions)
生成 3 个学完必须能回答的本质问题。

要求：
- 每个问题要有 question（问题本身）、why_it_matters（为什么这个问题重要）、depth_hint（回答到什么程度算理解）
- 不是计算题，是理解题
- 能引导学习者看到本质，不是复述定义
- 问题之间有递进关系

### 3. 认知收益预告 (cognitive_benefits)
列出 3-5 条具体的认知收益：
- 学完这个视频，你能做什么之前做不到的事？
- 用"学完后，你将能够..."的格式
- 每条收益要具体可验证，不要空泛

### 4. 常见误区预警 (misconceptions)
列出 3-4 个大部分学习者会踩的认知坑：
- 具体描述误解是什么（不是"要注意理解"）
- 解释为什么容易误解
- 给出检验标准：真正理解 vs 表面理解的表现

### 5. 关键时刻时间线 (sections)
把视频拆成 4-8 个关键时刻/章节，按出现顺序排列。
**重要**：上面的字幕每行前面带有 [mm:ss] 时间戳。对每个章节：
- start_time：根据该章节首次出现的内容，从字幕中找到对应的 [mm:ss] 换算成秒（例如 [3:25] → 205）。
- anchor：从字幕里**逐字复制**该章节开头出现的一句原文（8-20 字，必须与字幕连续片段完全一致，不要改写）。
  系统会用 anchor 把章节对齐到精确的字幕时间，所以请务必照抄、不要润色。

${timestampRule(videoDuration)}

## 输出格式
请以 JSON 格式返回，结构如下（start_time / end_time 均为「秒」整数）：
{
  "narrative_logic": "编排逻辑拆解的完整文本",
  "chapter_dependencies": "这一讲依赖的前置知识，以及它为后续哪些内容铺路",
  "questions": [
    {
      "question": "问题文本",
      "why_it_matters": "为什么这个问题重要",
      "depth_hint": "回答到什么程度算真正理解"
    }
  ],
  "cognitive_benefits": ["收益1", "收益2", ...],
  "misconceptions": ["误区1", "误区2", ...],
  "sections": [
    {
      "title": "章节标题",
      "summary": "章节摘要",
      "start_time": 205,
      "end_time": 360,
      "anchor": "从字幕里逐字复制的该段开头原文",
      "key_concepts": ["概念1", "概念2"]
    }
  ]
}`;
}

export function buildSeriesAnalysisPrompt(
  seriesTitle: string,
  videoSummaries: Array<{
    title: string;
    number: number;
    summary: string;
  }>
): string {
  const episodes = videoSummaries
    .map(
      (v) => `### 第 ${v.number} 集: ${v.title}\n${v.summary}`
    )
    .join("\n\n");

  return `## 任务
为一个视频系列生成全局编排逻辑分析。

## 系列信息
标题: ${seriesTitle}

## 各集内容摘要
${episodes}

## 分析要求

请分析整个系列的编排逻辑：

### 1. 叙事主线 (narrative_logic)
用 5-8 段话说明：
- 整个系列的核心主线是什么？
- 作者为什么按这个顺序讲？
- 章节之间的递进关系是什么？
- 整个系列在构建什么样的认知框架？

### 2. 章节依赖关系 (chapter_dependencies)
说明：
- 哪些概念是后续章节的前置依赖？
- 如果跳过某一集，会影响理解哪些后续内容？
- 整个系列的"知识链"是什么样的？

## 输出格式
请以 JSON 格式返回：
{
  "narrative_logic": "完整的编排逻辑分析文本",
  "chapter_dependencies": "章节依赖关系分析文本"
}`;
}

export function buildEpisodeFromSeriesPrompt(
  episodeTitle: string,
  episodeNumber: number,
  transcript: string,
  seriesLogic: string,
  videoDuration?: number
): string {
  return `## 任务
为一个视频系列中的单集生成学习导向包。

## 视频信息
- 标题: ${episodeTitle}
- 集数: 第 ${episodeNumber} 集
- 在整个系列中的位置

## 系列编排逻辑
${seriesLogic}

## 本集字幕/内容摘要
${transcript}

## 输出要求

请基于系列编排逻辑的上下文，为本集生成学习导向包。

### 1. 编排逻辑拆解 (narrative_logic)
本集在整个系列中的角色：
- 它承接了上一集的什么内容？
- 它解决了什么问题？
- 它为后续内容做了什么铺垫？

### 2. 第一性原理前置问题 (questions)
3 个本质问题，要求：
- 既聚焦本集内容，又能连接到系列主线
- 不是孤立的知识点问题，是框架性问题
- 每个问题要有 question、why_it_matters、depth_hint

### 3. 认知收益预告 (cognitive_benefits)
3-5 条具体收益

### 4. 常见误区预警 (misconceptions)
3-4 个具体误区

### 5. 关键时刻时间线 (sections)
把本集拆成 4-8 个关键时刻/章节，按顺序排列。字幕每行前带 [mm:ss] 时间戳。
每个章节填入 start_time（秒，例如 [3:25] → 205），并在 anchor 字段里**逐字复制**
该段开头出现在字幕中的一句原文（8-20 字，照抄不要改写），系统据此对齐到精确时间。

${timestampRule(videoDuration)}

## 输出格式
请以 JSON 格式返回（start_time / end_time 均为「秒」整数）：
{
  "narrative_logic": "编排逻辑拆解文本",
  "chapter_dependencies": "本集的前置依赖和后续铺垫",
  "questions": [
    {
      "question": "问题",
      "why_it_matters": "重要性",
      "depth_hint": "深度提示"
    }
  ],
  "cognitive_benefits": ["收益1", ...],
  "misconceptions": ["误区1", ...],
  "sections": [
    {
      "title": "章节标题",
      "summary": "章节摘要",
      "start_time": 205,
      "end_time": 360,
      "anchor": "从字幕里逐字复制的该段开头原文",
      "key_concepts": ["概念1", ...]
    }
  ]
}`;
}

export function buildSummaryPrompt(
  videoTitle: string,
  transcript: string
): string {
  return `请为以下视频内容生成一个结构化摘要，用于后续的课程分析。

视频标题: ${videoTitle}

内容字幕:
${transcript}

请提取：
1. 核心主题（1-2句话）
2. 关键概念列表（带简短定义）
3. 主要内容结构（按逻辑分段）
4. 与其他相关概念的联系

输出格式：
## 核心主题
...

## 关键概念
- 概念1: 定义
- 概念2: 定义
...

## 内容结构
1. 部分1标题: 简要描述
2. 部分2标题: 简要描述
...

## 概念联系
...`;
}
