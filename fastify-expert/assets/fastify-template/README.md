# Fastify Application

Production-ready Fastify application with best practices.

## Features

- **Schema-First Development**: All routes use JSON Schema for validation and fast serialization
- **Modular Architecture**: Feature-based structure with clean separation of concerns
- **Security**: Helmet, CORS, rate limiting, JWT authentication
- **Observability**: Structured logging with Pino, correlation IDs, request timing
- **Production Ready**: Health checks, graceful shutdown, error handling
- **API Documentation**: Auto-generated Swagger UI
- **Performance Optimized**: Database connection pooling, response schemas, async/await patterns

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Database Setup

Create the database and users table:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### Running the Application

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

### API Documentation

Once running, visit: http://localhost:3000/docs

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Performance

```bash
# Benchmark
npm run benchmark

# Profile with clinic.js
npm run profile:doctor
npm run profile:flame
npm run profile:bubble
```

## Project Structure

```
src/
├── app.js              # Application setup
├── server.js           # Server startup
├── config/             # Configuration
├── plugins/            # Infrastructure plugins
│   ├── database.js
│   ├── auth.js
│   └── hooks.js
├── schemas/            # Shared schemas
│   └── common.js
├── features/           # Feature modules
│   └── users/
│       ├── index.js    # Feature plugin
│       ├── routes.js   # HTTP routes
│       ├── service.js  # Business logic
│       ├── repository.js # Data access
│       └── schemas.js  # Feature schemas
└── lib/                # Utilities
    └── errors.js       # Custom error classes
```

## Environment Variables

See `.env.example` for all available configuration options.

## API Endpoints

### Health Checks

- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### Users

- `GET /api/users` - List users (with pagination)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user (requires auth)
- `DELETE /api/users/:id` - Delete user (requires admin role)
- `POST /api/users/login` - Login and get JWT token

## Authentication

Protected routes require a JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/users/123
```

## License

MIT
