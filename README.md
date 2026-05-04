# Exporta Fácil Backend

Backend architecture for Exporta Fácil export/import platform with WTO API integration.

## 🏗️ Architecture Overview

### Three-Layer Architecture
- **Frontend**: TanStack Start / React 19
- **Backend**: Node.js + Express + TypeScript on Edge Runtime
- **External**: WTO APIs + PostgreSQL + Redis cache

### Core Components

#### 1. **API Gateway** (`src/middleware/auth.ts`, `src/middleware/rateLimiting.ts`)
- JWT/API key authentication
- Rate limiting (global + WTO-specific)
- CORS and security headers
- Request logging and context injection

#### 2. **Domain Services** (`src/services/`)
- `alertsService.ts` - SPS/TBT alerts & quotas
- `marketsService.ts` - Trade trends & competition
- `facilityService.ts` - Customs & TFAD processes
- `productService.ts` - Product catalog (DB-only)
- `chatService.ts` - AI chat with LLM proxy

#### 3. **WTO Adapter** (`src/adapters/wto.server.ts`)
- Single point of WTO API integration
- Manages `Ocp-Apim-Subscription-Key` header injection
- Falls back to mocks if API key missing or upstream fails
- Transforms raw WTO responses to domain types

#### 4. **Cache Layer** (`src/cache/index.ts`)
- Redis caching with 5-minute TTL
- `getOrCompute` pattern for automatic caching
- Graceful fallback if Redis unavailable

#### 5. **Database** (`src/database/`)
- PostgreSQL for persistence (users, products, chat, logs)
- Migration scripts with sample data seeding

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env and configure:
# - WTO_API_KEY (leave empty for mock mode)
# - DB_* credentials
# - REDIS_* connection
# - JWT_SECRET
```

### 3. Database Setup (Optional)
```bash
npm run migrate
```

### 4. Start Development Server
```bash
npm run dev
```

Server runs on `http://localhost:3000`

## 📡 API Endpoints

### Alerts & Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/alerts?product=` | Get alerts for product |
| GET | `/api/alerts/critical?days=30` | Get critical alerts |
| GET | `/api/events?product=` | Get combined alerts + quotas |

### Market Data
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/markets?product=` | Get market trends |
| GET | `/api/markets/competition?product=&country=` | Analyze competition |
| GET | `/api/markets/trending?limit=10` | Get trending products |

### Facility & Customs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/facility?country=` | Get TFAD processes |
| POST | `/api/facility/clearance-estimate` | Calculate processing time |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/product?category=` | List products |
| POST | `/api/product` | Create product |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/session` | Create chat session |
| POST | `/api/chat/:sessionId/message` | Send message |

## 🔐 Authentication

### JWT Token
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/alerts
```

### API Key
```bash
curl -H "X-API-Key: <key>" http://localhost:3000/api/alerts
```

## 📊 Rate Limiting

- **Global**: 100 req/min per IP
- **WTO APIs**: 20 req/min (due to upstream quota)
- **Auth**: 5 attempts per 15 minutes

## 🔄 Cache Strategy

All WTO API responses are cached with 5-minute TTL:
- First request: hits WTO API
- Subsequent requests (within 5 min): cache hit
- Cache miss on expiry: refreshes from WTO
- Fallback: mocks if WTO unavailable

## 📝 Development Notes

### Mock Mode (No WTO API Key)
- Leave `WTO_API_KEY` empty in `.env`
- All endpoints return mock data automatically
- Useful for local development and CI/CD

### Adding New Services
1. Create service class in `src/services/`
2. Call WTO adapter (never call WTO directly)
3. Implement routes in `src/routes/api.ts`
4. Add middleware/auth as needed

### Database Schema
User → Products → Chat Sessions
```sql
SELECT * FROM products WHERE category = 'Agricultural';
SELECT * FROM chat_messages WHERE session_id = 'session-123';
```

## 🧪 Testing

```bash
# Run health check
curl http://localhost:3000/health

# Test endpoint with auth
curl -H "X-API-Key: test-key" http://localhost:3000/api/alerts?product=Coffee
```

## 🛠️ Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier formatting |
| `npm run migrate` | Run database migrations |

## 📚 Project Structure

```
src/
├── adapters/
│   └── wto.server.ts          # WTO API integration + fallback
├── cache/
│   └── index.ts               # Redis cache service
├── database/
│   ├── pool.ts                # PostgreSQL connection pool
│   ├── schema.ts              # Tables & migrations
│   └── migrate.ts             # Migration runner
├── middleware/
│   ├── auth.ts                # JWT/API key auth
│   └── rateLimiting.ts        # Rate limiting
├── services/
│   ├── alertsService.ts       # Alerts & quotas
│   ├── marketsService.ts      # Trade trends
│   ├── facilityService.ts     # Customs procedures
│   ├── productService.ts      # Product catalog
│   └── chatService.ts         # AI chat
├── routes/
│   └── api.ts                 # All API endpoints
├── types/
│   └── index.ts               # TypeScript types
├── utils/
│   ├── helpers.ts             # Utility functions
│   └── mock.ts                # Mock data
└── server.ts                  # Express app entry point
```

## 🔗 Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# WTO API (leave empty for mocks)
WTO_API_KEY=
WTO_BASE_URL=https://api.wto.org

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=exporta_facil
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth
JWT_SECRET=dev-secret
JWT_EXPIRY=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Cache
WTO_CACHE_TTL=300
```

## ⚡ Performance Considerations

1. **Cache-First**: Redis caches all WTO responses (5 min TTL)
2. **Connection Pooling**: PostgreSQL pool with max 20 connections
3. **Rate Limiting**: Prevents WTO API quota exhaustion
4. **Mock Fallback**: No dependency on WTO for core functionality
5. **Lazy Loading**: Services initialize on-demand

## 🐛 Troubleshooting

### Redis Connection Failed
- Ensure Redis is running: `redis-server`
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`
- Adapter will continue without cache

### Database Connection Failed
- Ensure PostgreSQL is running
- Verify credentials in `.env`
- Run `npm run migrate` to initialize schema

### WTO API Errors
- Check `WTO_API_KEY` is valid
- Verify API rate limits not exceeded
- Check for SPS/TBT notification updates
- Mock data is used automatically on failure

## 📖 Documentation

- [API Blueprint](./API_BLUEPRINT.md)
- [WTO API Docs](https://www.wto.org/english/res_e/recentdec_e.htm)
- [Express.js Docs](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📄 License

MIT
