/**
 * Pathfinding Algorithm (Modified Dijkstra's for Multi-DEX Routing)
 * Finds optimal multi-hop routes across liquidity pools
 */

import { PathfindingRequest, PathfindingResult, LiquidityGraph, PoolEdge } from './types';
import { RouteLeg } from '../types';
import { logger } from '../utils/logger';

export class Pathfinder {
  constructor() {
    // Graph builder would be used in production
  }
  
  /**
   * Find best route using Dijkstra's algorithm
   */
  async findBestRoute(
    request: PathfindingRequest,
    graph: LiquidityGraph
  ): Promise<PathfindingResult | null> {
    try {
      logger.debug(`Finding route: ${request.inputMint} -> ${request.outputMint}`);
      
      // Check for direct path first
      const directPool = this.findDirectPool(request.inputMint, request.outputMint, graph);
      if (directPool) {
        return this.buildDirectRoute(request, directPool);
      }
      
      // Use Dijkstra's for multi-hop routing
      const result = await this.dijkstraSearch(request, graph);
      
      if (!result) {
        logger.warn(`No path found between ${request.inputMint} and ${request.outputMint}`);
        return null;
      }
      
      return result;
    } catch (error: any) {
      logger.error(`Pathfinding error: ${error.message}`, error);
      return null;
    }
  }
  
  /**
   * Dijkstra's shortest path algorithm
   */
  private async dijkstraSearch(
    request: PathfindingRequest,
    graph: LiquidityGraph
  ): Promise<PathfindingResult | null> {
    // Priority queue: [mint, distance, path, accumulated fee, accumulated slippage]
    const queue: Array<[string, bigint, string[], bigint, number]> = [];
    const distances = new Map<string, bigint>();
    const previous = new Map<string, [string, PoolEdge]>();
    
    // Initialize distances
    distances.set(request.inputMint, 0n);
    queue.push([request.inputMint, 0n, [request.inputMint], 0n, 0]);
    
    while (queue.length > 0) {
      queue.sort((a, b) => Number(a[1] - b[1])); // Sort by distance (ascending)
      const [currentMint, currentDistance, path, currentFee, currentSlippage] = queue.shift()!;
      
      // Check if we reached the target
      if (currentMint === request.outputMint) {
        return this.buildResult(request, path, previous);
      }
      
      // Check hop limit
      if (path.length > request.maxHops + 1) {
        continue;
      }
      
      // Explore neighbors
      const neighbors = graph.edges.get(currentMint) || [];
      
      for (const edge of neighbors) {
        const nextMint = edge.toMint;
        const edgeFee = this.calculateFee(request.amount, edge.feeBps);
        const newDistance = currentDistance + edgeFee;
        
        // Check if this is a better path
        const existingDistance = distances.get(nextMint);
        if (!existingDistance || newDistance < existingDistance) {
          distances.set(nextMint, newDistance);
          previous.set(nextMint, [currentMint, edge]);
          
          const newPath = [...path, nextMint];
          queue.push([nextMint, newDistance, newPath, currentFee + edgeFee, currentSlippage]);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Find direct pool between two mints
   */
  private findDirectPool(
    fromMint: string,
    toMint: string,
    graph: LiquidityGraph
  ): PoolEdge | null {
    const neighbors = graph.edges.get(fromMint) || [];
    return neighbors.find(edge => edge.toMint === toMint) || null;
  }
  
  /**
   * Build direct route result
   */
  private buildDirectRoute(
    request: PathfindingRequest,
    pool: PoolEdge
  ): PathfindingResult {
    const amountOut = this.calculateAmountOut(request.amount, pool);
    const leg: RouteLeg = {
      dex: pool.dex,
      inputMint: pool.fromMint,
      outputMint: pool.toMint,
      inputAmount: request.amount.toString(),
      outputAmount: amountOut.toString(),
      poolAddress: pool.poolAddress,
      priceImpact: this.calculateSlippage(pool),
    };
    
    return {
      path: [request.inputMint, request.outputMint],
      routeLegs: [leg],
      totalAmountOut: amountOut,
      totalFee: this.calculateFee(request.amount, pool.feeBps),
      totalSlippage: this.calculateSlippage(pool),
      efficiency: this.calculateEfficiency(request.amount, amountOut, pool.feeBps),
    };
  }
  
  /**
   * Build multi-hop route result
   */
  private buildResult(
    request: PathfindingRequest,
    path: string[],
    previous: Map<string, [string, PoolEdge]>
  ): PathfindingResult | null {
    if (path.length < 2) return null;
    
    const legs: RouteLeg[] = [];
    let currentMint = request.outputMint;
    
    // Reconstruct path from end to start
    while (currentMint !== request.inputMint && previous.has(currentMint)) {
      const [prevMint, edge] = previous.get(currentMint)!;
      
      // Build RouteLeg with required fields
      const amountOut = this.calculateAmountOut(request.amount, edge);
      legs.push({
        dex: edge.dex,
        inputMint: prevMint,
        outputMint: currentMint,
        inputAmount: request.amount.toString(), // Simplified - would need actual amounts
        outputAmount: amountOut.toString(),
        poolAddress: edge.poolAddress,
        priceImpact: this.calculateSlippage(edge),
      });
      
      currentMint = prevMint;
    }
    
    // Reverse to get correct order
    legs.reverse();
    
    const lastLeg = legs[legs.length - 1];
    const totalAmountOut = lastLeg ? BigInt(lastLeg.outputAmount) : 0n;
    const totalFee = legs.reduce((sum) => {
      const edge = previous.get(currentMint)?.[1];
      return sum + (edge ? this.calculateFee(request.amount, edge.feeBps) : 0n);
    }, 0n);
    
    return {
      path,
      routeLegs: legs,
      totalAmountOut,
      totalFee,
      totalSlippage: this.calculateRouteSlippage(legs),
      efficiency: this.calculateEfficiency(request.amount, totalAmountOut, Number(totalFee)),
    };
  }
  
  /**
   * Calculate output amount for a swap (simplified constant product formula)
   */
  private calculateAmountOut(amountIn: bigint, pool: PoolEdge): bigint {
    // Simplified AMM formula: amountOut = (amountIn * reserveOut) / (amountIn + reserveIn)
    // Using pool.liquidity as proxy for reserves
    const liquidityReserve = pool.liquidity;
    return (amountIn * liquidityReserve) / (amountIn + liquidityReserve) / 2n;
  }
  
  /**
   * Calculate fee for a swap
   */
  private calculateFee(amount: bigint, feeBps: number): bigint {
    return (amount * BigInt(feeBps)) / 10000n;
  }
  
  /**
   * Calculate slippage for a pool
   */
  private calculateSlippage(pool: PoolEdge): number {
    // Simplified: base slippage on liquidity
    const baseSlippage = 0.5; // 0.5%
    return baseSlippage + (Number(pool.feeBps) / 100);
  }
  
  /**
   * Calculate route slippage
   */
  private calculateRouteSlippage(legs: RouteLeg[]): number {
    return legs.reduce((sum) => sum + 0.5, 0); // Simplified
  }
  
  /**
   * Calculate routing efficiency
   */
  private calculateEfficiency(amountIn: bigint, amountOut: bigint, fee: number | bigint): number {
    const feeAmount = typeof fee === 'number' ? BigInt(Math.floor(fee)) : fee;
    const effectiveAmountOut = amountOut + feeAmount;
    const efficiency = Number(effectiveAmountOut * 100n / amountIn);
    return Math.min(100, Math.max(0, efficiency));
  }
}

