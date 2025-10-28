import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function testSwap() {
  console.log('🚀 Testing Real Swap...\n');
  
  // Your wallet details
  const wallet = {
    publicKey: 'BKyvitJ4StjPvgKf24SqWsFir7bLmmBwF3GepVMnYzpV',
    privateKey: '67iEhpy8G3g7ovEBT6GvSUe61tjH6d51xviZVWn6NKbEF5tJzSPKStPSiAAeGiTVLZR937Rmtn8T4SerH96ZDz2q'
  };

  // Get quote first
  console.log('1️⃣ Getting quote...');
  const quoteResponse = await axios.get(`${API_URL}/api/quotes`, {
    params: {
      inputMint: 'So11111111111111111111111111111111111111112', // SOL
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      amount: '1000000', // 0.001 SOL
      slippageBps: 50
    }
  });

  const quote = quoteResponse.data.data;
  console.log('✅ Quote received:', {
    inputAmount: quote.inputAmount,
    outputAmount: quote.outputAmount,
    routes: quote.routes.length
  });

  // Execute swap
  console.log('\n2️⃣ Executing swap...');
  const swapResponse = await axios.post(`${API_URL}/api/swap`, {
    quote: quote,
    userWallet: wallet.publicKey,
    slippageBps: 50
  });

  console.log('\n3️⃣ Swap Result:', {
    status: swapResponse.data.data.status,
    transactionHash: swapResponse.data.data.transactionHash,
    signature: swapResponse.data.data.signature?.substring(0, 20) + '...'
  });
}

testSwap().catch(console.error);
