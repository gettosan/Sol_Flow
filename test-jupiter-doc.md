# Jupiter API Analysis

Based on https://dev.jup.ag/api-reference, the issue is clear:

## Problem Found:
The Ultra API endpoint returns a quote but **no transaction** because:
1. Ultra API requires pre-funded liquidity
2. Devnet pools often have insufficient liquidity
3. The transaction field is null/empty when no route can be executed

## Solution:
Use Jupiter's **Legacy Swap API** which:
1. Gets quote first
2. Builds transaction
3. Works better on devnet

## Correct API Flow:
```
GET /v6/quote → POST /v6/swap → Sign → Submit
```

Not:
```
GET /ultra/v1/order (may return null transaction)
```
