// PrincipAI Service Worker (Background)
// Handles extension lifecycle events

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set default server URL
    chrome.storage.sync.set({ serverUrl: "http://localhost:3000" });

    // Open welcome tab
    chrome.tabs.create({
      url: "https://github.com/askxiaozhang/princip-ai",
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SERVER_URL") {
    chrome.storage.sync.get(["serverUrl"], (result) => {
      sendResponse({ serverUrl: result.serverUrl || "http://localhost:3000" });
    });
    return true; // Keep channel open for async response
  }
});
