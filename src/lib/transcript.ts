/**
 * YouTube transcript extraction
 * Uses multiple fallback methods for robustness
 */

export interface TranscriptSegment {
  text: string;
  start: number; // seconds
  duration: number; // seconds
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  language: string;
  video_id: string;
  full_text: string;
}

/**
 * Extract transcript from a YouTube video using the public transcript API
 */
export async function extractTranscript(
  videoId: string
): Promise<TranscriptResult> {
  // Method 1: Use youtubei.js
  try {
    const result = await extractWithYoutubeiJS(videoId);
    if (result.segments.length > 0) return result;
  } catch (e) {
    console.warn("youtubei.js method failed:", e);
  }

  // Method 2: Direct HTTP transcript API
  try {
    const result = await extractWithDirectAPI(videoId);
    if (result.segments.length > 0) return result;
  } catch (e) {
    console.warn("Direct API method failed:", e);
  }

  throw new Error(
    `无法获取视频 ${videoId} 的字幕。该视频可能没有可用字幕，或者字幕提取失败。`
  );
}

/**
 * Method 1: youtubei.js - the most complete approach
 */
async function extractWithYoutubeiJS(
  videoId: string
): Promise<TranscriptResult> {
  const { Innertube } = await import("youtubei.js");
  const innertube = await Innertube.create({ retrieve_player: false });

  try {
    const info = await innertube.getBasicInfo(videoId);
    // Video title available for future use
    void info.basic_info?.title;
  } catch (e) {
    console.warn("Could not get video info:", e);
  }

  let segments: TranscriptSegment[] = [];
  let language = "zh";

  try {
    const transcriptResponse = await innertube.actions.execute(
      "/get_transcript",
      { videoId }
    );

    const body = transcriptResponse.data;
    if (body?.actions) {
      for (const action of body.actions) {
        const panel =
          action?.updateEngagementPanelAction?.content
            ?.transcriptRenderer?.content?.transcriptSearchPanelRenderer;
        if (panel) {
          const body2 = panel.body?.transcriptSegmentListRenderer;
          if (body2?.initialSegments) {
            segments = parseTranscriptSegments(body2.initialSegments);
          }
          const menu = panel.submenuItemRenderer;
          if (menu) {
            language =
              menu.title?.simpleText ||
              menu.title?.runs?.[0]?.text ||
              language;
          }
        }
      }
    }
  } catch (e) {
    console.warn("Transcript endpoint failed:", e);
  }

  return {
    segments,
    language,
    video_id: videoId,
    full_text: segments.map((s) => s.text).join(" "),
  };
}

/**
 * Method 2: Direct HTTP API for transcript extraction
 */
async function extractWithDirectAPI(
  videoId: string
): Promise<TranscriptResult> {
  // First, get the video page to find the caption tracks
  const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(videoPageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });
  const html = await response.text();

  // Extract the ytInitialPlayerResponse
  const playerMatch = html.match(
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;(?:var|let|const|<\/script>)/s
  );
  if (!playerMatch) {
    throw new Error("Could not find player response");
  }

  let playerResponse;
  try {
    playerResponse = JSON.parse(playerMatch[1]);
  } catch {
    throw new Error("Could not parse player response");
  }

  const captions =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) {
    throw new Error("No caption tracks found");
  }

  // Prefer Chinese, then English
  const preferred =
    captions.find(
      (c: { languageCode?: string }) => c.languageCode?.startsWith("zh")
    ) ||
    captions.find(
      (c: { languageCode?: string }) => c.languageCode?.startsWith("en")
    ) ||
    captions[0];

  const captionUrl = preferred?.baseUrl;
  if (!captionUrl) {
    throw new Error("No caption URL found");
  }

  // Fetch the caption XML
  const captionResponse = await fetch(captionUrl + "&fmt=srv3");
  const captionXml = await captionResponse.text();

  const segments = parseCaptionXML(captionXml);

  return {
    segments,
    language: preferred.languageCode || "zh",
    video_id: videoId,
    full_text: segments.map((s) => s.text).join(" "),
  };
}

function parseTranscriptSegments(
  initialSegments: Array<Record<string, unknown>>
): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  for (const seg of initialSegments) {
    const renderer =
      (seg.transcriptSegmentRenderer as Record<string, unknown>) || seg;
    const text =
      (renderer.snippet as string) ||
      ((renderer.title as Record<string, unknown>)?.simpleText as string) ||
      extractTextFromRuns(renderer.title as Record<string, unknown>);

    const startMs = parseTimestampToMs(
      renderer.startMs as string | number | undefined
    );
    const endMs = parseTimestampToMs(
      renderer.endMs as string | number | undefined
    );

    if (text && startMs !== null) {
      segments.push({
        text: text.trim(),
        start: startMs / 1000,
        duration: endMs !== null ? (endMs - startMs) / 1000 : 0,
      });
    }
  }

  return segments;
}

function extractTextFromRuns(
  title: Record<string, unknown> | undefined
): string {
  if (!title) return "";
  const runs = title.runs as Array<{ text?: string }> | undefined;
  if (!runs) return (title.simpleText as string) || "";
  return runs.map((r) => r.text || "").join("");
}

function parseTimestampToMs(
  val: string | number | undefined
): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "number") return val;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function parseCaptionXML(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const regex =
    /<text\s+start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([\s\S]*?)<\/text>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const dur = match[2] ? parseFloat(match[2]) : 0;
    const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ""));

    if (text.trim()) {
      segments.push({
        text: text.trim(),
        start,
        duration: dur,
      });
    }
  }

  return segments;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

/**
 * Extract transcripts for multiple videos in a series
 */
export async function extractSeriesTranscripts(
  videoIds: string[]
): Promise<Map<string, TranscriptResult>> {
  const results = new Map<string, TranscriptResult>();

  for (const id of videoIds) {
    try {
      const transcript = await extractTranscript(id);
      results.set(id, transcript);
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.warn(`Failed to extract transcript for ${id}:`, e);
    }
  }

  return results;
}

/**
 * Truncate transcript text to a max number of characters
 */
export function truncateTranscript(
  transcript: TranscriptResult,
  maxChars: number = 15000
): string {
  if (transcript.full_text.length <= maxChars) {
    return transcript.full_text;
  }

  let result = "";
  for (const seg of transcript.segments) {
    const minutes = Math.floor(seg.start / 60);
    const seconds = Math.floor(seg.start % 60);
    const timestamp = `[${minutes}:${seconds.toString().padStart(2, "0")}] `;
    const line = timestamp + seg.text + "\n";

    if (result.length + line.length > maxChars) break;
    result += line;
  }

  return result;
}
