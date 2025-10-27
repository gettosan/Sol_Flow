import { Router, Request, Response } from 'express';
import { SwapResponse, SwapRequest } from '../../types';
import { swapExecutor } from '../../solana/swapExecutor';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/swap
 * Execute a swap based on a quote
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const swapRequest: SwapRequest = req.body;
    
    logger.info(`Swap execution requested for ${swapRequest.userWallet}`);
    
    // Validate required fields
    if (!swapRequest.quote) {
      return res.status(400).json({
        success: false,
        error: 'Quote is required',
      });
    }
    
    if (!swapRequest.userWallet) {
      return res.status(400).json({
        success: false,
        error: 'User wallet address is required',
      });
    }
    
    // Validate swap parameters
    const validation = swapExecutor.validateSwapParams({
      quote: swapRequest.quote,
      userWallet: swapRequest.userWallet,
      slippageBps: swapRequest.slippageBps,
    });
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.reason,
      });
    }
    
    // Execute the swap
    const result = await swapExecutor.executeSwap({
      quote: swapRequest.quote,
      userWallet: swapRequest.userWallet,
      slippageBps: swapRequest.slippageBps,
    });
    
    // Convert to SwapResponse format
    const response: SwapResponse = {
      transactionHash: result.transactionHash,
      status: result.status as 'pending' | 'confirmed' | 'failed',
      inputAmount: result.inputAmount,
      outputAmount: result.outputAmount,
      actualPrice: result.actualPrice.toString(),
      route: result.route,
      timestamp: result.timestamp,
      savings: {
        bpsVsMarket: 5, // Placeholder
        mevProtectionBps: 2, // Placeholder
      },
    };
    
    res.json({
      success: true,
      data: response,
      metadata: {
        timestamp: Date.now(),
        requestId: req.headers['x-request-id'] as string,
        serverVersion: process.env.npm_package_version || '1.0.0',
      },
    });
    return;
  } catch (error: any) {
    logger.error(`Swap execution error: ${error.message}`, error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to execute swap',
      });
    }
    return; // Explicitly return after error handling
  }
});

export default router;

