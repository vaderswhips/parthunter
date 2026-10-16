// planner.js — BuildAI: calls the live /api/chat serverless function.

let BUILD_CONTEXT = { car: '', goal: '', budget: '' };
let CHAT_HISTORY = [];

document.querySelectorAll('#goals .gp').forEach(g => g.onclick = () => {
  document.querySelectorAll('#goals .gp').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked','false'); });
  g.classList.add('active'); g.setAttribute('aria-checked','true');
});

async function runBuild() {
  const car = document.getElementById('car').value.trim();
  const goal = document.querySelector('#goals .gp.active').dataset.g;
  const budget = document.getElementById('budget').value;
  const out = document.getElementById('buildOut');

  if (!car) {
    out.innerHTML = `<div class="plan-empty"><svg class="ico-lg" viewBox="0 0 24 24"><path d="M3 13.5 5.2 8a2 2 0 0 1 1.9-1.3h9.8a2 2 0 0 1 1.9 1.3l2.2 5.5M3 13.5V18h2.5M3 13.5h18V18h-2.5M5.5 18a1.5 1.5 0 1 0 3 0M15.5 18a1.5 1.5 0 1 0 3 0M5.5 18h10"/></svg><span>Name the car first. Make and model is enough,<br>for example "Nissan Silvia S14".</span></div>`;
    return;
  }

  BUILD_CONTEXT = { car, goal, budget };
  CHAT_HISTORY = [];

  out.innerHTML = `<div class="ai-thinking">Mapping a plan for <b>${escapeHTML(car)}</b><span class="blink">_</span></div>`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'plan', car, goal, budget })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed (${res.status})`);
    }

    const plan = await res.json();
    renderPlan(out, plan, car, goal);

    // Reveal the conversational follow-up box now that a plan exists.
    const chat = document.getElementById('buildChat');
    if (chat) {
      chat.style.display = '';
      document.getElementById('chatLog').innerHTML = '';
    }
  } catch (err) {
    out.innerHTML = `<div class="plan-empty">
      <svg class="ico-lg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.5M12 15.5v.5"/></svg>
      <span>BuildAI couldn't reach the planner. Try again in a moment.<br><span style="font-family:var(--mono);font-size:12px;color:var(--text-3)">${escapeHTML(String(err.message))}</span></span>
    </div>`;
  }
}

let LAST_PLAN = null;

function renderPlan(out, plan, car, goal) {
  const items = Array.isArray(plan.items) ? plan.items : [];
  LAST_PLAN = { plan, car, goal };
  out.innerHTML = '';

  // Header row: plan label + copy-build button (new)
  const headRow = document.createElement('div');
  headRow.className = 'plan-head';
  headRow.innerHTML = `<span>Plan for ${escapeHTML(car)}</span>`;
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-build';
  copyBtn.innerHTML = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V4a1 1 0 0 1 1-1h7"/></svg>Copy build';
  copyBtn.onclick = copyBuild;
  headRow.appendChild(copyBtn);
  out.appendChild(headRow);

  if (plan.summary) {
    const s = document.createElement('div');
    s.className = 'plan-summary';
    s.textContent = plan.summary;
    out.appendChild(s);
  }

  items.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'plan-item';
    el.innerHTML =
      `<div class="pi-rank">${String(idx + 1).padStart(2, '0')}</div>
       <div class="pi-body"><div class="pi-part">${escapeHTML(item.part || '')}</div><div class="pi-note">${escapeHTML(item.note || '')}</div></div>
       <div class="pi-price">${escapeHTML(item.price || '')}</div>`;
    out.appendChild(el);
  });

  const cta = document.createElement('button');
  cta.className = 'pill build-btn';
  cta.innerHTML = '<span>Show matching parts</span><i class="pill-ic"><svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4"/></svg></i>';
  cta.onclick = () => {
    renderResults([...CATALOGUE].sort(() => Math.random() - 0.5));
    document.getElementById('results-sec').scrollIntoView({ behavior: 'smooth' });
    toast('Build pushed to results');
  };
  out.appendChild(cta);
}

// ---- Copy/share build (new) ----
function copyBuild() {
  if (!LAST_PLAN) return;
  const { plan, car, goal } = LAST_PLAN;
  const items = Array.isArray(plan.items) ? plan.items : [];
  const lines = [];
  lines.push(`${car} build plan, via PartHunter.ae`);
  if (goal) lines.push(`Direction: ${goal.split('—')[0].trim()}`);
  if (plan.summary) lines.push('', plan.summary);
  lines.push('');
  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.part}${it.price ? ' — ' + it.price : ''}`);
    if (it.note) lines.push(`   ${it.note}`);
  });
  lines.push('', 'Plan your own at parthunter.ae');
  const text = lines.join('\n');

  const done = () => toast('Build copied');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); cb(); } catch (e) {}
  document.body.removeChild(ta);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- BuildAI conversational follow-up ----
async function sendBuildChat() {
  const input = document.getElementById('chatInput');
  const log = document.getElementById('chatLog');
  const msg = input.value.trim();
  if (!msg) return;

  // Append user message
  log.insertAdjacentHTML('beforeend', `<div class="chat-msg user">${escapeHTML(msg)}</div>`);
  input.value = '';
  log.scrollTop = log.scrollHeight;

  // Typing indicator
  log.insertAdjacentHTML('beforeend', `<div class="chat-msg ai pending">…</div>`);
  log.scrollTop = log.scrollHeight;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'chat',
        car: BUILD_CONTEXT.car,
        goal: BUILD_CONTEXT.goal,
        budget: BUILD_CONTEXT.budget,
        history: CHAT_HISTORY,
        message: msg
      })
    });
    const data = await res.json();
    const reply = (data && data.reply) ? data.reply : "I'm BuildAI — I only help with car builds and parts. Ask me about your build.";

    // Replace pending with real reply
    const pending = log.querySelector('.chat-msg.pending');
    if (pending) { pending.classList.remove('pending'); pending.textContent = reply; }

    // Track history for context (capped server-side too)
    CHAT_HISTORY.push({ role: 'user', content: msg });
    CHAT_HISTORY.push({ role: 'assistant', content: reply });
    if (CHAT_HISTORY.length > 12) CHAT_HISTORY = CHAT_HISTORY.slice(-12);

    log.scrollTop = log.scrollHeight;
  } catch (err) {
    const pending = log.querySelector('.chat-msg.pending');
    if (pending) { pending.classList.remove('pending'); pending.textContent = 'Couldn’t reach BuildAI. Try again.'; }
  }
}
