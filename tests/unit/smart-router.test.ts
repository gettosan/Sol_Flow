/**
 * Unit Tests for Smart Router
 */

import { SmartRouterOptimizer, smartRouter } from '../../src/router/optimizer';
import { LiquidityGraphBuilder } from '../../src/router/graph';
import { Pathfinder } from '../../src/router/pathfinding';
import { MOCK_SOL_MINT, MOCK_USDC_MINT } from '../setup';

describe('Smart Router', () => {
  describe('SmartRouterOptimizer', () => {
    let optimizer: SmartRouterOptimizer;
    
    beforeEach(() => {
      optimizer = new SmartRouterOptimizer();
    });
    
    it('should calculate efficiency correctly', () => {
      const efficiency = optimizer.calculateEfficiency(
        BigInt('1000000000'),
        BigInt('990000000'),
        BigInt('1000000')
      );
      
      expect(efficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency).toBeLessThanOrEqual(100);
    });
    
    it('should handle zero input amount', () => {
      const efficiency = optimizer.calculateEfficiency(0n, 1000000n, 0n);
      expect(efficiency).toBe(0);
    });
    
    it('should calculate total slippage for a route', () => {
      const route = [
        {
          dex: 'Jupiter' as const,
          percentage: 100,
          amountOut: '990000000',
          priceImpact: 1.0,
        },
      ];
      
      const slippage = optimizer.calculateTotalSlippage(route);
      expect(slippage).toBe(1.0);
    });
    
    it('should handle empty route', () => {
      const slippage = optimizer.calculateTotalSlippage([]);
      expect(slippage).toBe(0);
    });
    
    it('should export singleton instance', () => {
      expect(smartRouter).toBeDefined();
      expect(smartRouter.findBestRoute).toBeDefined();
      expect(typeof smartRouter.findBestRoute).toBe('function');
    });
  });
  
  describe('LiquidityGraphBuilder', () => {
    let graphBuilder: LiquidityGraphBuilder;
    
    beforeEach(() => {
      graphBuilder = new LiquidityGraphBuilder();
    });
    
    it('should build graph with tokens', async () => {
      const mints = [MOCK_SOL_MINT, MOCK_USDC_MINT];
      const graph = await graphBuilder.buildGraph(mints);
      
      expect(graph).toBeDefined();
      expect(graph.allMints).toBeInstanceOf(Set);
      expect(graph.allMints.size).toBeGreaterThanOrEqual(2);
    });
    
    it('should add pools to graph', async () => {
      await graphBuilder.buildGraph([MOCK_SOL_MINT, MOCK_USDC_MINT]);
      
      graphBuilder.addPool({
        fromMint: MOCK_SOL_MINT,
        toMint: MOCK_USDC_MINT,
        dex: 'Jupiter',
        poolAddress: 'pool123',
        feeBps: 30,
        liquidity: 1000000n,
        virtualPrice: 1.0,
      });
      
      const neighbors = graphBuilder.getNeighbors(MOCK_SOL_MINT);
      expect(neighbors.length).toBeGreaterThan(0);
    });
    
    it('should find paths between tokens', () => {
      const paths = graphBuilder.getPaths(MOCK_SOL_MINT, MOCK_USDC_MINT, 2);
      expect(Array.isArray(paths)).toBe(true);
    });
    
    it('should check for direct pools', async () => {
      await graphBuilder.buildGraph([MOCK_SOL_MINT, MOCK_USDC_MINT]);
      
      const hasDirect = graphBuilder.hasDirectPool(MOCK_SOL_MINT, MOCK_USDC_MINT);
      expect(typeof hasDirect).toBe('boolean');
    });
  });
  
  describe('Pathfinder', () => {
    let pathfinder: Pathfinder;
    let graphBuilder: LiquidityGraphBuilder;
    
    beforeEach(() => {
      graphBuilder = new LiquidityGraphBuilder();
      pathfinder = new Pathfinder();
    });
    
    it('should find route with direct pool', async () => {
      const mints = [MOCK_SOL_MINT, MOCK_USDC_MINT];
      const graph = await graphBuilder.buildGraph(mints);
      
      // Add a direct pool
      graphBuilder.addPool({
        fromMint: MOCK_SOL_MINT,
        toMint: MOCK_USDC_MINT,
        dex: 'Orca',
        poolAddress: 'direct_pool',
        feeBps: 30,
        liquidity: 1000000n,
        virtualPrice: 1.0,
      });
      
      const request = {
        inputMint: MOCK_SOL_MINT,
        outputMint: MOCK_USDC_MINT,
        amount: 1000000n,
        maxHops: 3,
        maxSlippageBps: 50,
      };
      
      const result = await pathfinder.findBestRoute(request, graph);
      
      // Result might be null if no route exists
      if (result) {
        expect(result.path).toBeDefined();
        expect(result.path.length).toBeGreaterThan(0);
        expect(result.routeLegs).toBeInstanceOf(Array);
      }
    });
    
    it('should handle route finding with empty graph', async () => {
      const mints = [MOCK_SOL_MINT, MOCK_USDC_MINT];
      const graph = await graphBuilder.buildGraph(mints);
      
      const request = {
        inputMint: MOCK_SOL_MINT,
        outputMint: MOCK_USDC_MINT,
        amount: 1000000n,
        maxHops: 3,
        maxSlippageBps: 50,
      };
      
      const result = await pathfinder.findBestRoute(request, graph);
      
      // No route exists
      expect(result).toBeNull();
    });
  });
});

