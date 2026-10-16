// api/_db.js — one tiny storage layer for listings, whichever Redis Vercel attached.
// (Files starting with "_" in api/ are helpers, not endpoints.)
//
//   REDIS_URL                      → Redis Cloud / any standard Redis (redis:// or rediss://)   [node-redis client]
//   UPSTASH_REDIS_REST_URL/TOKEN   → Upstash via Vercel Marketplace                              [HTTP]
//   KV_REST_API_URL/TOKEN          → legacy Vercel KV                                            [HTTP]

const TCP_URL = process.env.REDIS_URL;
const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const configured = !!(TCP_URL || (REST_URL && REST_TOKEN));

// ---------- HTTP backend ----------
async function rest(...cmd) {
  const r = await fetch(REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

// ---------- TCP backend (reused across warm invocations) ----------
let clientPromise = null;
async function client() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient } = await import('redis');
      const c = createClient({ url: TCP_URL, socket: { connectTimeout: 8000, reconnectStrategy: r => (r > 3 ? false : 200 * r) } });
      c.on('error', e => console.error('redis', e.message));
      await c.connect();
      return c;
    })().catch(e => { clientPromise = null; throw e; });
  }
  return clientPromise;
}

export const db = {
  async get(key) {
    return TCP_URL ? (await client()).get(key) : rest('GET', key);
  },
  async set(key, val) {
    return TCP_URL ? (await client()).set(key, val) : rest('SET', key, val);
  },
  async del(key) {
    return TCP_URL ? (await client()).del(key) : rest('DEL', key);
  },
  async mget(keys) {
    if (!keys.length) return [];
    return TCP_URL ? (await client()).mGet(keys) : rest('MGET', ...keys);
  },
  async zadd(zset, score, member) {
    return TCP_URL ? (await client()).zAdd(zset, { score, value: member }) : rest('ZADD', zset, score, member);
  },
  async zrem(zset, member) {
    return TCP_URL ? (await client()).zRem(zset, member) : rest('ZREM', zset, member);
  },
  // newest first
  async zrevrange(zset) {
    return TCP_URL ? (await client()).zRange(zset, 0, -1, { REV: true }) : rest('ZRANGE', zset, 0, -1, 'REV');
  }
};

// Convenience: load full listing objects for a zset, newest first.
export async function loadListings(zset) {
  const ids = await db.zrevrange(zset);
  if (!ids || !ids.length) return [];
  const raws = await db.mget(ids.map(i => `listing:${i}`));
  return raws.map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
}
