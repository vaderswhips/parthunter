const BUILD_PLANS = {
  street: {
    label: 'street build',
    parts: [
      { name: 'Coilovers', tags: ['coilovers'], desc: 'Adjustable ride height and handling — essential foundation for any build.' },
      { name: 'Cold air intake', tags: ['intake'], desc: 'Easy power gain with better throttle response. Cheap mod, noticeable difference.' },
      { name: 'Exhaust system', tags: ['exhaust'], desc: 'Free up exhaust flow, improve sound and top-end power.' },
      { name: 'Blow-off valve', tags: ['bov'], desc: 'Protects your turbo under boost. Essential if you are running boost.' },
    ]
  },
  track: {
    label: 'track build',
    parts: [
      { name: 'Coilovers', tags: ['coilovers'], desc: 'Stiff, fully adjustable setup. The most important mod for track use.' },
      { name: 'Big brake kit', tags: ['brakes'], desc: 'Critical for repeated hard braking. Stock brakes will fade fast on track.' },
      { name: 'LSD', tags: ['lsd'], desc: 'Puts the power down properly out of corners. Night and day difference.' },
      { name: 'Intercooler (FMIC)', tags: ['intercooler'], desc: 'Keeps intake temps down during sustained track sessions.' },
      { name: 'Turbo upgrade', tags: ['turbo'], desc: 'More power for the straights once the chassis mods are sorted.' },
    ]
  },
  drift: {
    label: 'drift build',
    parts: [
      { name: 'Coilovers', tags: ['coilovers'], desc: 'Lock the suspension for consistent angle. Go stiff in the rear.' },
      { name: 'LSD', tags: ['lsd'], desc: 'Non-negotiable for drift — both rear wheels need to spin together.' },
      { name: 'Turbo upgrade', tags: ['turbo'], desc: 'Power on demand for sustained angle. Throttle response is key.' },
      { name: 'Blow-off valve', tags: ['bov'], desc: 'Protect the turbo during clutch kicks and big entries.' },
      { name: 'Intercooler (FMIC)', tags: ['intercooler'], desc: 'Keep temps in check during long drift sessions.' },
    ]
  },
  power: {
    label: 'power build',
    parts: [
      { name: 'Turbo upgrade', tags: ['turbo'], desc: 'The core of any power build — bigger snail, more air, more power.' },
      { name: 'Intercooler (FMIC)', tags: ['intercooler'], desc: 'Dense cold air equals more power. Mandatory with a bigger turbo.' },
      { name: 'Blow-off valve', tags: ['bov'], desc: 'Handle the boost pressure properly. Protects the whole system.' },
      { name: 'Exhaust system', tags: ['exhaust'], desc: 'Let the exhaust gases out fast — don\'t restrict what you just built.' },
      { name: 'Cold air intake', tags: ['intake'], desc: 'Feed the engine the coldest, densest air possible.' },
    ]
  }
};

let sbState = { step: 'car', car: '', goal: '', plan: null, planStep: 0 };

function sbAdd(html, cls = 'msg-ai') {
  const body = document.getElementById('sb-body');
  const div = document.createElement('div');
  div.className = 'msg ' + cls;
  div.innerHTML = html;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function sbTyping() {
  const body = document.getElementById('sb-body');
  const d = document.createElement('div');
  d.className = 'msg msg-ai';
  d.id = 'sb-typing';
  d.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  body.appendChild(d);
  body.scrollTop = body.scrollHeight;
}

function sbRemoveTyping() {
  const t = document.getElementById('sb-typing');
  if (t) t.remove();
}

function sbReply(html, delay = 900) {
  sbTyping();
  setTimeout(() => { sbRemoveTyping(); sbAdd(html); }, delay);
}

function sbNextPart() {
  const plan = sbState.plan;
  if (!plan || sbState.planStep >= plan.parts.length) {
    sbReply(`<div class="bubble">That's the full priority list for a <strong>${plan ? plan.label : 'your build'}</strong>.<br><br>Want me to go deeper on any part, or are you looking for something specific?</div>`);
    return;
  }
  const part = plan.parts[sbState.planStep];
  sbState.planStep++;
  sbTyping();
  setTimeout(() => {
    sbRemoveTyping();
    const body = document.getElementById('sb-body');
    const d = document.createElement('div');
    d.className = 'msg msg-ai';
    const partTags = JSON.stringify(part.tags);
    const partName = part.name.replace(/'/g, "\\'");
    d.innerHTML = `<div class="rec-card">
      <div class="rec-card-title">${sbState.planStep}. ${part.name}</div>
      <div class="rec-desc">${part.desc}</div>
      <div class="rec-actions" id="rec-actions-${sbState.planStep}">
        <button class="btn-yes" onclick="pushResults(${partTags},'${partName}');document.getElementById('rec-actions-${sbState.planStep}').innerHTML='<span style=\\'font-size:11px;color:#16a34a\\'>Pushed to results feed</span>'">Show in results</button>
        <button class="btn-no" onclick="sbNextPart();document.getElementById('rec-actions-${sbState.planStep}').innerHTML='<span style=\\'font-size:11px;color:#aaa\\'>Skipped</span>'">Skip</button>
      </div>
    </div>`;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }, 800);
}

function sbOpt(val) {
  document.querySelectorAll('.sb-opt').forEach(b => b.disabled = true);
  sbHandleMsg(val);
}

function sbHandleMsg(msg) {
  const m = msg.toLowerCase().trim();
  sbAdd(`<div class="bubble">${msg}</div>`, 'msg msg-user');

  if (sbState.step === 'car') {
    sbState.car = msg;
    sbState.step = 'goal';
    sbReply(`<div class="bubble">Nice — a <strong>${msg}</strong>. What's the build goal?<div class="sb-opts" style="margin-top:8px">
      <button class="sb-opt" onclick="sbOpt('Street / daily driver')">Street / daily driver</button>
      <button class="sb-opt" onclick="sbOpt('Track days')">Track days</button>
      <button class="sb-opt" onclick="sbOpt('Drift build')">Drift build</button>
      <button class="sb-opt" onclick="sbOpt('Max power')">Max power</button>
    </div></div>`);
    return;
  }

  if (sbState.step === 'goal' || m.includes('street') || m.includes('daily') || m.includes('track') || m.includes('drift') || m.includes('power') || m.includes('max')) {
    sbState.goal = msg;
    sbState.step = 'planning';
    let key = 'street';
    if (m.includes('track')) key = 'track';
    else if (m.includes('drift')) key = 'drift';
    else if (m.includes('power') || m.includes('max')) key = 'power';
    sbState.plan = BUILD_PLANS[key];
    sbState.planStep = 0;
    sbReply(`<div class="bubble">Got it — a <strong>${sbState.plan.label}</strong> for the ${sbState.car}.<br><br>I'll walk you through each priority part. Hit "Show in results" on any part and it'll go straight to the feed so you can buy it.</div>`);
    setTimeout(() => sbNextPart(), 1900);
    return;
  }

  if (sbState.step === 'planning') {
    sbReply(`<div class="bubble">Ask me anything about the build. I can also keep going with the parts list if you want.</div>`);
    return;
  }

  sbState.step = 'car';
  sbReply(`<div class="bubble">Tell me what car you're building and I'll put together a parts plan for you.</div>`);
}

function sbSend() {
  const inp = document.getElementById('sb-input');
  const val = inp.value.trim();
  if (!val) return;
  inp.value = '';
  sbHandleMsg(val);
}
