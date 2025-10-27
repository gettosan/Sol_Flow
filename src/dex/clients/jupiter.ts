/**
 * Jupiter DEX Client
 * API Integration for Jupiter's aggregated liquidity router
 */

import axios, { AxiosInstance } from 'axios';
import { DexClient } from '../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class JupiterClient implements DexClient {
  name = 'Jupiter';
  private apiClient: AxiosInstance;
  
  constructor() {
    this.apiClient = axios.create({
      baseURL: config.dex.jupiterApiUrl,
      timeout: config.dex.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  async getQuote(
    inputMint: string,
    outputMint: string,
    inputAmount: string,
    slippageBps: number = 50 // Default 0.5%
  ): Promise<any> {
    try {
      const response = await this.apiClient.get('/quote', {
        params: {
          inputMint,
          outputMint,
          amount: inputAmount,
          slippageBps: slippageBps,
        },
      });
      
      const quote = response.data;
      
      if (!quote || !quote.outAmount) {
        logger.debug(`No Jupiter quote available for ${inputMint} -> ${outputMint}`);
        return null;
      }
      
      logger.debug(`Jupiter quote: ${inputMint} -> ${outputMint}, output: ${quote.outAmount}`);
      
      return {
        inputAmount: inputAmount,
        outputAmount: quote.outAmount.toString(),
        priceImpact: this.calculatePriceImpact(quote, quote.outAmount),
        routes: this.parseRoutes(quote.routePlan || []),
        estimatedGas: 5000,
        timestamp: Date.now(),
        quoteId: `jup_${Date.now()}`,
        mevProtected: false,
        expiresAt: Date.now() + 60000, // 60 seconds
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.debug(`No Jupiter liquidity for ${inputMint} -> ${outputMint}`);
        return null;
      }
      
      logger.error(`Jupiter API error: ${error.message}`, error);
      return null;
    }
  }
  
  async getRoutes(inputMint: string, outputMint: string, amount: string): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/quote', {
        params: {
          inputMint,
          outputMint,
          amount,
        },
      });
      
      const quote = response.data;
      
      if (!quote || !quote.routePlan) {
        return [];
      }
      
      return this.parseRoutes(quote.routePlan);
    } catch (error: any) {
      logger.error(`Jupiter routes error: ${error.message}`);
      return [];
    }
  }
  
  async hasLiquidity(inputMint: string, outputMint: string): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/quote', {
        params: {
          inputMint,
          outputMint,
          amount: '1000000', // Small amount check
        },
      });
      
      return response.data?.outAmount != null;
    } catch (error) {
      return false;
    }
  }
  
  private calculatePriceImpact(quote: any, outputAmount: string): number {
    // Simplified price impact calculation
    // Real implementation would compare against spot price
    const inputAmount = quote.inAmount || 0;
    const outAmount = BigInt(outputAmount);
    const inAmount = BigInt(inputAmount);
    
    if (inAmount === 0n) return 0;
    
    const ratio = Number(outAmount) / Number(inAmount);
    return Math.max(0, Math.min(100, (1 - ratio) * 100));
  }
  
  private parseRoutes(routePlan: any[]): any[] {
    return routePlan.map((leg: any) => ({
      dex: 'Jupiter',
      percentage: 100 / routePlan.length,
      amountOut: leg.outAmount || '0',
      poolAddress: leg.swapInfo?.label || 'Unknown',
      priceImpact: this.calculatePriceImpact(leg, leg.outAmount),
    }));
  }
}

export const jupiterClient = new JupiterClient();

