// api/moderate.js — PartHunter listing admin (Vercel)
//
// Open  https://parthunter.ae/api/moderate?key=YOUR_ADMIN_KEY  to see the queue.
//   • Pending listings: Approve or Reject
//   • Live listings:    Delete
// Email links use a per-listing HMAC token instead of the key, so the key
// never travels in email. Everything is GET so the links work from a phone.

import { createHmac, timingSafeEqual } from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_KEY = process.env.ADMIN_KEY || '';

async function redis(...cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

function token(id, action) {
  return createHmac('sha256', ADMIN_KEY || 'no-key').update(`${id}:${action}`).digest('hex').slice(0, 32);
}
function safeEq(a = '', b = '') {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && timingSafeEqual(A, B);
}
function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function fetchList(zset) {
  const ids = await redis('ZRANGE', zset, 0, -1, 'REV');
  if (!ids || !ids.length) return [];
  const raws = await redis('MGET', ...ids.map(i => `listing:${i}`));
  return raws.map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · PartHunter admin</title>
<style>
:root{--bg:#050505;--surf:#0c0c0e;--hair:rgba(255,255,255,.1);--t:#f5f4f2;--t2:#a3a2a8;--t3:#66656d;--red:#de4328;--amber:#e9b453;--ok:#4cc38a}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--t);font:15px/1.5 -apple-system,system-ui,'Segoe UI',sans-serif;padding:28px 18px 60px;max-width:860px;margin:0 auto}
h1{font-size:28px;letter-spacing:-.02em;margin-bottom:4px}.sub{color:var(--t3);margin-bottom:28px;font-size:14px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.14em;color:var(--t3);margin:30px 0 12px}
.card{background:var(--surf);border:1px solid var(--hair);border-radius:16px;padding:18px 18px 16px;margin-bottom:12px}
.row{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.name{font-weight:600;font-size:16px}
.meta{color:var(--t2);font-size:13.5px;margin-top:4px}.meta b{color:var(--t);font-weight:500}
.desc{color:var(--t2);font-size:14px;margin-top:10px;white-space:pre-wrap}
.price{font-weight:600;font-size:18px;white-space:nowrap}
.acts{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.btn{display:inline-block;padding:9px 16px;border-radius:999px;border:1px solid var(--hair);color:var(--t);text-decoration:none;font-size:14px;font-weight:500}
.btn.ok{background:var(--ok);border-color:var(--ok);color:#06140d}.btn.no{color:var(--red);border-color:rgba(222,67,40,.45)}.btn.del{color:var(--t2)}
.empty{color:var(--t3);padding:20px 0}.note{border:1px solid var(--hair);border-radius:12px;padding:14px 16px;color:var(--t2);font-size:14px;margin-bottom:20px}
.ok-msg{color:var(--ok)}.badge{display:inline-block;font-size:11px;letter-spacing:.06em;padding:3px 8px;border-radius:6px;border:1px solid var(--hair);color:var(--t2);margin-left:8px;vertical-align:middle}
code{background:#111;padding:2px 6px;border-radius:6px;font-size:13px}
a.back{color:var(--t2);font-size:14px}
</style></head><body>${body}</body></html>`;
}

function card(l, actions) {
  return `<div class="card"><div class="row"><div>
    <div class="name">${esc(l.title)}<span class="badge">${esc(l.condition)}</span></div>
    <div class="meta"><b>${esc(l.car)}</b> · ${esc(l.contact)}${l.link ? ` · <a href="${esc(l.link)}" target="_blank" rel="noopener" style="color:inherit">link</a>` : ''}</div>
    ${l.description ? `<div class="desc">${esc(l.description)}</div>` : ''}
    <div class="meta" style="margin-top:8px;color:var(--t3)">${esc(new Date(l.submittedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' }))} · id ${esc(l.id)}</div>
  </div><div class="price">${esc(l.price)} <span style="color:var(--t3);font-size:12px">AED</span></div></div>
  <div class="acts">${actions}</div></div>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');

  const q = req.query || {};
  const key = q.key || '';
  const { id, action, t } = q;

  if (!ADMIN_KEY) {
    return res.status(500).send(page('Setup needed', `<h1>Admin key not set</h1><div class="note">Add an <code>ADMIN_KEY</code> environment variable in Vercel (any long random string), redeploy, then open <code>/api/moderate?key=YOUR_KEY</code>.</div>`));
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).send(page('Setup needed', `<h1>Storage not configured</h1><div class="note">Add <code>UPSTASH_REDIS_REST_URL</code> and <code>UPSTASH_REDIS_REST_TOKEN</code> from your Upstash Redis database to Vercel, then redeploy.</div>`));
  }

  // ---- authorise: either the admin key, or a valid per-listing token for this exact action ----
  const byKey = safeEq(key, ADMIN_KEY);
  const byToken = id && action && t && safeEq(t, token(id, action));
  if (!byKey && !byToken) return res.status(401).send(page('Not allowed', `<h1>Not allowed</h1><div class="note">This page needs your admin key.</div>`));

  const home = `/api/moderate?key=${encodeURIComponent(byKey ? key : '')}`;

  // ---- actions ----
  if (id && action) {
    try {
      if (action === 'approve') {
        const raw = await redis('GET', `listing:${id}`);
        if (!raw) throw new Error('Listing not found (maybe already handled).');
        const l = JSON.parse(raw); l.status = 'approved'; l.approvedAt = new Date().toISOString();
        await redis('SET', `listing:${id}`, JSON.stringify(l));
        await redis('ZREM', 'listings:pending', id);
        await redis('ZADD', 'listings:approved', Date.now(), id);
      } else if (action === 'reject' || action === 'delete') {
        await redis('ZREM', 'listings:pending', id);
        await redis('ZREM', 'listings:approved', id);
        await redis('DEL', `listing:${id}`);
      } else {
        throw new Error('Unknown action.');
      }
    } catch (e) {
      return res.status(400).send(page('Error', `<h1>Couldn't do that</h1><div class="note">${esc(e.message)}</div><a class="back" href="${home}">Back to admin</a>`));
    }
    if (byKey) { res.statusCode = 302; res.setHeader('Location', home); return res.end(); }
    const verb = action === 'approve' ? 'Approved — it is live on the site now.' : action === 'reject' ? 'Rejected and removed.' : 'Deleted.';
    return res.status(200).send(page('Done', `<h1 class="ok-msg">${verb}</h1><div class="sub">Listing ${esc(id)}</div>`));
  }

  // ---- admin page ----
  if (!byKey) return res.status(401).send(page('Not allowed', `<h1>Not allowed</h1>`));
  let pending = [], live = [];
  try { [pending, live] = await Promise.all([fetchList('listings:pending'), fetchList('listings:approved')]); }
  catch (e) { return res.status(500).send(page('Error', `<h1>Storage error</h1><div class="note">${esc(e.message)}</div>`)); }

  const k = encodeURIComponent(key);
  const pendingHtml = pending.length
    ? pending.map(l => card(l, `<a class="btn ok" href="/api/moderate?key=${k}&id=${l.id}&action=approve">Approve</a><a class="btn no" href="/api/moderate?key=${k}&id=${l.id}&action=reject" onclick="return confirm('Reject and delete this listing?')">Reject</a>`)).join('')
    : `<div class="empty">Nothing waiting.</div>`;
  const liveHtml = live.length
    ? live.map(l => card(l, `<a class="btn del" href="/api/moderate?key=${k}&id=${l.id}&action=delete" onclick="return confirm('Remove this listing from the site?')">Delete</a>`)).join('')
    : `<div class="empty">No community listings live yet.</div>`;

  return res.status(200).send(page('Listings', `
    <h1>Listings</h1><div class="sub">${pending.length} pending · ${live.length} live</div>
    <h2>Pending approval</h2>${pendingHtml}
    <h2>Live on the site</h2>${liveHtml}`));
}
