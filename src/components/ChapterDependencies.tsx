"use client";

interface ChapterDependenciesProps {
  text: string;
}

export function ChapterDependencies({ text }: ChapterDependenciesProps) {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🔗</span>
        章节依赖关系
      </h2>
      <div className="space-y-3">
        {paragraphs.map((paragraph, index) => {
          const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={index} className="text-zinc-300 leading-relaxed text-sm">
              {parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong key={i} className="text-blue-400 font-medium">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return <span key={i}>{part}</span>;
              })}
            </p>
          );
        })}
      </div>
    </div>
  );
}
