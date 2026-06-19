# PrincipAI

> **Learn from first principles, not the first page.**
>
> 前置式主动学习引擎 — 在观看视频/阅读书籍之前，AI 先生成「学习导向包」，让你带着问题主动学习，而不是被动接收。

---

## 为什么需要 PrincipAI？

95% 的 MOOC 学习者无法完成课程。即使"看完"了，大多数人仍然无法真正应用所学。

认知科学将此称为 **流畅性幻觉（Fluency Illusion）**：被动观看视频时，大脑产生"我懂了"的错觉，但实际并未形成深层理解和持久记忆。

**PrincipAI 的理念：** 在学习之前，先用第一性原理问题锚定你的认知框架。带着问题去看内容，把"被动接收信息"变成"主动寻找答案"。

## 核心功能

用户输入视频/书籍链接，AI 生成 **学习导向包**：

| 模块 | 说明 |
|---|---|
| 🧩 **编排逻辑拆解** | 作者为什么按这个顺序讲？章节之间的因果关系是什么？ |
| ❓ **第一性原理前置问题** | 每集/每章 2-3 个学完必须能回答的本质问题 |
| 🎯 **认知收益预告** | 学完这一集，你能做什么之前做不到的事？ |
| ⚠️ **常见误区预警** | 大部分人学到这里会怎么误解？提前规避 |

### 示例：3Blue1Brown 线性代数

```
向量篇 — 前置问题：
"为什么向量可以同时表示箭头、坐标、数据点？
 这三种表述的本质统一在哪里？"

矩阵乘法篇 — 前置问题：
"为什么矩阵乘法要按「行×列」的规则定义？
 从几何变换的角度，这个规则是必然的吗？"

特征向量篇 — 前置问题：
"为什么几乎所有理工科领域都在用特征值/特征向量？
 它到底在找一个变换的什么核心不变属性？"
```

## 快速开始

### 安装

```bash
git clone https://github.com/askxiaozhang/princip-ai.git
cd princip-ai
npm install
```

### 配置 API Key（可选）

创建 `.env.local` 文件：

```bash
# OpenAI API Key (用于动态生成学习导向包)
OPENAI_API_KEY=sk-your-key-here
```

> 💡 **没有 API Key？** 应用内置了 3Blue1Brown 线性代数系列的 Demo 数据，可以直接体验！

### 运行

```bash
npm run dev
```

### 使用

1. 打开 `http://localhost:3000`
2. 输入视频链接（如 3Blue1Brown 线代系列）
3. 获取学习导向包
4. 带着问题去看视频

## 技术架构

```
用户输入（YouTube/Bilibili 链接）
        │
        ▼
  ┌─────────────┐
  │  字幕提取    │  youtube-transcript-api / youtubei.js
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  结构分析    │  OpenAI GPT-4o / Claude API
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  导向包生成  │  问题集 + 逻辑图 + 收益 + 误区
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  个性化适配  │  根据用户学习目标定制（规划中）
  └─────────────┘
```

## 技术栈

| 组件 | 技术选型 |
|---|---|
| 前端 | Next.js 16 + TailwindCSS v4 |
| 后端 | Next.js API Routes (Node.js) |
| 字幕提取 | youtubei.js |
| LLM | OpenAI GPT-4o (支持 Claude 扩展) |
| 部署 | Vercel |

## 项目结构

```
princip-ai/
├── README.md
├── feasibility-report.md    # 可行性调研报告
├── core.md                  # 产品核心思路
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/
│   │   │   ├── generate/    # 学习导向包生成 API
│   │   │   └── transcript/  # 字幕提取 API
│   │   ├── layout.tsx       # 根布局
│   │   ├── page.tsx         # 主页
│   │   └── globals.css      # 全局样式
│   ├── components/          # React 组件
│   │   ├── URLInput.tsx     # URL 输入框
│   │   ├── LearningPackageView.tsx  # 学习导向包展示
│   │   ├── EpisodeCard.tsx  # 单集卡片
│   │   ├── NarrativeLogic.tsx       # 编排逻辑展示
│   │   └── ChapterDependencies.tsx  # 章节依赖展示
│   └── lib/                 # 核心逻辑
│       ├── types.ts         # 类型定义
│       ├── youtube.ts       # YouTube URL 解析
│       ├── transcript.ts    # 字幕提取
│       ├── prompts.ts       # LLM 提示词
│       ├── analysis.ts      # LLM 分析
│       └── generation.ts    # 导向包生成（含 Demo 数据）
└── package.json
```

## 路线图

- [x] **Phase 0** — 可行性调研与竞品分析 ✅
- [x] **Phase 1** — MVP：3Blue1Brown 线代专属版 ✅
  - [x] 项目脚手架搭建（Next.js 16 + TypeScript + TailwindCSS v4）
  - [x] YouTube 字幕提取（双通道 fallback：youtubei.js + 直接 HTTP API）
  - [x] LLM 分析管线（OpenAI GPT-4o，JSON 结构化输出）
  - [x] 3Blue1Brown 线性代数 Demo 数据（11 集全量学习导向包）
  - [x] 完整的 UI 组件（URL 输入、导向包展示、可展开单集卡片）
  - [x] 响应式暗色主题
- [ ] **Phase 2** — 扩展内容（微积分、CS 经典课程）
  - [ ] 动态生成学习导向包（需要 API Key）
  - [ ] 支持 Bilibili 字幕提取
  - [ ] 添加更多预设课程
- [ ] **Phase 3** — 平台化（支持任意视频 + 个性化）
  - [ ] 用户账户和进度追踪
  - [ ] 个性化学习目标定制
  - [ ] 学习反刍机制（艾宾浩斯遗忘曲线）
- [ ] **Phase 4** — 社区与生态（浏览器插件、创作者入驻）
  - [ ] 浏览器插件（课中伴随思考锚点）
  - [ ] 费曼对话模拟器
  - [ ] 知识推导关系网络

## 参与贡献

本项目目前处于 MVP 阶段，欢迎以下形式的贡献：

- 💡 对产品方向的反馈和建议
- 🧪 MVP 测试用户（尤其是对 3Blue1Brown 内容感兴趣的理工科学习者）
- 🛠️ 技术开发（前端/后端/Prompt 工程）
- 📝 内容审核（确保生成的第一性原理问题质量）

## 许可

[MIT License](LICENSE)

---

<p align="center">
  <strong>共建人类知识的第一原理库，让深度学习有章可循。</strong>
</p>
