/**
 * YouTube URL parsing and video info utilities
 */

export interface ParsedYouTubeURL {
  type: "video" | "playlist";
  id: string;
  url: string;
}

/**
 * Extract YouTube video ID or playlist ID from various URL formats
 */
export function parseYouTubeURL(url: string): ParsedYouTubeURL | null {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.replace("www.", "").replace("m.", "");

    if (
      hostname !== "youtube.com" &&
      hostname !== "youtu.be" &&
      hostname !== "youtube-nocookie.com"
    ) {
      return null;
    }

    // youtu.be/VIDEO_ID
    if (hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1).split("/")[0];
      if (videoId && isValidVideoId(videoId)) {
        return { type: "video", id: videoId, url };
      }
    }

    // youtube.com/watch?v=VIDEO_ID or youtube.com/playlist?list=PLAYLIST_ID
    if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
      const path = parsed.pathname;

      // /watch?v=VIDEO_ID
      if (path === "/watch") {
        const v = parsed.searchParams.get("v");
        if (v && isValidVideoId(v)) {
          const list = parsed.searchParams.get("list");
          // If in a playlist context, return the playlist
          if (list && list.startsWith("PL")) {
            return { type: "playlist", id: list, url };
          }
          return { type: "video", id: v, url };
        }
      }

      // /playlist?list=PLAYLIST_ID
      if (path === "/playlist") {
        const list = parsed.searchParams.get("list");
        if (list) {
          return { type: "playlist", id: list, url };
        }
      }

      // /shorts/VIDEO_ID
      const shortsMatch = path.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) {
        return { type: "video", id: shortsMatch[1], url };
      }

      // /embed/VIDEO_ID
      const embedMatch = path.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) {
        return { type: "video", id: embedMatch[1], url };
      }

      // /live/VIDEO_ID
      const liveMatch = path.match(/^\/live\/([a-zA-Z0-9_-]+)/);
      if (liveMatch) {
        return { type: "video", id: liveMatch[1], url };
      }
    }

    return null;
  } catch {
    return null;
  }
}

function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

/**
 * 3Blue1Brown Linear Algebra series known playlist
 */
export const THREE_BLUE_ONE_BROWN_LA = {
  playlistId: "PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab",
  playlistIdOld: "PLZHQOb0TqpDNOtK0DggeHPJJmYlhYPYmP",
  title: "线性代数的本质 (Essence of Linear Algebra)",
  author: "3Blue1Brown",
  episodes: [
    {
      id: "k7RM-otwjNW",
      title: "向量究竟是什么？",
      en_title: "Vectors, what even are they?",
      number: 0,
    },
    {
      id: "kYB8IZa5AuE",
      title: "线性组合、张成空间与基",
      en_title:
        "Linear combinations, span, and bases",
      number: 1,
    },
    {
      id: "k7RM-otwjNW",
      title: "矩阵与线性变换",
      en_title: "Matrices as linear transformations",
      number: 2,
    },
    {
      id: "XkY2m0b4WgA",
      title: "矩阵乘法的本质",
      en_title: "Matrix multiplication as composition",
      number: 3,
    },
    {
      id: "Ip3bwBq7kYA",
      title: "行列式",
      en_title: "The determinant",
      number: 4,
    },
    {
      id: "U9_KUSb25Mw",
      title: "逆矩阵、列空间与零空间",
      en_title:
        "Inverse matrices, column space and null space",
      number: 5,
    },
    {
      id: "Sol6Z7XSjL4",
      title: "点积与对偶性",
      en_title: "Dot products and duality",
      number: 6,
    },
    {
      id: "BfFYP3XkMmk",
      title: "三维空间中的叉积",
      en_title: "Cross products",
      number: 7,
    },
    {
      id: "FIQoofL7wak",
      title: "基变换",
      en_title: "Change of basis",
      number: 8,
    },
    {
      id: "PFDl9h35Z3k",
      title: "特征向量与特征值",
      en_title: "Eigenvalues and eigenvectors",
      number: 9,
    },
    {
      id: "Fn7BgQIoDm8",
      title: "抽象向量空间",
      en_title: "Abstract vector spaces",
      number: 10,
    },
  ],
};

/**
 * Check if a URL belongs to a known series
 */
export function detectKnownSeries(
  parsed: ParsedYouTubeURL
): { series: typeof THREE_BLUE_ONE_BROWN_LA; episodeIndex: number } | null {
  if (parsed.type === "playlist") {
    if (
      parsed.id === THREE_BLUE_ONE_BROWN_LA.playlistId ||
      parsed.id === THREE_BLUE_ONE_BROWN_LA.playlistIdOld
    ) {
      return { series: THREE_BLUE_ONE_BROWN_LA, episodeIndex: -1 };
    }
  }
  if (parsed.type === "video") {
    const idx = THREE_BLUE_ONE_BROWN_LA.episodes.findIndex(
      (e) => e.id === parsed.id
    );
    if (idx !== -1) {
      return { series: THREE_BLUE_ONE_BROWN_LA, episodeIndex: idx };
    }
  }
  return null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeURL(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
