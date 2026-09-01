// Set this to your deployed Render URL before loading the extension.
const BACKEND_URL = 'https://YOUR-RENDER-SERVICE.onrender.com';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'INGEST') {
    fetch(`${BACKEND_URL}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.items),
    })
      .then((r) => r.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the message channel open for the async response
  }

  if (msg.type === 'HEALTH') {
    fetch(`${BACKEND_URL}/api/health`)
      .then((r) => r.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Price Race extension installed. Backend expected at', BACKEND_URL);
});
