import { AppServer } from './api/server';
import { validateConfig } from './config';
import { logger } from './utils/logger';
import { connectDatabase, closeDatabase } from './database/postgres/connection';
import { connectRedis, closeRedis } from './database/redis/client';
import { createTables } from './database/postgres/schema';

/**
 * Bootstrap the application
 */
async function bootstrap(): Promise<void> {
  try {
    // Validate configuration
    logger.info('Validating configuration...');
    validateConfig();

    // Connect to databases
    logger.info('Connecting to databases...');
    try {
      await connectDatabase();
      await createTables();
      logger.info('✅ PostgreSQL connected');
    } catch (error) {
      logger.warn('⚠️ PostgreSQL connection failed:', error);
      logger.warn('Continuing without database...');
    }

    try {
      await connectRedis();
      logger.info('✅ Redis connected');
    } catch (error) {
      logger.warn('⚠️ Redis connection failed:', error);
      logger.warn('Continuing without Redis cache...');
    }

    // Start server
    logger.info('Starting API server...');
    const server = new AppServer();
    await server.start();
    logger.info('✅ API server started');

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, shutting down gracefully...`);

      try {
        await server.stop();
        await closeDatabase();
        await closeRedis();
        logger.info('✅ Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();

