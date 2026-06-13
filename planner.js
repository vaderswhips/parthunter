// planner.js — BuildAI: calls the live /api/chat serverless function.

let BUILD_CONTEXT = { car: '', goal: '', budget: '' };
let CHAT_HISTORY = [];

document.querySelectorAll('#goals .gp').forEach(g => g.onclick = () => {
  document.querySelectorAll('#goals .gp').forEach(x => x.classList.remove('active'));
  g.classList.add('active');
});

async function runBuild() {
  const car = document.getElementById('car').value.trim();
  const goal = document.querySelector('#goals .gp.active').dataset.g;
  const budget = document.getElementById('budget').value;
  const out = document.getElementById('buildOut');

  if (!car) {
    out.innerHTML = `<div class="plan-empty"><span class="big">🚗</span><span>Type your car first — make and model, e.g. "Nissan Silvia S14".</span></div>`;
    return;
  }

  BUILD_CONTEXT = { car, goal, budget };
  CHAT_HISTORY = [];

  out.innerHTML = `<div class="ai-thinking"><span class="crosshair" style="width:14px;height:14px;position:relative"></span> BuildAI is mapping your <b style="color:var(--text)">${escapeHTML(car)}</b><span class="blink">_</span></div>`;

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
      <span class="big">⚠️</span>
      <span>BuildAI couldn't reach the planner.<br><span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${String(err.message)}</span></span>
    </div>`;
  }
}

function renderPlan(out, plan, car, goal) {
  const items = Array.isArray(plan.items) ? plan.items : [];
  out.innerHTML = `<div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-bottom:6px">PLAN FOR ${escapeHTML(car.toUpperCase())} · ${escapeHTML(goal.toUpperCase())}</div>`;

  if (plan.summary) {
    const s = document.createElement('div');
    s.style.cssText = 'font-size:15px;color:var(--text);margin-bottom:8px;line-height:1.4';
    s.textContent = plan.summary;
    out.appendChild(s);
  }

  items.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'plan-item';
    el.style.animationDelay = (idx * 0.1) + 's';
    el.innerHTML = `<div class="num">${String(idx + 1).padStart(2, '0')}</div>
      <div class="pi-body"><h5>${escapeHTML(item.part || '')}</h5><p>${escapeHTML(item.note || '')}</p></div>
      <div class="pi-price">${escapeHTML(item.price || '')}</div>`;
    out.appendChild(el);
  });

  const cta = document.createElement('button');
  cta.className = 'build-btn';
  cta.style.marginTop = '20px';
  cta.textContent = 'Show matching parts in results →';
  cta.onclick = () => {
    renderResults([...CATALOGUE].sort(() => Math.random() - 0.5));
    document.getElementById('results-sec').scrollIntoView({ behavior: 'smooth' });
    toast('Pushed your build to results 🎯');
  };
  out.appendChild(cta);
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
