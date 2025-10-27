#!/bin/bash

echo "🧪 Testing LiquidityFlow API Endpoints..."
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Endpoint..."
curl -s http://localhost:3000/api/health | jq -r '.status'
echo ""

# Test 2: Get Quote
echo "2️⃣ Testing Quote Endpoint..."
echo "Quote request: SOL -> USDC, 1 SOL amount"
curl -s "http://localhost:3000/api/quotes?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippage=0.5" \
  | jq -r '.success, .data.outputAmount, .data.routes | length'
echo ""

# Test 3: Swap Execution  
echo "3️⃣ Testing Swap Endpoint..."
TIMESTAMP=$(date +%s)000
EXPIRY=$((TIMESTAMP + 60000))
curl -s -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"quote\": {
      \"inputAmount\": \"1000000000\",
      \"outputAmount\": \"990000000\",
      \"priceImpact\": 1.0,
      \"routes\": [{
        \"dex\": \"Orca\",
        \"percentage\": 100,
        \"amountOut\": \"990000000\",
        \"poolAddress\": \"pool123\",
        \"priceImpact\": 1.0
      }],
      \"estimatedGas\": 3000,
      \"timestamp\": $TIMESTAMP,
      \"quoteId\": \"test-123\",
      \"mevProtected\": false,
      \"expiresAt\": $EXPIRY
    },
    \"userWallet\": \"BKyvitJ4StjPvgKf24SqWsFir7bLmmBwF3GepVMnYzpV\",
    \"slippageBps\": 50
  }" \
  | jq -r '.success, .data.transactionHash, .data.status'
echo ""

# Test 4: Get Routes
echo "4️⃣ Testing Routes Endpoint..."
curl -s "http://localhost:3000/api/routes?from=So11111111111111111111111111111111111111112&to=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000" \
  | jq -r '.success, .data.routes | length'
echo ""

echo "✅ API Tests Complete!"

