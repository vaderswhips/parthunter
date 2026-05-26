const sbHistory = [];

function sbAdd(html, cls = 'msg-ai') {
  const body = document.getElementById('sb-body');
  const d = document.createElement('div');
  d.className = 'msg ' + cls;
  d.innerHTML = html;
  body.appendChild(d);
  body.scrollTop = body.scrollHeight;
  return d;
}

function sbTyping() {
  const body = document.getElementById('sb-body');
  const d = document.createElement('div');
  d.id = 'sb-typing';
  d.className = 'msg msg-ai';
  d.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  body.appendChild(d);
  body.scrollTop = body.scrollHeight;
}

function sbClear() {
  const t = document.getElementById('sb-typing');
  if (t) t.remove();
}

function showRecCard(cats) {
  const recId = 'rec-' + Date.now();
  const recEl = document.createElement('div');
  recEl.className = 'msg msg-ai';
  const card = document.createElement('div');
  card.className = 'rec-card';
  card.innerHTML = `
    <div class="rec-title">Find these parts?</div>
    <div class="rec-tags">${cats.map(c => `<span class="rec-tag">${c}</span>`).join('')}</div>
    <div class="rec-acts" id="${recId}"></div>`;
  recEl.appendChild(card);

  const acts = card.querySelector('.rec-acts');
  const yesBtn = document.createElement('button');
  yesBtn.className = 'btn-yes';
  yesBtn.textContent = 'Show in results';
  yesBtn.onclick = () => {
    pushAIResults(cats, cats[0]);
    acts.innerHTML = '<span class="rec-confirmed">Pushed to results feed</span>';
  };

  const noBtn = document.createElement('button');
  noBtn.className = 'btn-no';
  noBtn.textContent = 'Dismiss';
  noBtn.onclick = () => {
    acts.innerHTML = '<span class="rec-dismissed">Dismissed</span>';
  };

  acts.appendChild(yesBtn);
  acts.appendChild(noBtn);

  document.getElementById('sb-body').appendChild(recEl);
  document.getElementById('sb-body').scrollTop = 9999;
}

async function sbSend() {
  const inp = document.getElementById('sb-input');
  const val = inp.value.trim();
  if (!val) return;
  inp.value = '';
  sbAdd(`<div class="bubble">${val}</div>`, 'msg msg-user');
  sbHistory.push({ role: 'user', content: val });
  sbTyping();

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: sbHistory }),
    });

    const data = await resp.json();
    sbClear();

    if (!resp.ok) {
      sbAdd(`<div class="bubble">Something went wrong: ${data.error || 'Unknown error'}. Try again.</div>`);
      return;
    }

    const text = data.content?.map(c => c.text || '').join('') || 'No response. Try again.';
    const partsMatch = text.match(/<PARTS>(.*?)<\/PARTS>/s);
    const cleanText = text.replace(/<PARTS>.*?<\/PARTS>/s, '').trim();

    sbHistory.push({ role: 'assistant', content: text });
    sbAdd(`<div class="bubble">${cleanText.replace(/\n/g, '<br>')}</div>`);

    if (partsMatch) {
      try {
        const cats = JSON.parse(partsMatch[1]);
        showRecCard(cats);
      } catch (e) {}
    }
  } catch (e) {
    sbClear();
    sbAdd(`<div class="bubble">Couldn't reach the AI right now. Check your connection and try again.</div>`);
  }
}
