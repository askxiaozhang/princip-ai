/**
 * LLM analysis module - uses Anthropic API for content analysis
 * Compatible with DashScope's Anthropic-compatible proxy endpoint.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM_PROMPT,
  buildSingleVideoPrompt,
  buildSeriesAnalysisPrompt,
  buildEpisodeFromSeriesPrompt,
  buildSummaryPrompt,
} from "./prompts";
import type {
  FirstPrincipleQuestion,
  VideoSection,
  AnswerEvaluation,
} from "./types";

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "API Key 未配置。请在 .env.local 中设置 API_KEY（支持 DashScope/Anthropic/自定义端点）。"
      );
    }
    const baseURL = process.env.API_BASE_URL;
    anthropicClient = new Anthropic({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }
  return anthropicClient;
}

/**
 * Extract JSON from LLM response text.
 * Handles responses wrapped in markdown code blocks (```json ... ``` or ``` ... ```).
 */
function extractJson(text: string): string {
  const trimmed = text.trim();
  // Match ```json\n{...}\n``` or ```\n{...}\n```
  const fenceMatch = trimmed.match(
    /^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/
  );
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

/**
 * Coerce an LLM-provided timestamp into seconds.
 * Accepts a number (seconds) or a "mm:ss" / "hh:mm:ss" string.
 */
function parseTimeToSeconds(val: unknown): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) {
    return val >= 0 ? Math.round(val) : undefined;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    const parts = trimmed.split(":").map((p) => parseInt(p, 10));
    if (parts.length >= 2 && parts.every((n) => !isNaN(n))) {
      return parts.reduce((acc, n) => acc * 60 + n, 0);
    }
  }
  return undefined;
}

/**
 * Normalize the `sections` array from an LLM response, preserving
 * optional start_time / end_time so the UI can offer key-moment jumps.
 */
function mapSections(raw: unknown): VideoSection[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: Record<string, unknown>) => ({
    title: (s.title as string) || "",
    summary: (s.summary as string) || "",
    key_concepts: (s.key_concepts as string[]) || [],
    start_time: parseTimeToSeconds(s.start_time),
    end_time: parseTimeToSeconds(s.end_time),
  }));
}

export interface AnalysisConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_CONFIG: AnalysisConfig = {
  model: "qwen3.7-plus",
  temperature: 0.7,
  maxTokens: 4096,
};

function resolveConfig(
  config?: Partial<AnalysisConfig>
): AnalysisConfig {
  return {
    model: config?.model ?? process.env.API_MODEL ?? DEFAULT_CONFIG.model,
    temperature: config?.temperature ?? DEFAULT_CONFIG.temperature,
    maxTokens: config?.maxTokens ?? DEFAULT_CONFIG.maxTokens,
  };
}

/**
 * Generate a learning orientation package for a single video
 */
