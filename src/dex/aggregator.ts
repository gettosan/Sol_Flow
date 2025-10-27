/**
 * Unified DEX Aggregator
 * Fetches quotes from all DEX clients and selects the best one
 */

import { SwapQuote } from '../types';
import { DexClient, DexConfig } from './types';
import { jupiterClient } from './clients/jupiter';
import { orcaClient } from './clients/orca';
import { raydiumClient } from './clients/raydium';
import { logger } from '../utils/logger';

export class DexAggregator {
  private clients: DexClient[];
  private config: DexConfig[];
  
  constructor() {
    this.clients = [jupiterClient, orcaClient, raydiumClient];
    this.config = [
      { name: 'Jupiter', enabled: true, priority: 1 },
      { name: 'Orca', enabled: true, priority: 2 },
      { name: 'Raydium', enabled: true, priority: 3 },
    ];
  }
  
  /**
   * Get the best quote across all DEX clients
   */
  async getBestQuote(
    inputMint: string,
    outputMint: string,
    inputAmount: string,
    slippageBps?: number
  ): Promise<(SwapQuote & { dex: string }) | null> {
    try {
      logger.info(`Fetching best quote for ${inputMint} -> ${outputMint}`);
      
      // Fetch quotes from all enabled DEX clients in parallel
      const quotePromises = this.getEnabledClients().map(client =>
        client.getQuote(inputMint, outputMint, inputAmount, slippageBps)
      );
      
      const quotes = await Promise.allSettled(quotePromises);
      
      // Filter out failed queries and null results
      const validQuotes = quotes
        .filter((result) => result.status === 'fulfilled' && result.value != null)
        .map((result) => (result as PromiseFulfilledResult<any>).value) as SwapQuote[];
      
      if (validQuotes.length === 0) {
        logger.warn(`No quotes available for ${inputMint} -> ${outputMint}`);
        return null;
      }
      
      // Select the best quote (highest output amount)
      const bestQuote = this.selectBestQuote(validQuotes);
      
      const dex = bestQuote.routes && bestQuote.routes.length > 0 ? bestQuote.routes[0].dex : 'Unknown';
      
      logger.info(
        `Best quote found: ${dex}, output: ${bestQuote.outputAmount}, impact: ${bestQuote.priceImpact}%`
      );
      
      return { ...bestQuote, dex };
    } catch (error: any) {
      logger.error(`Error aggregating quotes: ${error.message}`, error);
      return null;
    }
  }
  
  /**
   * Get all quotes from all DEX clients
   */
  async getAllQuotes(
    inputMint: string,
    outputMint: string,
    inputAmount: string,
    slippageBps?: number
  ): Promise<SwapQuote[]> {
    try {
      logger.debug(`Fetching all quotes for ${inputMint} -> ${outputMint}`);
      
      const quotePromises = this.getEnabledClients().map(client =>
        client.getQuote(inputMint, outputMint, inputAmount, slippageBps)
      );
      
      const quotes = await Promise.allSettled(quotePromises);
      
      return quotes
        .filter((result) => result.status === 'fulfilled' && result.value != null)
        .map((result) => (result as PromiseFulfilledResult<any>).value) as SwapQuote[];
    } catch (error: any) {
      logger.error(`Error fetching all quotes: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Select the best quote based on output amount and price impact
   */
  private selectBestQuote(quotes: SwapQuote[]): SwapQuote & { dex: string } {
    // Sort by output amount (descending), then by price impact (ascending)
    quotes.sort((a, b) => {
      const outputA = BigInt(a.outputAmount);
      const outputB = BigInt(b.outputAmount);
      
      if (outputA > outputB) return -1;
      if (outputA < outputB) return 1;
      
      return a.priceImpact - b.priceImpact;
    });
    
    const best = quotes[0];
    // Add dex property based on routes
    const dex = best.routes && best.routes.length > 0 ? best.routes[0].dex : 'Unknown';
    
    return { ...best, dex };
  }
  
  /**
   * Get enabled DEX clients sorted by priority
   */
  private getEnabledClients(): DexClient[] {
    const enabledConfigs = this.config.filter((c) => c.enabled);
    
    return enabledConfigs
      .sort((a, b) => a.priority - b.priority)
      .map((config) => this.clients.find((c) => c.name === config.name)!)
      .filter((c) => c != null);
  }
  
  /**
   * Check if any DEX has liquidity for the given token pair
   */
  async hasLiquidity(inputMint: string, outputMint: string): Promise<boolean> {
    const promises = this.getEnabledClients().map(client =>
      client.hasLiquidity(inputMint, outputMint)
    );
    
    const results = await Promise.allSettled(promises);
    return results.some((result) => result.status === 'fulfilled' && result.value === true);
  }
}

export const dexAggregator = new DexAggregator();

