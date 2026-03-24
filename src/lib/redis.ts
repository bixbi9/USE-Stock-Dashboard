// Upstash Redis cache via HTTP REST API — no npm package required.
// Works in Vercel serverless and Edge runtimes using plain fetch().
// When UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set
// (e.g. local dev without Redis), all operations are silent no-ops and
// the app falls back to in-memory cache or mock data.

const PRICE_CACHE_KEY = 'use:prices';
const PRICE_CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

async function upstashFetch(command: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!res.ok) throw new Error(`Upstash error: ${res.status}`);
  const json = await res.json() as { result: unknown };
  return json.result;
}

export async function getCachedPrices<T>(): Promise<T | null> {
  try {
    const result = await upstashFetch(['GET', PRICE_CACHE_KEY]);
    if (!result) return null;
    // Upstash returns strings; parse if needed
    return (typeof result === 'string' ? JSON.parse(result) : result) as T;
  } catch (err) {
    console.error('[Redis] getCachedPrices failed:', err);
    return null;
  }
}

export async function setCachedPrices<T>(prices: T): Promise<void> {
  try {
    await upstashFetch(['SET', PRICE_CACHE_KEY, JSON.stringify(prices), 'EX', PRICE_CACHE_TTL]);
  } catch (err) {
    console.error('[Redis] setCachedPrices failed:', err);
  }
}

export async function invalidatePriceCache(): Promise<void> {
  try {
    await upstashFetch(['DEL', PRICE_CACHE_KEY]);
  } catch (err) {
    console.error('[Redis] invalidatePriceCache failed:', err);
  }
}
