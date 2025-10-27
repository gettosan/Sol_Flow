/**
 * Wallet Management
 * Handles Solana wallet operations
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

interface WalletData {
  name: string;
  public_key: string;
  private_key: string;
  secret_key: string;
}

interface WalletsFile {
  main_wallet: WalletData;
  worker_wallets?: WalletData[];
}

/**
 * Load wallet from solana_wallets.json file
 */
export function loadWalletFromFile(walletName: string = 'main_wallet'): Keypair | null {
  try {
    const walletsPath = path.join(process.cwd(), 'solana_wallets.json');
    
    if (!fs.existsSync(walletsPath)) {
      logger.warn('solana_wallets.json not found');
      return null;
    }
    
    const walletsData = JSON.parse(fs.readFileSync(walletsPath, 'utf-8')) as WalletsFile;
    
    let walletData: WalletData;
    
    if (walletName === 'main_wallet') {
      walletData = walletsData.main_wallet;
    } else if (walletsData.worker_wallets) {
      walletData = walletsData.worker_wallets.find(w => w.name === walletName) || walletsData.main_wallet;
    } else {
      walletData = walletsData.main_wallet;
    }
    
    if (!walletData) {
      logger.error(`Wallet ${walletName} not found`);
      return null;
    }
    
    // Decode the secret key (hex format)
    let decoded: Uint8Array;
    
    // Try to decode from hex first (fallback)
    if (walletData.secret_key && walletData.secret_key.length === 64) {
      const hexBuffer = Buffer.from(walletData.secret_key, 'hex');
      decoded = new Uint8Array(hexBuffer);
    } else {
      // Try base58 decoding for Solana standard format
      decoded = bs58.decode(walletData.private_key);
    }
    
    const keypair = Keypair.fromSecretKey(decoded);
    
    logger.info(`Loaded wallet: ${walletData.name} (${walletData.public_key})`);
    return keypair;
    
  } catch (error: any) {
    logger.error(`Failed to load wallet from file: ${error.message}`);
    return null;
  }
}

/**
 * Get the main backend wallet
 */
export function getBackendWallet(): Keypair | null {
  return loadWalletFromFile('main_wallet');
}

/**
 * Generate a new wallet keypair for testing
 * DO NOT USE IN PRODUCTION
 */
export function generateTestWallet(): { publicKey: string; privateKey: string; secretKey: string } {
  const keypair = Keypair.generate();
  
  return {
    publicKey: keypair.publicKey.toString(),
    privateKey: bs58.encode(keypair.secretKey),
    secretKey: Buffer.from(keypair.secretKey).toString('hex'),
  };
}

