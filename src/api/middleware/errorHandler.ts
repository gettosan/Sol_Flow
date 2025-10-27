import { Request, Response, NextFunction } from 'express';
import { LiquidityFlowError } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    requestId: req.headers['x-request-id'],
  });

  // Handle LiquidityFlowError
  if (error instanceof LiquidityFlowError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      metadata: {
        timestamp: Date.now(),
        requestId: req.headers['x-request-id'] as string,
        serverVersion: process.env.npm_package_version || '1.0.0',
      },
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'E1000',
        message: 'Validation failed',
        details: error.message,
      },
      metadata: {
        timestamp: Date.now(),
        requestId: req.headers['x-request-id'] as string,
        serverVersion: process.env.npm_package_version || '1.0.0',
      },
    });
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: {
      code: 'E5000',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    },
    metadata: {
      timestamp: Date.now(),
      requestId: req.headers['x-request-id'] as string,
      serverVersion: process.env.npm_package_version || '1.0.0',
    },
  });
}

