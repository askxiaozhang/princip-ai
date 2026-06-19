"use client";

import { useState } from "react";
import type { LearningPackage } from "@/lib/types";

interface MindMapNode {
  id: string;
  label: string;
  type: "root" | "episode" | "concept" | "question";
  children?: MindMapNode[];
}

function buildMindMapTree(pkg: LearningPackage): MindMapNode {
  const root: MindMapNode = {
    id: "root",
    label: pkg.series.series_title,
    type: "root",
    children: pkg.series.episodes.map((ep, i) => ({
      id: `ep_${i}`,
      label: ep.title,
      type: "episode",
      children: [
        ...(ep.sections || []).map((s, j) => ({
          id: `ep_${i}_sec_${j}`,
          label: s.title,
          type: "concept" as const,
          children: s.key_concepts.map((c, k) => ({
            id: `ep_${i}_sec_${j}_c_${k}`,
            label: c,
            type: "concept" as const,
          })),
        })),
        ...(ep.questions.length > 0
          ? [
              {
                id: `ep_${i}_q`,
                label: "前置问题",
                type: "question" as const,
                children: ep.questions.map((q, j) => ({
                  id: `ep_${i}_q_${j}`,
                  label: q.question.slice(0, 60) + (q.question.length > 60 ? "…" : ""),
                  type: "question" as const,
                })),
              },
            ]
          : []),
      ],
    })),
  };
  return root;
}

const NODE_COLORS: Record<MindMapNode["type"], string> = {
  root: "bg-blue-600 text-white border-blue-500",
  episode: "bg-zinc-800 text-zinc-100 border-zinc-600",
  concept: "bg-emerald-950 text-emerald-200 border-emerald-700",
  question: "bg-purple-950 text-purple-200 border-purple-700",
};

function TreeNode({
  node,
  depth = 0,
}: {
  node: MindMapNode;
  depth?: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-2">
        {depth > 0 && (
          <div
            className="flex-shrink-0 mt-3 border-t border-zinc-700"
            style={{ width: 20 }}
          />
        )}
        <div className="flex flex-col flex-1 min-w-0">
          <button
            onClick={() => hasChildren && setOpen((o) => !o)}
            className={`text-left px-3 py-1.5 rounded-lg border text-sm font-medium transition-all w-fit max-w-full truncate ${
              NODE_COLORS[node.type]
            } ${hasChildren ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
            title={node.label}
          >
            {hasChildren && (
              <span className="mr-1 text-xs opacity-60">
                {open ? "▼" : "▶"}
              </span>
            )}
            {node.label}
          </button>

          {open && hasChildren && (
            <div
              className="mt-2 ml-4 flex flex-col gap-2 border-l border-zinc-700 pl-2"
            >
              {node.children!.map((child) => (
                <TreeNode key={child.id} node={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MindMapProps {
  pkg: LearningPackage;
}

export function MindMap({ pkg }: MindMapProps) {
  const tree = buildMindMapTree(pkg);

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 overflow-auto">
      <div className="flex items-center gap-2 mb-4 text-sm text-zinc-500">
        <span className="w-3 h-3 rounded-sm bg-blue-600" /> 系列
        <span className="w-3 h-3 rounded-sm bg-zinc-700 ml-2" /> 集数
        <span className="w-3 h-3 rounded-sm bg-emerald-900 ml-2" /> 概念
        <span className="w-3 h-3 rounded-sm bg-purple-900 ml-2" /> 前置问题
      </div>
      <div className="min-w-max">
        <TreeNode node={tree} depth={0} />
      </div>
    </div>
  );
}
