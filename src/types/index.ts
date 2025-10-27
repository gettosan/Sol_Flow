// ============================================================================
// Core Domain Types
// ============================================================================

export interface TokenInfo {
  mint: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

export interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  routes: RouteSegment[];
  estimatedGas: number;
  timestamp: number;
  quoteId: string;
  mevProtected: boolean;
  expiresAt: number;
}

export interface RouteSegment {
  dex: 'Jupiter' | 'Orca' | 'Raydium';
  percentage: number;
  amountOut: string;
  poolAddress?: string;
  priceImpact: number;
}

export interface MultiLegRoute {
  legs: RouteLeg[];
  totalOutputAmount: string;
  efficiency: number; // 0-100%
  totalPriceImpact: number;
  estimatedGas: number;
}

export interface RouteLeg {
  dex: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  poolAddress: string;
  priceImpact: number;
}

export interface LiquidityPool {
  address: string;
  dex: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  liquidityA: string;
  liquidityB: string;
  price: number;
  fee: number; // in bps
  tvl: number;
  volume24h: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface QuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippage: number;
}

export interface SwapRequest {
  quote: SwapQuote;
  userWallet: string;
  slippageBps?: number;
  useMevProtection?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface SwapResponse {
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  inputAmount: string;
  outputAmount: string;
  actualPrice: string;
  route: RouteSegment[];
  timestamp: number;
  savings: {
    bpsVsMarket: number;
    mevProtectionBps: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata: {
    timestamp: number;
    requestId: string;
    serverVersion: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentMessage {
  agentId: string;
  agentType: 'marketAnalysis' | 'smartRouter' | 'autonomousMM' | 'mevHunter';
  action: string;
  params: any;
  timestamp: number;
  correlationId: string;
}

export interface AgentResponse {
  agentId: string;
  action: string;
  result: any;
  confidence: number; // 0-1
  timestamp: number;
  decision: string;
  reasoning?: string;
}

export interface MarketConditions {
  volatility: number;
  liquidityDepth: number;
  spreadBps: number;
  mevRisk: 'low' | 'medium' | 'high';
  optimalExecutionWindow: number; // seconds
}

// ============================================================================
// Error Types
// ============================================================================

export enum ErrorCode {
  // Quote Errors (1xxx)
  INSUFFICIENT_LIQUIDITY = 'E1001',
  QUOTE_EXPIRED = 'E1002',
  INVALID_TOKEN_PAIR = 'E1003',
  AMOUNT_TOO_SMALL = 'E1004',
  AMOUNT_TOO_LARGE = 'E1005',

  // Swap Errors (2xxx)
  SLIPPAGE_EXCEEDED = 'E2001',
  TRANSACTION_FAILED = 'E2002',
  INSUFFICIENT_BALANCE = 'E2003',
  INVALID_SIGNATURE = 'E2004',

  // Routing Errors (3xxx)
  NO_ROUTE_FOUND = 'E3001',
  ROUTE_VALIDATION_FAILED = 'E3002',
  MAX_HOPS_EXCEEDED = 'E3003',

  // Agent Errors (4xxx)
  AGENT_TIMEOUT = 'E4001',
  AGENT_UNAVAILABLE = 'E4002',
  AGENT_DECISION_FAILED = 'E4003',

  // System Errors (5xxx)
  RPC_ERROR = 'E5001',
  DATABASE_ERROR = 'E5002',
  CACHE_ERROR = 'E5003',
  RATE_LIMIT_EXCEEDED = 'E5004',
}

export class LiquidityFlowError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'LiquidityFlowError';
  }
}

// ============================================================================
// Database Types
// ============================================================================

export interface TradeRecord {
  id: string;
  userAddress: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  route: RouteSegment[];
  dexFeesBps: number;
  slippageBps: number;
  mevProtected: boolean;
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
}

export interface LiquiditySnapshot {
  id: string;
  dex: string;
  poolAddress: string;
  tokenAMint: string;
  tokenBMint: string;
  liquidityA: string;
  liquidityB: string;
  price: number;
  timestamp: Date;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  solana: {
    rpcEndpoint: string;
    commitment: 'processed' | 'confirmed' | 'finalized';
    walletPrivateKey: string;
  };
  database: {
    postgres: {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };
    redis: {
      host: string;
      port: number;
    };
  };
  dex: {
    jupiterApiUrl: string;
    maxRetries: number;
    timeoutMs: number;
  };
  agents: {
    serverHost: string;
    serverPort: number;
    network: 'testnet' | 'mainnet';
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

