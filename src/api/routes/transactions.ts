/**
 * Transaction Status API Routes
 * Handles transaction tracking and status queries
 */

import { Router, Request, Response, NextFunction } from 'express';
import { transactionTracker } from '../../solana/transactionTracker';

const router = Router();

/**
 * GET /api/transactions/:signature
 * Get transaction status
 */
router.get('/:signature', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { signature } = req.params;

    if (!signature) {
      res.status(400).json({
        success: false,
        error: 'Transaction signature is required',
      });
      return;
    }

    const transactionInfo = await transactionTracker.getTransactionDetails(signature);

    if (!transactionInfo) {
      res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
      return;
    }

    res.json({
      success: true,
      data: transactionInfo,
      metadata: {
        timestamp: Date.now(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/transactions/status
 * Get status for multiple transactions
 */
router.post('/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { signatures } = req.body;

    if (!signatures || !Array.isArray(signatures)) {
      res.status(400).json({
        success: false,
        error: 'Signatures array is required',
      });
      return;
    }

    const statuses = await transactionTracker.getMultipleTransactionStatuses(signatures);

    res.json({
      success: true,
      data: {
        transactions: statuses,
        count: statuses.length,
      },
      metadata: {
        timestamp: Date.now(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/transactions/:signature/confirmed
 * Check if transaction is confirmed
 */
router.get('/:signature/confirmed', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { signature } = req.params;

    const isConfirmed = await transactionTracker.isTransactionConfirmed(signature);

    res.json({
      success: true,
      data: {
        signature,
        confirmed: isConfirmed,
      },
      metadata: {
        timestamp: Date.now(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/transactions/:signature/wait
 * Wait for transaction confirmation with timeout
 */
router.post('/:signature/wait', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { signature } = req.params;
    const { timeout } = req.body;

    const timeoutMs = timeout || 30000; // Default 30 seconds
    const result = await transactionTracker.waitForConfirmation(signature, timeoutMs);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Transaction not found or timeout',
      });
      return;
    }

    res.json({
      success: true,
      data: result,
      metadata: {
        timestamp: Date.now(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

