// PrincipAI Popup Script

async function checkServer(url) {
  try {
    const res = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://www.youtube.com/watch?v=test" }),
      signal: AbortSignal.timeout(3000),
    });
    // Any response (even error JSON) means the server is reachable
    return res.status < 500 || res.status === 400;
  } catch {
    return false;
  }
}

async function init() {
  const urlInput = document.getElementById("server-url");
  const saveBtn = document.getElementById("save-btn");
  const savedMsg = document.getElementById("saved-msg");
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("status-text");

  // Load saved server URL
  const result = await chrome.storage.sync.get(["serverUrl"]);
  const savedUrl = result.serverUrl || "http://localhost:3000";
  urlInput.value = savedUrl;

  // Check server status
  const ok = await checkServer(savedUrl);
  statusEl.className = `status ${ok ? "ok" : "err"}`;
  statusText.textContent = ok
    ? `服务在线：${savedUrl}`
    : `服务离线 — 请运行 npm run dev`;

  // Save button
  saveBtn.addEventListener("click", async () => {
    const newUrl = urlInput.value.trim().replace(/\/$/, "");
    if (!newUrl) return;

    await chrome.storage.sync.set({ serverUrl: newUrl });

    // Recheck
    const isOk = await checkServer(newUrl);
    statusEl.className = `status ${isOk ? "ok" : "err"}`;
    statusText.textContent = isOk
      ? `服务在线：${newUrl}`
      : `服务离线 — 请运行 npm run dev`;

    savedMsg.textContent = "✓ 已保存";
    setTimeout(() => {
      savedMsg.textContent = "";
    }, 2000);
  });
}

document.addEventListener("DOMContentLoaded", init);
