// search.js — search bar, AI interpret panel, results grid.

function cardHTML(p) {
  const used = p.condition === 'Used';
  const badge = p.featured
    ? `<span class="badge featured">★ Featured</span>`
    : `<span class="badge ${used ? 'used' : ''}">${p.condition || 'New'}</span>`;
  const url = SOURCE_URLS[p.src];
  const inner = `
    <div class="img">${badge}<span class="emoji">${p.emoji || '🔧'}</span></div>
    <div class="body">
      <h4>${escapeHTML(p.n)}</h4>
      <div class="src">${escapeHTML(p.src)}</div>
      <div class="price">${escapeHTML(p.price)} <small>AED</small></div>
      <div class="card-link">${url ? 'View on ' + escapeHTML(p.src) + ' ↗' : 'Community listing'}</div>
    </div>`;
  if (url) {
    return `<a class="card" href="${url}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
  }
  return `<div class="card">${inner}</div>`;
}

function renderResults(list) {
  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = list.map(cardHTML).join('');
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

  const carMatch = q.match(/s14|240sx|rb25|r34|supra|rx-7|wrx|civic|e46/i);
  const budgetMatch = q.match(/(\d[\d,\.]*)\s*k?/i);
  const car = carMatch ? carMatch[0].toUpperCase() : 'your build';
  const budget = /2k|2000/i.test(q) ? '2,000' : (budgetMatch ? budgetMatch[1] : null);
  const msg = `Looking for <span class="hl">${escapeHTML(q.replace(/under.*$/i, '').trim())}</span> compatible with <span class="hl">${car}</span>${budget ? `, filtered under <span class="hl">${budget} AED</span>` : ''}. Searching all 9 UAE sources…`;

  let i = 0;
  (function type() {
    typed.innerHTML = msg.substring(0, tagSafe(msg, i));
    i++;
    if (i <= msg.length) setTimeout(type, 9);
    else showMeta(car, budget);
  })();

  document.getElementById('resultsHead').textContent = 'Results for "' + q.slice(0, 40) + '"';
  renderResults([...CATALOGUE, ...USER_LISTINGS].sort(() => Math.random() - 0.5));
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

function showMeta(car, budget) {
  document.getElementById('interpMeta').innerHTML =
    `<span>🎯 ${car}</span><span>📍 UAE</span>${budget ? `<span>💰 ≤ ${budget} AED</span>` : ''}<span>🔄 9 sources</span>`;
}
