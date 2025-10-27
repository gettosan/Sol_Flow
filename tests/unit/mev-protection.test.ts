/**
 * Unit Tests for MEV Protection Service
 */

import { describe, it, expect } from '@jest/globals';
import { mevProtectionService } from '../../src/solana/mevProtection';
import { SwapQuote } from '../../src/types';

describe('MEV Protection Service', () => {
  describe('MevProtectionService', () => {
    it('should assess MEV risk correctly for low risk swaps', () => {
      const lowRiskQuote: SwapQuote = {
        inputAmount: '1000000000', // 1 SOL
        outputAmount: '100000000', // 0.1 USDC
        priceImpact: 0.5,
        routes: [
          {
            dex: 'Orca' as const,
            percentage: 100,
            amountOut: '100000000',
            poolAddress: 'pool1',
            priceImpact: 0.5,
          },
        ],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'low-risk-test',
        mevProtected: true,
        expiresAt: Date.now() + 60000,
      };

      const risk = mevProtectionService.assessMevRisk(
        lowRiskQuote,
        BigInt(lowRiskQuote.inputAmount),
        100 // $100 estimated value
      );

      expect(risk.level).toBe('low');
      expect(risk.score).toBeLessThan(30);
      expect(risk.protections).toContain('Standard slippage protection');
    });

    it('should assess MEV risk correctly for high risk swaps', () => {
      const highRiskQuote: SwapQuote = {
        inputAmount: '100000000000', // 100 SOL
        outputAmount: '5000000000', // 5 USDC
        priceImpact: 10.0,
        routes: [
          { dex: 'Jupiter' as const, percentage: 30, amountOut: '1500000000', poolAddress: 'pool1', priceImpact: 10 },
          { dex: 'Orca' as const, percentage: 40, amountOut: '2000000000', poolAddress: 'pool2', priceImpact: 10 },
          { dex: 'Raydium' as const, percentage: 30, amountOut: '1500000000', poolAddress: 'pool3', priceImpact: 10 },
          { dex: 'Orca' as const, percentage: 20, amountOut: '1000000000', poolAddress: 'pool4', priceImpact: 10 },
        ],
        estimatedGas: 10000,
        timestamp: Date.now(),
        quoteId: 'high-risk-test',
        mevProtected: false,
        expiresAt: Date.now() + 60000,
      };

      const risk = mevProtectionService.assessMevRisk(
        highRiskQuote,
        BigInt(highRiskQuote.inputAmount),
        10000 // $10k estimated value
      );

      expect(risk.level).toBe('high');
      expect(risk.score).toBeGreaterThanOrEqual(60);
      expect(risk.protections).toContain('Route randomization');
      expect(risk.protections).toContain('Private mempool submission');
      expect(risk.protections).toContain('Time-delay execution');
    });

    it('should randomize routes to prevent pattern recognition', () => {
      const originalRoutes = [
        { dex: 'Jupiter' as const, percentage: 50, amountOut: '500000000', poolAddress: 'pool1', priceImpact: 1 },
        { dex: 'Orca' as const, percentage: 30, amountOut: '300000000', poolAddress: 'pool2', priceImpact: 1 },
        { dex: 'Raydium' as const, percentage: 20, amountOut: '200000000', poolAddress: 'pool3', priceImpact: 1 },
      ];

      const randomized = mevProtectionService.randomizeRoute(originalRoutes);

      expect(randomized.length).toBe(originalRoutes.length);
      
      // Check that all routes are still present
      const originalDexes = originalRoutes.map(r => r.dex).sort();
      const randomizedDexes = randomized.map(r => r.dex).sort();
      expect(randomizedDexes).toEqual(originalDexes);
    });

    it('should handle single route without randomization', () => {
      const singleRoute = [
        { dex: 'Orca' as const, percentage: 100, amountOut: '1000000000', poolAddress: 'pool1', priceImpact: 1 },
      ];

      const result = mevProtectionService.randomizeRoute(singleRoute);

      expect(result).toEqual(singleRoute);
    });

    it('should calculate private fee based on risk level', () => {
      const baseFee = 0.01; // 0.01 SOL

      const lowFee = mevProtectionService.calculatePrivateFee('low', baseFee);
      const mediumFee = mevProtectionService.calculatePrivateFee('medium', baseFee);
      const highFee = mevProtectionService.calculatePrivateFee('high', baseFee);

      expect(lowFee).toBe(baseFee);
      expect(mediumFee).toBe(baseFee * 2);
      expect(highFee).toBe(baseFee * 5);
    });

    it('should detect potential front-running opportunities', () => {
      const quote: SwapQuote = {
        inputAmount: '1000000000',
        outputAmount: '120000000', // High output (better than average)
        priceImpact: 2.0,
        routes: [],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'front-running-test',
        mevProtected: false,
        expiresAt: Date.now() + 60000,
      };

      const recentPrice = 0.10; // Recent rate: 10%
      const detection = mevProtectionService.detectFrontRunning(quote, recentPrice);

      expect(detection.detected).toBe(true);
      expect(detection.confidence).toBeGreaterThan(0);
      expect(detection.reason).toBeDefined();
    });

    it('should not detect front-running for normal quotes', () => {
      const quote: SwapQuote = {
        inputAmount: '1000000000',
        outputAmount: '100000000', // Normal output
        priceImpact: 1.0,
        routes: [],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'normal-quote',
        mevProtected: true,
        expiresAt: Date.now() + 60000,
      };

      const recentPrice = 0.10; // Recent rate: 10%
      const detection = mevProtectionService.detectFrontRunning(quote, recentPrice);

      expect(detection.detected).toBe(false);
      expect(detection.confidence).toBeLessThan(0.5);
    });

    it('should add time delay for high risk swaps', async () => {
      const startTime = Date.now();
      
      await mevProtectionService.addTimeDelay(100);
      
      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should have delayed by at least 100ms (but could be more due to randomization)
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });
});

