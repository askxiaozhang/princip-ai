// 拼豆调色板 —— 参考 Hama / 咪小窝常见色号，覆盖常用 48 色。
// 每个颜色带有色号(code)、中文名(name) 与十六进制(hex)，
// 识别时会把每个格子的平均色映射到最接近的色号。

export interface BeadColor {
  code: string;
  name: string;
  hex: string;
}

export const PERLER_PALETTE: BeadColor[] = [
  { code: "W01", name: "白色", hex: "#FFFFFF" },
  { code: "C02", name: "米白", hex: "#F4ECD8" },
  { code: "Y03", name: "柠檬黄", hex: "#FFE600" },
  { code: "Y04", name: "金黄", hex: "#FFC400" },
  { code: "O05", name: "橙色", hex: "#FF7A00" },
  { code: "O06", name: "橘红", hex: "#FF5722" },
  { code: "R07", name: "大红", hex: "#E60012" },
  { code: "R08", name: "酒红", hex: "#9B1B30" },
  { code: "P09", name: "粉红", hex: "#FF8FB1" },
  { code: "P10", name: "桃粉", hex: "#FFB6C1" },
  { code: "P11", name: "玫红", hex: "#E91E8C" },
  { code: "V12", name: "紫色", hex: "#7B2D8E" },
  { code: "V13", name: "浅紫", hex: "#B39DDB" },
  { code: "B14", name: "深蓝", hex: "#003C8F" },
  { code: "B15", name: "宝蓝", hex: "#0057D9" },
  { code: "B16", name: "天蓝", hex: "#29B6F6" },
  { code: "B17", name: "浅蓝", hex: "#A7D8F0" },
  { code: "T18", name: "青色", hex: "#00BCD4" },
  { code: "G19", name: "墨绿", hex: "#1B5E20" },
  { code: "G20", name: "草绿", hex: "#43A047" },
  { code: "G21", name: "嫩绿", hex: "#8BC34A" },
  { code: "G22", name: "浅绿", hex: "#C5E1A5" },
  { code: "N23", name: "肤色", hex: "#FFD9B3" },
  { code: "N24", name: "深肤", hex: "#E0A879" },
  { code: "K25", name: "咖啡", hex: "#5D4037" },
  { code: "K26", name: "浅棕", hex: "#A1887F" },
  { code: "K27", name: "巧克力", hex: "#3E2723" },
  { code: "S28", name: "浅灰", hex: "#D6D6D6" },
  { code: "S29", name: "中灰", hex: "#9E9E9E" },
  { code: "S30", name: "深灰", hex: "#5A5A5A" },
  { code: "S31", name: "黑色", hex: "#1A1A1A" },
  { code: "F32", name: "荧光黄", hex: "#D4FF00" },
  { code: "F33", name: "荧光绿", hex: "#39FF14" },
  { code: "F34", name: "荧光橙", hex: "#FF6D00" },
  { code: "F35", name: "荧光粉", hex: "#FF4FD8" },
];

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const PALETTE_RGB: RGB[] = PERLER_PALETTE.map((c) => hexToRgb(c.hex));

// "redmean" 加权欧氏距离，比纯 RGB 更接近人眼感受
function colorDistance(a: RGB, b: RGB): number {
  const rmean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return (
    (2 + rmean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rmean) / 256) * db * db
  );
}

/** 返回最接近输入颜色的调色板索引 */
export function nearestBead(rgb: RGB): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE_RGB.length; i++) {
    const d = colorDistance(rgb, PALETTE_RGB[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
