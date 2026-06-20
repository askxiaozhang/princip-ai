"use client";

import { useState } from "react";
import type { EpisodeGuide } from "@/lib/types";

interface EpisodeCardProps {
  episode: EpisodeGuide;
}

function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = (s % 60).toString().padStart(2, "0");
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${(m % 60).toString().padStart(2, "0")}:${sec}`;
  }
  return `${m}:${sec}`;
}

/** Build a deep link that opens the video at a given timestamp. */
function timestampedUrl(url: string, seconds: number): string {
  const t = Math.round(seconds);
  if (url.includes("bilibili.com")) {
    return `${url}${url.includes("?") ? "&" : "?"}t=${t}`;
  }
  // YouTube and generic
  return `${url}${url.includes("?") ? "&" : "?"}t=${t}s`;
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden transition-all">
      {/* Episode Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors text-left"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-medium">
          {episode.episode_number !== undefined
            ? episode.episode_number
            : "?"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">
            {episode.title}
          </h3>
          <p className="text-zinc-500 text-xs mt-0.5">
            {episode.questions.length} 个前置问题 ·{" "}
            {episode.cognitive_benefits.length} 条认知收益
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Episode Content (expanded) */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-zinc-800 pt-4">
          {/* Video Link */}
          <a
            href={episode.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            在 YouTube 上观看
          </a>

          {/* Narrative Logic for this episode */}
          {episode.sections && episode.sections.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-3">
                ⏱️ 关键时刻 · 点击跳转
              </h4>
              <div className="grid gap-2">
                {episode.sections.map((section, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-zinc-800/50 p-3"
                  >
                    <div className="font-medium text-white text-sm flex items-center gap-2">
                      {typeof section.start_time === "number" && (
                        <a
                          href={timestampedUrl(episode.url, section.start_time)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 font-mono text-xs font-semibold text-blue-300 bg-blue-950/50 hover:bg-blue-600 hover:text-white rounded px-1.5 py-0.5 transition-colors tabular-nums"
                          title="在新标签页跳转到该时刻"
                        >
                          {formatTimestamp(section.start_time)}
                        </a>
                      )}
                      <span>{section.title}</span>
                    </div>
                    <div className="text-zinc-400 text-xs mt-1">
                      {section.summary}
                    </div>
                    {section.key_concepts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {section.key_concepts.map(
                          (concept, j) => (
                            <span
                              key={j}
                              className="px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300 text-xs"
                            >
                              {concept}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* First Principle Questions */}
          {episode.questions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-3">
                ❓ 第一性原理前置问题
              </h4>
              <div className="space-y-3">
                {episode.questions.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-blue-950/30 border border-blue-900/30 p-4"
                  >
                    <div className="font-medium text-white text-sm mb-2">
                      <span className="text-blue-400 mr-2">
                        Q{i + 1}.
                      </span>
                      {q.question}
                    </div>
                    <div className="text-zinc-400 text-xs space-y-1.5">
                      <div>
                        <span className="text-zinc-500">
                          为什么重要：
                        </span>{" "}
                        {q.why_it_matters}
                      </div>
                      {q.depth_hint && (
                        <div>
                          <span className="text-zinc-500">
                            深度提示：
                          </span>{" "}
                          {q.depth_hint}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cognitive Benefits */}
          {episode.cognitive_benefits.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-3">
                🎯 认知收益预告
              </h4>
              <div className="grid gap-2">
                {episode.cognitive_benefits.map(
                  (benefit, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-zinc-300"
                    >
                      <span className="text-green-400 flex-shrink-0">
                        ✓
                      </span>
                      <span>{benefit}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Misconceptions */}
          {episode.misconceptions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-3">
                ⚠️ 常见误区预警
              </h4>
              <div className="space-y-2">
                {episode.misconceptions.map(
                  (misconception, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-amber-950/20 border border-amber-900/20 p-3 text-sm text-zinc-300"
                    >
                      <span className="text-amber-400 mr-1">
                        ⚠
                      </span>
                      {misconception}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
