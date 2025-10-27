import { query } from './connection';
import { logger } from '../../utils/logger';

/**
 * Create all database tables
 */
export async function createTables(): Promise<void> {
  await query('BEGIN');
  
  try {
    // Trades table
    await query(`
      CREATE TABLE IF NOT EXISTS trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_address TEXT NOT NULL,
        input_mint TEXT NOT NULL,
        output_mint TEXT NOT NULL,
        input_amount BIGINT NOT NULL,
        output_amount BIGINT NOT NULL,
        route JSONB NOT NULL,
        dex_fees_bps INTEGER,
        slippage_bps INTEGER,
        mev_protected BOOLEAN DEFAULT FALSE,
        transaction_hash TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
        created_at TIMESTAMP DEFAULT NOW(),
        executed_at TIMESTAMP
      )
    `);

    // Create indexes for trades
    await query(`
      CREATE INDEX IF NOT EXISTS idx_trades_user 
      ON trades(user_address)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_trades_status 
      ON trades(status)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_trades_created 
      ON trades(created_at DESC)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_trades_tx_hash 
      ON trades(transaction_hash)
    `);

    // Liquidity snapshots table
    await query(`
      CREATE TABLE IF NOT EXISTS liquidity_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dex TEXT NOT NULL,
        pool_address TEXT NOT NULL,
        token_a_mint TEXT NOT NULL,
        token_b_mint TEXT NOT NULL,
        liquidity_a BIGINT NOT NULL,
        liquidity_b BIGINT NOT NULL,
        price DECIMAL(20, 10) NOT NULL,
        tvl DECIMAL(20, 2),
        volume_24h DECIMAL(20, 2),
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for liquidity_snapshots
    await query(`
      CREATE INDEX IF NOT EXISTS idx_liquidity_pool 
      ON liquidity_snapshots(pool_address)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_liquidity_timestamp 
      ON liquidity_snapshots(timestamp DESC)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_liquidity_dex 
      ON liquidity_snapshots(dex)
    `);

    // Agent logs table
    await query(`
      CREATE TABLE IF NOT EXISTS agent_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id TEXT NOT NULL,
        agent_type TEXT NOT NULL CHECK (agent_type IN 
          ('marketAnalysis', 'smartRouter', 'autonomousMM', 'mevHunter')),
        action TEXT NOT NULL,
        result JSONB,
        confidence FLOAT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for agent_logs
    await query(`
      CREATE INDEX IF NOT EXISTS idx_agent_type 
      ON agent_logs(agent_type)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_agent_timestamp 
      ON agent_logs(timestamp DESC)
    `);

    // Quote cache table
    await query(`
      CREATE TABLE IF NOT EXISTS quote_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id TEXT UNIQUE NOT NULL,
        input_mint TEXT NOT NULL,
        output_mint TEXT NOT NULL,
        input_amount BIGINT NOT NULL,
        output_amount BIGINT NOT NULL,
        routes JSONB NOT NULL,
        price_impact FLOAT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Transaction history table
    await query(`
      CREATE TABLE IF NOT EXISTS transaction_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        signature TEXT UNIQUE NOT NULL,
        user_address TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'confirmed', 'failed', 'finalized')),
        block_time TIMESTAMP,
        slot BIGINT,
        confirmation_status TEXT,
        error_message TEXT,
        fee BIGINT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for transaction_history
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tx_signature 
      ON transaction_history(signature)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tx_user 
      ON transaction_history(user_address)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tx_status 
      ON transaction_history(status)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tx_created 
      ON transaction_history(created_at DESC)
    `);

    // Create indexes for quote_cache
    await query(`
      CREATE INDEX IF NOT EXISTS idx_quote_id 
      ON quote_cache(quote_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_quote_expires 
      ON quote_cache(expires_at)
    `);

    // Performance metrics table
    await query(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_name TEXT NOT NULL,
        metric_value FLOAT NOT NULL,
        tags JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for performance_metrics
    await query(`
      CREATE INDEX IF NOT EXISTS idx_metrics_name 
      ON performance_metrics(metric_name)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp 
      ON performance_metrics(timestamp DESC)
    `);

    await query('COMMIT');
    logger.info('✅ Database tables created successfully');
  } catch (error) {
    await query('ROLLBACK');
    logger.error('❌ Error creating tables:', error);
    throw error;
  }
}

/**
 * Drop all tables (for testing/development)
 */
export async function dropTables(): Promise<void> {
  const tables = [
    'trades',
    'liquidity_snapshots',
    'agent_logs',
    'quote_cache',
    'transaction_history',
    'performance_metrics',
  ];

  try {
    for (const table of tables) {
      await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    logger.info('✅ Database tables dropped');
  } catch (error) {
    logger.error('❌ Error dropping tables:', error);
    throw error;
  }
}

/**
 * Cleanup expired quotes
 */
export async function cleanupExpiredQuotes(): Promise<void> {
  try {
    const result = await query(
      `
      DELETE FROM quote_cache 
      WHERE expires_at < NOW()
      `
    );
    logger.debug(`Cleaned up ${result.rowCount} expired quotes`);
  } catch (error) {
    logger.error('Error cleaning up expired quotes:', error);
  }
}

