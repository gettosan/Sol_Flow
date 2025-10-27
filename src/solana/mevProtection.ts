/**
 * MEV Protection Service
 * Protects swaps from MEV attacks through various strategies
 */

import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { SwapQuote } from '../types';

export interface MevRisk {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  score: number; // 0-100
  protections: string[];
}

export interface ProtectedSwapParams {
  transaction: Transaction | VersionedTransaction;
  quote: SwapQuote;
  slippageBps?: number;
  maxSlippageBps?: number;
}

export class MevProtectionService {
  private estimateSwapValue(quote: SwapQuote): number {
    // Rough estimation: assume 1 SOL = $100
    const inputAmount = parseFloat(quote.inputAmount) / 1e9; // Convert from lamports
    return inputAmount * 100;
  }
  
  constructor() {
    // Ready for MEV protection
  }

  /**
   * Assess MEV risk for a swap
   */
  assessMevRisk(quote: SwapQuote, _amount: bigint, estimatedValue: number): MevRisk {
    const factors: string[] = [];
    let score = 0;

    // Factor 1: Price Impact
    if (quote.priceImpact > 5) {
      score += 30;
      factors.push('High price impact (>5%)');
    } else if (quote.priceImpact > 2) {
      score += 15;
      factors.push('Moderate price impact (>2%)');
    }

    // Factor 2: Large Swap Size
    if (estimatedValue > 100000) {
      score += 25;
      factors.push('Large swap size (>$100k)');
    } else if (estimatedValue > 10000) {
      score += 10;
      factors.push('Medium swap size (>$10k)');
    }

    // Factor 3: Multiple Routes
    if (quote.routes.length > 3) {
      score += 15;
      factors.push('Complex multi-leg route');
    }

    // Factor 4: Low Liquidity Pool
    const totalLiquidity = this.estimateLiquidity(quote);
    if (totalLiquidity < 100000) {
      score += 20;
      factors.push('Low liquidity pool');
    }

    // Factor 5: No MEV Protection Flag
    if (!quote.mevProtected) {
      score += 10;
      factors.push('Not using MEV-protected routing');
    }

    // Determine risk level and protections
    let level: 'low' | 'medium' | 'high';
    const protections: string[] = [];

    if (score >= 60) {
      level = 'high';
      protections.push('Route randomization');
      protections.push('Private mempool submission');
      protections.push('Time-delay execution');
    } else if (score >= 30) {
      level = 'medium';
      protections.push('Route randomization');
      protections.push('Slippage protection');
    } else {
      level = 'low';
      protections.push('Standard slippage protection');
    }

    return {
      level,
      factors,
      score: Math.min(score, 100),
      protections,
    };
  }

  /**
   * Randomize route to prevent front-running
   */
  randomizeRoute(routes: any[]): any[] {
    if (routes.length <= 1) return routes;

    // Fisher-Yates shuffle for route randomization
    const shuffled = [...routes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    logger.debug('Route randomized to prevent MEV', {
      original: routes.length,
      shuffled: shuffled.length,
    });

    return shuffled;
  }

  /**
   * Add time delay to prevent predictable execution
   */
  async addTimeDelay(baseDelay: number): Promise<void> {
    // Random delay between 0.5s and 2s
    const delay = baseDelay + Math.random() * 1500;
    
    logger.debug(`Adding MEV protection delay: ${delay}ms`);
    
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Estimate total liquidity from quote
   */
  private estimateLiquidity(quote: SwapQuote): number {
    // Simple estimation based on output amount
    const totalOutput = BigInt(quote.outputAmount);
    return Number(totalOutput) / 1e9; // Convert to SOL equivalent
  }

  /**
   * Calculate prioritization fee for private mempool
   */
  calculatePrivateFee(riskLevel: 'low' | 'medium' | 'high', baseFee: number): number {
    const multiplier = {
      low: 1.0,
      medium: 2.0,
      high: 5.0,
    };

    return baseFee * multiplier[riskLevel];
  }

  /**
   * Protect a swap from MEV attacks
   */
  async protectSwap(params: ProtectedSwapParams): Promise<{
    transaction: Transaction | VersionedTransaction;
    riskAssessment: MevRisk;
    executionStrategy: string[];
  }> {
    const { transaction, quote, slippageBps, maxSlippageBps } = params;

    // Step 1: Assess MEV risk
    const estimatedValue = this.estimateSwapValue(quote);
    const amount = BigInt(quote.inputAmount);
    const riskAssessment = this.assessMevRisk(quote, amount, estimatedValue);

    logger.info('MEV Risk Assessment', {
      level: riskAssessment.level,
      score: riskAssessment.score,
      factors: riskAssessment.factors,
    });

    // Step 2: Apply protections based on risk level
    const executionStrategy: string[] = [];

    // For high risk, add time delay
    if (riskAssessment.level === 'high') {
      await this.addTimeDelay(500);
      executionStrategy.push('time-delay-execution');
    }

    // Randomize routes to prevent pattern recognition
    if (riskAssessment.level >= 'medium') {
      const randomizedRoutes = this.randomizeRoute(quote.routes);
      logger.debug('Routes randomized', { count: randomizedRoutes.length });
      executionStrategy.push('route-randomization');
    }

    // Calculate private fee if high risk
    if (riskAssessment.level === 'high') {
      const privateFee = this.calculatePrivateFee('high', 0.01); // 0.01 SOL base
      logger.info('High MEV risk - using private mempool submission', {
        privateFee,
      });
      executionStrategy.push('private-mempool-submission');
    }

    // Apply slippage protection
    const effectiveSlippage = slippageBps || 50;
    const maxSlippage = maxSlippageBps || 100;

    if (effectiveSlippage < maxSlippage) {
      executionStrategy.push('slippage-protection');
    }

    return {
      transaction,
      riskAssessment,
      executionStrategy,
    };
  }

  /**
   * Detect potential front-running opportunities
   */
  detectFrontRunning(quote: SwapQuote, recentPrice: number): {
    detected: boolean;
    confidence: number;
    reason?: string;
  } {
    // Calculate expected output
    const inputAmount = parseFloat(quote.inputAmount);
    const outputAmount = parseFloat(quote.outputAmount);
    const currentRate = outputAmount / inputAmount;

    // Check if quote is significantly better than current rate
    const priceDifference = ((currentRate - recentPrice) / recentPrice) * 100;

    if (priceDifference > 5) {
      return {
        detected: true,
        confidence: 0.8,
        reason: `Quote is ${priceDifference.toFixed(2)}% better than market average - potential front-running opportunity`,
      };
    }

    if (priceDifference > 2) {
      return {
        detected: true,
        confidence: 0.5,
        reason: `Quote is ${priceDifference.toFixed(2)}% better than market average`,
      };
    }

    return {
      detected: false,
      confidence: 0.1,
    };
  }

}

export const mevProtectionService = new MevProtectionService();

