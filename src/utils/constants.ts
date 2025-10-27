import { PublicKey } from '@solana/web3.js';

// Token Mints (Devnet)
export const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
};

// DEX Program IDs
export const DEX_PROGRAMS = {
  JUPITER: new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
  ORCA: new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),
  RAYDIUM: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
};

// Network Constants
export const NETWORK = {
  DEVNET_RPC: 'https://api.devnet.solana.com',
  MAINNET_RPC: 'https://api.mainnet-beta.solana.com',
  LAMPORTS_PER_SOL: 1_000_000_000,
};

// Trading Constants
export const TRADING = {
  MAX_SLIPPAGE_BPS: 1000, // 10%
  DEFAULT_SLIPPAGE_BPS: 50, // 0.5%
  MAX_HOPS: 5,
  MIN_TRADE_AMOUNT: 0.001, // SOL
  MAX_TRADE_AMOUNT: 1000, // SOL
  GAS_ESTIMATE_LAMPORTS: 5000,
};

// Cache TTLs (seconds)
export const CACHE_TTL = {
  QUOTE: 30,
  ROUTE: 60,
  LIQUIDITY: 10,
  PRICE: 5,
};

