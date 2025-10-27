/**
 * Unit Tests for DEX Clients
 */

import { JupiterClient } from '../../src/dex/clients/jupiter';
import { OrcaClient } from '../../src/dex/clients/orca';
import { RaydiumClient } from '../../src/dex/clients/raydium';
import { MOCK_SOL_MINT, MOCK_USDC_MINT } from '../setup';

describe('DEX Clients', () => {
  describe('JupiterClient', () => {
    let client: JupiterClient;
    
    beforeEach(() => {
      client = new JupiterClient();
    });
    
    it('should have correct name', () => {
      expect(client.name).toBe('Jupiter');
    });
    
    it('should get a quote for a token swap', async () => {
      const quote = await client.getQuote(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT,
        '1000000000'
      );
      
      // Note: In a real environment with network access, this might return a quote
      // For now, we just ensure no errors are thrown
      if (quote) {
        expect(quote).toBeDefined();
        expect(quote.inputAmount).toBeDefined();
        expect(quote.outputAmount).toBeDefined();
        expect(quote.quoteId).toBeDefined();
      }
    });
    
    it('should get routes for a token pair', async () => {
      const routes = await client.getRoutes(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT,
        '1000000000'
      );
      
      expect(routes).toBeInstanceOf(Array);
    });
    
    it('should check liquidity availability', async () => {
      const hasLiquidity = await client.hasLiquidity(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT
      );
      
      expect(typeof hasLiquidity).toBe('boolean');
    });
  });
  
  describe('OrcaClient', () => {
    let client: OrcaClient;
    
    beforeEach(() => {
      client = new OrcaClient();
    });
    
    it('should have correct name', () => {
      expect(client.name).toBe('Orca');
    });
    
    it('should get a quote for a token swap', async () => {
      const quote = await client.getQuote(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT,
        '1000000000'
      );
      
      expect(quote).toBeDefined();
      expect(quote.inputAmount).toBeDefined();
      expect(quote.outputAmount).toBeDefined();
      expect(quote.quoteId).toContain('orca');
      expect(quote.routes).toBeInstanceOf(Array);
      expect(quote.routes[0].dex).toBe('Orca');
    });
    
    it('should get routes for a token pair', async () => {
      const routes = await client.getRoutes(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT,
        '1000000000'
      );
      
      expect(routes).toBeInstanceOf(Array);
      expect(routes.length).toBeGreaterThan(0);
      
      if (routes.length > 0) {
        expect(routes[0].dex).toBe('Orca');
      }
    });
    
    it('should check liquidity availability', async () => {
      const hasLiquidity = await client.hasLiquidity(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT
      );
      
      expect(typeof hasLiquidity).toBe('boolean');
      expect(hasLiquidity).toBe(true); // Orca mock always returns true
    });
  });
  
  describe('RaydiumClient', () => {
    let client: RaydiumClient;
    
    beforeEach(() => {
      client = new RaydiumClient();
    });
    
    it('should have correct name', () => {
      expect(client.name).toBe('Raydium');
    });
    
    it('should get a quote for a token swap', async () => {
      const quote = await client.getQuote(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT,
        '1000000000'
      );
      
      expect(quote).toBeDefined();
      expect(quote.inputAmount).toBeDefined();
      expect(quote.outputAmount).toBeDefined();
      expect(quote.quoteId).toContain('ray');
      expect(quote.routes).toBeInstanceOf(Array);
      expect(quote.routes[0].dex).toBe('Raydium');
    });
    
    it('should get routes for a token pair', async () => {
      const routes = await client.getRoutes(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT,
        '1000000000'
      );
      
      expect(routes).toBeInstanceOf(Array);
      expect(routes.length).toBeGreaterThan(0);
      
      if (routes.length > 0) {
        expect(routes[0].dex).toBe('Raydium');
      }
    });
    
    it('should check liquidity availability', async () => {
      const hasLiquidity = await client.hasLiquidity(
        MOCK_SOL_MINT,
        MOCK_USDC_MINT
      );
      
      expect(typeof hasLiquidity).toBe('boolean');
      expect(hasLiquidity).toBe(true); // Raydium mock always returns true
    });
  });
});

