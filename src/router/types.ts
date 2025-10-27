/**
 * Smart Router Types and Interfaces
 */

import { SwapQuote, RouteSegment, MultiLegRoute, RouteLeg } from '../types';

export { RouteLeg };

export interface PoolEdge {
  fromMint: string;
  toMint: string;
  dex: string;
  poolAddress: string;
  feeBps: number;
  liquidity: bigint;
  virtualPrice: number; // Price ratio for routing decision
}

export interface LiquidityGraph {
  edges: Map<string, PoolEdge[]>; // mint -> list of available pools
  allMints: Set<string>;
}

export interface PathfindingRequest {
  inputMint: string;
  outputMint: string;
  amount: bigint;
  maxHops: number;
  maxSlippageBps: number;
  preferredDexes?: string[];
}

export interface PathfindingResult {
  path: string[]; // Array of mint addresses representing the route
  routeLegs: RouteLeg[];
  totalAmountOut: bigint;
  totalFee: bigint;
  totalSlippage: number;
  efficiency: number; // 0-100%
}

export interface RouteOptimizer {
  /**
   * Find the best route for a swap
   */
  findBestRoute(request: PathfindingRequest): Promise<PathfindingResult | null>;
  
  /**
   * Build multi-leg route from DEX quotes
   */
  buildMultiLegRoute(quote: SwapQuote): MultiLegRoute;
  
  /**
   * Calculate total slippage for a route
   */
  calculateTotalSlippage(route: RouteSegment[]): number;
  
  /**
   * Get routing efficiency score
   */
  calculateEfficiency(amountIn: bigint, amountOut: bigint, fee: bigint): number;
}

export interface GraphBuilder {
  /**
   * Build liquidity graph from available pools
   */
  buildGraph(mints: string[]): Promise<LiquidityGraph>;
  
  /**
   * Add pool to graph
   */
  addPool(pool: PoolEdge): void;
  
  /**
   * Get available paths between two mints
   */
  getPaths(fromMint: string, toMint: string, maxHops: number): string[][];
}

