import { config as dotenvConfig } from 'dotenv';
import { AppConfig } from '../types';

// Load environment variables
dotenvConfig({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env.devnet' });

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',

  solana: {
    rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com',
    commitment: (process.env.SOLANA_COMMITMENT || 'confirmed') as
      | 'processed'
      | 'confirmed'
      | 'finalized',
    walletPrivateKey: process.env.SOLANA_WALLET_PRIVATE_KEY || '',
  },

  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      user: process.env.POSTGRES_USER || 'liquidityflow',
      password: process.env.POSTGRES_PASSWORD || '',
      database: process.env.POSTGRES_DB || 'liquidityflow_db',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
  },

  dex: {
    jupiterApiUrl: process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6',
    maxRetries: 3,
    timeoutMs: 5000,
  },

  agents: {
    serverHost: process.env.AGENT_SERVER_HOST || 'localhost',
    serverPort: parseInt(process.env.AGENT_SERVER_PORT || '50051', 10),
    network: (process.env.FETCH_AI_NETWORK || 'testnet') as 'testnet' | 'mainnet',
  },

  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
};

// Validate required config
export const validateConfig = (): void => {
  const required = ['SOLANA_WALLET_PRIVATE_KEY', 'POSTGRES_PASSWORD'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

