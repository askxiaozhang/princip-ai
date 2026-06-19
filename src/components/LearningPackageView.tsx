"use client";

import type { LearningPackage } from "@/lib/types";
import { NarrativeLogic } from "./NarrativeLogic";
import { EpisodeCard } from "./EpisodeCard";
import { ChapterDependencies } from "./ChapterDependencies";

interface LearningPackageViewProps {
  pkg: LearningPackage;
}

export function LearningPackageView({ pkg }: LearningPackageViewProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {pkg.series.series_title}
            </h1>
            <p className="mt-1 text-zinc-400 text-sm">
              {pkg.series.series_description}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="px-2 py-1 rounded-full bg-zinc-800">
              {pkg.series.episodes.length} 集
            </span>
            <span>
              生成于{" "}
              {new Date(pkg.generated_at).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>
      </div>

      {/* Narrative Logic */}
      <NarrativeLogic text={pkg.series.narrative_logic} />

      {/* Chapter Dependencies */}
      <ChapterDependencies text={pkg.series.chapter_dependencies} />

      {/* Episodes */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          📚 各集学习导向
        </h2>
        <div className="space-y-6">
          {pkg.series.episodes.map((episode, index) => (
            <EpisodeCard
              key={episode.video_id + index}
              episode={episode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
