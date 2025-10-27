/**
 * Check Solana Wallet Balance
 */

import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

interface WalletsFile {
  main_wallet: {
    public_key: string;
  };
}

async function checkBalance() {
  try {
    // Read wallets
    const walletsPath = path.join(__dirname, '../solana_wallets.json');
    const walletsData = JSON.parse(fs.readFileSync(walletsPath, 'utf-8')) as WalletsFile;
    
    const mainWalletAddress = walletsData.main_wallet.public_key;
    
    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    console.log('🔍 Checking wallet balance on Solana Devnet...\n');
    console.log(`📝 Wallet Address: ${mainWalletAddress}\n`);
    
    // Get balance
    const publicKey = new PublicKey(mainWalletAddress);
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / 1e9; // Convert lamports to SOL
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 BALANCE CHECK RESULTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Lamports: ${balance.toLocaleString()}`);
    console.log(`   SOL: ${solBalance.toFixed(4)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (solBalance > 0) {
      console.log('✅ Wallet has devnet SOL! Ready to execute swaps.');
    } else {
      console.log('⚠️  Wallet has no SOL. Please airdrop devnet SOL to this address.');
    }
    
  } catch (error: any) {
    console.error('❌ Error checking balance:', error.message);
  }
}

checkBalance();

