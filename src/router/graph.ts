/**
 * Liquidity Graph Builder
 * Constructs and manages the liquidity pool graph for pathfinding
 */

import { GraphBuilder, LiquidityGraph, PoolEdge } from './types';
import { logger } from '../utils/logger';

export class LiquidityGraphBuilder implements GraphBuilder {
  private graph: LiquidityGraph;
  
  constructor() {
    this.graph = {
      edges: new Map(),
      allMints: new Set(),
    };
  }
  
  /**
   * Build liquidity graph from available pools
   */
  async buildGraph(mints: string[]): Promise<LiquidityGraph> {
    this.graph.allMints = new Set(mints);
    
    // Initialize edges for each mint
    for (const mint of mints) {
      if (!this.graph.edges.has(mint)) {
        this.graph.edges.set(mint, []);
      }
    }
    
    logger.info(`Built liquidity graph with ${mints.length} tokens`);
    
    return this.graph;
  }
  
  /**
   * Add pool to graph
   */
  addPool(pool: PoolEdge): void {
    const fromMint = pool.fromMint;
    
    if (!this.graph.edges.has(fromMint)) {
      this.graph.edges.set(fromMint, []);
    }
    
    this.graph.edges.get(fromMint)!.push(pool);
    this.graph.allMints.add(fromMint);
    this.graph.allMints.add(pool.toMint);
  }
  
  /**
   * Get available paths between two mints using BFS
   */
  getPaths(fromMint: string, toMint: string, maxHops: number): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();
    
    this.bfs(fromMint, toMint, maxHops, [fromMint], visited, paths);
    
    return paths;
  }
  
  /**
   * BFS pathfinding algorithm
   */
  private bfs(
    current: string,
    target: string,
    remainingHops: number,
    currentPath: string[],
    visited: Set<string>,
    paths: string[][]
  ): void {
    if (current === target) {
      paths.push([...currentPath]);
      return;
    }
    
    if (remainingHops <= 0) {
      return;
    }
    
    const neighbors = this.graph.edges.get(current) || [];
    
    for (const edge of neighbors) {
      const nextMint = edge.toMint;
      const pathKey = `${current}->${nextMint}`;
      
      if (visited.has(pathKey)) {
        continue;
      }
      
      visited.add(pathKey);
      currentPath.push(nextMint);
      
      this.bfs(nextMint, target, remainingHops - 1, currentPath, visited, paths);
      
      currentPath.pop();
      visited.delete(pathKey);
    }
  }
  
  /**
   * Get all neighbors for a mint
   */
  getNeighbors(mint: string): PoolEdge[] {
    return this.graph.edges.get(mint) || [];
  }
  
  /**
   * Check if there's a direct pool between two mints
   */
  hasDirectPool(fromMint: string, toMint: string): boolean {
    const neighbors = this.getNeighbors(fromMint);
    return neighbors.some(edge => edge.toMint === toMint);
  }
}

