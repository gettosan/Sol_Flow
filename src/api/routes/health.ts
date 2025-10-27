import { Router, Request, Response } from 'express';
import { getPool } from '../../database/postgres/connection';
import { getRedisClient } from '../../database/redis/client';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', async (_req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    services: {
      api: 'ok',
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // Check PostgreSQL connection
    try {
      const pool = getPool();
      await pool.query('SELECT 1');
      health.services.database = 'ok';
    } catch (error) {
      health.services.database = 'error';
      health.status = 'degraded';
      logger.warn('Database health check failed:', error);
    }

    // Check Redis connection
    try {
      const redis = getRedisClient();
      await redis.ping();
      health.services.redis = 'ok';
    } catch (error) {
      health.services.redis = 'error';
      health.status = 'degraded';
      logger.warn('Redis health check failed:', error);
    }
  } catch (error) {
    health.status = 'error';
    logger.error('Health check error:', error);
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;

