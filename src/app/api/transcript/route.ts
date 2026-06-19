import { NextRequest, NextResponse } from "next/server";
import { extractTranscript } from "@/lib/transcript";
import { parseYouTubeURL } from "@/lib/youtube";
import { parseBilibiliURL, extractBilibiliTranscript } from "@/lib/bilibili";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "请提供有效的视频 URL（YouTube 或 Bilibili）" },
        { status: 400 }
      );
    }

    // Try Bilibili first
    const bilibiliInfo = parseBilibiliURL(url);
    if (bilibiliInfo) {
      const transcript = await extractBilibiliTranscript(bilibiliInfo);
      return NextResponse.json({
        success: true,
        platform: "bilibili",
        video_id: transcript.video_id,
        language: transcript.language,
        segment_count: transcript.segments.length,
        text_length: transcript.full_text.length,
        preview: transcript.full_text.slice(0, 500),
      });
    }

    // Try YouTube
    const parsed = parseYouTubeURL(url);
    if (!parsed || parsed.type !== "video") {
      return NextResponse.json(
        { error: "请提供有效的视频 URL（YouTube 视频或 Bilibili 视频，非播放列表）" },
        { status: 400 }
      );
    }

    const transcript = await extractTranscript(parsed.id);

    return NextResponse.json({
      success: true,
      platform: "youtube",
      video_id: transcript.video_id,
      language: transcript.language,
      segment_count: transcript.segments.length,
      text_length: transcript.full_text.length,
      preview: transcript.full_text.slice(0, 500),
    });
  } catch (error) {
    console.error("Transcript extraction error:", error);
    const message =
      error instanceof Error ? error.message : "字幕提取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
