// app.js — boot, shared UI (toast, reveals, counters), and Sell-a-part submission.

// Featured grid on load
renderFeatured();
function renderFeatured() {
  const grid = document.getElementById('featuredGrid');
  if (grid) grid.innerHTML = FEATURED.map(cardHTML).join('');
}

// Toast
let toastT;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2400);
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

// ---- Sell a part: modal + submission ----
function openSell() { document.getElementById('sellModal').classList.add('open'); }
function closeSell() { document.getElementById('sellModal').classList.remove('open'); }

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
    status.textContent = 'Fill in title, fitment, price, and a contact.';
    status.style.color = 'var(--red)';
    return;
  }

  status.textContent = 'Submitting…';
  status.style.color = 'var(--muted)';

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
      emoji: '🧑‍🔧',
      condition: payload.condition || 'Used'
    });

    status.textContent = '✅ Submitted! It’s pending review and now showing in your results.';
    status.style.color = 'var(--green)';
    toast('Listing submitted 🎯');
    setTimeout(() => {
      closeSell();
      renderResults([...USER_LISTINGS, ...CATALOGUE]);
      document.getElementById('resultsHead').textContent = 'Latest listings';
      document.getElementById('results-sec').scrollIntoView({ behavior: 'smooth' });
      status.textContent = '';
    }, 1100);
  } catch (err) {
    status.textContent = '⚠️ ' + err.message;
    status.style.color = 'var(--red)';
  }
}

// Close modal on backdrop click / Esc
document.addEventListener('click', e => {
  if (e.target.id === 'sellModal') closeSell();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSell(); });
