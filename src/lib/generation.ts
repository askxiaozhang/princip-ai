/**
 * Learning Package Generation - orchestrates the full pipeline
 * Includes demo mode with pre-computed results for 3Blue1Brown
 */

import type { LearningPackage, SeriesGuide, EpisodeGuide } from "./types";
import {
  parseYouTubeURL,
  detectKnownSeries,
  getYouTubeURL,
} from "./youtube";
import { extractTranscript, truncateTranscript } from "./transcript";
import {
  analyzeVideo,
  analyzeSeries,
  analyzeEpisodeInSeries,
  isAPIKeyAvailable,
} from "./analysis";

/**
 * Generate a full learning package for a YouTube URL
 */
export async function generateLearningPackage(
  url: string,
  mode: "auto" | "demo" = "auto"
): Promise<LearningPackage> {
  const parsed = parseYouTubeURL(url);
  if (!parsed) {
    throw new Error(
      "无法解析 YouTube URL。请确保输入的是有效的 YouTube 视频或播放列表链接。"
    );
  }

  // Check if it's a known series
  const seriesInfo = detectKnownSeries(parsed);

  if (seriesInfo && (!isAPIKeyAvailable() || mode === "demo")) {
    return generateDemoPackage(url, seriesInfo);
  }

  // Dynamic generation
  if (parsed.type === "video") {
    return generateSingleVideoPackage(parsed.id, url, seriesInfo);
  } else {
    return generatePlaylistPackage(parsed.id, url, seriesInfo);
  }
}

/**
 * Generate a package for a single video
 */
async function generateSingleVideoPackage(
  videoId: string,
  url: string,
  seriesInfo: ReturnType<typeof detectKnownSeries>
): Promise<LearningPackage> {
  // Get video info and transcript
  const { Innertube } = await import("youtubei.js");
  const innertube = await Innertube.create({ retrieve_player: false });

  let videoTitle = videoId;
  try {
    const info = await innertube.getBasicInfo(videoId);
    videoTitle = info.basic_info?.title || videoId;
  } catch (e) {
    console.warn("Could not get video title:", e);
  }

  // Extract transcript
  const transcript = await extractTranscript(videoId);
  const truncated = truncateTranscript(transcript, 15000);

  // Generate series context if in a known series
  let seriesContext: string | undefined;
  if (seriesInfo) {
    seriesContext = seriesInfo.series.episodes
      .map((e, i) => `第 ${i} 集: ${e.title} (${e.en_title})`)
      .join("\n");
  }

  // Analyze with LLM
  const analysis = await analyzeVideo(
    videoTitle,
    videoId,
    truncated,
    seriesContext
  );

  const episode: EpisodeGuide = {
    video_id: videoId,
    title: videoTitle,
    url: getYouTubeURL(videoId),
    questions: analysis.questions,
    cognitive_benefits: analysis.cognitive_benefits,
    misconceptions: analysis.misconceptions,
    sections: analysis.sections,
  };

  if (seriesInfo) {
    episode.episode_number = seriesInfo.episodeIndex;
  }

  const series: SeriesGuide = {
    series_title: seriesInfo?.series.title || videoTitle,
    series_description: seriesInfo
      ? `${seriesInfo.series.author} 的系列教程，共 ${seriesInfo.series.episodes.length} 集`
      : "独立视频",
    narrative_logic: analysis.narrative_logic,
    chapter_dependencies: analysis.chapter_dependencies,
    episodes: [episode],
  };

  return {
    id: `pkg_${videoId}_${Date.now()}`,
    url,
    title: videoTitle,
    source_type: "video",
    generated_at: new Date().toISOString(),
    series,
    transcript_length: transcript.full_text.length,
  };
}

/**
 * Generate a package for a playlist (full series)
 */
async function generatePlaylistPackage(
  playlistId: string,
  url: string,
  seriesInfo: ReturnType<typeof detectKnownSeries>
): Promise<LearningPackage> {
  if (seriesInfo) {
    // Use known series info
    return generateKnownSeriesPackage(seriesInfo, url);
  }

  throw new Error(
    "播放列表分析目前仅支持已知系列。请尝试输入单个视频链接，或使用 3Blue1Brown 线性代数系列。"
  );
}

/**
 * Generate a package for a known series using all episodes
 */
