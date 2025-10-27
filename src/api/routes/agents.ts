import { Router, Request, Response, NextFunction } from 'express';
import { marketAnalysisAgent } from '../../agents/marketAnalysis';
import { smartRouterAgent } from '../../agents/smartRouter';
import { mevHunterAgent } from '../../agents/mevHunter';
import { agentCoordinator } from '../../agents/coordinator';

const router = Router();

/**
 * POST /api/agents/execute
 * Execute an agent action
 */
router.post('/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentType, action, params } = req.body;

    if (!agentType || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentType, action',
      });
    }

    let result: any;

    switch (agentType) {
      case 'market_analysis':
        if (action === 'analyze') {
          result = await marketAnalysisAgent.analyzeMarket(params);
        } else {
          throw new Error(`Unknown action for market_analysis: ${action}`);
        }
        break;

      case 'smart_router':
        if (action === 'optimize') {
          result = await smartRouterAgent.optimizeRoute(params);
        } else {
          throw new Error(`Unknown action for smart_router: ${action}`);
        }
        break;

      case 'mev_hunter':
        if (action === 'detect') {
          result = await mevHunterAgent.detectMevThreats(params.quote, params.recentTrades || []);
        } else {
          throw new Error(`Unknown action for mev_hunter: ${action}`);
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown agent type: ${agentType}`,
        });
    }

    res.json({
      success: true,
      data: {
        agentType,
        action,
        result,
        timestamp: Date.now(),
      },
      metadata: {
        timestamp: Date.now(),
        requestId: req.headers['x-request-id'] as string,
        serverVersion: process.env.npm_package_version || '1.0.0',
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/agents/list
 * List all available agents
 */
router.get('/list', async (_req: Request, res: Response) => {
  const agents = agentCoordinator.getAgents();

  res.json({
    success: true,
    data: {
      agents,
      count: agents.length,
    },
    metadata: {
      timestamp: Date.now(),
    },
  });
});

export default router;

