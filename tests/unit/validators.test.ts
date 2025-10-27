import {
  validateMintAddress,
  validateAmount,
  validateSlippage,
  validateQuoteRequest,
} from '../../src/utils/validators';
import { LiquidityFlowError, ErrorCode } from '../../src/types';

describe('Validator Functions', () => {
  describe('validateMintAddress', () => {
    it('should accept valid Solana mint addresses', () => {
      expect(() =>
        validateMintAddress('So11111111111111111111111111111111111111112')
      ).not.toThrow();
      expect(() =>
        validateMintAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      ).not.toThrow();
      expect(() =>
        validateMintAddress('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
      ).not.toThrow();
    });

    it('should reject empty or invalid mint addresses', () => {
      expect(() => validateMintAddress('')).toThrow(LiquidityFlowError);
      expect(() => validateMintAddress('invalid')).toThrow();
      expect(() => validateMintAddress('12345')).toThrow();
    });

    it('should reject address that is too short', () => {
      expect(() => validateMintAddress('So111111111111111')).toThrow(LiquidityFlowError);
    });

    it('should reject address that is too long', () => {
      expect(() =>
        validateMintAddress('So11111111111111111111111111111111111111112222333344445555666677778888')
      ).toThrow(LiquidityFlowError);
    });
  });

  describe('validateAmount', () => {
    it('should accept valid amounts within bounds', () => {
      expect(() => validateAmount('100', 1, 1000)).not.toThrow();
      expect(() => validateAmount('50.5', 10, 100)).not.toThrow();
      expect(() => validateAmount('0.001', 0.0001, 1)).not.toThrow();
    });

    it('should reject non-numeric amounts', () => {
      expect(() => validateAmount('abc', 1, 1000)).toThrow(LiquidityFlowError);
      expect(() => validateAmount('', 1, 1000)).toThrow(LiquidityFlowError);
    });

    it('should reject negative amounts', () => {
      expect(() => validateAmount('-100', 1, 1000)).toThrow(LiquidityFlowError);
    });

    it('should reject zero or negative amounts', () => {
      expect(() => validateAmount('0', 1, 1000)).toThrow(LiquidityFlowError);
    });

    it('should reject amounts below minimum', () => {
      expect(() => validateAmount('10', 100, 1000)).toThrow(LiquidityFlowError);
    });

    it('should reject amounts above maximum', () => {
      expect(() => validateAmount('2000', 100, 1000)).toThrow(LiquidityFlowError);
    });

    it('should provide detailed error messages', () => {
      try {
        validateAmount('10', 100, 1000);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(LiquidityFlowError);
        if (error instanceof LiquidityFlowError) {
          expect(error.code).toBe(ErrorCode.AMOUNT_TOO_SMALL);
          expect(error.message).toContain('below minimum');
        }
      }
    });
  });

  describe('validateSlippage', () => {
    it('should accept valid slippage values', () => {
      expect(() => validateSlippage(0)).not.toThrow();
      expect(() => validateSlippage(0.1)).not.toThrow();
      expect(() => validateSlippage(1.0)).not.toThrow();
      expect(() => validateSlippage(10)).not.toThrow();
    });

    it('should reject negative slippage', () => {
      expect(() => validateSlippage(-1)).toThrow(LiquidityFlowError);
    });

    it('should reject slippage above 10%', () => {
      expect(() => validateSlippage(11)).toThrow(LiquidityFlowError);
      expect(() => validateSlippage(15)).toThrow(LiquidityFlowError);
    });
  });

  describe('validateQuoteRequest', () => {
    const validRequest = {
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: '1000000000',
      slippage: 0.5,
    };

    it('should accept valid quote requests', () => {
      const request = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1',
        slippage: 0.5,
      };
      expect(() => validateQuoteRequest(request)).not.toThrow();
    });

    it('should reject requests with identical input and output mints', () => {
      const invalidRequest = {
        ...validRequest,
        outputMint: validRequest.inputMint,
      };

      expect(() => validateQuoteRequest(invalidRequest)).toThrow(LiquidityFlowError);
    });

    it('should reject requests with invalid input mint', () => {
      const invalidRequest = {
        ...validRequest,
        inputMint: 'invalid',
      };

      expect(() => validateQuoteRequest(invalidRequest)).toThrow();
    });

    it('should reject requests with invalid output mint', () => {
      const invalidRequest = {
        ...validRequest,
        outputMint: 'invalid',
      };

      expect(() => validateQuoteRequest(invalidRequest)).toThrow();
    });

    it('should reject requests with amount below minimum', () => {
      const invalidRequest = {
        ...validRequest,
        amount: '0.00001',
      };

      expect(() => validateQuoteRequest(invalidRequest)).toThrow(LiquidityFlowError);
    });

    it('should reject requests with amount above maximum', () => {
      const invalidRequest = {
        ...validRequest,
        amount: '1000000',
      };

      expect(() => validateQuoteRequest(invalidRequest)).toThrow(LiquidityFlowError);
    });

    it('should reject requests with invalid slippage', () => {
      const invalidRequest = {
        ...validRequest,
        slippage: 15,
      };

      expect(() => validateQuoteRequest(invalidRequest)).toThrow(LiquidityFlowError);
    });

    it('should accept requests without slippage (optional)', () => {
      const requestWithoutSlippage = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1',
      };

      expect(() => validateQuoteRequest(requestWithoutSlippage)).not.toThrow();
    });
  });
});

