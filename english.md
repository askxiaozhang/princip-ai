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

Users input video/book links, and AI generates a **Learning Orientation Package**:

| Module | Description |
|---|---|
| 🧩 **Structural Logic Analysis** | Why did the author present topics in this order? What are the causal relationships between chapters? |
| ❓ **First-Principles Pre-Questions** | 2-3 essential questions per episode/chapter that you must be able to answer after studying |
| 🎯 **Learning Outcome Preview** | What will you be able to do after this episode that you couldn't before? |
| ⚠️ **Common Misconception Warnings** | How do most people misunderstand this topic? Proactive avoidance |

### Example: 3Blue1Brown Linear Algebra

```
Vectors — Pre-Questions:
"Why can vectors simultaneously represent arrows, coordinates, and data points?
 What unifies these three representations at their essence?"

Matrix Multiplication — Pre-Questions:
"Why is matrix multiplication defined by the 'row × column' rule?
 From the perspective of geometric transformations, is this rule inevitable?"

Eigenvectors — Pre-Questions:
"Why do nearly all STEM fields use eigenvalues/eigenvectors?
 What core invariant property of a transformation is it really finding?"
```

## Quick Start

### Installation

```bash
git clone https://github.com/askxiaozhang/princip-ai.git
cd princip-ai
npm install
```

### Configure API Key (Optional)

Create a `.env.local` file:

```bash
# OpenAI API Key (for dynamic Learning Orientation Package generation)
OPENAI_API_KEY=sk-your-key-here
```

> 💡 **No API Key?** The app includes built-in demo data for the 3Blue1Brown Linear Algebra series — you can try it right away!

### Running

```bash
npm run dev
```

### Usage

1. Open `http://localhost:3000`
2. Enter a video link (e.g., 3Blue1Brown Linear Algebra series)
3. Get your Learning Orientation Package
4. Watch the video with guiding questions

## Technical Architecture

```
User Input (YouTube/Bilibili links)
        │
        ▼
  ┌─────────────┐
  │ Transcript   │  youtube-transcript-api / youtubei.js
  │ Extraction   │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ Structure    │  OpenAI GPT-4o / Claude API
  │ Analysis     │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ Orientation  │  Question Set + Logic Map + Outcomes + Misconceptions
  │ Package Gen  │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ Personalized │  Adapted to user learning goals (planned)
  │ Adaptation   │
  └─────────────┘
```

## Future Vision: Browser Extension

We plan to launch a browser extension that extends the PrincipAI learning experience from "pre-watching preparation" to "in-watching accompaniment" and "post-watching reinforcement," creating a true **immersive active learning loop**.

### Core Capabilities

```
┌─────────────────────────────────────────────────────────────┐
│  🌐 Browser Extension                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ① One-Click Video Chapter Detection                        │
│     Automatically extract timestamps, titles, and subtitles │
│     from the current browser video                          │
│     Supports YouTube / Bilibili / Coursera / any platform   │
│                                                             │
│  ② AI One-Click Prelearning                                │
│     Based on extracted video structure, instantly generate  │
│     a Learning Orientation Package                          │
│     No page switching needed — start active learning in the │
│     current tab                                             │
│                                                             │
│  ③ Mind Map Generation                                     │
│     Generate interactive knowledge maps similar to XMind    │
│     Logical relationships between chapters, prerequisite    │
│     concepts, and core derivations at a glance              │
│                                                             │
│  ④ Smart Pause + Thinking Anchors                          │
│     Automatically pause video at key concepts, posing       │
│     guiding questions                                       │
│     "What are the premises of this conclusion? If we change │
│      X, does it still hold?"                                │
│     Force users to pause and think at critical nodes        │
│     instead of passively scrolling past                     │
│                                                             │
│  ⑤ Post-Watching Quiz                                      │
│     Generate targeted quizzes after watching the video      │
│     Covering core concepts, common mistakes, and extended   │
│     thinking for each episode                               │
│     Verify true deep understanding, not just "watched it"   │
│                                                             │
│  ⑥ Personalized Adaptation                                 │
│     Dynamically adjust question difficulty and pace based   │
│     on user's learning level                                │
│     Beginners: more foundational concept anchoring          │
│     Advanced: more extended derivation challenges           │
│     Continuously builds user profile — the more you use it, │
│     the better it knows you                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Learning Loop

```
Pre-Watching           During Watching           Post-Watching
  │                       │                          │
  ▼                       ▼                          ▼
