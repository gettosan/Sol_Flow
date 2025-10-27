/**
 * Route Optimizer
 * Main service for finding optimal swap routes
 */

import { PathfindingRequest, PathfindingResult, RouteOptimizer } from './types';
import { SwapQuote, MultiLegRoute, RouteSegment, RouteLeg } from '../types';
import { Pathfinder } from './pathfinding';
import { LiquidityGraphBuilder } from './graph';
import { logger } from '../utils/logger';

export class SmartRouterOptimizer implements RouteOptimizer {
  private pathfinder: Pathfinder;
  private graphBuilder: LiquidityGraphBuilder;
  
  constructor() {
    this.graphBuilder = new LiquidityGraphBuilder();
    this.pathfinder = new Pathfinder();
  }
  
  /**
   * Find the best route for a swap
   */
  async findBestRoute(request: PathfindingRequest): Promise<PathfindingResult | null> {
    try {
      logger.info(`Optimizing route: ${request.inputMint} -> ${request.outputMint}`);
      
      // Build liquidity graph
      const mints = Array.from(new Set([request.inputMint, request.outputMint]));
      const graph = await this.graphBuilder.buildGraph(mints);
      
      // Find path using Dijkstra's
      const result = await this.pathfinder.findBestRoute(request, graph);
      
      if (result) {
        logger.info(
          `Route found: ${result.path.length} hops, efficiency: ${result.efficiency}%, ` +
          `output: ${result.totalAmountOut.toString()}`
        );
      }
      
      return result;
    } catch (error: any) {
      logger.error(`Route optimization error: ${error.message}`, error);
      return null;
    }
  }
  
  /**
   * Build multi-leg route from DEX quotes
   */
  buildMultiLegRoute(quote: SwapQuote): MultiLegRoute {
    // Note: This is a simplified conversion since SwapQuote doesn't contain inputMint/outputMint
    // In production, this would be passed separately or included in the quote
    const totalOutputAmount = quote.outputAmount;
    const totalPriceImpact = quote.priceImpact;
    const estimatedGas = quote.estimatedGas;
    
    // Convert RouteSegment to RouteLeg
    const legs: RouteLeg[] = quote.routes.map(segment => ({
      dex: segment.dex,
      inputMint: '', // Would be provided separately in production
      outputMint: '',
      inputAmount: segment.amountOut, // This would need proper tracking
      outputAmount: segment.amountOut,
      poolAddress: segment.poolAddress || '',
      priceImpact: segment.priceImpact,
    }));
    
    // Calculate efficiency based on output vs input
    const efficiency = this.calculateEfficiency(
      BigInt(quote.inputAmount),
      BigInt(totalOutputAmount),
      BigInt(estimatedGas)
    );
    
    return {
      legs,
      totalOutputAmount,
      efficiency,
      totalPriceImpact,
      estimatedGas,
    };
  }
  
  /**
   * Calculate total slippage for a route
   */
  calculateTotalSlippage(route: RouteSegment[]): number {
    return route.reduce((sum, segment) => sum + segment.priceImpact, 0);
  }
  
  /**
   * Get routing efficiency score (0-100%)
   */
  calculateEfficiency(amountIn: bigint, amountOut: bigint, fee: bigint): number {
    if (amountIn === 0n) return 0;
    
    // Efficiency = (amountOut - fee) / amountIn * 100
    const effectiveAmount = amountOut - fee;
    const efficiency = Number((effectiveAmount * 100n) / amountIn);
    
    return Math.min(100, Math.max(0, efficiency));
  }
  
  /**
   * Compare routes and select the best one
   */
  compareRoutes(route1: PathfindingResult, route2: PathfindingResult): PathfindingResult {
    // Prioritize higher efficiency, then lower slippage, then shorter path
    if (route1.efficiency > route2.efficiency) return route1;
    if (route2.efficiency > route1.efficiency) return route2;
    
    if (route1.totalSlippage < route2.totalSlippage) return route1;
    if (route2.totalSlippage < route1.totalSlippage) return route2;
    
    return route1.path.length <= route2.path.length ? route1 : route2;
  }
}

export const smartRouter = new SmartRouterOptimizer();

