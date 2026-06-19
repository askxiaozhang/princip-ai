import { NextRequest, NextResponse } from "next/server";
import { generateLearningPackage } from "@/lib/generation";
import type { GenerateResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes for LLM calls

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, mode = "auto" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "请提供有效的 YouTube URL" } satisfies GenerateResponse,
        { status: 400 }
      );
    }

    const pkg = await generateLearningPackage(url, mode);

    return NextResponse.json({
      success: true,
      package: pkg,
    } satisfies GenerateResponse);
  } catch (error) {
    console.error("Generation error:", error);

    const message =
      error instanceof Error ? error.message : "生成学习导向包失败";

    return NextResponse.json(
      { success: false, error: message } satisfies GenerateResponse,
      { status: 500 }
    );
  }
}
