import { ErrorCode } from '../types';

export class LiquidityFlowError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'LiquidityFlowError';
    Object.setPrototypeOf(this, LiquidityFlowError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// Specific error classes
export class QuoteExpiredError extends LiquidityFlowError {
  constructor(quoteId: string) {
    super(ErrorCode.QUOTE_EXPIRED, `Quote ${quoteId} has expired`, 400, { quoteId });
  }
}

export class InsufficientLiquidityError extends LiquidityFlowError {
  constructor(tokenPair: string, amount: string) {
    super(
      ErrorCode.INSUFFICIENT_LIQUIDITY,
      `Insufficient liquidity for ${tokenPair} with amount ${amount}`,
      400,
      { tokenPair, amount }
    );
  }
}

export class SlippageExceededError extends LiquidityFlowError {
  constructor(expected: number, actual: number) {
    super(
      ErrorCode.SLIPPAGE_EXCEEDED,
      `Slippage exceeded: expected ${expected}%, got ${actual}%`,
      400,
      { expected, actual }
    );
  }
}

export class NoRouteFoundError extends LiquidityFlowError {
  constructor(inputToken: string, outputToken: string) {
    super(
      ErrorCode.NO_ROUTE_FOUND,
      `No route found from ${inputToken} to ${outputToken}`,
      404,
      { inputToken, outputToken }
    );
  }
}

export class RateLimitError extends LiquidityFlowError {
  constructor(retryAfter: number) {
    super(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      429,
      { retryAfter }
    );
  }
}

