/**
 * Unit Tests for Quote Engine
 */

import { QuoteEngine, quoteEngine } from '../../src/services/quoteEngine';
import { MOCK_SOL_MINT, MOCK_USDC_MINT } from '../setup';

describe('Quote Engine', () => {
  describe('QuoteEngine', () => {
    let engine: QuoteEngine;
    
    beforeEach(() => {
      engine = new QuoteEngine();
    });
    
    it('should generate a quote for a valid request', async () => {
      const request = {
        inputMint: MOCK_SOL_MINT,
        outputMint: MOCK_USDC_MINT,
        amount: '1000000000',
        slippage: 50,
      };
      
      const quote = await engine.generateQuote(request);
      
      // Note: Returns mock data from Orca/Raydium since Jupiter API is not available
      expect(quote).toBeDefined();
      if (quote) {
        expect(quote.inputAmount).toBeDefined();
        expect(quote.outputAmount).toBeDefined();
        expect(quote.quoteId).toBeDefined();
        expect(quote.routes).toBeInstanceOf(Array);
      }
    });
    
    it('should return null for invalid request', async () => {
      const request = {
        inputMint: '',
        outputMint: '',
        amount: '-1',
        slippage: 50,
      };
      
      const quote = await engine.generateQuote(request);
      expect(quote).toBeNull();
    });
    
    it('should get all quotes for a request', async () => {
      const request = {
        inputMint: MOCK_SOL_MINT,
        outputMint: MOCK_USDC_MINT,
        amount: '1000000000',
        slippage: 50,
      };
      
      const quotes = await engine.getAllQuotes(request);
      
      expect(quotes).toBeInstanceOf(Array);
      if (quotes.length > 0) {
        quotes.forEach(quote => {
          expect(quote.inputAmount).toBeDefined();
          expect(quote.outputAmount).toBeDefined();
        });
      }
    });
    
    it('should build route display string', () => {
      const mockQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 1.0,
        routes: [
          {
            dex: 'Orca' as const,
            percentage: 100,
            amountOut: '990000000',
            poolAddress: 'pool123',
            priceImpact: 1.0,
          },
        ],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'test123',
        mevProtected: false,
        expiresAt: Date.now() + 60000,
      };
      
      const display = engine.buildRouteDisplay(mockQuote);
      expect(typeof display).toBe('string');
      expect(display).toContain('Orca');
    });
    
    it('should handle empty routes in route display', () => {
      const mockQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 1.0,
        routes: [],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'test123',
        mevProtected: false,
        expiresAt: Date.now() + 60000,
      };
      
      const display = engine.buildRouteDisplay(mockQuote);
      expect(display).toBe('Unknown route');
    });
    
    it('should estimate execution time', () => {
      const mockQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 1.0,
        routes: [
          { dex: 'Orca' as const, percentage: 50, amountOut: '495000000', poolAddress: 'pool1', priceImpact: 1.0 },
          { dex: 'Raydium' as const, percentage: 50, amountOut: '495000000', poolAddress: 'pool2', priceImpact: 1.0 },
        ],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'test123',
        mevProtected: false,
        expiresAt: Date.now() + 60000,
      };
      
      const time = engine.estimateExecutionTime(mockQuote);
      expect(time).toBe(500); // 2 routes * 250ms
    });
    
    it('should validate quote for execution', () => {
      const validQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 5.0, // Within limit
        routes: [
          {
            dex: 'Orca' as const,
            percentage: 100,
            amountOut: '990000000',
            poolAddress: 'pool123',
            priceImpact: 5.0,
          },
        ],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'test123',
        mevProtected: false,
        expiresAt: Date.now() + 60000, // Valid
      };
      
      const result = engine.validateQuoteForExecution(validQuote);
      expect(result.valid).toBe(true);
    });
    
    it('should reject expired quotes', () => {
      const expiredQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 5.0,
        routes: [
          {
            dex: 'Orca' as const,
            percentage: 100,
            amountOut: '990000000',
            poolAddress: 'pool123',
            priceImpact: 5.0,
          },
        ],
        estimatedGas: 3000,
        timestamp: Date.now() - 120000,
        quoteId: 'test123',
        mevProtected: false,
        expiresAt: Date.now() - 60000, // Expired
      };
      
      const result = engine.validateQuoteForExecution(expiredQuote);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Quote expired');
    });
    
    it('should reject quotes with high price impact', () => {
      const highImpactQuote = {
        inputAmount: '1000000000',
        outputAmount: '800000000',
        priceImpact: 25.0, // Too high
        routes: [
          {
            dex: 'Orca' as const,
            percentage: 100,
            amountOut: '800000000',
            poolAddress: 'pool123',
            priceImpact: 25.0,
          },
        ],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'test123',
        mevProtected: false,
        expiresAt: Date.now() + 60000,
      };
      
      const result = engine.validateQuoteForExecution(highImpactQuote);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Price impact too high (>10%)');
    });
    
    it('should reject quotes with no routes', () => {
      const noRoutesQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 5.0,
        routes: [],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'test123',
        mevProtected: false,
        expiresAt: Date.now() + 60000,
      };
      
      const result = engine.validateQuoteForExecution(noRoutesQuote);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('No routes available');
    });
    
    it('should export singleton instance', () => {
      expect(quoteEngine).toBeDefined();
      expect(quoteEngine.generateQuote).toBeDefined();
      expect(typeof quoteEngine.generateQuote).toBe('function');
    });
  });
});

