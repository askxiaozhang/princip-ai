"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PERLER_PALETTE, nearestBead } from "@/lib/perler-palette";

const EMPTY = -1;

interface Dims {
  bigCols: number;
  bigRows: number;
  sub: number; // 每个大格里的小格数 (sub × sub)
}

type Mode = "pan" | "erase";

export default function PerlerSimulator() {
  // 网格尺寸：默认 10×10 大格，每个大格 5×5 小格 => 50×50 颗豆
  const [dims, setDims] = useState<Dims>({ bigCols: 10, bigRows: 10, sub: 5 });
  const cols = dims.bigCols * dims.sub;
  const rows = dims.bigRows * dims.sub;

  // 每颗豆的调色板索引，EMPTY 表示空格
  const [grid, setGrid] = useState<Int16Array>(
    () => new Int16Array(cols * rows).fill(EMPTY)
  );

  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);

  // 视图：缩放与平移
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // 颜色交互
  const [activeColor, setActiveColor] = useState<number | null>(null); // 高亮某色
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  const [mode, setMode] = useState<Mode>("pan");
  const [showOriginal, setShowOriginal] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  // ---------- 视图适配 ----------
  function fitToView(c: number, r: number) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const pad = 24;
    const cell = Math.max(
      4,
      Math.floor(
        Math.min((wrap.clientWidth - pad) / c, (wrap.clientHeight - pad) / r)
      )
    );
    setZoom(cell / BASE_CELL);
    setOffset({ x: 0, y: 0 });
  }

  // ---------- 图片识别：把图片采样进网格 ----------
  // 把图片按比例铺进 c×r 网格，逐格取色映射到最近豆色，透明处留空。
  function recognizeInto(img: HTMLImageElement, c: number, r: number): Int16Array {
    const off = document.createElement("canvas");
    off.width = c;
    off.height = r;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    if (!ctx) return new Int16Array(c * r).fill(EMPTY);

    // 保持比例 (contain)，居中放置，空白区域保持透明 => 空格
    const scale = Math.min(c / img.width, r / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.clearRect(0, 0, c, r);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, (c - dw) / 2, (r - dh) / 2, dw, dh);

    const data = ctx.getImageData(0, 0, c, r).data;
    const next = new Int16Array(c * r);
    for (let i = 0; i < c * r; i++) {
      if (data[i * 4 + 3] < 32) {
        next[i] = EMPTY;
        continue;
      }
      next[i] = nearestBead({
        r: data[i * 4],
        g: data[i * 4 + 1],
        b: data[i * 4 + 2],
      });
    }
    return next;
  }

  function loadImage(src: string) {
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      setGrid(recognizeInto(img, cols, rows));
      fitToView(cols, rows);
    };
    img.src = src;
  }

  function onFile(file?: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  // 改变网格尺寸：同步重置网格，若已有图片则按新尺寸重新识别。
  function applyDims(next: Dims) {
    setDims(next);
    const c = next.bigCols * next.sub;
    const r = next.bigRows * next.sub;
    setGrid(imgEl ? recognizeInto(imgEl, c, r) : new Int16Array(c * r).fill(EMPTY));
  }

  // 粘贴截图
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          onFile(it.getAsFile());
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, rows]);

  // ---------- 绘制 ----------
  const cellPx = BASE_CELL * zoom;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 画板原点（居中 + 平移）
    const boardW = cols * cellPx;
    const boardH = rows * cellPx;
    const ox = (W - boardW) / 2 + offset.x;
    const oy = (H - boardH) / 2 + offset.y;

    // 棋盘背景
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(ox, oy, boardW, boardH);

    // 原图对照层
    if (showOriginal && imgEl) {
      const scale = Math.min(
        boardW / imgEl.width,
        boardH / imgEl.height
      );
      const dw = imgEl.width * scale;
      const dh = imgEl.height * scale;
      ctx.globalAlpha = 0.45;
      ctx.drawImage(
        imgEl,
        ox + (boardW - dw) / 2,
        oy + (boardH - dh) / 2,
        dw,
        dh
      );
      ctx.globalAlpha = 1;
    }

    // 画豆子
    const radius = cellPx / 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = grid[y * cols + x];
        if (idx === EMPTY) continue;
        if (hidden.has(idx)) continue;
        const dim =
          activeColor !== null && idx !== activeColor && !showOriginal;
        const cx = ox + x * cellPx + radius;
        const cy = oy + y * cellPx + radius;
        ctx.globalAlpha = dim ? 0.12 : 1;
        ctx.fillStyle = PERLER_PALETTE[idx].hex;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.46, 0, Math.PI * 2);
        ctx.fill();
        // 豆子中间的孔
        if (cellPx >= 8) {
          ctx.globalAlpha = dim ? 0.12 : 0.9;
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    // 网格线
    if (showGuide && cellPx >= 4) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= cols; x++) {
        ctx.moveTo(ox + x * cellPx, oy);
        ctx.lineTo(ox + x * cellPx, oy + boardH);
      }
      for (let y = 0; y <= rows; y++) {
        ctx.moveTo(ox, oy + y * cellPx);
        ctx.lineTo(ox + boardW, oy + y * cellPx);
      }
      ctx.stroke();

      // 大格粗线
      ctx.strokeStyle = "rgba(59,130,246,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= cols; x += dims.sub) {
        ctx.moveTo(ox + x * cellPx, oy);
        ctx.lineTo(ox + x * cellPx, oy + boardH);
      }
      for (let y = 0; y <= rows; y += dims.sub) {
        ctx.moveTo(ox, oy + y * cellPx);
        ctx.lineTo(ox + boardW, oy + y * cellPx);
      }
      ctx.stroke();
    }
  }, [
    cols,
    rows,
    cellPx,
    offset,
    grid,
    hidden,
    activeColor,
    showOriginal,
    showGuide,
    imgEl,
    dims.sub,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  // ---------- 指针交互：平移 / 擦除 / 双指缩放 ----------
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const dragged = useRef(false);

  const eventToCell = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const boardW = cols * cellPx;
    const boardH = rows * cellPx;
    const ox = (W - boardW) / 2 + offset.x;
    const oy = (H - boardH) / 2 + offset.y;
    const x = Math.floor((clientX - rect.left - ox) / cellPx);
    const y = Math.floor((clientY - rect.top - oy) / cellPx);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
    return { x, y };
  };

  const eraseAt = (clientX: number, clientY: number) => {
    const cell = eventToCell(clientX, clientY);
    if (!cell) return;
    setGrid((g) => {
      const i = cell.y * cols + cell.x;
      if (g[i] === EMPTY) return g;
      const n = Int16Array.from(g);
      n[i] = EMPTY;
      return n;
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
      };
    } else if (mode === "erase") {
      eraseAt(e.clientX, e.clientY);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const z = clamp(
        (dist / pinch.current.dist) * pinch.current.zoom,
        0.2,
        12
      );
      setZoom(z);
      return;
    }

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragged.current = true;

    if (mode === "erase") {
      if (dragged.current) eraseAt(e.clientX, e.clientY);
    } else {
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) => clamp(z * (e.deltaY < 0 ? 1.12 : 0.89), 0.2, 12));
  };

  // ---------- 颜色统计 ----------
  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (let i = 0; i < grid.length; i++) {
      const v = grid[i];
      if (v === EMPTY) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [grid]);

  const totalBeads = useMemo(
    () => counts.reduce((s, [, n]) => s + n, 0),
    [counts]
  );

  const toggleHidden = (idx: number) => {
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(idx)) n.delete(idx);
      else n.add(idx);
      return n;
    });
  };

  // ---------- 导出 PNG 图纸 ----------
  const exportPng = () => {
    const c = document.createElement("canvas");
    const px = 18;
    c.width = cols * px;
    c.height = rows * px;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = grid[y * cols + x];
        if (idx === EMPTY || hidden.has(idx)) continue;
        ctx.fillStyle = PERLER_PALETTE[idx].hex;
        ctx.beginPath();
        ctx.arc(x * px + px / 2, y * px + px / 2, px * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * px, 0);
      ctx.lineTo(x * px, c.height);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * px);
      ctx.lineTo(c.width, y * px);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= cols; x += dims.sub) {
      ctx.beginPath();
      ctx.moveTo(x * px, 0);
      ctx.lineTo(x * px, c.height);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y += dims.sub) {
      ctx.beginPath();
      ctx.moveTo(0, y * px);
      ctx.lineTo(c.width, y * px);
      ctx.stroke();
    }
    const a = document.createElement("a");
    a.download = `拼豆图纸_${cols}x${rows}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };

  const clearAll = () => {
    setGrid(new Int16Array(cols * rows).fill(EMPTY));
    setImgEl(null);
    setActiveColor(null);
    setHidden(new Set());
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      {/* 画布区 */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => fileRef.current?.click()} className={btn}>
            📁 上传图片
          </button>
          <button onClick={() => camRef.current?.click()} className={btn}>
            📷 拍照
          </button>
          <button
            onClick={() => setMode(mode === "erase" ? "pan" : "erase")}
            className={mode === "erase" ? btnActive : btn}
          >
            🧽 {mode === "erase" ? "擦除中" : "擦除"}
          </button>
          <button
            onClick={() => setShowOriginal((v) => !v)}
            className={showOriginal ? btnActive : btn}
            disabled={!imgEl}
          >
            🔍 对照原图
          </button>
          <button
            onClick={() => setShowGuide((v) => !v)}
            className={showGuide ? btnActive : btn}
          >
            ▦ 网格
          </button>
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setZoom((z) => clamp(z * 0.83, 0.2, 12))} className={btnIcon}>
              −
            </button>
            <span className="text-xs w-12 text-center tabular-nums text-neutral-400">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom((z) => clamp(z * 1.2, 0.2, 12))} className={btnIcon}>
              +
            </button>
            <button onClick={() => fitToView(cols, rows)} className={btnIcon} title="适配">
              ⤢
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        <div
          ref={wrapRef}
          className="relative rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden touch-none select-none"
          style={{ height: "min(70vh, 640px)" }}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas
            ref={canvasRef}
            className={mode === "erase" ? "cursor-crosshair" : "cursor-grab"}
          />
          {!imgEl && totalBeads === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2 text-neutral-500 pointer-events-none px-6">
              <div className="text-5xl">🧩</div>
              <p className="text-sm">
                上传 / 拍照 / 粘贴截图 (Ctrl+V)，自动识别成拼豆图
              </p>
              <p className="text-xs text-neutral-600">
                当前画板 {cols}×{rows} 颗（{dims.bigCols}×{dims.bigRows} 大格 · 每格 {dims.sub}×{dims.sub}）
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          手势：单指拖动平移 · 双指缩放 · 滚轮缩放 · 擦除模式下点/划删除豆子
        </p>
      </div>

      {/* 侧边面板 */}
      <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
        {/* 网格设置 */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-neutral-200">网格设置</h3>
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              label="横向大格"
              value={dims.bigCols}
              min={1}
              max={40}
              onChange={(v) => applyDims({ ...dims, bigCols: v })}
            />
            <NumberField
              label="纵向大格"
              value={dims.bigRows}
              min={1}
              max={40}
              onChange={(v) => applyDims({ ...dims, bigRows: v })}
            />
            <NumberField
              label="小格/格"
              value={dims.sub}
              min={1}
              max={20}
              onChange={(v) => applyDims({ ...dims, sub: v })}
            />
          </div>
          <p className="text-xs text-neutral-500">
            共 {cols}×{rows} = {(cols * rows).toLocaleString()} 颗
          </p>
          <div className="flex gap-2">
            <button onClick={exportPng} className={`${btn} flex-1`} disabled={totalBeads === 0}>
              ⬇ 导出图纸
            </button>
            <button onClick={clearAll} className={`${btn} flex-1`}>
              🗑 清空
            </button>
          </div>
        </div>

        {/* 颜色清单 */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-200">
              用色清单
            </h3>
            <span className="text-xs text-neutral-500">
              {counts.length} 色 / {totalBeads} 颗
            </span>
          </div>
          {activeColor !== null && (
            <button
              onClick={() => setActiveColor(null)}
              className="text-xs text-blue-400 self-start"
            >
              ← 取消高亮，显示全部
            </button>
          )}
          <div className="flex flex-col gap-1 overflow-auto max-h-[44vh] pr-1">
            {counts.length === 0 && (
              <p className="text-xs text-neutral-600">识别后这里会列出每种颜色</p>
            )}
            {counts.map(([idx, n]) => {
              const c = PERLER_PALETTE[idx];
              const isHidden = hidden.has(idx);
              const isActive = activeColor === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                    isActive ? "bg-blue-500/20" : "hover:bg-neutral-900"
                  } ${isHidden ? "opacity-40" : ""}`}
                  onClick={() =>
                    setActiveColor(isActive ? null : idx)
                  }
                >
                  <span
                    className="w-5 h-5 rounded-full border border-black/30 shrink-0"
                    style={{ background: c.hex }}
                  />
                  <div className="flex flex-col leading-tight min-w-0 flex-1">
                    <span className="text-xs text-neutral-200 truncate">
                      {c.name}
                    </span>
                    <span className="text-[10px] text-neutral-500">{c.code}</span>
                  </div>
                  <span className="text-xs tabular-nums text-neutral-400">
                    {n}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHidden(idx);
                    }}
                    className="text-xs px-1.5 py-0.5 rounded hover:bg-neutral-800 text-neutral-400"
                    title={isHidden ? "显示" : "隐藏"}
                  >
                    {isHidden ? "👁‍🗨" : "👁"}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-neutral-500">
            点击颜色 → 高亮该色、淡化其他；👁 → 隐藏该色减小干扰。
          </p>
        </div>
      </div>
    </div>
  );
}

const BASE_CELL = 14;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

const btn =
  "px-3 py-1.5 rounded-lg text-sm bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
const btnActive =
  "px-3 py-1.5 rounded-lg text-sm bg-blue-600 border border-blue-500 text-white transition-colors";
const btnIcon =
  "w-8 h-8 rounded-lg text-sm bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-800 transition-colors flex items-center justify-center";

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-neutral-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(clamp(parseInt(e.target.value) || min, min, max))
        }
        className="w-full px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 focus:outline-none focus:border-blue-500"
      />
    </label>
  );
}