┌──────────┐        ┌──────────┐            ┌──────────┐
│Prelearning│       │  Smart   │            │ Post-    │
│Orientation│ ───▶ │  Pause + │  ───▶     │ Watching │
│Package    │       │ Thinking │            │  Quiz    │
│Mind Map   │       │ Anchors  │            │Consolida-│
│           │       │Immersive │            │ tion     │
└──────────┘        └──────────┘            └──────────┘
     │                      │                       │
     └──────────────────────┴───────────────────────┘
                            │
                            ▼
                 True First-Principles Understanding
```

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | Next.js 16 + TailwindCSS v4 |
| Backend | Next.js API Routes (Node.js) |
| Transcript Extraction | youtubei.js |
| LLM | OpenAI GPT-4o (Claude support planned) |
| Deployment | Vercel |

## Project Structure

```
princip-ai/
├── README.md
├── feasibility-report.md    # Feasibility research report
├── core.md                  # Core product concepts
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/
│   │   │   ├── generate/    # Learning Orientation Package generation API
│   │   │   └── transcript/  # Transcript extraction API
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   ├── components/          # React components
│   │   ├── URLInput.tsx     # URL input field
│   │   ├── LearningPackageView.tsx  # Learning Orientation Package display
│   │   ├── EpisodeCard.tsx  # Individual episode card
│   │   ├── NarrativeLogic.tsx       # Narrative logic display
│   │   └── ChapterDependencies.tsx  # Chapter dependency display
│   └── lib/                 # Core logic
│       ├── types.ts         # Type definitions
│       ├── youtube.ts       # YouTube URL parsing
│       ├── transcript.ts    # Transcript extraction
│       ├── prompts.ts       # LLM prompts
│       ├── analysis.ts      # LLM analysis
│       └── generation.ts    # Orientation Package generation (incl. demo data)
└── package.json
```

## Roadmap

- [x] **Phase 0** — Feasibility Research & Competitive Analysis ✅
- [x] **Phase 1** — MVP: 3Blue1Brown Linear Algebra Dedicated Edition ✅
  - [x] Project scaffolding (Next.js 16 + TypeScript + TailwindCSS v4)
  - [x] YouTube transcript extraction (dual-channel fallback: youtubei.js + direct HTTP API)
  - [x] LLM analysis pipeline (OpenAI GPT-4o, JSON structured output)
  - [x] 3Blue1Brown Linear Algebra demo data (full Learning Orientation Package for 11 episodes)
  - [x] Complete UI components (URL input, Orientation Package display, expandable episode cards)
  - [x] Responsive dark theme
- [ ] **Phase 2** — Content Expansion (Calculus, CS Classic Courses)
  - [ ] Dynamic Learning Orientation Package generation (requires API Key)
  - [ ] Bilibili transcript extraction support
  - [ ] More preset courses
- [ ] **Phase 3** — Platform (Support for Any Video + Personalization)
  - [ ] User accounts and progress tracking
  - [ ] Personalized learning goal customization
  - [ ] Learning reinforcement mechanism (Ebbinghaus forgetting curve)
- [ ] **Phase 4** — Browser Extension: Immersive Active Learning Loop
  - [ ] One-click video chapter detection for current browser video (YouTube / Bilibili / Coursera, etc.)
  - [ ] AI one-click Prelearning for instant Learning Orientation Package generation
  - [ ] Interactive mind map generation (similar to XMind)
  - [ ] Smart Pause + Thinking Anchors: auto-pause at key concepts with guiding questions
  - [ ] Post-watching quiz: targeted tests after video viewing
  - [ ] Personalized adaptation: dynamically adjust question difficulty and pace based on user level
- [ ] **Phase 5** — Community & Ecosystem
  - [ ] Feynman Dialogue Simulator
  - [ ] Knowledge derivation relationship network
  - [ ] Creator onboarding (educators upload courses, auto-generate Orientation Packages)

## Contributing

This project is currently in the MVP stage. The following forms of contribution are welcome:

- 💡 Product direction feedback and suggestions
- 🧪 MVP test users (especially STEM learners interested in 3Blue1Brown content)
- 🛠️ Technical development (frontend / backend / prompt engineering)
- 📝 Content review (ensure quality of generated first-principles questions)

## License

[MIT License](LICENSE)

---

<p align="center">
  <strong>Building a first-principles library of human knowledge, making deep learning methodical.</strong>
</p>
