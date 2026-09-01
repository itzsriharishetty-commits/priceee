/**
 * Runs on swiggy.com / zomato.com / zeptonow.com pages.
 *
 * IMPORTANT: these sites are React/Vue apps that change their DOM structure
 * often, so there is no stable CSS selector list that will "just work"
 * forever. Instead of pretending otherwise, this script uses two honest
 * approaches:
 *
 *   1. Click-to-capture (reliable): turn on Capture mode, click any element
 *      near a dish/price on the page, and this script walks up the DOM
 *      looking for a ₹ amount and a plausible name near your click, then
 *      shows an editable mini-panel so you can fix anything it guessed
 *      wrong before sending it to the backend.
 *
 *   2. Auto-scan (convenience): scans the whole page for ₹-prefixed prices
 *      and best-guess names, so the popup can show a checklist you can
 *      bulk-send instead of clicking one by one. Expect some noise —
 *      that's why it's a checklist, not an auto-send.
 *
 * Nothing here talks to swiggy.com/zomato.com/zeptonow.com servers — it
 * only reads the DOM already rendered in your browser.
 */

(function () {
  const PLATFORM = detectPlatform();
  const PRICE_REGEX = /₹\s?([\d,]+(?:\.\d{1,2})?)/;
  let captureModeOn = false;
  let toggleBtn = null;
  let lastHovered = null;

  function detectPlatform() {
    const host = location.hostname;
    if (host.includes('swiggy')) return 'SWIGGY';
    if (host.includes('zomato')) return 'ZOMATO';
    if (host.includes('zepto')) return 'ZEPTO';
    return 'OTHER';
  }

  // ---------- Floating toggle button ----------

  function injectToggleButton() {
    if (document.getElementById('pr-toggle-btn')) return;
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'pr-toggle-btn';
    toggleBtn.type = 'button';
    updateToggleLabel();
    toggleBtn.addEventListener('click', () => setCaptureMode(!captureModeOn));
    document.documentElement.appendChild(toggleBtn);
  }

  function updateToggleLabel() {
    if (!toggleBtn) return;
    toggleBtn.textContent = captureModeOn ? '🎯 Capture: ON (click a dish)' : '🎯 Capture: OFF';
    toggleBtn.classList.toggle('pr-on', captureModeOn);
  }

  function setCaptureMode(on) {
    captureModeOn = on;
    document.body.classList.toggle('pr-capture-active', on);
    updateToggleLabel();
  }

  // ---------- Hover highlight + click capture ----------

  document.addEventListener('mouseover', (e) => {
    if (!captureModeOn) return;
    if (lastHovered) lastHovered.classList.remove('pr-hover-highlight');
    lastHovered = e.target;
    lastHovered.classList.add('pr-hover-highlight');
  }, true);

  document.addEventListener('click', (e) => {
    if (!captureModeOn) return;
    if (e.target.closest('#pr-toggle-btn, #pr-capture-panel')) return; // don't intercept our own UI
    e.preventDefault();
    e.stopPropagation();
    const guess = extractNearPrice(e.target);
    openCapturePanel(e.clientX, e.clientY, guess);
  }, true);

  /** Walk up from `el` looking for a ₹ price and a plausible dish name nearby. */
  function extractNearPrice(el) {
    let node = el;
    let priceText = null;
    let container = null;

    for (let depth = 0; depth < 6 && node; depth++) {
      const text = node.innerText || node.textContent || '';
      const match = text.match(PRICE_REGEX);
      if (match) {
        priceText = match[1].replace(/,/g, '');
        container = node;
        break;
      }
      node = node.parentElement;
    }

    if (!container) container = el.parentElement || el;

    const name = guessName(container, priceText);
    return {
      name: name || document.title.slice(0, 60),
      price: priceText ? parseFloat(priceText) : null,
    };
  }

  function guessName(container, priceDigits) {
    // Prefer headings or elements that look like a title/name.
    const candidates = container.querySelectorAll('h1,h2,h3,h4,[class*="name" i],[class*="title" i]');
    for (const c of candidates) {
      const t = clean(c.innerText);
      if (t && t.length >= 3 && t.length <= 80 && !t.includes('₹')) return t;
    }
    // Fall back: longest text node in the container that isn't the price itself.
    const text = clean(container.innerText || container.textContent || '');
    if (!text) return null;
    const withoutPrice = priceDigits ? text.replace(new RegExp('₹\\s?' + priceDigits), '') : text;
    const line = withoutPrice.split('\n').map(clean).filter(Boolean).sort((a, b) => b.length - a.length)[0];
    return line ? line.slice(0, 80) : null;
  }

  function clean(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  // ---------- Editable mini-panel ----------

  function openCapturePanel(x, y, guess) {
    closeCapturePanel();

    const panel = document.createElement('div');
    panel.id = 'pr-capture-panel';
    panel.style.left = Math.min(x, window.innerWidth - 280) + 'px';
    panel.style.top = Math.min(y, window.innerHeight - 260) + 'px';
    panel.innerHTML = `
      <label>Dish name</label>
      <input id="pr-f-name" type="text" value="${escapeAttr(guess.name || '')}">
      <label>Price (₹)</label>
      <input id="pr-f-price" type="number" step="0.01" value="${guess.price ?? ''}">
      <label>Delivery fee (₹, optional)</label>
      <input id="pr-f-fee" type="number" step="0.01" placeholder="0">
      <div class="pr-actions">
        <button class="pr-cancel" type="button">Cancel</button>
        <button class="pr-send" type="button">Send to Price Race</button>
      </div>
    `;
    document.documentElement.appendChild(panel);

    panel.querySelector('.pr-cancel').addEventListener('click', closeCapturePanel);
    panel.querySelector('.pr-send').addEventListener('click', () => {
      const name = document.getElementById('pr-f-name').value.trim();
      const price = parseFloat(document.getElementById('pr-f-price').value);
      const fee = parseFloat(document.getElementById('pr-f-fee').value);
      if (!name || isNaN(price)) {
        showToast('Need a name and a valid price');
        return;
      }
      sendItems([{
        platform: PLATFORM,
        itemName: name,
        price: price,
        deliveryFee: isNaN(fee) ? null : fee,
        storeName: document.title.slice(0, 80),
        sourceUrl: location.href,
      }]);
      closeCapturePanel();
    });

    document.getElementById('pr-f-name').focus();
  }

  function closeCapturePanel() {
    const existing = document.getElementById('pr-capture-panel');
    if (existing) existing.remove();
  }

  function escapeAttr(s) {
    return (s || '').replace(/"/g, '&quot;');
  }

  // ---------- Toast ----------

  function showToast(msg) {
    let toast = document.getElementById('pr-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pr-toast';
      document.documentElement.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('pr-visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('pr-visible'), 2200);
  }

  // ---------- Sending to backend (via background, to dodge page CSP) ----------

  function sendItems(items) {
    chrome.runtime.sendMessage({ type: 'INGEST', items }, (response) => {
      if (chrome.runtime.lastError) {
        showToast('Could not reach backend — is it running?');
        return;
      }
      if (response && response.ok) {
        showToast(`Sent ${items.length} item${items.length === 1 ? '' : 's'} ✓`);
      } else {
        showToast('Backend rejected the request');
      }
    });
  }

  // ---------- Auto-scan for the popup checklist ----------

  function scanPage(limit = 50) {
    const results = [];
    const seen = new Set();
    const all = document.body.querySelectorAll('*');

    for (const el of all) {
      if (results.length >= limit) break;
      // Only look at "leaf-ish" elements to avoid matching huge ancestor blocks.
      if (el.children.length > 2) continue;
      const text = clean(el.innerText || el.textContent || '');
      const match = text.match(PRICE_REGEX);
      if (!match) continue;
      if (text.length > 30) continue; // likely not a clean price element

      const priceDigits = match[1].replace(/,/g, '');
      const price = parseFloat(priceDigits);
      if (isNaN(price) || price <= 0 || price > 20000) continue;

      const container = el.closest('li,div,article,section') || el.parentElement || el;
      const name = guessName(container, priceDigits) || text.replace(PRICE_REGEX, '').trim();
      if (!name || name.length < 3) continue;

      const dedupeKey = name.toLowerCase() + '|' + price;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      results.push({ name: name.slice(0, 80), price, platform: PLATFORM });
    }
    return results;
  }

  // ---------- Messages from popup ----------

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SCAN') {
      sendResponse({ platform: PLATFORM, candidates: scanPage() });
      return true;
    }
    if (msg.type === 'SET_CAPTURE_MODE') {
      setCaptureMode(!!msg.enabled);
      sendResponse({ ok: true, enabled: captureModeOn });
      return true;
    }
    if (msg.type === 'GET_CAPTURE_MODE') {
      sendResponse({ enabled: captureModeOn });
      return true;
    }
  });

  injectToggleButton();
})();
