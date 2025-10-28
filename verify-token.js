const { Connection, PublicKey } = require('@solana/web3.js');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function verifyToken() {
  try {
    const mint = new PublicKey('HHSfQJEhWkXQZbxuNzmtCwZGNYwAX2VNezdXuVYJbrgE');
    console.log('🔍 Verifying token on devnet...\n');
    console.log('Mint Address:', mint.toString());
    
    const accountInfo = await connection.getParsedAccountInfo(mint);
    
    if (accountInfo.value) {
      console.log('✅ Token found on devnet!');
      console.log('\nToken Details:');
      console.log('- Owner:', accountInfo.value.owner.toString());
      if (accountInfo.value.data.parsed) {
        console.log('- Mint:', accountInfo.value.data.parsed.info.mint);
        console.log('- Decimals:', accountInfo.value.data.parsed.info.decimals);
        console.log('- Supply:', accountInfo.value.data.parsed.info.supply);
      }
    } else {
      console.log('❌ Token not found on devnet');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyToken();
