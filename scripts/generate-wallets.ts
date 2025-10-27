/**
 * Generate Solana Wallets
 * Creates keypairs for the LiquidityFlow backend
 */

import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';

interface Wallet {
  name: string;
  public_key: string;
  private_key: string;
  secret_key: string;
}

interface WalletsFile {
  main_wallet: Wallet;
  worker_wallets: Wallet[];
}

/**
 * Generate a keypair and return wallet info
 */
function generateWallet(name: string): Wallet {
  const keypair = Keypair.generate();
  
  return {
    name,
    public_key: keypair.publicKey.toString(),
    private_key: bs58.encode(keypair.secretKey), // Base58 encoded for Solana
    secret_key: Buffer.from(keypair.secretKey).toString('hex'), // Hex for backup
  };
}

/**
 * Main function to generate wallets
 */
function main() {
  console.log('🔑 Generating Solana wallets for LiquidityFlow...\n');
  
  // Generate main wallet (for backend operations)
  const mainWallet = generateWallet('main_wallet');
  console.log('✅ Main Wallet Generated:');
  console.log(`   Public Key: ${mainWallet.public_key}`);
  console.log(`   Name: ${mainWallet.name}\n`);
  
  // Generate worker wallets (for parallel processing)
  const workerWallets: Wallet[] = [];
  const numWorkers = 3;
  
  for (let i = 1; i <= numWorkers; i++) {
    const worker = generateWallet(`worker_${i}`);
    workerWallets.push(worker);
    console.log(`✅ Worker ${i} Generated: ${worker.public_key}`);
  }
  
  // Create wallets file structure
  const walletsFile: WalletsFile = {
    main_wallet: mainWallet,
    worker_wallets: workerWallets,
  };
  
  // Write to file
  const outputPath = path.join(__dirname, '../solana_wallets.json');
  fs.writeFileSync(outputPath, JSON.stringify(walletsFile, null, 2));
  
  console.log(`\n📝 Wallets saved to: ${outputPath}`);
  console.log('⚠️  Make sure to add this file to .gitignore!\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 MAIN WALLET ADDRESS (Add SOL to this):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(mainWallet.public_key);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('💡 Next steps:');
  console.log('   1. Send testnet/devnet SOL to main wallet');
  console.log('   2. Add solana_wallets.json to .gitignore');
  console.log('   3. Keep private keys SECURE!\n');
}

main();

