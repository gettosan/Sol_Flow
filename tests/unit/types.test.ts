import {
  TokenInfo,
  SwapQuote,
  RouteSegment,
  LiquidityFlowError,
  ErrorCode,
  QuoteRequest,
  SwapRequest,
  ApiResponse,
  AgentMessage,
  TradeRecord,
  LiquiditySnapshot,
} from '../../src/types';
import { MOCK_SOL_MINT, MOCK_USDC_MINT } from '../setup';

describe('Core Type Definitions', () => {
  describe('TokenInfo', () => {
    it('should create a valid TokenInfo object', () => {
      const token: TokenInfo = {
        mint: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        decimals: 9,
        logoURI: 'https://example.com/sol.png',
      };

      expect(token.mint).toBe('So11111111111111111111111111111111111111112');
      expect(token.symbol).toBe('SOL');
      expect(token.decimals).toBe(9);
      expect(token.logoURI).toBeDefined();
    });

    it('should allow optional logoURI', () => {
      const token: TokenInfo = {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        decimals: 6,
      };

      expect(token.logoURI).toBeUndefined();
    });
  });

  describe('SwapQuote', () => {
    it('should create a valid SwapQuote', () => {
      const quote: SwapQuote = {
        inputAmount: '1000000000',
        outputAmount: '120000000',
        priceImpact: 0.01,
        routes: [],
        estimatedGas: 5000,
        timestamp: Date.now(),
        quoteId: 'test-quote-1',
        mevProtected: false,
        expiresAt: Date.now() + 30000,
      };

      expect(parseFloat(quote.inputAmount)).toBeGreaterThan(0);
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);
      expect(quote.priceImpact).toBeGreaterThanOrEqual(0);
      expect(quote.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('RouteSegment', () => {
    it('should create a valid RouteSegment', () => {
      const route: RouteSegment = {
        dex: 'Jupiter',
        percentage: 100,
        amountOut: '100000000',
        priceImpact: 0.01,
      };

      expect(route.dex).toMatch(/^(Jupiter|Orca|Raydium)$/);
      expect(route.percentage).toBeGreaterThan(0);
      expect(route.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('LiquidityFlowError', () => {
    it('should create an error with proper structure', () => {
      const error = new LiquidityFlowError(
        ErrorCode.INSUFFICIENT_LIQUIDITY,
        'Not enough liquidity',
        400,
        { token: 'SOL', amount: '1000' }
      );

      expect(error.code).toBe(ErrorCode.INSUFFICIENT_LIQUIDITY);
      expect(error.message).toBe('Not enough liquidity');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ token: 'SOL', amount: '1000' });
      expect(error.name).toBe('LiquidityFlowError');
    });
  });

  describe('ErrorCode enum', () => {
    it('should have proper error code structure', () => {
      expect(ErrorCode.INSUFFICIENT_LIQUIDITY).toMatch(/^E\d{4}$/);
      expect(ErrorCode.QUOTE_EXPIRED).toMatch(/^E\d{4}$/);
      expect(ErrorCode.SLIPPAGE_EXCEEDED).toMatch(/^E\d{4}$/);
      expect(ErrorCode.NO_ROUTE_FOUND).toMatch(/^E\d{4}$/);
      expect(ErrorCode.AGENT_TIMEOUT).toMatch(/^E\d{4}$/);
    });
  });

  describe('Type compatibility', () => {
    it('should properly type QuoteRequest', () => {
      const request: QuoteRequest = {
        inputMint: MOCK_SOL_MINT,
        outputMint: MOCK_USDC_MINT,
        amount: '1000000000',
        slippage: 0.5,
      };

      expect(typeof request.inputMint).toBe('string');
      expect(typeof request.outputMint).toBe('string');
      expect(typeof request.amount).toBe('string');
      expect(request.slippage).toBeGreaterThanOrEqual(0);
    });

    it('should properly type SwapRequest', () => {
      const mockSwapQuote: SwapQuote = {
        inputAmount: '1000000000',
        outputAmount: '100000000',
        priceImpact: 1.0,
        routes: [],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'test-quote-123',
        mevProtected: true,
        expiresAt: Date.now() + 60000,
      };

      const request: SwapRequest = {
        quote: mockSwapQuote,
        userWallet: 'TestPublicKey123',
        slippageBps: 100,
      };

      expect(typeof request.quote.quoteId).toBe('string');
      expect(typeof request.userWallet).toBe('string');
      expect(typeof request.slippageBps).toBe('number');
    });

    it('should properly type ApiResponse', () => {
      const response: ApiResponse<string> = {
        success: true,
        data: 'test data',
        metadata: {
          timestamp: Date.now(),
          requestId: 'req-123',
          serverVersion: '1.0.0',
        },
      };

      expect(typeof response.success).toBe('boolean');
      expect(response.metadata.requestId).toBeDefined();
    });

    it('should properly type AgentMessage', () => {
      const message: AgentMessage = {
        agentId: 'agent-1',
        agentType: 'marketAnalysis',
        action: 'analyze',
        params: { tokenPair: 'SOL/USDC' },
        timestamp: Date.now(),
        correlationId: 'corr-123',
      };

      expect(['marketAnalysis', 'smartRouter', 'autonomousMM', 'mevHunter']).toContain(
        message.agentType
      );
      expect(typeof message.timestamp).toBe('number');
    });

    it('should properly type TradeRecord', () => {
      const trade: TradeRecord = {
        id: 'trade-123',
        userAddress: 'UserAddress123',
        inputMint: MOCK_SOL_MINT,
        outputMint: MOCK_USDC_MINT,
        inputAmount: '1000000000',
        outputAmount: '120000000',
        route: [],
        dexFeesBps: 5,
        slippageBps: 50,
        mevProtected: false,
        transactionHash: 'tx-hash-123',
        status: 'pending',
        createdAt: new Date(),
      };

      expect(['pending', 'confirmed', 'failed']).toContain(trade.status);
      expect(trade.createdAt instanceof Date).toBe(true);
    });

    it('should properly type LiquiditySnapshot', () => {
      const snapshot: LiquiditySnapshot = {
        id: 'snapshot-123',
        dex: 'Orca',
        poolAddress: 'pool-address-123',
        tokenAMint: MOCK_SOL_MINT,
        tokenBMint: MOCK_USDC_MINT,
        liquidityA: '1000000000000',
        liquidityB: '100000000',
        price: 0.1,
        timestamp: new Date(),
      };

      expect(snapshot.price).toBeGreaterThan(0);
      expect(snapshot.timestamp instanceof Date).toBe(true);
    });
  });
});

