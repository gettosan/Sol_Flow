/**
 * Test Live Devnet Swap
 * Execute a real swap on Solana devnet
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testLiveSwap() {
  console.log('🔄 TESTING LIVE DEVNET SWAP');
  console.log('============================\n');

  // Step 1: Generate a quote first
  console.log('Step 1: Getting swap quote...');
  const quoteResponse = await axios.post(`${BASE_URL}/api/quotes`, {
    inputMint: 'So11111111111111111111111111111111111111112', // SOL
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    amount: '10000000', // 0.01 SOL
    slippageBps: 100, // 1%
  });

  console.log('Quote received:', {
    input: quoteResponse.data.data.inputAmount,
    output: quoteResponse.data.data.outputAmount,
    priceImpact: quoteResponse.data.data.priceImpact,
  });
  console.log('');

  // Step 2: Execute the swap
  console.log('Step 2: Executing swap with MEV protection...');
  
  const swapResponse = await axios.post(`${BASE_URL}/api/swap`, {
    quote: quoteResponse.data.data,
    userWallet: 'BKyvitJ4StjPvgKf24SqWsFir7bLmmBwF3GepVMnYzpV', // Your funded wallet
    slippageBps: 100,
  });

  console.log('Swap result:', {
    status: swapResponse.data.data.status,
    transactionHash: swapResponse.data.data.transactionHash,
    inputAmount: swapResponse.data.data.inputAmount,
    outputAmount: swapResponse.data.data.outputAmount,
  });

  // Step 3: Check transaction status
  if (swapResponse.data.data.transactionHash && 
      !swapResponse.data.data.transactionHash.startsWith('failed')) {
    console.log('\nStep 3: Monitoring transaction...');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const txStatus = await axios.get(
      `${BASE_URL}/api/transactions/${swapResponse.data.data.transactionHash}`
    );
    
    console.log('Transaction status:', txStatus.data.data.status);
  }

  console.log('\n✅ Live swap test complete!');
}

testLiveSwap().catch(console.error);