export async function analyzeVideo(
  videoTitle: string,
  videoId: string,
  transcript: string,
  seriesContext?: string,
  config?: Partial<AnalysisConfig>
): Promise<{
  narrative_logic: string;
  chapter_dependencies: string;
  questions: FirstPrincipleQuestion[];
  cognitive_benefits: string[];
  misconceptions: string[];
  sections: VideoSection[];
}> {
  const client = getAnthropicClient();
  const cfg = resolveConfig(config);
  const userPrompt = buildSingleVideoPrompt(
    videoTitle,
    videoId,
    transcript,
    seriesContext
  );

  const response = await client.messages.create({
    model: cfg.model,
    temperature: cfg.temperature,
    max_tokens: cfg.maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content =
    response.content.find((b) => b.type === "text")?.text || "";
  if (!content) {
    throw new Error("LLM 返回为空");
  }

  try {
    const parsed = JSON.parse(extractJson(content));
    return {
      narrative_logic: parsed.narrative_logic || "",
      chapter_dependencies: parsed.chapter_dependencies || "",
      questions: (parsed.questions || []).map(
        (q: {
          question: string;
          why_it_matters: string;
          depth_hint?: string;
        }) => ({
          question: q.question,
          why_it_matters: q.why_it_matters,
          depth_hint: q.depth_hint,
        })
      ),
      cognitive_benefits: parsed.cognitive_benefits || [],
      misconceptions: parsed.misconceptions || [],
      sections: mapSections(parsed.sections),
    };
  } catch (e) {
    throw new Error(`解析 LLM 输出失败: ${e}`);
  }
}

/**
 * Analyze the overall structure of a video series
 */
export async function analyzeSeries(
  seriesTitle: string,
  videoSummaries: Array<{
    title: string;
    number: number;
    summary: string;
  }>,
  config?: Partial<AnalysisConfig>
): Promise<{
  narrative_logic: string;
  chapter_dependencies: string;
}> {
  const client = getAnthropicClient();
  const cfg = resolveConfig(config);
  const userPrompt = buildSeriesAnalysisPrompt(seriesTitle, videoSummaries);

  const response = await client.messages.create({
    model: cfg.model,
    temperature: cfg.temperature,
    max_tokens: cfg.maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content =
    response.content.find((b) => b.type === "text")?.text || "";
  if (!content) {
    throw new Error("LLM 返回为空");
  }

  try {
    const parsed = JSON.parse(extractJson(content));
    return {
      narrative_logic: parsed.narrative_logic || "",
      chapter_dependencies: parsed.chapter_dependencies || "",
    };
  } catch (e) {
    throw new Error(`解析 LLM 输出失败: ${e}`);
  }
}

/**
 * Analyze a single episode within a series context
 */
export async function analyzeEpisodeInSeries(
  episodeTitle: string,
  episodeNumber: number,
  transcript: string,
  seriesLogic: string,
  config?: Partial<AnalysisConfig>
) {
  const client = getAnthropicClient();
  const cfg = resolveConfig(config);
  const userPrompt = buildEpisodeFromSeriesPrompt(
    episodeTitle,
    episodeNumber,
    transcript,
    seriesLogic
  );

  const response = await client.messages.create({
    model: cfg.model,
    temperature: cfg.temperature,
    max_tokens: cfg.maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content =
    response.content.find((b) => b.type === "text")?.text || "";
  if (!content) {
    throw new Error("LLM 返回为空");
  }

  try {
    const parsed = JSON.parse(extractJson(content));
    return {
      narrative_logic: parsed.narrative_logic || "",
      chapter_dependencies: parsed.chapter_dependencies || "",
      questions: (parsed.questions || []).map(
        (q: {
          question: string;
          why_it_matters: string;
          depth_hint?: string;
        }) => ({
          question: q.question,
          why_it_matters: q.why_it_matters,
          depth_hint: q.depth_hint,
        })
      ),
      cognitive_benefits: parsed.cognitive_benefits || [],
      misconceptions: parsed.misconceptions || [],
      sections: mapSections(parsed.sections),
    };
  } catch (e) {
    throw new Error(`解析 LLM 输出失败: ${e}`);
  }
}

/**
 * Summarize a video transcript for use in series-level analysis
 */
export async function summarizeTranscript(
  videoTitle: string,
  transcript: string,
  config?: Partial<AnalysisConfig>
): Promise<string> {
  const client = getAnthropicClient();
  const cfg = resolveConfig({
    ...config,
    maxTokens: config?.maxTokens ?? 2048,
  });
  const userPrompt = buildSummaryPrompt(videoTitle, transcript);

  const response = await client.messages.create({
    model: cfg.model,
    temperature: 0.3,
    max_tokens: cfg.maxTokens,
    system: "你是一个教育内容分析专家。请用中文输出。",
    messages: [{ role: "user", content: userPrompt }],
  });

  return response.content.find((b) => b.type === "text")?.text || "";
}

/**
 * Check if API key is available
 */
export function isAPIKeyAvailable(): boolean {
  return !!(process.env.API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * Generate quiz questions for a video/episode
 */
export async function generateQuiz(
  videoTitle: string,
  transcript: string,
  questions: Array<{ question: string; why_it_matters: string }>,
  config?: Partial<AnalysisConfig>
): Promise<{
  quiz: Array<{
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
}> {
  const client = getAnthropicClient();
  const cfg = resolveConfig(config);

  const priorQuestions = questions
    .map((q, i) => `Q${i + 1}: ${q.question}`)
    .join("\n");

  const userPrompt = `## 任务
为以下视频生成一套测验题，检验学习者是否真正理解了核心内容。

## 视频标题
${videoTitle}

## 核心前置问题（已生成）
${priorQuestions}

## 视频内容摘要
${transcript.slice(0, 3000)}

## 输出要求
生成 5 道单选题，每题有 4 个选项，覆盖核心概念和常见误区。

题目标准：
- 不是死记硬背题，而是理解验证题
- 考察能否用概念解决实际问题
- 错误选项要有代表性（反映常见误解）

JSON 格式：
{
  "quiz": [
    {
      "question": "题目",
      "options": ["A选项", "B选项", "C选项", "D选项"],
      "correct": 0,
      "explanation": "为什么这个答案正确，以及其他选项为什么错"
    }
  ]
}`;

  const response = await client.messages.create({
    model: cfg.model,
    temperature: 0.5,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content.find((b) => b.type === "text")?.text || "";
  if (!content) throw new Error("LLM 返回为空");

  try {
    return JSON.parse(extractJson(content));
  } catch (e) {
    throw new Error(`解析测验题失败: ${e}`);
  }
}

/**
 * Active-recall evaluation: grade a learner's free-form answer to a
 * first-principle question. The point is to force active thinking — the
 * learner must produce an explanation, and the AI judges whether it
 * grasps the essence (not whether it recites a definition).
 */
export async function evaluateAnswer(
  question: string,
  userAnswer: string,
  opts: {
    whyItMatters?: string;
    depthHint?: string;
    transcript?: string;
    videoTitle?: string;
  } = {},
  config?: Partial<AnalysisConfig>
): Promise<AnswerEvaluation> {
  const client = getAnthropicClient();
  const cfg = resolveConfig(config);

  const context = [
    opts.videoTitle ? `## 视频标题\n${opts.videoTitle}` : "",
    opts.whyItMatters ? `## 这个问题为什么重要\n${opts.whyItMatters}` : "",
    opts.depthHint ? `## 答到什么程度算真正理解\n${opts.depthHint}` : "",
    opts.transcript
      ? `## 视频内容摘要（评分参考）\n${opts.transcript.slice(0, 3000)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userPrompt = `## 任务
学习者尝试用自己的话回答一道第一性原理问题。请像一位严格但有建设性的导师那样评估这个回答。
评估的核心是：学习者是否抓住了本质，而不是是否复述了定义或用词是否漂亮。

## 问题
${question}

${context}

## 学习者的回答
${userAnswer || "（空白 / 我不会）"}

## 评估要求
- score：0-100 的整数，反映对本质的把握程度（不是表达流畅度）
- verdict：从 "mastered"（已掌握本质）、"partial"（部分理解但有缺口）、"misunderstood"（存在关键误解或几乎没答）三选一
- strengths：1-3 条，具体指出回答中真正答到点子上的地方（若没有则空数组）
- gaps：1-3 条，具体指出缺失的关键点或误解，越具体越好
- model_answer：一段抓住本质的参考答案，帮助学习者补齐认知，而不是简单给标准定义
- suggestion：一句话，告诉学习者带着什么去看（或重看）视频

请只用中文，对空白或敷衍的回答也要认真给出 model_answer 和 gaps。

## 输出格式
请以 JSON 返回：
{
  "score": 0,
  "verdict": "partial",
  "strengths": ["..."],
  "gaps": ["..."],
  "model_answer": "...",
  "suggestion": "..."
}`;

  const response = await client.messages.create({
    model: cfg.model,
    temperature: 0.4,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content.find((b) => b.type === "text")?.text || "";
  if (!content) throw new Error("LLM 返回为空");

  try {
    const parsed = JSON.parse(extractJson(content));
    const rawScore = Number(parsed.score);
    const score = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore)))
      : 0;
    const verdict: AnswerEvaluation["verdict"] =
      parsed.verdict === "mastered" ||
      parsed.verdict === "misunderstood"
        ? parsed.verdict
        : "partial";
    return {
      score,
      verdict,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      model_answer: parsed.model_answer || "",
      suggestion: parsed.suggestion || "",
    };
  } catch (e) {
    throw new Error(`解析评估结果失败: ${e}`);
  }
}
