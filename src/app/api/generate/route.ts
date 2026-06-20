import { NextRequest, NextResponse } from "next/server";
import { generateLearningPackage } from "@/lib/generation";
import type { GenerateResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes for LLM calls

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, mode = "auto" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "请提供有效的视频 URL（YouTube 或 Bilibili）" } satisfies GenerateResponse,
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const pkg = await generateLearningPackage(url, mode);

    return NextResponse.json({
      success: true,
      package: pkg,
    } satisfies GenerateResponse, { headers: CORS_HEADERS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "生成学习导向包失败";

    // URL parse failures and missing API key are client errors (4xx), not server errors
    const isClientError =
      message.includes("无法解析视频 URL") ||
      message.includes("API Key 未配置") ||
      message.includes("OPENAI_API_KEY") ||
      message.includes("Bilibili 视频分析需要配置");

    if (!isClientError) {
      console.error("Generation error:", error);
    }

    return NextResponse.json(
      { success: false, error: message } satisfies GenerateResponse,
      { status: isClientError ? 400 : 500, headers: CORS_HEADERS }
    );
  }
}
