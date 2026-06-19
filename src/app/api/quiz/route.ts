import { NextRequest, NextResponse } from "next/server";
import { generateQuiz, isAPIKeyAvailable } from "@/lib/analysis";
import type { FirstPrincipleQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoTitle, transcript, questions } = body as {
      videoTitle: string;
      transcript: string;
      questions: FirstPrincipleQuestion[];
    };

    if (!videoTitle || !questions?.length) {
      return NextResponse.json(
        { error: "请提供视频标题和学习问题" },
        { status: 400 }
      );
    }

    if (!isAPIKeyAvailable()) {
      return NextResponse.json(
        { error: "测验生成需要配置 API Key。请在 .env.local 中设置 API_KEY。" },
        { status: 400 }
      );
    }

    const result = await generateQuiz(
      videoTitle,
      transcript || "",
      questions
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Quiz generation error:", error);
    const message = error instanceof Error ? error.message : "测验生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
