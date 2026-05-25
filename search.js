const SYNONYMS = {
  "coils": "coilovers", "springs": "coilovers", "suspension": "coilovers",
  "blow off": "bov", "dump valve": "bov", "bpv": "bov",
  "fmic": "intercooler", "front mount": "intercooler",
  "diff": "lsd", "differential": "lsd",
  "intake": "intake", "induction kit": "intake", "pod filter": "intake", "cai": "intake",
  "turbo": "turbo", "snail": "turbo", "forced induction": "turbo",
  "brakes": "brakes", "brake kit": "brakes", "bbk": "brakes", "big brake": "brakes",
  "exhaust": "exhaust", "catback": "exhaust", "downpipe": "exhaust",
  "engine": "engine", "motor": "engine", "swap": "engine",
};

const INTERP_LABELS = {
  "coilovers": "suspension — coilovers",
  "bov": "blow-off valve (BOV / dump valve)",
  "intercooler": "intercooler (FMIC)",
  "lsd": "limited slip differential (LSD)",
  "intake": "cold air intake / induction",
  "turbo": "turbocharger / forced induction",
  "brakes": "brakes / big brake kit",
  "exhaust": "exhaust system",
  "engine": "engine / swap",
};

let activeFilter = 'all';

function normalise(q) {
  let out = q.toLowerCase();
  Object.keys(SYNONYMS).forEach(k => {
    if (out.includes(k)) out = out.replace(k, SYNONYMS[k]);
  });
  return out;
}

function interpText(q) {
  const n = normalise(q);
  const found = Object.keys(INTERP_LABELS).find(k => n.includes(k));
  if (!found) return null;
  const cars = ['s13','s14','s15','r32','r33','r34','rb25','sr20','ka24','silvia','skyline','240sx','200sx','180sx'];
  const carMatch = cars.find(c => q.toLowerCase().includes(c));
  let txt = 'Searching for: ' + INTERP_LABELS[found];
  if (carMatch) txt += ' → ' + carMatch.toUpperCase() + ' compatible';
  return txt;
}

function scoreItem(item, tokens) {
  let s = 0;
  tokens.forEach(t => {
    if (item.tags.some(tag => tag.includes(t))) s += 2;
    if (item.title.toLowerCase().includes(t)) s += 1;
  });
  return s;
}

function setChip(el, v) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  activeFilter = v;
  const q = document.getElementById('ph-q').value.trim();
  if (q) doSearch();
}

function doSearch(injectedQuery) {
  const raw = injectedQuery || document.getElementById('ph-q').value.trim();
  if (!raw) return;
  if (injectedQuery) document.getElementById('ph-q').value = injectedQuery;

  const interp = interpText(raw);
  const iEl = document.getElementById('ph-interp');
  iEl.innerHTML = interp
    ? `<div class="interp-pill"><i class="ti ti-sparkles" style="font-size:11px"></i>${interp}</div>`
    : '';

  const feed = document.getElementById('ph-feed');
  feed.innerHTML = '<div class="loading"><div class="spinner"></div>Searching 9 sources across UAE...</div>';

  setTimeout(() => {
    const q = normalise(raw);
    const tokens = q.split(/\s+/).filter(Boolean);
    let res = DB.map(i => ({ ...i, _s: scoreItem(i, tokens), _aiRec: false })).filter(i => i._s > 0);

    if (activeFilter === 'new') res = res.filter(r => r.type === 'new');
    if (activeFilter === 'used') res = res.filter(r => r.type === 'used');
    if (activeFilter === 'perf') res = res.filter(r => !['Dubizzle','Facebook Marketplace'].includes(r.source));
    if (activeFilter === 'class') res = res.filter(r => ['Dubizzle','Facebook Marketplace'].includes(r.source));

    res.sort((a, b) => (b.featured - a.featured) || (b._s - a._s));
    renderResults(res);
  }, 800);
}

function pushResults(tags, label) {
  const feed = document.getElementById('ph-feed');
  feed.innerHTML = `<div class="loading"><div class="spinner"></div>Finding ${label} for your build...</div>`;
  setTimeout(() => {
    const res = DB.filter(i => tags.some(t => i.tags.includes(t))).map(i => ({ ...i, _aiRec: true, _s: 1 }));
    res.sort((a, b) => b.featured - a.featured);
    renderResults(res, label);
  }, 700);
}

function renderResults(res, aiLabel) {
  const feed = document.getElementById('ph-feed');
  if (!res.length) {
    feed.innerHTML = '<div class="empty"><i class="ti ti-search-off"></i><p>No results found. Try different keywords or ask the BuildAI planner.</p></div>';
    return;
  }

  const nw = res.filter(r => r.type === 'new').length;
  const us = res.filter(r => r.type === 'used').length;
  const minP = Math.min(...res.map(r => r.price));
  const maxP = Math.max(...res.map(r => r.price));
  const range = res.length > 1
    ? `AED ${minP.toLocaleString()} – ${maxP.toLocaleString()}`
    : `AED ${res[0].price.toLocaleString()}`;

  const statsLabel = aiLabel
    ? `<span class="stat"><strong>${res.length}</strong> AI-recommended results for <strong>${aiLabel}</strong></span>`
    : `<span class="stat"><strong>${res.length}</strong> results</span>
       <div class="stat-div"></div>
       <span class="stat"><strong>${nw}</strong> new</span>
       <div class="stat-div"></div>
       <span class="stat"><strong>${us}</strong> used</span>
       <div class="stat-div"></div>
       <span class="stat">${range}</span>`;

  const cards = res.map(r => `
    <div class="card" onclick="window.open('${r.url}','_blank')">
      <img src="${r.img}" alt="${r.title}" loading="lazy" onerror="this.style.background='#eee'" />
      <div class="card-body">
        <div class="card-title">${r.title}</div>
        <div class="card-meta">
          ${r.featured ? '<span class="badge badge-feat">Featured</span>' : ''}
          ${r._aiRec ? '<span class="badge badge-ai"><i class="ti ti-sparkles" style="font-size:9px"></i> AI pick</span>' : ''}
          <span class="badge ${r.type === 'new' ? 'badge-new' : 'badge-used'}">${r.type === 'new' ? 'New' : 'Used'}</span>
          <span>${r.source}</span>
          <span>${r.loc}</span>
        </div>
        <div class="card-link"><i class="ti ti-external-link" style="font-size:10px"></i>View on ${r.source}</div>
      </div>
      <div class="card-price-col">
        <div class="card-price"><span>AED </span>${r.price.toLocaleString()}</div>
      </div>
    </div>`).join('');

  feed.innerHTML = `<div class="stats">${statsLabel}</div><div class="results">${cards}</div>`;
}
