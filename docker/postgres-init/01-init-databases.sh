#!/bin/bash
set -e

# Create liquidityflow database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE liquidityflow'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'liquidityflow')\gexec
EOSQL

echo "✅ Databases initialized"

