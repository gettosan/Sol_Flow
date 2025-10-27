/**
 * Market Analysis Agent
 * Analyzes market conditions and provides trading recommendations
 */

import { logger } from '../utils/logger';
import { agentCoordinator } from './coordinator';
import { MarketAnalysisRequest, MarketAnalysisResponse } from './types';
import { AgentRequest } from './coordinator';

export class MarketAnalysisAgent {
  private agentId: string;

  constructor() {
    this.agentId = 'market_analysis_agent';
    
    // Register this agent
    agentCoordinator.registerAgent(this.agentId, {
      name: 'Market Analysis Agent',
      capabilities: {
        marketAnalysis: true,
        routeOptimization: false,
        mevDetection: false,
        liquidityAnalysis: true,
      },
    });
  }

  /**
   * Analyze market conditions
   */
  async analyzeMarket(request: MarketAnalysisRequest): Promise<MarketAnalysisResponse> {
    try {
      logger.info(`Market Analysis Agent: Analyzing ${request.tokenPairs.length} token pairs`);

      const agentRequest: AgentRequest = {
        type: 'market_analysis_request',
        payload: request,
        timeout: 10000,
      };

      const response = await agentCoordinator.sendToAgent(this.agentId, agentRequest);

      if (!response.success) {
        throw new Error(response.error || 'Market analysis failed');
      }

      return response.data as MarketAnalysisResponse;
    } catch (error: any) {
      logger.error('Market analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get liquidity scores for token pairs
   */
  async getLiquidityScores(pairs: Array<{ inputMint: string; outputMint: string }>): Promise<Map<string, number>> {
    const analysis = await this.analyzeMarket({
      tokenPairs: pairs,
      timeframe: '1h',
    });

    const scores = new Map<string, number>();
    
    analysis.analysis.forEach(item => {
      scores.set(item.pair, item.liquidityScore);
    });

    return scores;
  }

  /**
   * Recommend best trading pairs
   */
  async recommendPairs(count: number = 5): Promise<Array<{ pair: string; score: number; risk: string }>> {
    // This would fetch from real market data
    const recommended = [
      { pair: 'SOL-USDC', score: 95, risk: 'low' },
      { pair: 'SOL-USDT', score: 90, risk: 'low' },
      { pair: 'BTC-USDC', score: 85, risk: 'medium' },
      { pair: 'ETH-SOL', score: 80, risk: 'medium' },
      { pair: 'USDC-RAY', score: 75, risk: 'medium' },
    ];

    return recommended.slice(0, count);
  }
}

export const marketAnalysisAgent = new MarketAnalysisAgent();

