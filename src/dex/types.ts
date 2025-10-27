/**
 * DEX Client Types and Interfaces
 */

import { SwapQuote, RouteSegment } from '../types';

export interface DexClient {
  name: string;
  
  /**
   * Get a quote for swapping tokens
   */
  getQuote(
    inputMint: string,
    outputMint: string,
    inputAmount: string,
    slippageBps?: number
  ): Promise<SwapQuote | null>;
  
  /**
   * Get available routes between two tokens
   */
  getRoutes(
    inputMint: string,
    outputMint: string,
    amount: string
  ): Promise<RouteSegment[]>;
  
  /**
   * Check if this DEX has liquidity for the given token pair
   */
  hasLiquidity(inputMint: string, outputMint: string): Promise<boolean>;
}

export interface DexQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  route: RouteSegment[];
  dex: string;
  estimatedTimeMs: number;
}

export interface DexLiquidityInfo {
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  liquidityA: string;
  liquidityB: string;
  tvl: number;
  volume24h: number;
  feeBps: number;
}

export interface DexPoolData {
  address: string;
  tokenA: string;
  tokenB: string;
  reserves: {
    tokenA: string;
    tokenB: string;
  };
  feeBps: number;
  dex: string;
}

export type DexName = 'Jupiter' | 'Orca' | 'Raydium';

export interface DexConfig {
  name: DexName;
  enabled: boolean;
  priority: number; // Lower is higher priority
  apiUrl?: string;
  maxSlippageBps?: number;
}

