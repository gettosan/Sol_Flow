/**
 * Smart Router Agent
 * Optimizes routing for best execution
 */

import { logger } from '../utils/logger';
import { agentCoordinator } from './coordinator';
import { RouteOptimizationRequest, RouteOptimizationResponse } from './types';
import { AgentRequest } from './coordinator';
import { SwapQuote } from '../types';

export class SmartRouterAgent {
  private agentId: string;

  constructor() {
    this.agentId = 'smart_router_agent';
    
    agentCoordinator.registerAgent(this.agentId, {
      name: 'Smart Router Agent',
      capabilities: {
        marketAnalysis: false,
        routeOptimization: true,
        mevDetection: true,
        liquidityAnalysis: true,
      },
    });
  }

  /**
   * Optimize swap route
   */
  async optimizeRoute(request: RouteOptimizationRequest): Promise<RouteOptimizationResponse> {
    try {
      logger.info('Smart Router Agent: Optimizing route', {
        inputMint: request.inputMint,
        outputMint: request.outputMint,
        amount: request.amount,
      });

      const agentRequest: AgentRequest = {
        type: 'route_optimization_request',
        payload: request,
        timeout: 15000,
      };

      const response = await agentCoordinator.sendToAgent(this.agentId, agentRequest);

      if (!response.success) {
        throw new Error(response.error || 'Route optimization failed');
      }

      return response.data as RouteOptimizationResponse;
    } catch (error: any) {
      logger.error('Route optimization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Find best route for swap
   */
  async findBestRoute(
    inputMint: string,
    outputMint: string,
    amount: string
  ): Promise<SwapQuote | null> {
    const response = await this.optimizeRoute({
      inputMint,
      outputMint,
      amount,
      constraints: {
        maxSlippage: 100, // 1%
        maxRoutes: 3,
      },
    });

    if (response.optimizedRoutes.length === 0) {
      return null;
    }

    // Return the best route (highest efficiency)
    return response.optimizedRoutes[0];
  }
}

export const smartRouterAgent = new SmartRouterAgent();

