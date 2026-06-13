// search.js — search bar, AI interpret panel, results grid.

function cardHTML(p) {
  const used = p.condition === 'Used';
  const badge = p.featured
    ? `<span class="badge featured">★ Featured</span>`
    : `<span class="badge ${used ? 'used' : ''}">${p.condition || 'New'}</span>`;

  // Per-product link comes from the live feed (p.url); fall back to shop homepage.
  const url = p.url || SOURCE_URLS[p.src] || null;

  // Real product image if present, else emoji placeholder.
  const visual = p.img
    ? `<img class="card-img" src="${escapeHTML(p.img)}" alt="${escapeHTML(p.n)}" loading="lazy"/>`
    : `<span class="emoji">${p.emoji || '🔧'}</span>`;

  // Price, or "Enquire" for special-order/no-price items.
  const priceBlock = p.price
    ? `<div class="price">${escapeHTML(p.price)} <small>AED</small></div>`
    : `<div class="price enquire">Enquire</div>`;

  const linkLabel = url
    ? (p.src ? 'View on ' + escapeHTML(p.src) + ' ↗' : 'View ↗')
    : 'Community listing';

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
}

function quickSearch(q) {
  document.getElementById('searchInput').value = q;
  runSearch();
}

function runSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  const panel = document.getElementById('interpret');
  const typed = document.getElementById('typed');
  panel.classList.add('on');
  typed.innerHTML = '';

  const carMatch = q.match(/s14|240sx|rb25|r34|supra|rx-7|wrx|civic|e46|m2|m3|m4|m140|m240|340|440|b58|z4|g8\d/i);
  const car = carMatch ? carMatch[0].toUpperCase() : 'your build';

  // Real keyword filter over the live catalogue + user listings.
  const pool = [...CATALOGUE, ...USER_LISTINGS];
  const terms = q.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const matches = pool.filter(p => {
    const hay = (p.n + ' ' + p.src).toLowerCase();
    return terms.some(t => hay.includes(t));
  });
  const results = matches.length ? matches : pool; // fall back to showing everything if no match

  const msg = `Looking for <span class="hl">${escapeHTML(q.replace(/under.*$/i, '').trim())}</span> for <span class="hl">${car}</span>. Searching live partner stock…`;

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
    `<span>🎯 ${escapeHTML(String(car))}</span><span>📍 UAE</span><span>📦 ${count} live part${count === 1 ? '' : 's'}</span><span>🔄 partner stock</span>`;
}
