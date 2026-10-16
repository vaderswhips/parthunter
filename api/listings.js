// api/listings.js — approved community listings as PartHunter cards (Vercel)
// Only listings approved on /api/moderate appear here. Pending ones never do.

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

// Buyers reach the seller through whatever they gave us: a listing link,
// a WhatsApp number, or an email.
function contactUrl(l) {
  if (l.link && /^https?:\/\//i.test(l.link)) return l.link;
  const c = l.contact || '';
  if (/@/.test(c)) return `mailto:${c.trim()}`;
  const digits = c.replace(/\D/g, '');
  if (digits.length >= 9) {
    const intl = digits.startsWith('971') ? digits : digits.startsWith('0') ? '971' + digits.slice(1) : digits;
    return `https://wa.me/${intl}`;
  }
  return null;
}

function formatPrice(p) {
  const n = parseFloat(String(p).replace(/[^\d.]/g, ''));
  return isNaN(n) ? null : n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(200).json({ products: [], note: 'storage not configured' });

  try {
    const ids = await redis('ZRANGE', 'listings:approved', 0, -1, 'REV');
    if (!ids || !ids.length) return res.status(200).json({ products: [] });
    const raws = await redis('MGET', ...ids.map(i => `listing:${i}`));
    const products = raws
      .map(r => { try { return JSON.parse(r); } catch { return null; } })
      .filter(l => l && l.status === 'approved')
      .map(l => ({
        n: `${l.title} — ${l.car}`,
        src: 'Community listing',
        community: true,
        price: formatPrice(l.price),
        condition: l.condition || 'Used',
        img: null,
        featured: false,
        available: true,
        url: contactUrl(l)
      }));
    return res.status(200).json({ products });
  } catch (e) {
    console.error('listings error', e);
    return res.status(200).json({ products: [], error: String(e.message) });
  }
}
