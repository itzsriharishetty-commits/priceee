const API_BASE = ''; // same-origin, since Spring Boot serves this file too
const POLL_INTERVAL_MS = 4000;

const PLATFORM_COLORS = {
  SWIGGY: '#FC8019',
  ZOMATO: '#E23744',
  ZEPTO: '#8B2CF5',
  OTHER: '#6B7280',
};

const groupsContainer = document.getElementById('groupsContainer');
const emptyState = document.getElementById('emptyState');
const statusPill = document.getElementById('statusPill');
const entryCount = document.getElementById('entryCount');
const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearBtn');
const manualForm = document.getElementById('manualForm');

let currentQuery = '';
let pollTimer = null;

async function fetchComparison(query) {
  const url = `${API_BASE}/api/comparison${query ? `?query=${encodeURIComponent(query)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`comparison fetch failed: ${res.status}`);
  return res.json();
}

async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('health check failed');
  return res.json();
}

function setStatus(ok, text) {
  statusPill.textContent = text;
  statusPill.className = 'status-pill ' + (ok ? 'status-ok' : 'status-error');
}

function formatMoney(v) {
  if (v === null || v === undefined) return '—';
  return '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function renderGroups(groups) {
  groupsContainer.innerHTML = '';

  const totalEntries = groups.reduce((sum, g) => sum + g.entries.length, 0);
  entryCount.textContent = `${totalEntries} price${totalEntries === 1 ? '' : 's'} captured across ${groups.length} dish${groups.length === 1 ? '' : 'es'}`;

  if (groups.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const maxAcrossAll = Math.max(1, ...groups.flatMap(g => g.entries.map(e => e.price + (e.deliveryFee || 0))));

  for (const group of groups) {
    groupsContainer.appendChild(renderCard(group));
  }
}

function renderCard(group) {
  const card = document.createElement('article');
  card.className = 'race-card';

  const groupMax = Math.max(1, ...group.entries.map(e => e.price + (e.deliveryFee || 0)));
  const cheapestId = group.entries.length ? group.entries[0].id : null;

  const header = document.createElement('div');
  header.className = 'race-card-header';
  header.innerHTML = `
    <div class="race-card-title">${escapeHtml(group.displayName)}</div>
    ${group.maxSavings > 0
      ? `<span class="savings-badge">Save ${formatMoney(group.maxSavings)}</span>`
      : ''}
  `;
  card.appendChild(header);

  for (const entry of group.entries) {
    card.appendChild(renderBarRow(entry, groupMax, entry.id === cheapestId));
  }

  const footer = document.createElement('div');
  footer.className = 'card-footer';
  const first = group.entries[0];
  footer.innerHTML = `
    <span>${group.platformCount} platform${group.platformCount === 1 ? '' : 's'} compared</span>
    ${first && first.sourceUrl ? `<a href="${escapeAttr(first.sourceUrl)}" target="_blank" rel="noopener">open cheapest ↗</a>` : ''}
  `;
  card.appendChild(footer);

  return card;
}

function renderBarRow(entry, groupMax, isWinner) {
  const row = document.createElement('div');
  row.className = 'bar-row';

  const total = entry.price + (entry.deliveryFee || 0);
  const widthPct = Math.max(4, Math.round((total / groupMax) * 100));
  const color = PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.OTHER;
  const platformLabel = entry.platform ? entry.platform.charAt(0) + entry.platform.slice(1).toLowerCase() : 'Other';

  row.innerHTML = `
    <div class="bar-meta">
      <span class="platform-name ${isWinner ? 'winner' : ''}">${isWinner ? '🏆 ' : ''}${platformLabel}${entry.storeName ? ` · ${escapeHtml(entry.storeName)}` : ''}</span>
      <span class="price-value" style="color:${isWinner ? '#34D399' : '#EDEDEF'}">
        ${formatMoney(total)}${entry.deliveryFee ? `<span class="fee-note">incl. delivery</span>` : ''}
      </span>
    </div>
    <div class="bar-track">
      <div class="bar-fill ${isWinner ? 'winner' : ''}" style="width:${widthPct}%; background:${color}; color:${color};"></div>
    </div>
  `;
  return row;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
function escapeAttr(str) {
  return (str ?? '').replace(/"/g, '&quot;');
}

async function refresh() {
  try {
    const [groups] = await Promise.all([fetchComparison(currentQuery)]);
    renderGroups(groups);
    const health = await fetchHealth();
    setStatus(true, `backend connected · ${health.storedEntries} stored`);
  } catch (err) {
    setStatus(false, 'backend unreachable — is it running on :8080?');
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  refresh();
  pollTimer = setInterval(refresh, POLL_INTERVAL_MS);
}

searchInput.addEventListener('input', debounce((e) => {
  currentQuery = e.target.value.trim();
  refresh();
}, 250));

clearBtn.addEventListener('click', async () => {
  if (!confirm('Clear all captured prices? This cannot be undone.')) return;
  await fetch(`${API_BASE}/api/clear`, { method: 'DELETE' });
  refresh();
});

manualForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const entry = {
    platform: document.getElementById('manualPlatform').value,
    itemName: document.getElementById('manualItemName').value.trim(),
    price: parseFloat(document.getElementById('manualPrice').value),
    deliveryFee: parseFloatOrNull(document.getElementById('manualDeliveryFee').value),
    storeName: document.getElementById('manualStoreName').value.trim() || null,
  };
  if (!entry.itemName || isNaN(entry.price)) return;

  await fetch(`${API_BASE}/api/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  manualForm.reset();
  refresh();
});

function parseFloatOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

startPolling();
