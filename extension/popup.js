const BACKEND_URL = 'https://price-compare-backend.onrender.com';

const statusEl = document.getElementById('status');
const platformLabel = document.getElementById('platformLabel');
const captureToggle = document.getElementById('captureToggle');
const scanBtn = document.getElementById('scanBtn');
const scanList = document.getElementById('scanList');
const sendSelectedRow = document.getElementById('sendSelectedRow');
const sendSelectedBtn = document.getElementById('sendSelectedBtn');
const openDashboardBtn = document.getElementById('openDashboardBtn');

let activeTabId = null;
let lastCandidates = [];

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function platformFromUrl(url) {
  if (!url) return 'Unsupported page';
  if (url.includes('swiggy.com')) return 'Swiggy detected';
  if (url.includes('zomato.com')) return 'Zomato detected';
  if (url.includes('zeptonow.com')) return 'Zepto detected';
  return 'Open Swiggy, Zomato, or Zepto to capture prices';
}

async function refreshHealth() {
  chrome.runtime.sendMessage({ type: 'HEALTH' }, (res) => {
    if (res && res.ok) {
      statusEl.textContent = `connected (${res.data.storedEntries} stored)`;
      statusEl.className = 'ok';
    } else {
      statusEl.textContent = 'not reachable — run the backend';
      statusEl.className = 'err';
    }
  });
}

async function refreshCaptureState() {
  const tab = await getActiveTab();
  activeTabId = tab?.id ?? null;
  platformLabel.textContent = platformFromUrl(tab?.url);

  if (!isSupportedPage(tab?.url)) {
    captureToggle.textContent = 'Not on a supported page';
    captureToggle.disabled = true;
    scanBtn.disabled = true;
    return;
  }
  captureToggle.disabled = false;
  scanBtn.disabled = false;

  chrome.tabs.sendMessage(activeTabId, { type: 'GET_CAPTURE_MODE' }, (res) => {
    if (chrome.runtime.lastError) {
      captureToggle.textContent = 'Reload the page to enable';
      captureToggle.disabled = true;
      return;
    }
    setToggleUI(res?.enabled ?? false);
  });
}

function isSupportedPage(url) {
  return !!url && (url.includes('swiggy.com') || url.includes('zomato.com') || url.includes('zeptonow.com'));
}

function setToggleUI(enabled) {
  captureToggle.textContent = enabled ? '🎯 Capture mode: ON' : 'Capture mode: OFF';
  captureToggle.classList.toggle('on', enabled);
}

captureToggle.addEventListener('click', () => {
  if (!activeTabId) return;
  chrome.tabs.sendMessage(activeTabId, { type: 'GET_CAPTURE_MODE' }, (res) => {
    const nextState = !(res?.enabled ?? false);
    chrome.tabs.sendMessage(activeTabId, { type: 'SET_CAPTURE_MODE', enabled: nextState }, () => {
      setToggleUI(nextState);
      if (nextState) window.close(); // let them go click on the page immediately
    });
  });
});

scanBtn.addEventListener('click', () => {
  if (!activeTabId) return;
  scanList.innerHTML = '<p class="muted">Scanning…</p>';
  chrome.tabs.sendMessage(activeTabId, { type: 'SCAN' }, (res) => {
    if (chrome.runtime.lastError || !res) {
      scanList.innerHTML = '<p class="muted">Could not scan this page. Try reloading it.</p>';
      return;
    }
    lastCandidates = res.candidates || [];
    renderScanList(lastCandidates);
  });
});

function renderScanList(candidates) {
  if (candidates.length === 0) {
    scanList.innerHTML = '<p class="muted">No obvious ₹ prices found. Try click-to-capture instead.</p>';
    sendSelectedRow.style.display = 'none';
    return;
  }
  scanList.innerHTML = '';
  candidates.forEach((c, i) => {
    const row = document.createElement('label');
    row.className = 'scan-item';
    row.innerHTML = `
      <input type="checkbox" data-idx="${i}" checked>
      <span class="name">${escapeHtml(c.name)}</span>
      <span class="price">₹${c.price}</span>
    `;
    scanList.appendChild(row);
  });
  sendSelectedRow.style.display = 'flex';
}

sendSelectedBtn.addEventListener('click', () => {
  const checked = Array.from(scanList.querySelectorAll('input[type="checkbox"]:checked'))
    .map((cb) => lastCandidates[Number(cb.dataset.idx)]);

  if (checked.length === 0) return;

  const items = checked.map((c) => ({
    platform: c.platform,
    itemName: c.name,
    price: c.price,
    sourceUrl: null,
  }));

  chrome.runtime.sendMessage({ type: 'INGEST', items }, (res) => {
    if (res && res.ok) {
      scanList.innerHTML = `<p class="muted">Sent ${items.length} item(s) ✓</p>`;
      sendSelectedRow.style.display = 'none';
      refreshHealth();
    } else {
      scanList.innerHTML = '<p class="muted">Could not reach backend.</p>';
    }
  });
});

openDashboardBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: BACKEND_URL });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

refreshHealth();
refreshCaptureState();
