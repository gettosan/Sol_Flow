/**
 * Price Streaming Service
 * Fetches real market data from Solana and streams to WebSocket clients
 */

import { logger } from '../utils/logger';
import { dexAggregator } from '../dex/aggregator';

export interface PriceUpdate {
  inputMint: string;
  outputMint: string;
  rate: string;
  timestamp: number;
  source: string;
  confidence: number;
  mevRisk: 'low' | 'medium' | 'high';
  priceImpact: number;
  liquidityAvailable: string;
}

export interface Subscription {
  socketId: string;
  inputMint: string;
  outputMint: string;
  amount?: string;
}

export class PriceStreamService {
  public subscriptions: Map<string, Subscription[]>;
  private updateInterval: NodeJS.Timeout | null;
  private cachedUpdates = new Map<string, PriceUpdate>();

  constructor() {
    this.subscriptions = new Map();
    this.updateInterval = null;
    this.cachedUpdates = new Map();
  }

  /**
   * Start the price streaming service
   */
  start(): void {
    logger.info('Starting price streaming service...');
    
    // Update prices every 5 seconds
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, 5000);

    // Initial update
    this.updatePrices();
  }

  /**
   * Stop the price streaming service
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    logger.info('Price streaming service stopped');
  }

  /**
   * Subscribe to price updates
   */
  subscribe(socketId: string, inputMint: string, outputMint: string, amount?: string): void {
    const roomId = `${inputMint}-${outputMint}`;
    
    if (!this.subscriptions.has(roomId)) {
      this.subscriptions.set(roomId, []);
    }

    this.subscriptions.get(roomId)?.push({
      socketId,
      inputMint,
      outputMint,
      amount,
    });

    logger.info('Client subscribed to price updates', {
      socketId,
      roomId,
      amount,
    });

    // Send initial price immediately
    this.sendPriceUpdate(roomId);
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribe(socketId: string, inputMint: string, outputMint: string): void {
    const roomId = `${inputMint}-${outputMint}`;
    const subscribers = this.subscriptions.get(roomId);

    if (subscribers) {
      const index = subscribers.findIndex(sub => sub.socketId === socketId);
      if (index !== -1) {
        subscribers.splice(index, 1);
        
        // Remove room if empty
        if (subscribers.length === 0) {
          this.subscriptions.delete(roomId);
        }
      }
    }

    logger.info('Client unsubscribed from price updates', { socketId, roomId });
  }

  /**
   * Update prices for all subscribed pairs
   */
  private async updatePrices(): Promise<void> {
    const rooms = Array.from(this.subscriptions.keys());

    for (const roomId of rooms) {
      await this.sendPriceUpdate(roomId);
    }
  }

  /**
   * Fetch real price from DEX aggregator and send to subscribers
   */
  private async sendPriceUpdate(roomId: string): Promise<void> {
    const subscribers = this.subscriptions.get(roomId);
    
    if (!subscribers || subscribers.length === 0) {
      return;
    }

    const [inputMint, outputMint] = roomId.split('-');
    const subscription = subscribers[0]; // Use first subscription's amount

    try {
      // Fetch real quote from aggregator
      const quote = await dexAggregator.getBestQuote(
        inputMint,
        outputMint,
        subscription.amount || '1000000000', // Default 1 SOL
        50 // 0.5% slippage in bps
      );

      if (!quote) {
        logger.warn('No quote available for price update', { roomId });
        return;
      }

      // Calculate rate
      const inputAmount = parseFloat(quote.inputAmount);
      const outputAmount = parseFloat(quote.outputAmount);
      const rate = inputAmount > 0 ? (outputAmount / inputAmount).toString() : '0';

      // Build price update
      const priceUpdate: PriceUpdate = {
        inputMint,
        outputMint,
        rate,
        timestamp: Date.now(),
        source: quote.routes[0]?.dex || 'Unknown',
        confidence: this.calculateConfidence(quote),
        mevRisk: this.assessMevRisk(quote),
        priceImpact: quote.priceImpact,
        liquidityAvailable: this.estimateLiquidity(quote),
      };

      // Emit to subscribers (this will be connected to Socket.IO in the main module)
      this.emitToSubscribers(roomId, priceUpdate);

    } catch (error: any) {
      logger.error('Failed to fetch price update', { roomId, error: error.message });
    }
  }

  /**
   * Calculate confidence based on quote quality
   */
  private calculateConfidence(quote: any): number {
    let confidence = 0.5;

    // Higher liquidity = higher confidence
    if (quote.priceImpact < 1) confidence += 0.2;
    if (quote.priceImpact < 0.5) confidence += 0.2;
    
    // Multiple routes = higher confidence
    if (quote.routes.length > 1) confidence += 0.1;

    // MEV protection = higher confidence
    if (quote.mevProtected) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Assess MEV risk based on quote characteristics
   */
  private assessMevRisk(quote: any): 'low' | 'medium' | 'high' {
    if (quote.priceImpact > 5) return 'high';
    if (quote.priceImpact > 2) return 'medium';
    return 'low';
  }

  /**
   * Estimate available liquidity based on quote
   */
  private estimateLiquidity(quote: any): string {
    // Rough estimation based on amount out and price impact
    const outputAmount = parseFloat(quote.outputAmount);
    const multiplier = 1 / (1 + quote.priceImpact / 100);
    return (outputAmount / multiplier).toString();
  }

  /**
   * Emit price update to all subscribers in the room
   * This will be connected to Socket.IO emit functionality
   */
  private emitToSubscribers(roomId: string, update: PriceUpdate): void {
    // This will be implemented with Socket.IO
    logger.debug('Price update ready', { roomId, rate: update.rate });
    
    // Store for Socket.IO handler to emit
    this.cachedUpdates.set(roomId, update);
  }

  /**
   * Get cached price updates for Socket.IO to emit
   */
  getCachedUpdates(): Map<string, PriceUpdate> {
    return this.cachedUpdates;
  }

  /**
   * Clear cached updates after emitting
   */
  clearCache(roomId: string): void {
    this.cachedUpdates.delete(roomId);
  }
}

export const priceStreamService = new PriceStreamService();

