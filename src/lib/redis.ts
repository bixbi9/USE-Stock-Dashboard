// Upstash Redis client for persistent cross-request caching on Vercel.
// When UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set
// (e.g. local dev without Redis), all operations return null/void
// and the app falls back to in-memory cache or mock data.

import { Redis } from '@upstash/redis';

const PRICE_CACHE_KEY = 'use:prices';
const PRICE_CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

function getClient(): Redis | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function getCachedPrices<T>(): Promise<T | null> {
  try {
    const client = getClient();
    if (!client) return null;
    return await client.get<T>(PRICE_CACHE_KEY);
  } catch (err) {
    console.error('[Redis] getCachedPrices failed:', err);
    return null;
  }
}

export async function setCachedPrices<T>(prices: T): Promise<void> {
  try {
    const client = getClient();
    if (!client) return;
    await client.set(PRICE_CACHE_KEY, prices, { ex: PRICE_CACHE_TTL });
  } catch (err) {
    console.error('[Redis] setCachedPrices failed:', err);
  }
}

export async function invalidatePriceCache(): Promise<void> {
  try {
    const client = getClient();
    if (!client) return;
    await client.del(PRICE_CACHE_KEY);
  } catch (err) {
    console.error('[Redis] invalidatePriceCache failed:', err);
  }
}
