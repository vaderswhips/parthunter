// api/submit-listing.js — PartHunter "Sell a part" intake (Vercel)
//
// A submission is stored as PENDING and is NOT shown on the site until Hamad
// approves it on the admin page (/api/moderate?key=…). An email with one-tap
// approve / reject links goes out if Resend is configured.
//
// Env vars (Vercel → Settings → Environment Variables):
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN  — listing storage (Upstash free tier)
//   ADMIN_KEY                                          — secret that unlocks the admin page
//   RESEND_API_KEY                                     — optional, for the notification email

import { createHmac } from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

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
  return createHmac('sha256', process.env.ADMIN_KEY || 'no-key').update(`${id}:${action}`).digest('hex').slice(0, 32);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, car, price, condition, contact, link, description } = req.body || {};

  const errors = [];
  if (!title || title.trim().length < 3) errors.push('Add a part name.');
  if (!car || car.trim().length < 2) errors.push('Add the car or fitment.');
  if (!price || isNaN(parseFloat(String(price).replace(/[^\d.]/g, '')))) errors.push('Add a valid price.');
  if (!contact || contact.trim().length < 5) errors.push('Add a phone or email.');
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const listing = {
    id,
    title: String(title).trim().slice(0, 120),
    car: String(car).trim().slice(0, 80),
    price: String(price).replace(/[^\d.,]/g, '').trim().slice(0, 20),
    condition: ['Used', 'New', 'Refurbished'].includes(condition) ? condition : 'Used',
    contact: String(contact).trim().slice(0, 120),
    link: String(link || '').trim().slice(0, 300),
    description: String(description || '').trim().slice(0, 800),
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  // ---- store as pending ----
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.log('LISTING (storage not configured, not saved):', JSON.stringify(listing));
    return res.status(200).json({ ok: true, pending: true, note: 'Received, but storage is not configured yet so it was not saved.' });
  }
  try {
    await redis('SET', `listing:${id}`, JSON.stringify(listing));
    await redis('ZADD', 'listings:pending', Date.now(), id);
  } catch (e) {
    console.error('redis error', e);
    return res.status(500).json({ error: 'Could not save the listing. Try again in a moment.' });
  }

  // ---- notify Hamad (optional) ----
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const base = `https://${req.headers.host}`;
    const approve = `${base}/api/moderate?id=${id}&action=approve&t=${token(id, 'approve')}`;
    const reject = `${base}/api/moderate?id=${id}&action=reject&t=${token(id, 'reject')}`;
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'PartHunter Listings <listings@mail.parthunter.ae>',
          to: 'partner@parthunter.ae',
          subject: `Pending listing: ${listing.title} (${listing.car})`,
          text:
`A new part is waiting for your approval on PartHunter.ae

Part:       ${listing.title}
Fitment:    ${listing.car}
Price:      ${listing.price} AED
Condition:  ${listing.condition}
Contact:    ${listing.contact}
Link:       ${listing.link || '—'}

${listing.description || '(no description)'}

Approve:  ${approve}
Reject:   ${reject}

Or open the admin page to review everything pending.`
        })
      });
    } catch (e) { console.error('resend error', e); }
  }

  return res.status(200).json({ ok: true, pending: true });
}
