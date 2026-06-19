// PrincipAI Content Script
// Detects YouTube/Bilibili video pages and injects an analysis button

(function () {
  "use strict";

  let injected = false;
  let panel = null;

  function getCurrentVideoURL() {
    return window.location.href;
  }

  function isYouTubeVideoPage() {
    return (
      window.location.hostname.includes("youtube.com") &&
      window.location.pathname === "/watch"
    );
  }

  function isBilibiliVideoPage() {
    return (
      window.location.hostname.includes("bilibili.com") &&
      window.location.pathname.startsWith("/video/")
    );
  }

  function createButton() {
    const btn = document.createElement("button");
    btn.id = "principai-btn";
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      PrincipAI 分析
    `;
    btn.addEventListener("click", handleAnalyzeClick);
    return btn;
  }

  function createPanel() {
    const p = document.createElement("div");
    p.id = "principai-panel";
    p.innerHTML = `
      <div id="principai-panel-header">
        <h2>🧠 PrincipAI 学习导向包</h2>
        <button id="principai-panel-close">✕</button>
      </div>
      <div id="principai-panel-content">
        <p style="color:#71717a;font-size:13px;">点击「PrincipAI 分析」按钮开始生成学习导向包。</p>
      </div>
    `;
    p.querySelector("#principai-panel-close").addEventListener("click", () => {
      p.classList.remove("open");
    });
    document.body.appendChild(p);
    return p;
  }

  function showLoading() {
    const content = document.getElementById("principai-panel-content");
    if (content) {
      content.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:16px;">
          <div style="width:40px;height:40px;border:3px solid #27272a;border-top-color:#3b82f6;border-radius:50%;animation:principai-spin 0.8s linear infinite;"></div>
          <p style="color:#71717a;font-size:13px;text-align:center;">正在提取字幕并分析…<br>约需 30-60 秒</p>
        </div>
      `;
    }
  }

  function showError(msg) {
    const content = document.getElementById("principai-panel-content");
    if (content) {
      content.innerHTML = `<div class="principai-error">${msg}</div>`;
    }
  }

  function renderPackage(pkg) {
    const content = document.getElementById("principai-panel-content");
    if (!content || !pkg) return;

    const ep = pkg.series?.episodes?.[0];
    if (!ep) {
      content.innerHTML = `<p style="color:#71717a;font-size:13px;">无法解析学习导向包。</p>`;
      return;
    }

    const questionsHTML = (ep.questions || [])
      .map(
        (q) => `
      <div class="principai-question">
        <p>${q.question}</p>
        ${q.why_it_matters ? `<p class="hint">💡 ${q.why_it_matters}</p>` : ""}
      </div>
    `
      )
      .join("");

    const benefitsHTML = (ep.cognitive_benefits || [])
      .map((b) => `<div class="principai-benefit">${b}</div>`)
      .join("");

    const misconceptionsHTML = (ep.misconceptions || [])
      .map(
        (m) => `<div style="font-size:13px;color:#a1a1aa;padding:4px 0;border-left:2px solid #ef4444;padding-left:10px;margin-bottom:6px;">${m}</div>`
      )
      .join("");

    content.innerHTML = `
      <div style="margin-bottom:12px;">
        <h3 style="font-size:15px;font-weight:700;color:white;margin:0 0 4px 0;">${ep.title}</h3>
        <p style="font-size:12px;color:#71717a;margin:0;">${pkg.series.series_title}</p>
      </div>

      ${
        questionsHTML
          ? `
        <div class="principai-section">
          <div class="principai-section-title">❓ 第一性原理前置问题</div>
          ${questionsHTML}
        </div>
      `
          : ""
      }

      ${
        benefitsHTML
          ? `
        <div class="principai-section">
          <div class="principai-section-title">🎯 认知收益预告</div>
          ${benefitsHTML}
        </div>
      `
          : ""
      }

      ${
        misconceptionsHTML
          ? `
        <div class="principai-section">
          <div class="principai-section-title">⚠️ 常见误区预警</div>
          ${misconceptionsHTML}
        </div>
      `
          : ""
      }

      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #27272a;">
        <a href="${ep.url}" target="_blank" style="font-size:12px;color:#3b82f6;text-decoration:none;">
          → 在 PrincipAI 网站查看完整分析
        </a>
      </div>
    `;
  }

  async function handleAnalyzeClick() {
    const btn = document.getElementById("principai-btn");
    if (!btn) return;

    // Open panel
    if (!panel) {
      panel = createPanel();
    }
    panel.classList.add("open");
    showLoading();

    btn.classList.add("loading");
    btn.innerHTML = `<span class="spinner"></span> 分析中…`;
    btn.disabled = true;

    try {
      // Get server URL from storage
      const result = await chrome.storage.sync.get(["serverUrl"]);
      const serverUrl = result.serverUrl || "http://localhost:3000";

      const url = getCurrentVideoURL();
      const res = await fetch(`${serverUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "生成失败");
      }

      renderPackage(data.package);
    } catch (e) {
      showError(
        e.message?.includes("Failed to fetch")
          ? "无法连接到 PrincipAI 服务。请确认本地服务已启动（npm run dev）。"
          : e.message || "生成失败，请重试。"
      );
    } finally {
      btn.classList.remove("loading");
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        PrincipAI 分析
      `;
      btn.disabled = false;
    }
  }

  function injectButton() {
    if (injected) return;
    if (!isYouTubeVideoPage() && !isBilibiliVideoPage()) return;

    let target = null;

    if (isYouTubeVideoPage()) {
      // YouTube: inject below video title
      target =
        document.querySelector("#above-the-fold #title") ||
        document.querySelector("h1.ytd-watch-metadata") ||
        document.querySelector("#info-contents");
    } else if (isBilibiliVideoPage()) {
      // Bilibili: inject below video title
      target =
        document.querySelector(".video-title") ||
        document.querySelector(".tit") ||
        document.querySelector("#viewbox_report");
    }

    if (!target) return;

    const existing = document.getElementById("principai-btn");
    if (existing) return;

    const btn = createButton();
    target.parentNode?.insertBefore(btn, target.nextSibling) ||
      target.appendChild(btn);
    injected = true;
  }

  // Watch for navigation changes (YouTube is a SPA)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      injected = false;
      setTimeout(injectButton, 1500);
    }
    if (!injected) {
      injectButton();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Initial injection
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(injectButton, 1000);
    });
  } else {
    setTimeout(injectButton, 1000);
  }
})();
