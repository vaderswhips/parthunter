// app.js — boot, shared UI (toast, reveals, counters), and Sell-a-part submission.

// Load live products from partner shops' real feeds, then render.
loadLiveProducts();
async function loadLiveProducts() {
  const grid = document.getElementById('featuredGrid');
  if (grid) grid.innerHTML = Array.from({length:8},()=>'<div class="skel"><div class="img"></div><div class="l"></div><div class="l s"></div><div class="l p"></div></div>').join('');
  try {
    const res = await fetch('/api/shops');
    const data = await res.json();
    const products = Array.isArray(data.products) ? data.products : [];

    // Populate the global arrays the rest of the site reads from.
    FEATURED = products.filter(p => p.featured).slice(0, 8);
    CATALOGUE = products.slice();

    renderFeatured();
  } catch (e) {
    if (grid) grid.innerHTML = '<div class="feed-loading">Live stock couldn\'t load. Refresh to try again.</div>';
  }
}

function renderFeatured() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  if (!FEATURED.length) {
    grid.innerHTML = '<div class="feed-loading">No partner stock live yet. Check back soon.</div>';
    return;
  }
  grid.innerHTML = FEATURED.map(cardHTML).join('');
}

// Toast
let toastT;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 2400);
}

// Reveal on scroll
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));


// ---- Partner onboarding: open a pre-filled email ----
function partnerEmail() {
  const subject = 'Featured partner — PartHunter.ae onboarding';
  const body =
`Hi PartHunter team,

We'd like to get our shop featured on PartHunter.ae. Here are our details:

• Shop name:
• What we sell (brands / categories):
• Location / emirate:
• Website or online store:
• Product feed URL (Shopify/WooCommerce, if any):
• Instagram:
• Best contact name & number:

Looking forward to getting onboarded.

Thanks!`;
  const url = 'mailto:partner@parthunter.ae?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  window.location.href = url;
}

// ---- Mobile: expand a collapsed grid preview ----
function toggleMore(gridId, btn) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.classList.remove('collapsed');
  btn.style.display = 'none';
}

// ---- Mobile: reveal/hide the How it works steps ----
function toggleHow(btn) {
  const steps = document.getElementById('howSteps');
  if (!steps) return;
  const open = steps.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.textContent = open ? 'Hide' : 'See how it works';
}

// ---- Sell a part: modal + submission ----
function openSell() { document.getElementById('sellModal').classList.add('on'); }
function closeSell() { document.getElementById('sellModal').classList.remove('on'); }

async function submitListing() {
  const get = id => document.getElementById(id).value.trim();
  const payload = {
    title: get('lTitle'),
    car: get('lCar'),
    price: get('lPrice'),
    condition: get('lCondition'),
    contact: get('lContact'),
    link: get('lLink'),
    description: get('lDesc')
  };
  const status = document.getElementById('sellStatus');

  // Basic client-side check
  if (!payload.title || !payload.car || !payload.price || !payload.contact) {
    status.textContent = 'Add the part, fitment, price and a contact to submit.';
    status.style.color = 'var(--red)';
    return;
  }

  status.textContent = 'Submitting…';
  status.style.color = 'var(--text-3)';

  try {
    const res = await fetch('/api/submit-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission failed');

    // Show it in this session's results immediately
    USER_LISTINGS.unshift({
      n: payload.title,
      src: 'Community listing',
      price: payload.price.replace(/[^\d.,]/g, '') || payload.price,
      emoji: null,
      condition: payload.condition || 'Used'
    });

    status.textContent = 'Submitted. It\'s pending review and now showing in your results.';
    status.style.color = 'var(--text-2)';
    toast('Listing submitted');
    setTimeout(() => {
      closeSell();
      renderResults([...USER_LISTINGS, ...CATALOGUE]);
      document.getElementById('resultsHead').textContent = 'Latest listings';
      document.getElementById('results-sec').scrollIntoView({ behavior: 'smooth' });
      status.textContent = '';
    }, 1100);
  } catch (err) {
    status.textContent = err.message;
    status.style.color = 'var(--red)';
  }
}

// ---- Island nav: mobile menu ----
function toggleMenu() {
  const m = document.getElementById('menu');
  const b = document.getElementById('burger');
  const open = !m.classList.contains('on');
  m.classList.toggle('on', open);
  m.setAttribute('aria-hidden', open ? 'false' : 'true');
  b.setAttribute('aria-expanded', open ? 'true' : 'false');
  b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.style.overflow = open ? 'hidden' : '';
}

// Close modal on backdrop click / Esc
document.addEventListener('click', e => {
  if (e.target.id === 'sellModal') closeSell();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeSell();
  const m = document.getElementById('menu');
  if (m && m.classList.contains('on')) toggleMenu();
});

// ---- Focus mode: one section per screen ----
const FOCUS_KEY = 'ph_focus';

function focusSections() {
  return [...document.querySelectorAll('main > [data-label]')]
    .filter(s => s.style.display !== 'none');
}

function setFocus(on, announce) {
  document.documentElement.classList.toggle('focus', on);
  const btn = document.getElementById('focusBtn');
  if (btn) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Focus mode on. Switch to normal view' : 'Focus mode: one section per screen');
  }
  const st = document.getElementById('menuFocusState');
  if (st) st.textContent = on ? 'On' : 'Off';
  try { localStorage.setItem(FOCUS_KEY, on ? '1' : '0'); } catch (e) {}
  updateDots();
  if (announce) toast(on ? 'Focus mode on. One section per screen' : 'Normal view');
}

function toggleFocus() {
  setFocus(!document.documentElement.classList.contains('focus'), true);
}

let dotsIO = null;
function updateDots() {
  const wrap = document.getElementById('dots');
  if (!wrap) return;
  const on = document.documentElement.classList.contains('focus');
  if (dotsIO) { dotsIO.disconnect(); dotsIO = null; }
  if (!on) { wrap.innerHTML = ''; return; }

  const secs = focusSections();
  wrap.innerHTML = secs.map((s, i) =>
    `<button data-label="${s.dataset.label}" aria-label="Go to ${s.dataset.label}" data-i="${i}"></button>`).join('');
  wrap.querySelectorAll('button').forEach(b => {
    b.onclick = () => secs[+b.dataset.i].scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  dotsIO = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const i = secs.indexOf(e.target);
      wrap.querySelectorAll('button').forEach((b, j) => b.classList.toggle('active', j === i));
    });
  }, { threshold: 0.55 });
  secs.forEach(s => dotsIO.observe(s));
}

// Arrow / page keys step between sections while in focus mode
document.addEventListener('keydown', e => {
  if (!document.documentElement.classList.contains('focus')) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  const dir = (e.key === 'ArrowDown' || e.key === 'PageDown') ? 1 : (e.key === 'ArrowUp' || e.key === 'PageUp') ? -1 : 0;
  if (!dir) return;
  const secs = focusSections();
  const mid = window.innerHeight / 2;
  let cur = secs.findIndex(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
  if (cur < 0) cur = 0;
  const next = Math.max(0, Math.min(secs.length - 1, cur + dir));
  if (next !== cur) { e.preventDefault(); secs[next].scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});

// Restore the user's choice on load (no toast)
(function () {
  let saved = null;
  try { saved = localStorage.getItem(FOCUS_KEY); } catch (e) {}
  if (saved === '1') setFocus(true, false);
})();
