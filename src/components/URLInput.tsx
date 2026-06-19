"use client";

import { useState } from "react";

interface URLInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function URLInput({ onSubmit, isLoading }: URLInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("请输入 YouTube 视频链接");
      return;
    }

    // Basic URL validation
    try {
      const parsed = new URL(url.trim());
      const hostname = parsed.hostname.replace("www.", "");
      if (
        !hostname.includes("youtube.com") &&
        !hostname.includes("youtu.be")
      ) {
        setError("请输入有效的 YouTube 链接");
        return;
      }
    } catch {
      setError("请输入有效的 URL");
      return;
    }

    onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            placeholder="粘贴 YouTube 视频链接，例如：https://www.youtube.com/watch?v=..."
            className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-xl transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                生成中...
              </>
            ) : (
              "生成学习导向包"
            )}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm text-zinc-500">
        <span>试试：</span>
        <button
          type="button"
          onClick={() =>
            setUrl(
              "https://www.youtube.com/watch?v=k7RM-otwjNW"
            )
          }
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          3Blue1Brown 向量篇
        </button>
        <span>|</span>
        <button
          type="button"
          onClick={() =>
            setUrl(
              "https://www.youtube.com/playlist?list=PLZHQOb0TqpDPjL1e4x1My9i2C0SSIqHvE"
            )
          }
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          线性代数全系列
        </button>
      </div>
    </form>
  );
}
