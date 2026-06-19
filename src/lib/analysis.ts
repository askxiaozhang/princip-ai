/**
 * LLM analysis module - uses OpenAI API for content analysis
 */

import OpenAI from "openai";
import {
  SYSTEM_PROMPT,
  buildSingleVideoPrompt,
  buildSeriesAnalysisPrompt,
  buildEpisodeFromSeriesPrompt,
  buildSummaryPrompt,
} from "./prompts";
import type { FirstPrincipleQuestion, VideoSection } from "./types";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY 未配置。请在 .env.local 中设置你的 OpenAI API 密钥。"
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface AnalysisConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_CONFIG: AnalysisConfig = {
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
};

function resolveConfig(
  config?: Partial<AnalysisConfig>
): AnalysisConfig {
  return {
    model: config?.model ?? DEFAULT_CONFIG.model,
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
  const client = getOpenAIClient();
  const cfg = resolveConfig(config);
  const prompt = buildSingleVideoPrompt(
    videoTitle,
    videoId,
    transcript,
    seriesContext
  );

  const response = await client.chat.completions.create({
    model: cfg.model,
    temperature: cfg.temperature,
    max_tokens: cfg.maxTokens,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM 返回为空");
  }

  try {
    const parsed = JSON.parse(content);
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
  const client = getOpenAIClient();
  const cfg = resolveConfig(config);
  const prompt = buildSeriesAnalysisPrompt(seriesTitle, videoSummaries);

  const response = await client.chat.completions.create({
    model: cfg.model,
    temperature: cfg.temperature,
    max_tokens: cfg.maxTokens,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM 返回为空");
  }

  try {
    const parsed = JSON.parse(content);
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
  const client = getOpenAIClient();
  const cfg = resolveConfig(config);
  const prompt = buildEpisodeFromSeriesPrompt(
    episodeTitle,
    episodeNumber,
    transcript,
    seriesLogic
  );

  const response = await client.chat.completions.create({
    model: cfg.model,
    temperature: cfg.temperature,
    max_tokens: cfg.maxTokens,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM 返回为空");
  }

  try {
    const parsed = JSON.parse(content);
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
  const client = getOpenAIClient();
  const cfg = resolveConfig({
    ...config,
    maxTokens: config?.maxTokens ?? 2048,
  });
  const prompt = buildSummaryPrompt(videoTitle, transcript);

  const response = await client.chat.completions.create({
    model: cfg.model,
    temperature: 0.3,
    max_tokens: cfg.maxTokens,
    messages: [
      {
        role: "system",
        content: "你是一个教育内容分析专家。请用中文输出。",
      },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Check if OpenAI API key is available
 */
export function isAPIKeyAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