async function generateKnownSeriesPackage(
  seriesInfo: NonNullable<ReturnType<typeof detectKnownSeries>>,
  url: string
): Promise<LearningPackage> {
  const { series } = seriesInfo;
  const episodes: EpisodeGuide[] = [];

  // For each episode, extract transcript and analyze
  const summaries: Array<{ title: string; number: number; summary: string }> =
    [];

  for (let i = 0; i < series.episodes.length; i++) {
    const ep = series.episodes[i];
    try {
      const transcript = await extractTranscript(ep.id);
      const truncated = truncateTranscript(transcript, 8000);

      summaries.push({
        title: `${ep.title} (${ep.en_title})`,
        number: ep.number,
        summary: truncated.slice(0, 3000),
      });

      episodes.push({
        video_id: ep.id,
        title: ep.title,
        episode_number: ep.number,
        url: getYouTubeURL(ep.id),
        questions: [],
        cognitive_benefits: [],
        misconceptions: [],
      });
    } catch (e) {
      console.warn(`Failed to get transcript for episode ${ep.number}:`, e);
      summaries.push({
        title: `${ep.title} (${ep.en_title})`,
        number: ep.number,
        summary: "[字幕提取失败]",
      });
    }
  }

  // Series-level analysis
  const seriesAnalysis = await analyzeSeries(series.title, summaries);

  // Per-episode analysis with series context
  for (let i = 0; i < series.episodes.length; i++) {
    const ep = series.episodes[i];
    try {
      const transcript = await extractTranscript(ep.id);
      const truncated = truncateTranscript(transcript, 10000);

      const epAnalysis = await analyzeEpisodeInSeries(
        ep.title,
        ep.number,
        truncated,
        seriesAnalysis.narrative_logic
      );

      episodes[i].questions = epAnalysis.questions;
      episodes[i].cognitive_benefits = epAnalysis.cognitive_benefits;
      episodes[i].misconceptions = epAnalysis.misconceptions;
      episodes[i].sections = epAnalysis.sections;
    } catch (e) {
      console.warn(`Failed to analyze episode ${ep.number}:`, e);
      // Keep empty questions/benefits/misconceptions
    }
  }

  return {
    id: `pkg_playlist_${Date.now()}`,
    url,
    title: series.title,
    source_type: "playlist",
    generated_at: new Date().toISOString(),
    series: {
      series_title: series.title,
      series_description: `${series.author} 的系列教程，共 ${series.episodes.length} 集`,
      narrative_logic: seriesAnalysis.narrative_logic,
      chapter_dependencies: seriesAnalysis.chapter_dependencies,
      episodes,
    },
  };
}

// ===== DEMO MODE: Pre-computed learning package for 3Blue1Brown =====

function generateDemoPackage(
  url: string,
  seriesInfo: NonNullable<ReturnType<typeof detectKnownSeries>>
): LearningPackage {
  const { series, episodeIndex } = seriesInfo;

  const allEpisodes: EpisodeGuide[] = DEMO_EPISODES;

  if (episodeIndex >= 0) {
    // Single episode view
    const ep = allEpisodes[episodeIndex];
    return {
      id: `demo_video_${ep.video_id}`,
      url,
      title: ep.title,
      source_type: "video",
      generated_at: new Date().toISOString(),
      series: {
        ...DEMO_SERIES,
        episodes: [ep],
      },
    };
  }

  // Full series view
  return {
    id: `demo_series`,
    url,
    title: series.title,
    source_type: "playlist",
    generated_at: new Date().toISOString(),
    series: DEMO_SERIES,
  };
}

