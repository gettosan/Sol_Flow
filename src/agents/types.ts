/**
 * Agent Types and Interfaces
 * Type definitions for Fetch.ai autonomous agents
 */

import { SwapQuote } from '../types';

export interface AgentMessage {
  id: string;
  timestamp: number;
  type: AgentMessageType;
  payload: any;
  sender: string;
  receiver?: string;
}

export type AgentMessageType =
  | 'market_analysis_request'
  | 'market_analysis_response'
  | 'route_optimization_request'
  | 'route_optimization_response'
  | 'mev_detection_request'
  | 'mev_detection_response'
  | 'liquidity_analysis_request'
  | 'liquidity_analysis_response';

export interface MarketAnalysisRequest {
  tokenPairs: Array<{ inputMint: string; outputMint: string }>;
  timeframe: '1h' | '4h' | '24h' | '7d';
}

export interface MarketAnalysisResponse {
  analysis: {
    pair: string;
    liquidityScore: number; // 0-100
    volatility: number; // percentage
    recommended: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
  }[];
  timestamp: number;
}

export interface RouteOptimizationRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  constraints: {
    maxSlippage: number;
    maxRoutes: number;
    preferredDex?: string[];
  };
}

export interface RouteOptimizationResponse {
  optimizedRoutes: SwapQuote[];
  analysis: {
    efficiency: number;
    expectedSlippage: number;
    gasEstimate: number;
    mevRisk: 'low' | 'medium' | 'high';
  };
}

export interface MevDetectionRequest {
  quote: SwapQuote;
  recentTrades: any[];
}

export interface MevDetectionResponse {
  detected: boolean;
  confidence: number;
  threats: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

export interface AgentCapabilities {
  marketAnalysis: boolean;
  routeOptimization: boolean;
  mevDetection: boolean;
  liquidityAnalysis: boolean;
}

export interface AgentConfig {
  name: string;
  id: string;
  capabilities: AgentCapabilities;
  network: 'testnet' | 'mainnet';
  endpoint: string;
}

