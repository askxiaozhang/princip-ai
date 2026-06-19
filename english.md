<div align="center">

**[中文](README.md)** | **[English](english.md)**

</div>

# PrincipAI

> **Learn from first principles, not the first page.**
>
> A proactive learning engine — before watching videos or reading books, AI generates a "Learning Orientation Package" so you can learn actively with questions, not passively receive information.

---

## Why PrincipAI?

95% of MOOC learners fail to complete their courses. Even those who "finish watching" still cannot truly apply what they've learned.

Cognitive science calls this the **Fluency Illusion**: when passively watching videos, the brain creates the illusion of "I understand," but deep comprehension and lasting memory are never formed.

**PrincipAI's philosophy:** Before learning, anchor your cognitive framework with first-principles questions. Watch content with questions in mind, turning "passive information reception" into "active answer-seeking."

## Core Features

Users input video links, and AI generates a **Learning Orientation Package**:

| Module | Description |
|---|---|
| 🧩 **Structural Logic Analysis** | Why did the author present topics in this order? What are the causal relationships between chapters? |
| ❓ **First-Principles Pre-Questions** | 2-3 essential questions per episode/chapter that you must be able to answer after studying |
| 🎯 **Learning Outcome Preview** | What will you be able to do after this episode that you couldn't before? |
| ⚠️ **Common Misconception Warnings** | How do most people misunderstand this topic? Proactive avoidance |
| 🗺️ **Interactive Mind Map** | Visualize the knowledge structure with clickable, collapsible nodes |
| ✏️ **Quiz Generation** | AI-generated quiz to verify true understanding |

## Quick Start

### Installation

```bash
git clone https://github.com/askxiaozhang/princip-ai.git
cd princip-ai
npm install
```

### Configure API Key (Optional — enables dynamic generation)

Create a `.env.local` file:

```bash
# Option 1: DashScope (recommended for China users)
# Get API Key at https://coding.dashscope.aliyuncs.com/apps/anthropic
API_KEY=sk-your-dashscope-key
API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
API_MODEL=qwen-plus   # or claude-3-5-sonnet-20241022

# Option 2: OpenAI
API_KEY=sk-your-openai-key
API_MODEL=gpt-4o

# Option 3: Backward-compatible (old config still works)
OPENAI_API_KEY=sk-your-key-here
```

> 💡 **No API Key?** The app includes built-in demo data for 3Blue1Brown **Linear Algebra** and **Calculus** series — try it right away!

### Running

```bash
npm run dev
```

### Usage

1. Open `http://localhost:3000`
2. Enter a video link (YouTube or Bilibili)
3. Get your Learning Orientation Package
4. Explore the mind map to see knowledge structure
5. Watch the video with guiding questions, then take the quiz

## Browser Extension (Phase 2)

A Chrome/Edge extension (Manifest V3) is included in `browser-extension/`.

### Install (Developer Mode)

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `browser-extension/` directory

### What It Does

- Detects YouTube and Bilibili video pages automatically
- Injects a "PrincipAI Analyze" button next to the video title
- On click: calls your local PrincipAI server and displays the learning package in a sidebar
- Popup settings page to configure the server URL

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | Next.js 16 + TailwindCSS v4 |
| Backend | Next.js API Routes (Node.js) |
| YouTube Transcript | youtubei.js + direct HTTP API |
| Bilibili Transcript | Bilibili Subtitle API |
| LLM | OpenAI GPT-4o / DashScope / any OpenAI-compatible API |
| Browser Extension | Chrome Manifest V3 |
| Deployment | Vercel |

## Project Structure

```
princip-ai/
├── README.md
├── english.md
├── browser-extension/         # Chrome MV3 Extension
│   ├── manifest.json
│   ├── content.js             # Video page injection script
│   ├── content.css
│   ├── background.js          # Service Worker
│   ├── popup.html             # Extension popup UI
│   └── popup.js
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate/      # Learning package generation API
│   │   │   ├── transcript/    # Transcript extraction API
│   │   │   └── quiz/          # Quiz generation API
│   │   └── page.tsx           # Main page (Guide + Mind Map + Quiz tabs)
│   ├── components/
│   │   ├── URLInput.tsx       # URL input (YouTube + Bilibili)
│   │   ├── MindMap.tsx        # Interactive mind map
│   │   ├── QuizView.tsx       # Quiz modal
│   │   └── ...
│   └── lib/
│       ├── youtube.ts         # YouTube URL + series detection
│       ├── bilibili.ts        # Bilibili URL + subtitle extraction
│       ├── analysis.ts        # LLM (DashScope/OpenAI compatible)
│       └── generation.ts      # Package generation + demo data
└── package.json
```

## Roadmap

- [x] **Phase 0** — Feasibility Research & Competitive Analysis ✅
- [x] **Phase 1** — MVP: 3Blue1Brown Linear Algebra ✅
- [x] **Phase 2** — Content Expansion & Browser Extension 🚀
  - [x] Flexible API: DashScope / OpenAI / any OpenAI-compatible endpoint
  - [x] Bilibili subtitle extraction via Bilibili Subtitle API
  - [x] More preset courses: 3Blue1Brown Calculus series (11 episodes)
  - [x] Interactive mind map with collapsible knowledge nodes
  - [x] AI quiz generation with instant feedback
  - [x] Browser extension: YouTube/Bilibili button injection + sidebar
- [ ] **Phase 3** — Platform (any video + personalization)
- [ ] **Phase 4** — Full browser extension (smart pause, post-watch quiz)
- [ ] **Phase 5** — Community & Ecosystem

## Contributing

Contributions welcome:

- 💡 Product direction feedback
- 🧪 Beta testing (especially STEM learners interested in 3Blue1Brown)
- 🛠️ Technical contributions (frontend / backend / prompts / extension)
- 📝 Content review (quality of first-principles questions)

## License

[MIT License](LICENSE)

---

<p align="center">
  <strong>Building a first-principles library of human knowledge, making deep learning methodical.</strong>
</p>
