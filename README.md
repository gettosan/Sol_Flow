# LiquidityFlow Backend

**Real-time decentralized liquidity aggregation protocol for Solana**

LiquidityFlow is a production-ready backend system for aggregating liquidity across major Solana DEXs (Jupiter, Orca, Raydium) with intelligent routing, MEV protection, and autonomous agent coordination using Fetch.ai.

---

## 🚀 Project Overview

LiquidityFlow enables decentralized liquidity aggregation on Solana by:

- **Smart Routing**: Multi-leg pathfinding algorithm that finds optimal swap routes across multiple DEXs
- **DEX Aggregation**: Integration with Jupiter, Orca, and Raydium for best execution prices
- **MEV Protection**: Advanced MEV attack detection and private transaction routing
- **Autonomous Agents**: Fetch.ai agents for market analysis and execution optimization
- **Real-time Quotes**: WebSocket streaming for instant price updates

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LiquidityFlow Backend                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  REST API → Smart Router → Solana Programs → Fetch.ai Agents    │
│                      ↓                                           │
│              Database Layer (PostgreSQL + Redis)                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Technology Stack

### Backend Core
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+
- **Framework**: Express.js 5.1+
- **Queue**: Bull 4.10+ (Redis-backed job queue)
- **WebSocket**: Socket.io 4.8+ (real-time quote streaming)

### Blockchain Integration
- **Solana**: @solana/web3.js 1.87+
- **Anchor**: @coral-xyz/anchor 0.32+
- **DEX APIs**: Jupiter, Orca, Raydium SDKs
- **Network**: Solana Devnet

### Database
- **PostgreSQL**: 15+ with pg 8.11+
- **Redis**: 7+ with ioredis 5.8+
- **Knowledge Graph**: MeTTa (for agent reasoning)

### DevOps & Testing
- **Testing**: Jest 29+ with ts-jest 29+
- **Containerization**: Docker Compose
- **Logging**: Winston 3.10+
- **Monitoring**: Prometheus client

---

## 🛠️ Installation

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/gettosan/Sol_Flow.git
   cd Sol_Flow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.devnet` and update with your credentials:
   ```bash
   cp .env.devnet .env
   ```
   
   Edit `.env` and set:
   - `SOLANA_WALLET_PRIVATE_KEY` - Your Solana wallet private key
   - `POSTGRES_PASSWORD` - PostgreSQL password
   - Other configuration as needed

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run tests**
   ```bash
   npm test
   ```

---

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Project Structure

```
liquidity-flow-backend/
├── src/
│   ├── types/           # Type definitions
│   ├── api/             # REST API routes & middleware
│   ├── core/            # Core business logic
│   │   ├── smartRouter/ # Pathfinding algorithm
│   │   ├── dexAggregator/ # DEX integration clients
│   │   ├── solanaPrograms/ # Anchor program interfaces
│   │   └── quoteEngine/ # Quote generation logic
│   ├── agents/          # Fetch.ai agent integrations
│   ├── database/        # Database layer (PostgreSQL + Redis)
│   ├── utils/           # Utility functions
│   └── config/          # Configuration management
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── fixtures/        # Test data
├── agents/              # Python agent implementations
├── programs/            # Solana (Anchor) programs
└── docker/              # Docker configuration

```

---

## 🧩 Current Implementation Status

### ✅ Completed (Feature 1)

- **Project Foundation**
  - TypeScript configuration with strict mode
  - Jest testing framework setup
  - ESLint and Prettier configuration
  - All dependencies installed

- **Core Type Definitions**
  - Complete type system for the entire backend
  - Error code enumeration
  - API request/response types
  - Agent communication types
  - Database record types

- **Utility Modules**
  - Logging system (Winston)
  - Error handling with custom error classes
  - Input validation functions
  - Centralized constants

- **Configuration System**
  - Environment-based configuration
  - Configuration validation
  - Solana devnet integration setup

- **Testing**
  - 43 comprehensive tests (all passing)
  - Test utilities and setup
  - Coverage for types, validators, and errors

### 🚧 In Progress / Planned

- Database layer (PostgreSQL + Redis connections)
- REST API endpoints (quotes, swap, routes, agents)
- Smart router engine with pathfinding algorithm
- DEX aggregation layer (Jupiter, Orca, Raydium clients)
- Solana program integration
- Fetch.ai autonomous agents
- WebSocket real-time quote streaming

---

## 📊 Testing

### Current Test Results

```
Test Suites: 3 passed, 3 total
Tests:       43 passed, 43 total
Snapshots:   0 total
Time:        0.601 s
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

Tests cover:
- ✅ Type definitions and structure
- ✅ Error classes and error codes
- ✅ Validation functions
- ✅ Configuration loading

---

## 🔧 Configuration

### Environment Variables

Key environment variables in `.env.devnet`:

```env
# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Solana
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed
SOLANA_WALLET_PRIVATE_KEY=your_key_here

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=liquidityflow
POSTGRES_PASSWORD=devnet_password
POSTGRES_DB=liquidityflow_db

REDIS_HOST=localhost
REDIS_PORT=6379

# DEX APIs
JUPITER_API_URL=https://quote-api.jup.ag/v6
```

---

## 📚 API Endpoints (Planned)

### REST API

- `GET /api/quotes` - Get swap quote
- `POST /api/swap` - Execute swap
- `GET /api/routes` - Get routing options
- `POST /api/agents/execute` - Execute agent action
- `GET /api/health` - Health check

### WebSocket

- `WS /api/stream` - Real-time quote streaming

---

## 🤝 Contributing

This project is being developed incrementally. See [CHANGELOG.md](./CHANGELOG.md) for detailed information about each feature.

### Development Workflow

1. Read requirements for the feature
2. Design the solution
3. Implement the code
4. Update CHANGELOG.md
5. Write tests
6. Test manually
7. Commit to Git

---

## 📄 License

ISC License

---

## 👤 Author

**gettosan** <gettoojjk@gmail.com>

- GitHub: [@gettosan](https://github.com/gettosan)
- Project: [Sol_Flow](https://github.com/gettosan/Sol_Flow)

---

## 🔗 Links

- [Repository](https://github.com/gettosan/Sol_Flow)
- [Issues](https://github.com/gettosan/Sol_Flow/issues)
- [Changelog](./CHANGELOG.md)

---

## 📖 Documentation

- [Setup Guide](./docs/SETUP.md) (coming soon)
- [API Documentation](./docs/API_ENDPOINTS.md) (coming soon)
- [Agent Protocol](./docs/AGENT_PROTOCOL.md) (coming soon)

---

## ⚠️ Current Status

**Version**: 1.0.0-dev  
**Status**: Active Development  
**Last Updated**: October 27, 2024

This is an active development project. Core foundation is complete with comprehensive testing. Database layer and API endpoints are next in development.

