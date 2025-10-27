import { LiquidityFlowError, ErrorCode } from '../types';

/**
 * Validate token mint address format
 */
export function validateMintAddress(mint: string): void {
  if (!mint || typeof mint !== 'string') {
    throw new LiquidityFlowError(
      ErrorCode.INVALID_TOKEN_PAIR,
      'Invalid mint address format',
      400
    );
  }

  // Basic Solana address validation (44 characters)
  if (mint.length < 32 || mint.length > 44) {
    throw new LiquidityFlowError(
      ErrorCode.INVALID_TOKEN_PAIR,
      `Mint address must be a valid Solana address: ${mint}`,
      400
    );
  }
}

/**
 * Validate trade amount
 */
export function validateAmount(amount: string, minAmount: number, maxAmount: number): void {
  const amountNum = parseFloat(amount);

  if (isNaN(amountNum) || amountNum <= 0) {
    throw new LiquidityFlowError(
      ErrorCode.AMOUNT_TOO_SMALL,
      'Amount must be a positive number',
      400
    );
  }

  if (amountNum < minAmount) {
    throw new LiquidityFlowError(
      ErrorCode.AMOUNT_TOO_SMALL,
      `Amount ${amountNum} is below minimum ${minAmount}`,
      400
    );
  }

  if (amountNum > maxAmount) {
    throw new LiquidityFlowError(
      ErrorCode.AMOUNT_TOO_LARGE,
      `Amount ${amountNum} exceeds maximum ${maxAmount}`,
      400
    );
  }
}

/**
 * Validate slippage percentage
 */
export function validateSlippage(slippage: number): void {
  if (slippage < 0 || slippage > 10) {
    throw new LiquidityFlowError(
      ErrorCode.SLIPPAGE_EXCEEDED,
      `Slippage must be between 0 and 10%, got ${slippage}%`,
      400
    );
  }
}

/**
 * Validate quote request parameters
 */
export function validateQuoteRequest(request: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippage?: number;
}): void {
  validateMintAddress(request.inputMint);
  validateMintAddress(request.outputMint);

  if (request.inputMint === request.outputMint) {
    throw new LiquidityFlowError(
      ErrorCode.INVALID_TOKEN_PAIR,
      'Input and output tokens must be different',
      400
    );
  }

  validateAmount(request.amount, 0.0001, 1000);

  if (request.slippage !== undefined) {
    validateSlippage(request.slippage);
  }
}

