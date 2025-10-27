import Redis from 'ioredis';
import { config } from '../../config';
import { logger } from '../../utils/logger';

let redis: Redis | null = null;

/**
 * Create Redis connection
 */
export function createRedisClient(): Redis {
  return new Redis({
    host: config.database.redis.host,
    port: config.database.redis.port,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false,
  });
}

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis {
  if (!redis) {
    redis = createRedisClient();

    redis.on('connect', () => {
      logger.info('Redis connecting...');
    });

    redis.on('ready', () => {
      logger.info('✅ Redis connected successfully');
    });

    redis.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  return redis;
}

/**
 * Connect to Redis and test connection
 */
export async function connectRedis(): Promise<void> {
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    logger.info('✅ Redis ping successful');
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Get Redis client for direct operations
 */
export function getRedis(): Redis {
  return getRedisClient();
}

