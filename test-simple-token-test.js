const { Connection, Keypair, SystemProgram, Transaction } = require('@solana/web3.js');
const bs58 = require('bs58');

async function test() {
  try {
    const connection = new Connection('http://localhost:8899', 'confirmed');
    console.log('🔗 Connected to local validator\n');
    
    // Load wallet
    const walletData = require('./solana_wallets.json');
    const secretKey = bs58.decode(walletData.main_wallet.private_key);
    const wallet = Keypair.fromSecretKey(secretKey);
    console.log('✅ Wallet loaded:', wallet.publicKey.toString());
    
    // Get balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log('💰 SOL Balance:', balance / 1e9, 'SOL\n');
    
    // Create a simple test transaction
    console.log('🧪 Creating test transaction...');
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: wallet.publicKey,
        lamports: 1000
      })
    );
    
    transaction.feePayer = wallet.publicKey;
    const recentBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = recentBlockhash.blockhash;
    
    // Sign and send
    console.log('📝 Signing transaction...');
    transaction.sign(wallet);
    
    const signature = await connection.sendRawTransaction(transaction.serialize());
    console.log('✅ Transaction sent:', signature);
    
    await connection.confirmTransaction(signature);
    console.log('✅ Transaction confirmed!\n');
    
    console.log('✅ ALL TESTS PASSED!');
    console.log('   - Wallet working');
    console.log('   - Transactions can be created');
    console.log('   - Signing works');
    console.log('   - Submission works');
    console.log('   - Confirmation works');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