const DEMO_EPISODES: EpisodeGuide[] = [
  {
    video_id: "k7RM-otwjNW",
    title: "向量究竟是什么？",
    episode_number: 0,
    url: "https://www.youtube.com/watch?v=k7RM-otwjNW",
    questions: [
      {
        question:
          "为什么向量可以同时表示物理空间中的箭头、坐标系中的数字对、和一条数据记录？这三种看似完全不同的东西，本质统一在哪里？",
        why_it_matters:
          "这个问题触及线性代数最根本的研究对象。如果只能记住一件事，就是：向量的'本质'不在于它的表示形式，而在于它所满足的运算规则（加法和数乘）。理解了这一点，后面函数、信号等'非几何'对象也能用线性代数来分析。",
        depth_hint:
          "真正理解的标准：你能向一个完全不懂数学的人解释，为什么Excel里的一行数据（身高、体重、年龄）'本质上'和屏幕上的一个箭头是同一种东西。关键在于它们都支持'叠加'和'缩放'。",
      },
      {
        question:
          "为什么我们把向量的加法定义为'对应分量相加'（平行四边形法则）？这个定义是随意的还是必然的？如果换一种定义会怎样？",
        why_it_matters:
          "向量加法不是凭空定义的——它来自于我们对'平移'和'叠加'的物理直觉。理解这一点后，你会看到线性代数中所有运算定义都不是随意的，而是从几何直觉中'长'出来的。",
        depth_hint:
          "真正理解的标准：你能解释为什么'对应分量相乘'不是好的向量加法定义（不满足交换律？不满足结合律？几何上没有好的解释？），而'对应分量相加'在所有表示方式下都'说得通'。",
      },
      {
        question:
          "如果只给你一个向量，你能用它'到达'二维空间中的所有点吗？如果不行，需要什么条件？",
        why_it_matters:
          "这引出了'张成空间'和'线性无关'的概念，是整个线性代数空间理论的基础。理解'一个向量能张成什么'和'需要什么才能张成全空间'，是理解基、维度、秩的前提。",
        depth_hint:
          "真正理解的标准：你能用几何直觉说明为什么一个向量只能张成一条线，两个不平行的向量能张成整个平面，以及为什么'平行'是关键条件（而不是'长度不同'之类）。",
      },
    ],
    cognitive_benefits: [
      "看到任何向量（无论是物理量、坐标、还是数据行），都能在脑中自由切换'箭头'、'坐标'、'数据点'三种视角",
      "理解向量加法不是'公式'而是'平移的叠加'，看到平行四边形法则的必然性",
      "能判断一组向量能'到达'哪些地方（张成空间），为理解基和维度建立直觉",
    ],
    misconceptions: [
      "误区：'向量就是箭头'或'向量就是坐标对'。真相：向量是满足特定运算规则（加法+数乘+八条公理）的抽象对象。箭头和坐标只是它在特定语境下的具体化身。",
      "误区：'零向量是特殊情况，不重要'。真相：零向量是向量空间的'原点'，所有平移都相对于它。没有零向量，就没有'线性'的概念。",
      "误区：'向量的维数就是它的长度/大小'。真相：维数是描述这个向量所在空间需要的最少坐标数，与向量本身的'长度'无关。一个二维向量有两个分量，和一个三维向量有三个分量——维数不同。",
    ],
    sections: [
      {
        title: "向量的三种视角",
        summary:
          "介绍向量作为箭头（物理）、坐标（计算机）、数据点（数据科学）的三种等价视角",
        key_concepts: ["向量", "箭头表示", "坐标表示", "数据点表示"],
      },
      {
        title: "向量加法与数乘",
        summary:
          "讲解向量加法的平行四边形法则和数乘的缩放含义",
        key_concepts: ["向量加法", "平行四边形法则", "标量乘法", "缩放"],
      },
      {
        title: "基向量与张成空间",
        summary:
          "引入基向量的概念，讨论一个或两个向量能'到达'的空间范围",
        key_concepts: ["基向量", "张成空间", "线性组合", "线性无关"],
      },
    ],
  },
  {
    video_id: "kYB8IZa5AuE",
    title: "线性组合、张成空间与基",
    episode_number: 1,
    url: "https://www.youtube.com/watch?v=kYB8IZa5AuE",
    questions: [
      {
        question:
          "什么是'张成空间'？为什么两个向量的张成空间可以是线、平面或整个空间——取决于什么条件？",
        why_it_matters:
          "张成空间是理解'基'和'维度'的前提。它回答了'从给定原料出发，能到达哪些地方'这个基本问题。",
        depth_hint:
          "真正理解的标准：你能解释为什么两个共线向量只能张成一条线，而不平行的两个向量能张成整个平面——从'线性组合'的定义出发几何地推导出来。",
      },
      {
        question:
          "'基'到底是什么？为什么说基不是唯一的？选择不同的基会改变什么、不改变什么？",
        why_it_matters:
          "基是坐标系的'骨架'。理解基的非唯一性，是后续理解基变换和特征向量的基础。",
        depth_hint:
          "真正理解的标准：你能举出二维空间中至少两组不同的基，并解释'同一个向量在不同基下的坐标不同，但箭头本身不变'。",
      },
    ],
    cognitive_benefits: [
      "理解'线性组合'是线性代数最核心的操作——几乎所有后续概念都是它的变体",
      "能从几何上判断一组向量能张成什么空间，理解'线性无关'的真正含义",
      "认识到'基'是一种选择而非客观存在——为后续基变换打下心理基础",
    ],
    misconceptions: [
      "误区：'线性无关就是向量不平行'。真相：这只是在二维的情况。三维中三个向量'线性无关'意味着它们不共面。更高维中'线性无关'的含义是'没有一个能被其他的线性组合表示'。",
      "误区：'标准基 (i, j) 是唯一正确的基'。真相：标准基只是最方便的选择。任何两个不平行向量都能作为基。",
    ],
    sections: [
      {
        title: "线性组合的几何意义",
        summary: "用动画展示标量乘法和向量加法的组合效果",
        key_concepts: ["线性组合", "标量", "系数"],
      },
      {
        title: "张成空间",
        summary: "讨论不同情况下向量组的张成空间",
        key_concepts: ["张成空间", "span", "维度"],
      },
      {
        title: "基的定义",
        summary: "定义基为最小张成集，讨论基的选择",
        key_concepts: ["基", "基向量", "标准基"],
      },
    ],
  },
  {
    video_id: "k7RM-otwjNW",
    title: "矩阵与线性变换",
    episode_number: 2,
    url: "https://www.youtube.com/watch?v=k7RM-otwjNW",
    questions: [
      {
        question:
          "为什么说'矩阵就是线性变换'？这个等价的含义是什么？给你一个矩阵，你怎么读出它对应的几何变换？",
        why_it_matters:
          "这是整个系列最关键的认知跃迁。建立这个直觉后，行列式、逆矩阵、特征向量等概念都会变得自然。",
        depth_hint:
          "真正理解的标准：给你一个 2x2 矩阵，你能立刻在脑中想象它把平面变成了什么样子——哪个方向被拉伸了、哪个方向被压缩了、有没有旋转。",
      },
      {
        question:
          "为什么只有'保持网格线平行且等距'的变换才是线性的？这个几何条件对应什么代数条件？",
        why_it_matters:
          "线性性是线性代数的核心约束。理解'什么不是线性变换'和'什么是线性变换'同等重要。",
        depth_hint:
          "真正理解的标准：你能举出一个非线性变换（如平移、弯曲）并解释它为什么不满足'网格线平行等距'条件，以及为什么这导致它不能用矩阵表示。",
      },
    ],
    cognitive_benefits: [
      "看到矩阵不再想到'数字表格'，而是直接想到'空间变换'",
      "能从一个矩阵的列向量读出变换效果：第一列是 i-hat 的去向，第二列是 j-hat 的去向",
      "理解'线性'的几何含义：网格线保持平行等距",
    ],
    misconceptions: [
      "误区：'矩阵就是一堆数字的表格，矩阵运算就是按规则算数字'。真相：矩阵是空间变换的编码，所有运算规则都是从几何性质中推导出来的。",
      "误区：'每个变换都是线性的'。真相：平移不是线性变换（它不保持原点不动）。只有保持'网格线平行等距'的变换才是线性的。",
    ],
    sections: [
      {
        title: "线性变换的几何直觉",
        summary: "用动画展示各种线性变换如何移动空间中的点",
        key_concepts: ["线性变换", "空间变换", "网格线"],
      },
      {
        title: "矩阵作为变换的编码",
        summary: "展示矩阵的列向量记录了基向量的去向",
        key_concepts: ["矩阵", "列向量", "基向量变换"],
      },
    ],
  },
  {
    video_id: "XkY2m0b4WgA",
    title: "矩阵乘法的本质",
    episode_number: 3,
    url: "https://www.youtube.com/watch?v=XkY2m0b4WgA",
    questions: [
      {
        question:
          "为什么矩阵乘法要按'行×列'的规则定义？从变换复合的角度，这个规则是必然的还是人为规定的？",
        why_it_matters:
          "教科书上的矩阵乘法公式看起来非常任意。理解它来自'变换复合'后，你会看到线性代数中运算定义的内在一致性。",
        depth_hint:
          "真正理解的标准：你能从'先做变换A再做变换B'出发，手动推导出 AB 矩阵的每个元素应该是什么——而不是记住公式。",
      },
      {
        question:
          "为什么矩阵乘法不满足交换律（AB ≠ BA）？从变换的角度，这到底意味着什么？",
        why_it_matters:
          "这是线性代数和标量代数最大的区别之一。理解'变换的顺序很重要'是理解量子力学、3D 图形学等应用的基础。",
        depth_hint:
          "真正理解的标准：你能给出一个具体的几何例子（如先旋转再剪切 vs 先剪切再旋转），用直觉说明为什么结果不同，而不只是说'因为公式不交换'。",
      },
    ],
    cognitive_benefits: [
      "不再死记矩阵乘法公式——能从'变换复合'的几何意义推导出来",
      "理解矩阵乘法不交换的几何原因：变换的顺序很重要",
      "能把复杂的矩阵运算分解为一系列简单变换的复合",
    ],
    misconceptions: [
      "误区：'矩阵乘法不交换是因为公式复杂'。真相：不交换的本质是'变换的顺序影响结果'。先旋转再平移 ≠ 先平移再旋转，这是几何事实，不是代数巧合。",
      "误区：'矩阵乘法的定义是任意的'。真相：'行×列'的规则是'变换复合'的唯一自然编码方式，不是拍脑袋想出来的。",
    ],
    sections: [
      {
        title: "变换的复合",
        summary: "展示两个变换依次应用的效果",
        key_concepts: ["变换复合", "矩阵乘法"],
      },
      {
        title: "矩阵乘法的推导",
        summary: "从变换复合推导出矩阵乘法规则",
        key_concepts: ["矩阵乘法", "行×列", "复合矩阵"],
      },
    ],
  },
  {
    video_id: "Ip3bwBq7kYA",
    title: "行列式",
    episode_number: 4,
    url: "https://www.youtube.com/watch?v=Ip3bwBq7kYA",
    questions: [
      {
        question:
          "行列式的几何意义到底是什么？为什么'面积缩放因子'这个解释比'主对角线之积减去副对角线之积'更有价值？",
        why_it_matters:
          "行列式的代数公式看起来毫无直觉。理解它是'面积/体积缩放因子'后，所有行列式的性质（乘法性、为零的含义等）都变得显而易见。",
        depth_hint:
          "真正理解的标准：看到一个 2x2 矩阵，你能估算它把单位正方形的面积放大/缩小了多少倍，并说出 det(AB) = det(A) × det(B) 的几何原因。",
      },
      {
        question:
          "为什么行列式为 0 就意味着变换不可逆？从空间维度的角度，发生了什么？",
        why_it_matters:
          "行列式为零 ⟺ 不可逆 ⟺ 零空间非平凡 ⟺ 秩不满——这四个等价命题是线性代数最核心的等价关系之一。",
        depth_hint:
          "真正理解的标准：你能解释 det=0 时空间'压扁'到了更低的维度，信息丢失了，所以'回不去'了——用几何直觉串起整个逻辑链。",
      },
    ],
    cognitive_benefits: [
      "看到行列式不再想到公式，而是想到'空间被缩放了多少'",
      "理解负行列式意味着空间被'翻转'了",
      "掌握 det=0 ⟺ 不可逆 ⟺ 信息丢失的几何直觉链",
    ],
    misconceptions: [
      "误区：'行列式就是一个数的计算公式'。真相：行列式是变换对空间'体积'的缩放因子。公式只是这个几何量的代数表达。",
      "误区：'行列式为负没有意义'。真相：负号表示变换'翻转'了空间的方向（如镜面反射）。",
      "误区：'行列式大说明变换很重要'。真相：行列式只告诉你面积缩放了多少，不告诉你变换的性质。一个行列式很大的变换可能只是简单的均匀放大。",
    ],
    sections: [
      {
        title: "行列式的几何意义",
        summary: "用面积缩放因子解释行列式",
        key_concepts: ["行列式", "面积缩放", "det"],
      },
      {
        title: "行列式为零的含义",
        summary: "讨论降维、信息丢失与不可逆性",
        key_concepts: ["降维", "不可逆", "零行列式"],
      },
    ],
  },
  {
    video_id: "U9_KUSb25Mw",
    title: "逆矩阵、列空间与零空间",
    episode_number: 5,
    url: "https://www.youtube.com/watch?v=U9_KUSb25Mw",
    questions: [
      {
        question:
          "逆矩阵存在的条件到底是什么？为什么'行列式不为零'和'矩阵可逆'是等价的？",
        why_it_matters:
          "逆矩阵是解线性方程组的核心工具。理解存在条件（而不是只记住判定方法）让你知道什么时候方程有唯一解。",
        depth_hint:
          "真正理解的标准：你能从 det=0 → 降维 → 信息丢失 → 无法唯一恢复 这条逻辑链，解释为什么可逆 ⟺ det≠0。",
      },
      {
        question:
          "零空间的几何意义是什么？它和'方程 Ax=0 的解'有什么关系？为什么零空间的大小反映了矩阵的'信息损失'？",
        why_it_matters:
          "零空间是把列空间、秩、可逆性等概念串联起来的关键。理解零空间 = 理解线性方程组的解的结构。",
        depth_hint:
          "真正理解的标准：你能解释'零空间是被变换压扁到原点的那些向量'，以及为什么零空间非平凡意味着 det=0 意味着不可逆。",
      },
    ],
    cognitive_benefits: [
      "理解'可逆 ⟺ det≠0 ⟺ 零空间只有零向量'这个核心等价关系",
      "从几何上理解列空间（变换后能到达的地方）和零空间（被压扁到原点的地方）",
      "能把线性方程组 Ax=b 的解的存在性和唯一性与矩阵的几何性质联系起来",
    ],
    misconceptions: [
      "误区：'矩阵的逆就是一个公式算出来的东西'。真相：逆矩阵对应逆变换——把变换' undo '回去。公式只是计算手段。",
      "误区：'零空间只包含零向量的矩阵才有用'。真相：大多数有用的矩阵零空间都是非平凡的。零空间的结构告诉你变换'压缩'了哪些信息。",
    ],
    sections: [
      {
        title: "逆矩阵",
        summary: "从逆变换的角度理解逆矩阵",
        key_concepts: ["逆矩阵", "可逆性", "逆变换"],
      },
      {
        title: "列空间",
        summary: "矩阵的列向量张成的空间",
        key_concepts: ["列空间", "像空间", "秩"],
      },
      {
        title: "零空间",
        summary: "被变换映射到零向量的所有向量",
        key_concepts: ["零空间", "核", "Ax=0"],
      },
    ],
  },
  {
    video_id: "Sol6Z7XSjL4",
    title: "点积与对偶性",
    episode_number: 6,
    url: "https://www.youtube.com/watch?v=Sol6Z7XSjL4",
    questions: [
      {
        question:
          "点积 v·w 为什么等于'v 在 w 方向上的投影长度乘以 w 的长度'？这个几何解释和'对应元素相乘再相加'的代数定义之间，为什么是等价的？",
        why_it_matters:
          "点积的几何解释让它从一个公式变成一个直觉工具。理解这个等价性是理解'对偶性'的前提。",
        depth_hint:
          "真正理解的标准：你能用'投影'的语言解释为什么 v·w > 0 表示夹角小于90度、v·w = 0 表示正交、v·w < 0 表示夹角大于90度。",
      },
      {
        question:
          "什么是对偶性？为什么说'每个线性变换到数字的函数（线性泛函）都对应一个向量'？",
        why_it_matters:
          "对偶性是线性代数中最深刻也最容易被忽略的概念之一。它是理解泛函分析、量子力学中bra-ket记号的基础。",
        depth_hint:
          "真正理解的标准：你能解释'1x3 矩阵乘以 3x1 矩阵'和'点积'在数学上是同一件事——前者是代数操作，后者是几何操作，但结果相同。",
      },
    ],
    cognitive_benefits: [
      "从'投影'的角度理解点积，不再只是'对应元素相乘再相加'",
      "理解对偶性：线性泛函和向量之间的本质等价",
      "看到矩阵乘法的'行×列'规则和点积的深层联系",
    ],
    misconceptions: [
      "误区：'点积只是公式，没什么几何意义'。真相：点积是投影的度量——它告诉你两个向量'在同一方向上有多少重叠'。",
      "误区：'对偶性是很高级的概念，MVP不需要关心'。真相：对偶性就在你眼前——每次你做点积，你就在做'线性泛函作用于向量'。",
    ],
    sections: [
      {
        title: "点积的几何意义",
        summary: "从投影角度理解点积",
        key_concepts: ["点积", "投影", "正交"],
      },
      {
        title: "对偶性",
        summary: "线性泛函与向量的对应关系",
        key_concepts: ["对偶性", "线性泛函", "对偶向量"],
      },
    ],
  },
  {
    video_id: "BfFYP3XkMmk",
    title: "三维空间中的叉积",
    episode_number: 7,
    url: "https://www.youtube.com/watch?v=BfFYP3XkMmk",
    questions: [
      {
        question:
          "叉积 v×w 的结果为什么垂直于 v 和 w 所在的平面？从行列式的角度，这个'垂直方向'是怎么被唯一确定的？",
        why_it_matters:
          "叉积在物理和工程中大量使用（力矩、角动量、电磁学）。理解它的几何来源比记住'行列式展开'公式重要得多。",
        depth_hint:
          "真正理解的标准：你能解释叉积的模 = 由 v 和 w 张成的平行四边形面积 = 行列式的绝对值，以及叉积的方向由'右手定则'（或行列式的符号）决定。",
      },
    ],
    cognitive_benefits: [
      "理解叉积的几何本质：面积 + 法向量",
      "看到叉积与行列式的深层联系",
      "能在三维空间中用右手定则确定叉积方向",
    ],
    misconceptions: [
      "误区：'叉积只是另一个计算公式'。真相：叉积编码了两个向量张成的'有向面积'和该面积所在平面的法方向。",
    ],
    sections: [
      {
        title: "叉积的定义",
        summary: "叉积的几何和代数定义",
        key_concepts: ["叉积", "法向量", "右手定则"],
      },
      {
        title: "叉积与行列式",
        summary: "叉积的模等于行列式",
        key_concepts: ["行列式", "面积", "有向面积"],
      },
    ],
  },
  {
    video_id: "FIQoofL7wak",
    title: "基变换",
    episode_number: 8,
    url: "https://www.youtube.com/watch?v=FIQoofL7wak",
    questions: [
      {
        question:
          "同一个变换在不同基下的矩阵表示不同——那'哪个矩阵才是正确的'？基变换公式 P⁻¹AP 在几何上到底在做什么？",
        why_it_matters:
          "基变换是连接'抽象变换'和'具体矩阵'的桥梁。理解它后，你会认识到矩阵不是变换本身，而是变换在特定坐标系下的'快照'。",
        depth_hint:
          "真正理解的标准：你能解释 P⁻¹AP 的含义：P 是从新基到标准基的转换，P⁻¹ 是从标准基回到新基的转换，A 是在标准基下的变换。整个复合就是'先用新基看，再用标准基做变换，最后回到新基看'。",
      },
    ],
    cognitive_benefits: [
      "理解矩阵不是变换本身，而是变换在特定基下的表示",
      "掌握基变换公式 P⁻¹AP 的几何含义",
      "为理解特征向量（在所有基下最简单的表示）做铺垫",
    ],
    misconceptions: [
      "误区：'基变换公式是纯代数技巧'。真相：P⁻¹AP 有清晰的几何含义——'换到别人的视角看同一个变换'。",
      "误区：'不同基下的矩阵描述不同的变换'。真相：它们描述同一个变换，只是用不同的'语言'（坐标系）来表达。",
    ],
    sections: [
      {
        title: "不同基下的矩阵",
        summary: "同一个变换在不同基下的不同矩阵表示",
        key_concepts: ["基变换", "坐标转换"],
      },
      {
        title: "P⁻¹AP 的推导",
        summary: "基变换公式的几何推导",
        key_concepts: ["基变换矩阵", "相似矩阵"],
      },
    ],
  },
  {
    video_id: "PFDl9h35Z3k",
    title: "特征向量与特征值",
    episode_number: 9,
    url: "https://www.youtube.com/watch?v=PFDl9h35Z3k",
    questions: [
      {
        question:
          "为什么几乎所有理工科领域都在用特征值/特征向量？它到底在找一个变换的什么核心不变属性？",
        why_it_matters:
          "特征向量是线性代数最强大的工具之一。从 Google PageRank 到量子力学、从 PCA 到振动分析，特征向量无处不在。理解它'在找什么'比知道'怎么算'重要得多。",
        depth_hint:
          "真正理解的标准：你能解释特征向量是变换中'方向不变'的向量，特征值是该方向上的缩放因子——特征分解就是在找变换的'主轴'，沿着这些轴变换最简单（只有缩放没有旋转）。",
      },
      {
        question:
          "为什么特征分解 A = PDP⁻¹ 让矩阵的高次幂变得容易计算？这在动态系统中意味着什么？",
        why_it_matters:
          "矩阵高次幂 = 多次应用同一变换 = 动态系统的演化。特征分解让这个过程从'矩阵乘法'简化为'特征值的幂'——这是理解稳态、收敛、振动的关键。",
        depth_hint:
          "真正理解的标准：你能解释 A^n = PD^nP⁻¹ 的几何含义：沿着特征向量方向，变换 n 次就是缩放 n 次（λ^n）。非特征向量方向的运动会逐渐被'吸收'到特征方向上。",
      },
      {
        question:
          "什么时候一个矩阵不能对角化？从几何上看，'不能对角化'的变换有什么特殊之处？",
        why_it_matters:
          "不能对角化的矩阵揭示了线性变换更深层的结构——有些变换没有足够的'独立方向'。这是理解若尔当标准形等高级概念的起点。",
        depth_hint:
          "真正理解的标准：你能举出一个不能对角化的变换（如剪切变换），并解释它的特征空间'维数不够'——几何上就是'没有足够的独立方向来简化变换'。",
      },
    ],
    cognitive_benefits: [
      "理解特征向量是变换的'主轴'——沿这些方向变换最简单",
      "掌握特征分解 A = PDP⁻¹ 的几何含义",
      "能解释为什么特征值在 PageRank、PCA、振动分析等场景中如此重要",
      "理解矩阵高次幂 A^n 的几何含义和长期行为",
    ],
    misconceptions: [
      "误区：'特征值就是特征方程的根，没什么几何意义'。真相：特征值是变换在'主轴'方向上的缩放因子。特征方程的根就是这些缩放因子的代数表达。",
      "误区：'所有矩阵都可以对角化'。真相：有些矩阵（如剪切矩阵）没有足够的独立特征向量，不能对角化。这对应着几何上'不够对称'的变换。",
      "误区：'特征值大说明这个方向重要'。真相：在 PCA 等应用中，特征值大确实说明该方向'方差大/信息多'。但在其他语境中，特征值大小不一定直接等于'重要性'。",
    ],
    sections: [
      {
        title: "特征向量的几何意义",
        summary: "变换中方向不变的向量",
        key_concepts: ["特征向量", "特征值", "不变方向"],
      },
      {
        title: "特征分解",
        summary: "A = PDP⁻¹ 的含义和计算",
        key_concepts: ["对角化", "特征分解", "PDP⁻¹"],
      },
      {
        title: "动态系统中的应用",
        summary: "矩阵高次幂与长期行为",
        key_concepts: ["矩阵幂", "稳态", "收敛"],
      },
    ],
  },
  {
    video_id: "Fn7BgQIoDm8",
    title: "抽象向量空间",
    episode_number: 10,
    url: "https://www.youtube.com/watch?v=Fn7BgQIoDm8",
    questions: [
      {
        question:
          "为什么函数也可以构成向量空间？'向量'这个概念从'箭头'推广到'函数'后，之前的所有几何直觉还成立吗？",
        why_it_matters:
          "抽象向量空间是线性代数的最终形态——它告诉你线性代数不只是关于箭头和矩阵的，而是关于一切满足叠加原理的数学对象。傅里叶分析、量子力学、机器学习都建立在这个基础上。",
        depth_hint:
          "真正理解的标准：你能解释'函数空间中的基函数'（如 sin(x), cos(x), ...）和'二维空间中的基向量 (i, j)'在结构上是完全平行的——都是'用线性组合表示任意元素'的极小集合。",
      },
      {
        question:
          "线性代数的哪些定理在抽象向量空间中仍然成立，哪些需要额外条件？为什么'有限维'和'无限维'之间有这么大的差异？",
        why_it_matters:
          "有限维线性代数的几乎所有结果都可以推广到抽象向量空间，但无限维情况下的收敛性、完备性等分析概念开始介入。这是从线性代数通往泛函分析的大门。",
        depth_hint:
          "真正理解的标准：你知道'所有有限维向量空间都同构于 R^n'这个定理的深刻含义——它意味着一旦你理解了 R^n，你就理解了所有有限维向量空间。但无限维不是这样。",
      },
    ],
    cognitive_benefits: [
      "理解向量空间是一个'公理系统'——任何满足8条公理的对象集合都是向量空间",
      "能将之前的几何直觉（线性变换、基、维度）推广到函数、多项式等抽象对象",
      "为学习泛函分析、量子力学、信号处理等高级课程做好概念准备",
    ],
    misconceptions: [
      "误区：'向量空间就是箭头空间'。真相：向量空间是一个抽象的代数结构。箭头空间只是其中一个（非常重要的）例子。",
      "误区：'抽象向量空间太抽象了，没什么用'。真相：函数空间、多项式空间、信号空间都是向量空间。理解这些空间让你能用线性代数的工具分析函数、信号、量子态等。",
    ],
    sections: [
      {
        title: "向量空间的公理",
        summary: "向量空间的8条公理定义",
        key_concepts: ["向量空间", "公理", "封闭性"],
      },
      {
        title: "函数空间",
        summary: "函数作为向量的例子",
        key_concepts: ["函数空间", "基函数", "无限维"],
      },
    ],
  },
];

