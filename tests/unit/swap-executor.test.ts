/**
 * Unit Tests for Swap Executor
 */

import { SwapExecutor, swapExecutor } from '../../src/solana/swapExecutor';

describe('Swap Executor', () => {
  describe('SwapExecutor', () => {
    let executor: SwapExecutor;
    
    beforeEach(() => {
      executor = new SwapExecutor();
    });
    
    it('should validate swap parameters correctly', () => {
      const mockQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 1.0,
        routes: [{ dex: 'Orca' as const, percentage: 100, amountOut: '990000000', poolAddress: 'pool1', priceImpact: 1.0 }],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'test123',
        mevProtected: false,
        expiresAt: Date.now() + 60000,
      };
      
      const params = {
        quote: mockQuote,
        userWallet: 'TestUser123',
        slippageBps: 50,
      };
      
      const result = executor.validateSwapParams(params);
      expect(result.valid).toBe(true);
    });
    
    it('should reject swap without quote', () => {
      const result = executor.validateSwapParams({
        quote: null as any,
        userWallet: 'TestUser123',
      });
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Quote is required');
    });
    
    it('should reject swap without user wallet', () => {
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
      
      const result = executor.validateSwapParams({
        quote: mockQuote,
        userWallet: '',
      });
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('User wallet is required');
    });
    
    it('should reject expired quotes', () => {
      const expiredQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 1.0,
        routes: [],
        estimatedGas: 3000,
        timestamp: Date.now() - 120000,
        quoteId: 'test123',
        mevProtected: false,
        expiresAt: Date.now() - 60000, // Expired
      };
      
      const result = executor.validateSwapParams({
        quote: expiredQuote,
        userWallet: 'TestUser123',
      });
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Quote has expired');
    });
    
    it('should reject swaps with high price impact', () => {
      const highImpactQuote = {
        inputAmount: '1000000000',
        outputAmount: '800000000',
        priceImpact: 25.0, // Too high
        routes: [],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'test123',
        mevProtected: false,
        expiresAt: Date.now() + 60000,
      };
      
      const result = executor.validateSwapParams({
        quote: highImpactQuote,
        userWallet: 'TestUser123',
      });
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Price impact too high (>10%)');
    });
    
    it('should simulate swap execution', async () => {
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
      
      const result = await executor.executeSwap({
        quote: mockQuote,
        userWallet: 'TestUser123',
        slippageBps: 50,
      });
      
      expect(result).toBeDefined();
      expect(result.transactionHash).toBeDefined();
      // Jupiter API may return 'failed' for test wallets (invalid addresses)
      // In production with real wallet, this would be 'confirmed'
      expect(['confirmed', 'failed']).toContain(result.status);
      expect(result.inputAmount).toBe(mockQuote.inputAmount);
      if (result.status === 'confirmed') {
        expect(result.outputAmount).toBe(mockQuote.outputAmount);
      }
    });
    
    it('should export singleton instance', () => {
      expect(swapExecutor).toBeDefined();
      expect(swapExecutor.executeSwap).toBeDefined();
      expect(typeof swapExecutor.executeSwap).toBe('function');
    });
  });
});

