// api/shops.js — PartHunter live product feed aggregator (Vercel)
// Pulls live products from partner shops' public Shopify feeds, maps them to
// PartHunter card format, and returns them. Reads live each call — no stored
// copy, so prices/listings can't be edited on our end and stay current.
//
// To add a shop later: add an entry to the SHOPS array below. That's it.

const SHOPS = [
  {
    name: 'Name-it Performance',
    slug: 'name-it',
    feed: 'https://www.name-it.ae/products.json',
    store: 'https://www.name-it.ae',
    featured: true
  }
  // Add future shops here, e.g.:
  // { name: 'Deep Performance', slug: 'deep', feed: 'https://deepperformance.com/products.json', store: 'https://www.deepperformance.com', featured: true }
];

// Pick a representative emoji from the product title/type for the card visual
// fallback (used only if no image). Kept simple and brand-appropriate.
function pickEmoji(title = '', type = '') {
  const t = (title + ' ' + type).toLowerCase();
  if (t.includes('wheel') || t.includes('bbs') || t.includes('rim')) return '🛞';
  if (t.includes('coilover') || t.includes('suspension') || t.includes('kw')) return '🔧';
  if (t.includes('turbo') || t.includes('inlet') || t.includes('intake')) return '🌀';
  if (t.includes('exhaust') || t.includes('downpipe')) return '💨';
  if (t.includes('carbon') || t.includes('mirror') || t.includes('winglet') || t.includes('spoiler')) return '🏎️';
  if (t.includes('brace') || t.includes('chassis')) return '🔩';
  if (t.includes('tune') || t.includes('ecu') || t.includes('map')) return '⚙️';
  return '🔧';
}

// Map one Shopify product to a PartHunter card.
function mapProduct(p, shop) {
  // Lowest available variant price (so the card shows "from" the cheapest option)
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const prices = variants
    .map(v => parseFloat(v.price))
    .filter(n => !isNaN(n) && n > 1); // ignore placeholder AED 1 "enquiry" listings as real price
  const anyAvailable = variants.some(v => v.available);

  // Format price with thousands separators, no decimals if whole
  let priceStr = null;
  if (prices.length) {
    const min = Math.min(...prices);
    priceStr = min.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  const img = Array.isArray(p.images) && p.images.length ? p.images[0].src : null;

  return {
    n: p.title,
    src: shop.name,
    slug: shop.slug,
    price: priceStr,            // may be null -> front end shows "Enquire"
    img,                         // real product image URL
    emoji: pickEmoji(p.title, p.product_type),
    condition: 'New',
    featured: !!shop.featured,
    available: anyAvailable,
    url: `${shop.store}/products/${p.handle}`
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Light caching: let the CDN hold the response briefly so we're not hitting
  // shop feeds on every single page load, while staying effectively live.
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');

  const all = [];
  const errors = [];

  await Promise.all(SHOPS.map(async (shop) => {
    try {
      const r = await fetch(shop.feed, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) { errors.push(`${shop.name}: HTTP ${r.status}`); return; }
      const data = await r.json();
      const products = Array.isArray(data.products) ? data.products : [];
      for (const p of products) {
        const card = mapProduct(p, shop);
        if (card.n) all.push(card);
      }
    } catch (e) {
      errors.push(`${shop.name}: ${String(e)}`);
    }
  }));

  return res.status(200).json({ products: all, errors });
}