const DEMO_SERIES: SeriesGuide = {
  series_title: "线性代数的本质 (Essence of Linear Algebra)",
  series_description:
    "3Blue1Brown 的经典线性代数可视化系列，共 11 集。用几何直觉重构线性代数的核心概念。",
  narrative_logic: `3Blue1Brown 的线性代数系列有一个清晰的核心主线：**从几何直观出发，重新构建整个线性代数的概念体系**。

整个系列的编排遵循一条递进的认知链：

**第一层：定义研究对象（向量）**
系列从"向量究竟是什么"开始，这不是随意选择。向量是线性代数的原子 — 后续所有概念（矩阵、变换、空间）都建立在向量之上。3Blue1Brown 选择同时展示向量的三种面貌（箭头、坐标、数据点），是为了在第一集就埋下"统一性"的种子：这三种看似不同的东西，本质上是同一个数学对象的三种表达。

**第二层：定义基本操作（线性组合与基）**
有了向量，自然的问题是"如何操作它们"。线性组合和张成空间定义了向量之间的"可达性"——从给定的基向量出发，我们能到达哪些地方？基的选择不是唯一的，这为后续"基变换"埋下了伏笔。

**第三层：引入核心工具（矩阵与线性变换）**
矩阵在这里不再是"一堆数字的表格"，而是"空间变换的编码"。这是整个系列最关键的认知跃迁：矩阵 = 变换。一旦建立这个直觉，后续所有矩阵运算都有了清晰的几何意义。

**第四层：操作的复合与性质（矩阵乘法、行列式、逆矩阵）**
矩阵乘法 = 变换的复合；行列式 = 变换对面积的缩放因子；逆矩阵 = 变换的可逆性。每一讲都在回答"这个运算在几何上意味着什么"。特别地，行列式为0 → 空间维度坍缩 → 不可逆，这条逻辑链把三个概念串联成一个统一的认知框架。

**第五层：深层结构（点积对偶、叉积、基变换）**
点积不再只是"对应元素相乘再相加"的公式，而是"一个向量到另一个向量方向上的投影"的度量。对偶性揭示了线性泛函和向量之间的本质联系。基变换解释了"同一件事在不同坐标系下的不同表达"——这是理解特征向量的关键铺垫。

**第六层：上升到抽象（特征向量、抽象向量空间）**
特征向量回答了一个根本问题：在变换中，什么是"不变的"？这是线性代数最强大的工具之一，因为它把复杂变换简化为沿固定方向的缩放。最后的抽象向量空间把前面所有的几何直觉推广到任意满足公理的数学对象上——函数、多项式、信号都可以用线性代数的语言来描述。

整个系列的设计哲学是：**先建立几何直觉，再推导代数性质**。这与传统线性代数教学（先定义公理，再推导定理）形成鲜明对比。`,

  chapter_dependencies: `整个系列的知识依赖链是严格递进的：

**向量** → 所有后续内容的基础。不理解向量就无法理解线性变换。

**线性组合与基** → 依赖向量概念。张成空间定义了"可达性"，基的选择为基变换做铺垫。这一集的理解直接影响"矩阵的列空间"和"零空间"的理解。

**矩阵与线性变换** → 依赖线性组合（矩阵作用就是线性组合的矩阵形式）。这一集是整个系列的认知枢纽——建立"矩阵=变换"的直觉后，后续所有内容都变得自然。

**矩阵乘法** → 依赖矩阵变换。理解"复合变换"后，矩阵乘法规则不再是任意的，而是必然的。

**行列式** → 依赖矩阵变换。行列式是变换的"面积缩放因子"。理解行列式需要理解变换如何改变空间。

**逆矩阵与秩** → 依赖行列式。行列式为0 ↔ 不可逆 ↔ 秩不满。这三个概念形成等价关系。

**点积对偶** → 依赖线性变换。对偶性是线性代数中较抽象的概念，需要前面所有概念的积累。

**叉积** → 依赖行列式。叉积的大小等于由两个向量张成的平行四边形面积，而面积的计算需要行列式。

**基变换** → 依赖矩阵变换和基的概念。基变换是"同一变换在不同基下的矩阵表示"。

**特征向量** → 依赖矩阵变换和基变换。特征向量是变换中"方向不变"的向量，理解它需要理解变换和基的完整图景。

**抽象向量空间** → 依赖前面所有内容。这是将几何直觉推广到抽象对象的最终一步。

**关键依赖**：如果跳过"矩阵与线性变换"这一集，后续几乎全部无法理解。它是整个系列的枢纽。`,

  episodes: DEMO_EPISODES,
};

