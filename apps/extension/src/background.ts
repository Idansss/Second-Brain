// Background service worker — handles context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-second-brain",
    title: "Save to Second Brain",
    contexts: ["selection", "link", "page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { apiUrl = "http://localhost:3000" } = await chrome.storage.local.get("apiUrl");

  const body = info.selectionText
    ? { content: `${info.selectionText}\n\nSource: ${tab?.url}`, type: "highlight" }
    : { url: info.linkUrl ?? tab?.url, content: "", type: "link" };

  try {
    await fetch(`${apiUrl}/api/trpc/notes.create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ json: body }),
    });
  } catch (e) {
    console.error("Second Brain: failed to save", e);
  }
});
