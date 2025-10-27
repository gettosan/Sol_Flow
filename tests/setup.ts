import { config } from 'dotenv';
import { logger } from '../src/utils/logger';

// Load test environment
config({ path: '.env.test' });

// Suppress logs during testing unless LOG_LEVEL is set
if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'error';
}

// Global test utilities
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock Solana RPC endpoint for testing
export const MOCK_RPC_ENDPOINT = 'https://api.devnet.solana.com';

// Mock token addresses
export const MOCK_SOL_MINT = 'So11111111111111111111111111111111111111112';
export const MOCK_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const MOCK_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

// Cleanup after tests
afterAll(async () => {
  // Add cleanup logic here when database connections are established
  logger.info('Test suite completed');
});

