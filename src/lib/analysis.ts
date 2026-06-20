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
import type { FirstPrincipleQuestion, VideoSection } from "./types";

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
      sections: (parsed.sections || []).map(
        (s: {
          title: string;
          summary: string;
          key_concepts: string[];
        }) => ({
          title: s.title,
          summary: s.summary,
          key_concepts: s.key_concepts || [],
        })
      ),
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
      sections: (parsed.sections || []).map(
        (s: {
          title: string;
          summary: string;
          key_concepts: string[];
        }) => ({
          title: s.title,
          summary: s.summary,
          key_concepts: s.key_concepts || [],
        })
      ),
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
