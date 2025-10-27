/**
 * MEV Hunter Agent
 * Detects and mitigates MEV threats
 */

import { logger } from '../utils/logger';
import { agentCoordinator } from './coordinator';
import { MevDetectionRequest, MevDetectionResponse } from './types';
import { AgentRequest } from './coordinator';
import { SwapQuote } from '../types';

export class MevHunterAgent {
  private agentId: string;

  constructor() {
    this.agentId = 'mev_hunter_agent';
    
    agentCoordinator.registerAgent(this.agentId, {
      name: 'MEV Hunter Agent',
      capabilities: {
        marketAnalysis: false,
        routeOptimization: false,
        mevDetection: true,
        liquidityAnalysis: false,
      },
    });
  }

  /**
   * Detect MEV threats in a swap
   */
  async detectMevThreats(
    quote: SwapQuote,
    recentTrades: any[] = []
  ): Promise<MevDetectionResponse> {
    try {
      logger.info('MEV Hunter Agent: Analyzing swap for threats', {
        quoteId: quote.quoteId,
        priceImpact: quote.priceImpact,
      });

      const request: AgentRequest = {
        type: 'mev_detection_request',
        payload: {
          quote,
          recentTrades,
        } as MevDetectionRequest,
        timeout: 10000,
      };

      const response = await agentCoordinator.sendToAgent(this.agentId, request);

      if (!response.success) {
        throw new Error(response.error || 'MEV detection failed');
      }

      const detection = response.data as MevDetectionResponse;

      if (detection.detected) {
        logger.warn('MEV threats detected', {
          confidence: detection.confidence,
          threats: detection.threats.length,
        });
      }

      return detection;
    } catch (error: any) {
      logger.error('MEV detection failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Assess swap safety
   */
  async assessSwapSafety(quote: SwapQuote): Promise<{
    safe: boolean;
    risks: string[];
    recommendations: string[];
  }> {
    const detection = await this.detectMevThreats(quote);

    const risks: string[] = detection.threats.map(t => t.description);
    const recommendations: string[] = [];

    if (detection.detected && detection.confidence > 0.7) {
      recommendations.push('Use private mempool submission');
      recommendations.push('Consider smaller swap size');
      recommendations.push('Use time-delay execution');
    }

    if (quote.priceImpact > 5) {
      recommendations.push('High price impact - consider splitting order');
    }

    return {
      safe: !detection.detected || detection.confidence < 0.5,
      risks,
      recommendations,
    };
  }
}

export const mevHunterAgent = new MevHunterAgent();

