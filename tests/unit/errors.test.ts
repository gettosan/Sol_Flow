import {
  LiquidityFlowError,
  QuoteExpiredError,
  InsufficientLiquidityError,
  SlippageExceededError,
  NoRouteFoundError,
  RateLimitError,
} from '../../src/utils/errors';
import { ErrorCode } from '../../src/types';

describe('Custom Error Classes', () => {
  describe('LiquidityFlowError', () => {
    it('should create a LiquidityFlowError with proper structure', () => {
      const error = new LiquidityFlowError(
        ErrorCode.INSUFFICIENT_LIQUIDITY,
        'Test error message',
        400,
        { test: 'details' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LiquidityFlowError);
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_LIQUIDITY);
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ test: 'details' });
      expect(error.name).toBe('LiquidityFlowError');
    });

    it('should default statusCode to 400', () => {
      const error = new LiquidityFlowError(ErrorCode.RPC_ERROR, 'Test error');
      expect(error.statusCode).toBe(400);
    });

    it('should allow optional details', () => {
      const error = new LiquidityFlowError(ErrorCode.RATE_LIMIT_EXCEEDED, 'Test error');
      expect(error.details).toBeUndefined();
    });

    it('should serialize to JSON correctly', () => {
      const error = new LiquidityFlowError(
        ErrorCode.SLIPPAGE_EXCEEDED,
        'Slippage exceeded',
        400,
        { expected: 1, actual: 2 }
      );

      const json = error.toJSON();
      expect(json).toEqual({
        code: ErrorCode.SLIPPAGE_EXCEEDED,
        message: 'Slippage exceeded',
        details: { expected: 1, actual: 2 },
      });
    });
  });

  describe('QuoteExpiredError', () => {
    it('should create a QuoteExpiredError with correct code', () => {
      const error = new QuoteExpiredError('test-quote-123');
      expect(error).toBeInstanceOf(LiquidityFlowError);
      expect(error.code).toBe(ErrorCode.QUOTE_EXPIRED);
      expect(error.message).toContain('test-quote-123');
      expect(error.statusCode).toBe(400);
      expect(error.details?.quoteId).toBe('test-quote-123');
    });
  });

  describe('InsufficientLiquidityError', () => {
    it('should create an InsufficientLiquidityError with correct details', () => {
      const error = new InsufficientLiquidityError('SOL/USDC', '1000000');
      expect(error).toBeInstanceOf(LiquidityFlowError);
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_LIQUIDITY);
      expect(error.message).toContain('SOL/USDC');
      expect(error.message).toContain('1000000');
      expect(error.details?.tokenPair).toBe('SOL/USDC');
      expect(error.details?.amount).toBe('1000000');
    });
  });

  describe('SlippageExceededError', () => {
    it('should create a SlippageExceededError with correct details', () => {
      const error = new SlippageExceededError(1.0, 2.5);
      expect(error).toBeInstanceOf(LiquidityFlowError);
      expect(error.code).toBe(ErrorCode.SLIPPAGE_EXCEEDED);
      expect(error.message).toContain('1');
      expect(error.message).toContain('2.5');
      expect(error.details?.expected).toBe(1.0);
      expect(error.details?.actual).toBe(2.5);
    });
  });

  describe('NoRouteFoundError', () => {
    it('should create a NoRouteFoundError with correct tokens', () => {
      const error = new NoRouteFoundError('SOL', 'USDC');
      expect(error).toBeInstanceOf(LiquidityFlowError);
      expect(error.code).toBe(ErrorCode.NO_ROUTE_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('SOL');
      expect(error.message).toContain('USDC');
      expect(error.details?.inputToken).toBe('SOL');
      expect(error.details?.outputToken).toBe('USDC');
    });
  });

  describe('RateLimitError', () => {
    it('should create a RateLimitError with retry after time', () => {
      const retryAfter = 60;
      const error = new RateLimitError(retryAfter);
      expect(error).toBeInstanceOf(LiquidityFlowError);
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(error.statusCode).toBe(429);
      expect(error.message).toContain('60');
      expect(error.details?.retryAfter).toBe(60);
    });
  });
});

