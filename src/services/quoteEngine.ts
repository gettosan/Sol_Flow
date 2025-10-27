/**
 * Quote Engine
 * Generates real-time quotes by aggregating DEX prices and finding optimal routes
 */

import { SwapQuote, QuoteRequest } from '../types';
import { dexAggregator } from '../dex/aggregator';
import { quoteCache } from '../database/redis/quoteCache';
import { logger } from '../utils/logger';
import { validateQuoteRequest } from '../utils/validators';

export class QuoteEngine {
  /**
   * Generate a quote for a swap request
   */
  async generateQuote(request: QuoteRequest): Promise<SwapQuote | null> {
    try {
      logger.info(`Generating quote for ${request.inputMint} -> ${request.outputMint}`);
      
      // Validate request
      try {
        validateQuoteRequest(request);
      } catch (error: any) {
        logger.warn(`Invalid quote request: ${error.message}`);
        return null;
      }
      
      // Check cache first
      const cachedQuote = await this.getCachedQuote(request);
      if (cachedQuote && !this.isQuoteExpired(cachedQuote)) {
        logger.debug('Returning cached quote');
        return cachedQuote;
      }
      
      // Get best quote from aggregator
      const aggregateQuote = await dexAggregator.getBestQuote(
        request.inputMint,
        request.outputMint,
        request.amount,
        request.slippage
      );
      
      if (!aggregateQuote) {
        logger.warn('No quote available from any DEX');
        return null;
      }
      
      // Enhance quote with smart routing (optional multi-hop optimization)
      const enhancedQuote = await this.enhanceQuoteWithRouting(
        request,
        aggregateQuote
      );
      
      // Cache the quote with proper serialization
      await quoteCache.cacheQuote(
        request.inputMint,
        request.outputMint,
        request.amount,
        enhancedQuote
      );
      
      return enhancedQuote;
    } catch (error: any) {
      logger.error(`Quote generation error: ${error.message}`, error);
      return null;
    }
  }
  
  /**
   * Get all quotes from all DEXes for comparison
   */
  async getAllQuotes(request: QuoteRequest): Promise<SwapQuote[]> {
    try {
      logger.debug(`Fetching all quotes for ${request.inputMint} -> ${request.outputMint}`);
      
      const quotes = await dexAggregator.getAllQuotes(
        request.inputMint,
        request.outputMint,
        request.amount,
        request.slippage
      );
      
      // Sort by output amount descending
      quotes.sort((a, b) => {
        const amountA = BigInt(a.outputAmount);
        const amountB = BigInt(b.outputAmount);
        if (amountA > amountB) return -1;
        if (amountA < amountB) return 1;
        return 0;
      });
      
      return quotes;
    } catch (error: any) {
      logger.error(`Error fetching all quotes: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Enhance quote with smart routing for multi-hop optimization
   */
  private async enhanceQuoteWithRouting(
    _request: QuoteRequest,
    quote: any
  ): Promise<SwapQuote> {
    // For now, return the aggregated quote directly
    // In production, this would use the smart router to find even better paths
    return quote;
  }
  
  /**
   * Get cached quote if available
   */
  private async getCachedQuote(request: QuoteRequest): Promise<SwapQuote | null> {
    try {
      const cached = await quoteCache.getQuote(
        request.inputMint,
        request.outputMint,
        request.amount
      );
      
      return cached;
    } catch (error) {
      logger.error(`Cache read error: ${error}`);
      return null;
    }
  }
  
  /**
   * Check if quote is expired
   */
  private isQuoteExpired(quote: SwapQuote): boolean {
    return Date.now() > quote.expiresAt;
  }
  
  /**
   * Build route display from quote
   */
  buildRouteDisplay(quote: SwapQuote): string {
    if (quote.routes.length === 0) {
      return 'Unknown route';
    }
    
    return quote.routes
      .map(segment => `${segment.dex} (${segment.percentage}%)`)
      .join(' → ');
  }
  
  /**
   * Calculate estimated execution time
   */
  estimateExecutionTime(quote: SwapQuote): number {
    // Base execution time per DEX
    const baseTime = 250; // ms per DEX
    return quote.routes.length * baseTime;
  }
  
  /**
   * Validate quote for execution
   */
  validateQuoteForExecution(quote: SwapQuote): { valid: boolean; reason?: string } {
    // Check expiration
    if (this.isQuoteExpired(quote)) {
      return { valid: false, reason: 'Quote expired' };
    }
    
    // Check price impact
    if (quote.priceImpact > 10) {
      return { valid: false, reason: 'Price impact too high (>10%)' };
    }
    
    // Check if we have routes
    if (quote.routes.length === 0) {
      return { valid: false, reason: 'No routes available' };
    }
    
    return { valid: true };
  }
}

export const quoteEngine = new QuoteEngine();

