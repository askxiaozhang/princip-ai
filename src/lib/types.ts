/**
 * PrincipAI type definitions
 * Learning Orientation Package (学习导向包)
 */

export interface FirstPrincipleQuestion {
  question: string;
  why_it_matters: string;
  depth_hint?: string;
}

export interface VideoSection {
  title: string;
  start_time?: number; // seconds
  end_time?: number;
  summary: string;
  key_concepts: string[];
}

export interface EpisodeGuide {
  video_id: string;
  title: string;
  episode_number?: number;
  duration?: number; // seconds
  url: string;
  questions: FirstPrincipleQuestion[];
  cognitive_benefits: string[];
  misconceptions: string[];
  sections?: VideoSection[];
}

export interface SeriesGuide {
  series_title: string;
  series_description: string;
  narrative_logic: string; // 编排逻辑拆解
  chapter_dependencies: string; // 章节间因果关系
  episodes: EpisodeGuide[];
}

export interface LearningPackage {
  id: string;
  url: string;
  title: string;
  source_type: "video" | "playlist" | "text";
  generated_at: string;
  series: SeriesGuide;
  transcript_length?: number;
}

/**
 * Active-recall evaluation: the learner writes a free-form answer to a
 * first-principle question and the AI grades it, forcing active thinking
 * instead of passive watching.
 */
export interface AnswerEvaluation {
  score: number; // 0-100
  verdict: "mastered" | "partial" | "misunderstood"; // 掌握程度
  strengths: string[]; // 答得好的地方
  gaps: string[]; // 缺失/误解的地方
  model_answer: string; // 抓住本质的参考答案
  suggestion: string; // 下一步建议
}

export interface EvaluateRequest {
  question: string;
  why_it_matters?: string;
  depth_hint?: string;
  user_answer: string;
  transcript?: string;
  video_title?: string;
}

export interface EvaluateResponse {
  success: boolean;
  evaluation?: AnswerEvaluation;
  error?: string;
}

export interface GenerateRequest {
  url: string;
  mode?: "auto" | "demo";
}

export interface GenerateResponse {
  success: boolean;
  package?: LearningPackage;
  error?: string;
}
