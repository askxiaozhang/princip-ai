import type { Metadata } from "next";
import PerlerSimulator from "@/components/PerlerSimulator";

export const metadata: Metadata = {
  title: "拼豆辅助模拟器",
  description:
    "上传 / 拍照 / 截图，自动识别成拼豆图。支持等比缩放、网格对齐、按色高亮或隐藏、擦除干扰，手机可用。",
};

export default function PerlerPage() {
  return (
    <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <header className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          🧩 拼豆辅助模拟器
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          上传 / 拍照 / 粘贴截图，一键识别成拼豆图；缩放对齐、按色高亮或隐藏，边看边拼。
        </p>
      </header>
      <PerlerSimulator />
    </main>
  );
}
