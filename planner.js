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
        const recId = 'rec-' + Date.now();
        const recEl = document.createElement('div');
        recEl.className = 'msg msg-ai';
        recEl.innerHTML = `<div class="rec-card">
          <div class="rec-title">Show these parts in results?</div>
          <div class="rec-desc">${cats.join(', ')}</div>
          <div class="rec-acts" id="${recId}">
            <button class="btn-yes" onclick="pushAIResults(${JSON.stringify(cats)},'${cats[0]}');document.getElementById('${recId}').innerHTML='<span style=\\'font-size:11px;color:#16a34a\\'>Pushed to results feed</span>'">Show in results</button>
            <button class="btn-no" onclick="document.getElementById('${recId}').innerHTML='<span style=\\'font-size:11px;color:#aaa\\'>Dismissed</span>'">Dismiss</button>
          </div>
        </div>`;
        document.getElementById('sb-body').appendChild(recEl);
        document.getElementById('sb-body').scrollTop = 9999;
      } catch (e) {}
    }
  } catch (e) {
    sbClear();
    sbAdd(`<div class="bubble">Couldn't reach the AI right now. Check your connection and try again.</div>`);
  }
}
