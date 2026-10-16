// search.js — search bar, AI interpret panel, results grid.

function cardHTML(p) {
  const used = p.condition === 'Used';
  const badge = p.featured
    ? `<span class="badge featured">Partner stock</span>`
    : `<span class="badge ${used ? 'used' : ''}">${p.condition || 'New'}</span>`;

  // Per-product link comes from the live feed (p.url); fall back to shop homepage.
  const url = p.url || SOURCE_URLS[p.src] || null;

  // Real product image if present, else a quiet line-art placeholder.
  const placeholder = `<span class="emoji" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5V7M12 17v3.5M3.5 12H7M17 12h3.5"/></svg></span>`;
  const visual = placeholder + (p.img
    ? `<img class="card-img" src="${escapeHTML(p.img)}" alt="" loading="lazy" onerror="this.remove()"/>`
    : '');

  // Price, or "Enquire" for special-order/no-price items.
  const priceBlock = p.price
    ? `<div class="price">${escapeHTML(p.price)}<small>AED</small></div>`
    : `<div class="price enquire">Enquire for price</div>`;

  const arrow = `<svg viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"/></svg>`;
  const linkLabel = p.community
    ? (url ? 'Contact seller' + arrow : 'Community listing')
    : url ? 'View on ' + escapeHTML(p.src) + arrow : 'View listing';

  const inner = `
    <div class="img">${badge}${visual}</div>
    <div class="body">
      <h4>${escapeHTML(p.n)}</h4>
      <div class="src">${escapeHTML(p.src)}</div>
      ${priceBlock}
      <div class="card-link">${linkLabel}</div>
    </div>`;
  if (url) {
    return `<a class="card" href="${url}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
  }
  return `<div class="card">${inner}</div>`;
}

function renderResults(list) {
  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = list.map(cardHTML).join('');
  // Reveal the results section (hidden until the first search / build push).
  const sec = document.getElementById('results-sec');
  if (sec) sec.style.display = '';
  // On mobile the grid starts collapsed to a preview; restore that on each new render.
  grid.classList.add('collapsed');
  const btn = document.getElementById('resultsMoreBtn');
  if (btn) btn.style.display = '';
  if (typeof updateDots === 'function') updateDots();
}

function quickSearch(q) {
  document.getElementById('searchInput').value = q;
  runSearch();
}

// Sources the scanning readout cycles through (cosmetic — conveys "sweeping everything").
const SCAN_SOURCES = [
  'Name-it Performance', 'Dubizzle Motors', 'OpenSooq', 'Facebook Marketplace',
  'Sharjah parts souk', 'Instagram sellers', 'local workshops', 'partner shops'
];

function runSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;

  const carMatch = q.match(/s14|240sx|rb25|r34|supra|rx-7|wrx|civic|e46|m2|m3|m4|m140|m240|340|440|b58|z4|g8\d/i);
  const car = carMatch ? carMatch[0].toUpperCase() : 'your build';

  // Real keyword filter over the live catalogue + user listings.
  const pool = [...CATALOGUE, ...USER_LISTINGS];
  const terms = q.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const matches = pool.filter(p => {
    const hay = (p.n + ' ' + p.src).toLowerCase();
    return terms.some(t => hay.includes(t));
  });
  const results = matches.length ? matches : pool;

  // --- 1. Scanning-sources animation (new) ---
  const scan = document.getElementById('scanning');
  const scanLines = document.getElementById('scanLines');
  const panel = document.getElementById('interpret');
  const typed = document.getElementById('typed');
  panel.classList.remove('on');           // hide interpret until scan finishes
  scan.classList.add('on');

  let si = 0, found = 0;
  const totalSteps = SCAN_SOURCES.length;
  scanLines.innerHTML = '';
  const scanTimer = setInterval(() => {
    if (si < totalSteps) {
      const src = SCAN_SOURCES[si];
      // nudge the running count toward the real result total as we go
      found = Math.round(results.length * ((si + 1) / totalSteps));
      scanLines.innerHTML =
        `scanning <b>${escapeHTML(src)}</b>…<br><span class="scan-count">${found} match${found === 1 ? '' : 'es'} locked</span>`;
      si++;
    } else {
      clearInterval(scanTimer);
      scan.classList.remove('on');
      revealInterpret();
    }
  }, 180);

  // --- 2. Interpret panel + results (after scan) ---
  function revealInterpret() {
    panel.classList.add('on');
    typed.innerHTML = '';
    const msg = `Target: <span class="hl">${escapeHTML(q.replace(/under.*$/i, '').trim())}</span> for <span class="hl">${car}</span>. Swept every live UAE source.`;
    let i = 0;
    (function type() {
      typed.innerHTML = msg.substring(0, tagSafe(msg, i));
      i++;
      if (i <= msg.length) setTimeout(type, 9);
      else showMeta(car, results.length);
    })();

    document.getElementById('resultsHead').textContent =
      matches.length ? 'Results for "' + q.slice(0, 40) + '"' : 'No exact match — showing all live parts';
    renderResults(results);
    document.getElementById('results-sec').scrollIntoView({ behavior: 'smooth' });
  }
}

function tagSafe(str, n) {
  let count = 0, idx = 0;
  while (count < n && idx < str.length) {
    if (str[idx] === '<') idx = str.indexOf('>', idx) + 1;
    else idx++;
    count++;
  }
  return idx;
}

function showMeta(car, count) {
  document.getElementById('interpMeta').innerHTML =
    `<span>TARGET · ${escapeHTML(String(car))}</span><span>REGION · UAE</span><span>LOCKED · ${count} part${count === 1 ? '' : 's'}</span>`;
}
