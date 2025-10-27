#!/bin/bash
set -e

echo "Initializing LiquidityFlow databases..."

# The user and database are already created by POSTGRES_USER and POSTGRES_DB
# Just need to ensure everything is ready
echo "✅ Databases ready: liquidityflow_db"
