const axios = require('axios');

async function testSwap() {
  try {
    console.log('🚀 Testing Swap on Local Validator\n');
    
    // Step 1: Get a quote
    console.log('1️⃣ Getting quote...');
    const quoteResponse = await axios.get('http://localhost:3000/api/quotes', {
      params: {
        inputMint: 'So11111111111111111111111111111111111111112', // SOL
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        amount: '1000000', // 0.001 SOL
        slippageBps: 50
      }
    });
    
    console.log('✅ Quote:', quoteResponse.data.data.outputAmount);
    
    // Step 2: Execute swap
    console.log('\n2️⃣ Executing swap...');
    const swapResponse = await axios.post('http://localhost:3000/api/swap', {
      quote: quoteResponse.data.data,
      userWallet: 'BKyvitJ4StjPvgKf24SqWsFir7bLmmBwF3GepVMnYzpV',
      slippageBps: 50
    });
    
    console.log('✅ Swap Result:', swapResponse.data.data.status);
    console.log('📝 Details:', JSON.stringify(swapResponse.data.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSwap();
