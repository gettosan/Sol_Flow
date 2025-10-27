import { SwapQuote } from '../../types';
import { getRedisClient } from './client';

const TTL = 30; // 30 seconds
const PREFIX = 'quote:';

/**
 * Quote cache operations
 */
export class QuoteCache {
  private redis = getRedisClient();

  /**
   * Cache a quote
   */
  async set(quote: SwapQuote): Promise<void> {
    const key = this.getKey(quote.quoteId);
    await this.redis.setex(key, TTL, JSON.stringify(quote));
  }

  /**
   * Get cached quote
   */
  async get(quoteId: string): Promise<SwapQuote | null> {
    const key = this.getKey(quoteId);
    const data = await this.redis.get(key);

    if (!data) return null;

    const quote = JSON.parse(data) as SwapQuote;

    // Check if expired
    if (Date.now() > quote.expiresAt) {
      await this.redis.del(key);
      return null;
    }

    return quote;
  }

  /**
   * Delete quote
   */
  async delete(quoteId: string): Promise<void> {
    const key = this.getKey(quoteId);
    await this.redis.del(key);
  }

  /**
   * Cache route for token pair
   */
  async cacheRoute(inputMint: string, outputMint: string, amount: string, route: any): Promise<void> {
    const key = `route:${inputMint}:${outputMint}:${amount}`;
    await this.redis.setex(key, 60, JSON.stringify(route));
  }

  /**
   * Get cached route
   */
  async getRoute(inputMint: string, outputMint: string, amount: string): Promise<any | null> {
    const key = `route:${inputMint}:${outputMint}:${amount}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Cache liquidity data
   */
  async cacheLiquidity(poolAddress: string, liquidityData: any): Promise<void> {
    const key = `liquidity:${poolAddress}`;
    await this.redis.setex(key, 10, JSON.stringify(liquidityData));
  }

  /**
   * Get cached liquidity
   */
  async getLiquidity(poolAddress: string): Promise<any | null> {
    const key = `liquidity:${poolAddress}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Increment quote request counter (rate limiting)
   */
  async incrementQuoteRequests(userAddress: string): Promise<number> {
    const key = `rate:${userAddress}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }

    return count;
  }

  /**
   * Get key with prefix
   */
  private getKey(quoteId: string): string {
    return `${PREFIX}${quoteId}`;
  }
}

/**
 * Export singleton instance
 */
export const quoteCache = new QuoteCache();

