"use client";

import { useState } from "react";

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface QuizViewProps {
  quiz: QuizQuestion[];
  title: string;
  onClose: () => void;
}

export function QuizView({ quiz, title, onClose }: QuizViewProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);

  const q = quiz[current];

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
    if (idx === q.correct) setScore((s) => s + 1);
  }

  function handleNext() {
    setAnswers((a) => [...a, selected === q.correct]);
    if (current + 1 >= quiz.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  }

  if (finished) {
    const pct = Math.round((score / quiz.length) * 100);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 p-8 text-center">
          <div className="text-5xl mb-4">{pct >= 80 ? "🎯" : pct >= 60 ? "📚" : "🔄"}</div>
          <h2 className="text-2xl font-bold text-white mb-2">测验完成！</h2>
          <p className="text-zinc-400 mb-6">{title}</p>
          <div className="text-4xl font-bold text-blue-400 mb-2">
            {score} / {quiz.length}
          </div>
          <p className="text-zinc-500 mb-8">
            {pct >= 80
              ? "你已掌握核心概念，准备好带着问题去学习了！"
              : pct >= 60
              ? "不错，还有一些概念值得深入理解。"
              : "建议先认真阅读学习导向包，再来一次。"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setCurrent(0);
                setSelected(null);
                setShowExplanation(false);
                setScore(0);
                setFinished(false);
                setAnswers([]);
              }}
              className="px-6 py-2.5 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition"
            >
              重新挑战
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <p className="text-sm text-zinc-500">{title}</p>
            <p className="text-white font-medium">
              第 {current + 1} / {quiz.length} 题
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
            style={{ width: `${((current) / quiz.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="px-6 py-5">
          <p className="text-white text-lg leading-relaxed mb-5">{q.question}</p>

          <div className="flex flex-col gap-3">
            {q.options.map((opt, idx) => {
              let cls =
                "w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ";
              if (selected === null) {
                cls += "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800";
              } else if (idx === q.correct) {
                cls += "border-emerald-500 bg-emerald-950 text-emerald-200";
              } else if (idx === selected && selected !== q.correct) {
                cls += "border-red-500 bg-red-950 text-red-200";
              } else {
                cls += "border-zinc-800 text-zinc-500 opacity-60";
              }
              return (
                <button key={idx} className={cls} onClick={() => handleSelect(idx)}>
                  <span className="font-medium mr-2 text-zinc-400">
                    {["A", "B", "C", "D"][idx]}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="mt-4 rounded-xl bg-zinc-800 border border-zinc-700 p-4">
              <p className="text-sm font-medium text-zinc-300 mb-1">
                {selected === q.correct ? "✅ 正确！" : "❌ 不对，正确答案是选项 " + ["A","B","C","D"][q.correct]}
              </p>
              <p className="text-sm text-zinc-400">{q.explanation}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end">
          {selected !== null && (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
            >
              {current + 1 >= quiz.length ? "查看结果" : "下一题 →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
