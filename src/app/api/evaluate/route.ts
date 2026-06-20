import { NextRequest, NextResponse } from "next/server";
import { evaluateAnswer, isAPIKeyAvailable } from "@/lib/analysis";
import type { EvaluateRequest, EvaluateResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EvaluateRequest;
    const { question, user_answer } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { success: false, error: "请提供需要评估的问题" } satisfies EvaluateResponse,
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!isAPIKeyAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error: "答案评估需要配置 API Key。请在 .env.local 中设置 API_KEY。",
        } satisfies EvaluateResponse,
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const evaluation = await evaluateAnswer(question, user_answer || "", {
      whyItMatters: body.why_it_matters,
      depthHint: body.depth_hint,
      transcript: body.transcript,
      videoTitle: body.video_title,
    });

    return NextResponse.json(
      { success: true, evaluation } satisfies EvaluateResponse,
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Evaluation error:", error);
    const message = error instanceof Error ? error.message : "答案评估失败";
    return NextResponse.json(
      { success: false, error: message } satisfies EvaluateResponse,
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
