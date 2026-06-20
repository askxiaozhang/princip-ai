"use client";

import { useState } from "react";
import { URLInput } from "@/components/URLInput";
import { LearningPackageView } from "@/components/LearningPackageView";
import { MindMap } from "@/components/MindMap";
import { QuizView, type QuizQuestion } from "@/components/QuizView";
import { ActiveRecallView } from "@/components/ActiveRecallView";
import type { LearningPackage } from "@/lib/types";

type Tab = "guide" | "mindmap" | "quiz";

export default function Home() {
  const [pkg, setPkg] = useState<LearningPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("guide");
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showRecall, setShowRecall] = useState(false);

  const handleSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setPkg(null);
    setQuiz(null);
    setShowQuiz(false);
    setShowRecall(false);
    setActiveTab("guide");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "生成失败");
      }

      setPkg(data.package);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!pkg) return;
    setQuizLoading(true);
    setQuizError(null);
    const firstEp = pkg.series.episodes[0];
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoTitle: firstEp.title,
          transcript: "",
          questions: firstEp.questions,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "生成失败");
      setQuiz(data.quiz);
      setShowQuiz(true);
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setQuizLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/40 border border-blue-800/30 text-blue-300 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            前置式主动学习引擎
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            PrincipAI
          </h1>
          <p className="text-xl text-zinc-400 mb-2 max-w-xl mx-auto">
            Learn from first principles, not the first page.
          </p>
          <p className="text-base text-zinc-500 max-w-2xl mx-auto">
            在观看视频之前，AI 先生成「学习导向包」——拆解编排逻辑、生成第一性原理问题、预告认知收益、预警常见误区。
            让你带着问题主动学习，而不是被动接收。
          </p>
        </div>
      </section>

      {/* Input Section */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <URLInput onSubmit={handleSubmit} isLoading={isLoading} />
      </section>

      {/* Status / Loading */}
      {isLoading && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center gap-4 text-zinc-400">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-zinc-800" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">正在生成学习导向包...</p>
              <p className="text-sm text-zinc-500 mt-1">
                提取字幕 → 分析结构 → 生成问题 → 可能需要 30-60 秒
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Error */}
      {error && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto rounded-xl bg-red-950/30 border border-red-900/30 p-4">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-xl flex-shrink-0">✕</span>
              <div>
                <p className="text-red-200 font-medium">生成失败</p>
                <p className="text-red-300/70 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      {pkg && (
        <section className="max-w-6xl mx-auto px-4 py-8 pb-24">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
            {(
              [
                { id: "guide", label: "📋 学习导向包" },
                { id: "mindmap", label: "🗺️ 思维导图" },
              ] as { id: Tab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={handleGenerateQuiz}
              disabled={quizLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-all disabled:opacity-50 flex items-center gap-1.5"
              title="需要配置 API Key"
            >
              {quizLoading ? (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                "✏️"
              )}
              出题测验
            </button>
            <button
              onClick={() => setShowRecall(true)}
              disabled={!pkg.series.episodes[0]?.questions.length}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-all disabled:opacity-50 flex items-center gap-1.5"
              title="用自己的话回答前置问题，AI 评估你的理解"
            >
              🧠 主动回忆
            </button>
          </div>

          {quizError && (
            <p className="mb-4 text-sm text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-2">
              {quizError}
            </p>
          )}

          {activeTab === "guide" && <LearningPackageView pkg={pkg} />}
          {activeTab === "mindmap" && <MindMap pkg={pkg} />}

          {showQuiz && quiz && (
            <QuizView
              quiz={quiz}
              title={pkg.series.episodes[0]?.title || pkg.title}
              onClose={() => setShowQuiz(false)}
            />
          )}

          {showRecall && pkg.series.episodes[0]?.questions.length > 0 && (
            <ActiveRecallView
              questions={pkg.series.episodes[0].questions}
              title={pkg.series.episodes[0]?.title || pkg.title}
              onClose={() => setShowRecall(false)}
            />
          )}
        </section>
      )}

      {/* How it Works */}
      {!pkg && !isLoading && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-xl font-semibold text-white text-center mb-8">
            工作原理
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6 text-center">
              <div className="text-3xl mb-3">📥</div>
              <h3 className="text-white font-medium mb-2">输入视频链接</h3>
              <p className="text-zinc-500 text-sm">
                粘贴 YouTube 视频或播放列表链接
              </p>
            </div>
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6 text-center">
              <div className="text-3xl mb-3">🧠</div>
              <h3 className="text-white font-medium mb-2">AI 深度分析</h3>
              <p className="text-zinc-500 text-sm">
                提取字幕，拆解编排逻辑，生成第一性原理问题
              </p>
            </div>
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6 text-center">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-white font-medium mb-2">带着问题学习</h3>
              <p className="text-zinc-500 text-sm">
                看视频前先读学习导向包，建立认知框架
              </p>
            </div>
          </div>

          {/* Example */}
          <div className="mt-12 max-w-2xl mx-auto">
            <h3 className="text-lg font-medium text-white text-center mb-4">
              示例：3Blue1Brown 线性代数
            </h3>
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
              <p className="text-zinc-400 text-sm mb-3">向量篇 — 前置问题：</p>
              <blockquote className="border-l-2 border-blue-500 pl-4 text-zinc-300 italic">
                &ldquo;为什么向量可以同时表示箭头、坐标、数据点？
                <br />
                这三种表述的本质统一在哪里？&rdquo;
              </blockquote>
              <p className="text-zinc-400 text-sm mt-4 mb-3">
                矩阵乘法篇 — 前置问题：
              </p>
              <blockquote className="border-l-2 border-blue-500 pl-4 text-zinc-300 italic">
                &ldquo;为什么矩阵乘法要按「行×列」的规则定义？
                <br />
                从几何变换的角度，这个规则是必然的吗？&rdquo;
              </blockquote>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-zinc-600">
          <p>共建人类知识的第一原理库，让深度学习有章可循。</p>
        </div>
      </footer>
    </main>
  );
}
