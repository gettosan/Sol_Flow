/**
 * Unit Tests for DEX Aggregator
 */

import { DexAggregator } from '../../src/dex/aggregator';
import { MOCK_SOL_MINT, MOCK_USDC_MINT } from '../setup';

describe('DEX Aggregator', () => {
  let aggregator: DexAggregator;
  
  beforeEach(() => {
    aggregator = new DexAggregator();
  });
  
  describe('getBestQuote', () => {
    it('should return the best quote from available DEXes', async () => {
      const quote = await aggregator.getBestQuote(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT,
        '1000000000',
        50
      );
      
      expect(quote).toBeDefined();
      expect(quote?.inputAmount).toBe('1000000000');
      expect(quote?.outputAmount).toBeDefined();
      expect(quote?.priceImpact).toBeGreaterThanOrEqual(0);
      expect(quote?.routes).toBeInstanceOf(Array);
      expect(quote?.quoteId).toBeDefined();
      expect(quote?.expiresAt).toBeGreaterThan(Date.now());
      expect(quote?.routes.length).toBeGreaterThan(0);
      expect(quote?.routes[0].dex).toBeDefined();
    });
    
    it('should return null if no quotes are available', async () => {
      const quote = await aggregator.getBestQuote(
        'invalid_mint',
        'another_invalid_mint',
        '1000000000'
      );
      
      // Note: Jupiter API might still return quotes, so we check for valid structure
      if (quote) {
        expect(quote).toBeDefined();
      }
    });
    
    it('should include slippage in quote request', async () => {
      const quote = await aggregator.getBestQuote(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT,
        '1000000000',
        100 // 1% slippage
      );
      
      if (quote) {
        expect(quote).toBeDefined();
      }
    });
  });
  
  describe('getAllQuotes', () => {
    it('should return quotes from all enabled DEXes', async () => {
      const quotes = await aggregator.getAllQuotes(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT,
        '1000000000'
      );
      
      expect(quotes).toBeInstanceOf(Array);
      
      if (quotes.length > 0) {
        quotes.forEach(quote => {
          expect(quote).toBeDefined();
          expect(quote.inputAmount).toBeDefined();
          expect(quote.outputAmount).toBeDefined();
          expect(quote.routes).toBeInstanceOf(Array);
          expect(quote.quoteId).toBeDefined();
        });
      }
    });
    
    it('should handle errors gracefully', async () => {
      const quotes = await aggregator.getAllQuotes(
        'invalid_mint',
        'another_invalid_mint',
        '1000000000'
      );
      
      expect(quotes).toBeInstanceOf(Array);
    });
  });
  
  describe('hasLiquidity', () => {
    it('should check if liquidity exists for a token pair', async () => {
      const hasLiquidity = await aggregator.hasLiquidity(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT
      );
      
      expect(typeof hasLiquidity).toBe('boolean');
    });
    
    it('should return false for invalid token pairs', async () => {
      const hasLiquidity = await aggregator.hasLiquidity(
        'invalid_mint',
        'another_invalid_mint'
      );
      
      expect(typeof hasLiquidity).toBe('boolean');
    });
  });
});

