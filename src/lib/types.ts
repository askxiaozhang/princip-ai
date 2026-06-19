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

export interface GenerateRequest {
  url: string;
  mode?: "auto" | "demo";
}

export interface GenerateResponse {
  success: boolean;
  package?: LearningPackage;
  error?: string;
}
