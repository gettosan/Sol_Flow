import { Pool, PoolConfig } from 'pg';
import { config } from '../../config';
import { logger } from '../../utils/logger';

let pool: Pool | null = null;

/**
 * Create PostgreSQL connection pool
 */
export function createPool(): Pool {
  const poolConfig: PoolConfig = {
    host: config.database.postgres.host,
    port: config.database.postgres.port,
    user: config.database.postgres.user,
    password: config.database.postgres.password,
    database: config.database.postgres.database,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  return new Pool(poolConfig);
}

/**
 * Get or create database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = createPool();

    pool.on('error', (err) => {
      logger.error('Unexpected database pool error:', err);
    });

    pool.on('connect', () => {
      logger.debug('New PostgreSQL client connected');
    });

    logger.info('PostgreSQL connection pool created');
  }

  return pool;
}

/**
 * Connect to database and test connection
 */
export async function connectDatabase(): Promise<void> {
  try {
    const poolInstance = getPool();
    const client = await poolInstance.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ PostgreSQL connected successfully');
  } catch (error) {
    logger.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

/**
 * Close database connections
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL connection pool closed');
  }
}

/**
 * Execute a database query
 */
export async function query(text: string, params?: any[]): Promise<any> {
  const poolInstance = getPool();
  return poolInstance.query(text, params);
}

