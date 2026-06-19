/**
 * Bilibili URL parsing and subtitle extraction
 */

import type { TranscriptResult, TranscriptSegment } from "./transcript";

export interface BilibiliVideoInfo {
  bvid: string;
  aid?: number;
  page: number;
}

/**
 * Parse a Bilibili video URL into structured info
 */
export function parseBilibiliURL(url: string): BilibiliVideoInfo | null {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.replace("www.", "").replace("m.", "");

    if (!hostname.includes("bilibili.com")) {
      return null;
    }

    const page = Math.max(1, parseInt(parsed.searchParams.get("p") || "1"));

    // /video/BVxxxxxx
    const bvMatch = parsed.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/i);
    if (bvMatch) {
      return { bvid: bvMatch[1], page };
    }

    // /video/avxxxxxx
    const avMatch = parsed.pathname.match(/\/video\/av(\d+)/i);
    if (avMatch) {
      return { bvid: "", aid: parseInt(avMatch[1]), page };
    }

    return null;
  } catch {
    return null;
  }
}

const BILIBILI_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.bilibili.com/",
  Origin: "https://www.bilibili.com",
};

/**
 * Get video CID from BVID
 */
async function getVideoCID(bvid: string, page: number): Promise<{ cid: number; title: string }> {
  const url = `https://api.bilibili.com/x/player/pagelist?bvid=${bvid}`;
  const res = await fetch(url, { headers: BILIBILI_HEADERS });
  if (!res.ok) throw new Error(`Bilibili API error: ${res.status}`);

  const data = await res.json();
  if (data.code !== 0) throw new Error(`Bilibili API: ${data.message}`);

  const pages: Array<{ cid: number; part: string }> = data.data || [];
  if (pages.length === 0) throw new Error("No video pages found");

  const idx = Math.min(page - 1, pages.length - 1);
  return { cid: pages[idx].cid, title: pages[idx].part };
}

/**
 * Get subtitle URLs for a video
 */
async function getSubtitleURLs(
  bvid: string,
  cid: number
): Promise<Array<{ lan: string; subtitle_url: string }>> {
  const url = `https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`;
  const res = await fetch(url, { headers: BILIBILI_HEADERS });
  if (!res.ok) throw new Error(`Bilibili player API error: ${res.status}`);

  const data = await res.json();
  if (data.code !== 0) throw new Error(`Bilibili player API: ${data.message}`);

  return data.data?.subtitle?.subtitles || [];
}

/**
 * Extract transcript from a Bilibili video
 */
export async function extractBilibiliTranscript(
  info: BilibiliVideoInfo
): Promise<TranscriptResult> {
  const { bvid, page } = info;

  // Get CID
  const { cid } = await getVideoCID(bvid, page);

  // Get subtitle URLs
  const subtitles = await getSubtitleURLs(bvid, cid);
  if (subtitles.length === 0) {
    throw new Error(
      `该 Bilibili 视频（${bvid}）没有可用字幕。请确保视频有 CC 字幕。`
    );
  }

  // Prefer Chinese subtitles
  const preferred =
    subtitles.find((s) => s.lan?.startsWith("zh")) || subtitles[0];
  const subtitleURL = preferred.subtitle_url.startsWith("//")
    ? "https:" + preferred.subtitle_url
    : preferred.subtitle_url;

  // Fetch subtitle JSON
  const subtitleRes = await fetch(subtitleURL, { headers: BILIBILI_HEADERS });
  if (!subtitleRes.ok) {
    throw new Error(`Failed to fetch Bilibili subtitle: ${subtitleRes.status}`);
  }

  const subtitleData = await subtitleRes.json();

  // Bilibili subtitle format: { body: [{ from, to, content, location }] }
  const segments: TranscriptSegment[] = (
    subtitleData.body as Array<{ from: number; to: number; content: string }>
  ).map((item) => ({
    text: item.content,
    start: item.from,
    duration: item.to - item.from,
  }));

  return {
    segments,
    language: preferred.lan || "zh",
    video_id: bvid,
    full_text: segments.map((s) => s.text).join(" "),
  };
}

/**
 * Get Bilibili video thumbnail
 */
export async function getBilibiliThumbnail(bvid: string): Promise<string | null> {
  try {
    const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    const res = await fetch(url, { headers: BILIBILI_HEADERS });
    const data = await res.json();
    return data.data?.pic || null;
  } catch {
    return null;
  }
}

/**
 * Get Bilibili video URL
 */
export function getBilibiliURL(bvid: string, page = 1): string {
  return page > 1
    ? `https://www.bilibili.com/video/${bvid}?p=${page}`
    : `https://www.bilibili.com/video/${bvid}`;
}
