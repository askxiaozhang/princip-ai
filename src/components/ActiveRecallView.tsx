"use client";

import { useState } from "react";
import type { FirstPrincipleQuestion, AnswerEvaluation } from "@/lib/types";

interface ActiveRecallViewProps {
  questions: FirstPrincipleQuestion[];
  title: string;
  transcript?: string;
  onClose: () => void;
}

const VERDICT_META: Record<
  AnswerEvaluation["verdict"],
  { label: string; emoji: string; color: string }
> = {
  mastered: { label: "已掌握本质", emoji: "🎯", color: "text-emerald-400" },
  partial: { label: "部分理解", emoji: "📚", color: "text-amber-400" },
  misunderstood: { label: "存在关键误解", emoji: "🔄", color: "text-red-400" },
};

export function ActiveRecallView({
  questions,
  title,
  transcript,
  onClose,
}: ActiveRecallViewProps) {
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const q = questions[current];

  async function handleEvaluate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.question,
          why_it_matters: q.why_it_matters,
          depth_hint: q.depth_hint,
          user_answer: answer,
          transcript: transcript || "",
          video_title: title,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "评估失败");
      setEvaluation(data.evaluation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "评估失败");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (evaluation) setScores((s) => [...s, evaluation.score]);
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setAnswer("");
      setEvaluation(null);
      setError(null);
    }
  }

  function restart() {
    setCurrent(0);
    setAnswer("");
    setEvaluation(null);
    setError(null);
    setScores([]);
    setFinished(false);
  }

  if (finished) {
    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 p-8 text-center">
          <div className="text-5xl mb-4">
            {avg >= 80 ? "🎯" : avg >= 60 ? "📚" : "🔄"}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">主动回忆完成！</h2>
          <p className="text-zinc-400 mb-6">{title}</p>
          <div className="text-4xl font-bold text-blue-400 mb-2">{avg} 分</div>
          <p className="text-zinc-500 mb-8">
            {avg >= 80
              ? "你已经能用自己的话讲清本质，带着这份理解去看视频会更高效。"
              : avg >= 60
              ? "方向对了，但还有关键缺口——看视频时重点补上这些点。"
              : "先别急着看视频，建议结合参考答案再想一遍这些问题。"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={restart}
              className="px-6 py-2.5 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition"
            >
              再来一次
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition"
            >
              返回学习包
            </button>
          </div>
        </div>
      </div>
    );
  }

  const verdict = evaluation ? VERDICT_META[evaluation.verdict] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <p className="text-sm text-zinc-500">主动回忆 · {title}</p>
            <p className="text-white font-medium">
              第 {current + 1} / {questions.length} 题
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition text-xl"
          >
            ✕
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${(current / questions.length) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">
          <p className="text-white text-lg leading-relaxed mb-2">
            {q.question}
          </p>
          {q.why_it_matters && (
            <p className="text-zinc-500 text-sm mb-4">💡 {q.why_it_matters}</p>
          )}

          {!evaluation ? (
            <>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={loading}
                rows={6}
                placeholder="用你自己的话写下你的理解——不确定也没关系，先尝试解释，这正是主动学习的关键。"
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
              />
              {error && (
                <p className="mt-3 text-sm text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {/* Score + verdict */}
              <div className="flex items-center gap-4 rounded-xl bg-zinc-800 border border-zinc-700 p-4">
                <div className="text-3xl font-bold text-blue-400 tabular-nums">
                  {evaluation.score}
                  <span className="text-base text-zinc-500"> / 100</span>
                </div>
                {verdict && (
                  <div className={`font-medium ${verdict.color}`}>
                    {verdict.emoji} {verdict.label}
                  </div>
                )}
              </div>

              {evaluation.strengths.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-emerald-400 mb-1.5">
                    ✅ 答到点子上的地方
                  </p>
                  <ul className="space-y-1">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-zinc-300">
                        · {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.gaps.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-400 mb-1.5">
                    ⚠️ 还缺的关键点
                  </p>
                  <ul className="space-y-1">
                    {evaluation.gaps.map((g, i) => (
                      <li key={i} className="text-sm text-zinc-300">
                        · {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.model_answer && (
                <div className="rounded-xl bg-blue-950/30 border border-blue-900/30 p-4">
                  <p className="text-sm font-medium text-blue-300 mb-1.5">
                    🧭 抓住本质的参考答案
                  </p>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {evaluation.model_answer}
                  </p>
                </div>
              )}

              {evaluation.suggestion && (
                <p className="text-sm text-zinc-400">
                  👉 {evaluation.suggestion}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
          {!evaluation ? (
            <button
              onClick={handleEvaluate}
              disabled={loading || answer.trim().length === 0}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition flex items-center gap-2"
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {loading ? "AI 评估中…" : "提交评估"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
            >
              {current + 1 >= questions.length ? "查看结果" : "下一题 →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
