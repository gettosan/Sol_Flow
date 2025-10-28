#!/bin/bash

echo "🧪 Testing LiquidityFlow Features"
echo "===================================="
echo ""

BASE_URL="http://localhost:3000"
TEST_ADDRESS="BKyvitJ4StjPvgKf24SqWsFir7bLmmBwF3GepVMnYzpV"

# Test 1: Get a swap quote
echo "📊 Test 1: Getting Swap Quote..."
QUOTE=$(curl -s -X POST $BASE_URL/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": "1000000000",
    "slippageBps": 100
  }')

echo "Quote Response:"
echo "$QUOTE" | jq '.data | {quoteId, inputAmount, outputAmount, priceImpact, routes: (.routes | length)}'
echo ""

# Test 2: Market Analysis Agent
echo "📈 Test 2: Market Analysis Agent..."
MARKET=$(curl -s -X POST $BASE_URL/api/agents/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "market_analysis",
    "action": "analyze",
    "params": {
      "tokenPairs": [
        {"inputMint": "So11111111111111111111111111111111111111112", "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}
      ],
      "timeframe": "1h"
    }
  }')
echo "$MARKET" | jq '.data.result.analysis[0]'
echo ""

# Test 3: Smart Router Agent
echo "🔀 Test 3: Smart Router Agent..."
ROUTER=$(curl -s -X POST $BASE_URL/api/agents/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "smart_router",
    "action": "optimize",
    "params": {
      "inputMint": "So11111111111111111111111111111111111111112",
      "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "amount": "1000000000",
      "constraints": {"maxSlippage": 100, "maxRoutes": 3}
    }
  }')
echo "$ROUTER" | jq '.data.result.analysis'
echo ""

# Test 4: MEV Detection
echo "🛡️ Test 4: MEV Hunter Agent..."
QUOTE_JSON='{
  "inputAmount": "1000000000",
  "outputAmount": "100000000",
  "priceImpact": 5.0,
  "routes": [{"dex": "Jupiter", "percentage": 100, "amountOut": "100000000", "poolAddress": "pool1", "priceImpact": 5}],
  "estimatedGas": 5000,
  "timestamp": '$(date +%s000)',
  "quoteId": "test-quote-123",
  "mevProtected": false,
  "expiresAt": '$(($(date +%s)+60))000'
}'

MEV=$(curl -s -X POST $BASE_URL/api/agents/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"agentType\": \"mev_hunter\",
    \"action\": \"detect\",
    \"params\": {
      \"quote\": $QUOTE_JSON,
      \"recentTrades\": []
    }
  }")
echo "$MEV" | jq '.data.result'
echo ""

# Test 5: Transaction Status (mock signature)
echo "📝 Test 5: Transaction Status Tracking..."
TX_STATUS=$(curl -s http://localhost:3000/api/transactions/5XbT1KRv4HnxXyNwuKhY3v8zTq9cY2F9x1gW5sGm1TzW)
echo "Status Check:"
echo "$TX_STATUS" | jq '.' | head -10
echo ""

echo "✅ All Feature Tests Complete!"

