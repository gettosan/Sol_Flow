import { Request, Response, NextFunction } from 'express';
import { validateQuoteRequest as validateQuoteRequestUtil } from '../../utils/validators';
import { QuoteRequest } from '../../types';

/**
 * Validate quote request parameters
 */
export function validateQuoteRequest(req: Request, _res: Response, next: NextFunction): void {
  try {
    const request: QuoteRequest = {
      inputMint: req.query.inputMint as string,
      outputMint: req.query.outputMint as string,
      amount: req.query.amount as string,
      slippage: req.query.slippage ? parseFloat(req.query.slippage as string) : 0.5,
    };

    validateQuoteRequestUtil(request);
    req.body = request;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequired(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const missing = fields.filter((field) => !req.body[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E1000',
          message: `Missing required fields: ${missing.join(', ')}`,
        },
        metadata: {
          timestamp: Date.now(),
          requestId: req.headers['x-request-id'] as string,
          serverVersion: process.env.npm_package_version || '1.0.0',
        },
      });
    }

    next();
  };
}

