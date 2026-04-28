# Backend API Server

Express.js + TypeScript backend for RWManage application.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- npm or yarn

### Installation

```bash
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

```bash
# Initialize database schema
npm run db:push

# Optional: Seed with sample data
npm run db:seed
```

## 📝 Available Scripts

- `npm run dev` - Start development server with hot reload (port 3000)
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server (requires `npm run build` first)
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:security` - Run security-focused tests
- `npm run db:push` - Push Prisma schema to database
- `npm run db:seed` - Seed database with initial data

## 🏗️ Project Structure

```
src/
├── app.ts              # Express app configuration
├── server.ts           # Server entry point
├── controllers/        # Route handlers
├── middlewares/        # Express middlewares
├── routes/            # API routes
├── validation/        # Request validation schemas
├── lib/               # Utility functions
└── tests/             # Test files

prisma/
├── schema.prisma      # Database schema
└── seed.ts            # Database seeding script
```

## 🛣️ API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### RW Management
- `GET /api/rw` - Get RW data
- `POST /api/rw` - Create RW
- `GET /api/rw/:id` - Get RW details

### Masjid Management
- `GET /api/rw/:rwId/masjid` - Get masjid data
- `POST /api/rw/:rwId/masjid` - Create/update masjid

### ZIS (Zakat/Charity)
- `GET /api/rw/:rwId/zis` - Get ZIS data
- `POST /api/rw/:rwId/zis` - Record ZIS transaction
- `GET /api/rw/:rwId/zis/reports` - Get ZIS reports

### Kas (Fund Management)
- `GET /api/rw/:rwId/kas` - Get fund data
- `POST /api/rw/:rwId/kas` - Record fund transaction

### Reports
- `GET /api/reports` - Get available reports
- `GET /api/reports/:type` - Generate specific report

### Share Links
- `POST /api/share-links` - Create share link
- `GET /share/:token` - Access shared data

## 🔐 Security Features

- JWT authentication with configurable expiry
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Request validation with Zod schemas
- CORS configuration
- Secure headers

## 📊 Database

Uses PostgreSQL with Prisma ORM. Schema includes tables for:
- Users (with authentication)
- RW (residential communities)
- Masjid (mosque) data
- ZIS (charity) transactions
- Kas (fund) transactions
- Reports and analytics data

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode for development
npm run test:watch

# Security-specific tests
npm run test:security
```

Tests are configured with Jest and located in the `tests/` directory.

## 📦 Key Dependencies

- **express** - Web framework
- **@prisma/client** - Database ORM
- **jsonwebtoken** - JWT authentication
- **bcrypt** - Password hashing
- **zod** - Schema validation
- **express-rate-limit** - Rate limiting
- **cors** - CORS middleware

## 🚀 Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables in `.env`

3. Initialize database:
   ```bash
   npm run db:push
   ```

4. Start production server:
   ```bash
   npm run start
   ```

### Docker (Optional)

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## 📝 Environment Variables

See `.env.example` for all required and optional configuration variables.

## 🐛 Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL format in .env
- Ensure database exists and user has permissions

### JWT Errors
- Verify JWT_SECRET is set in .env
- Check token hasn't expired (JWT_EXPIRY setting)

### Port Already in Use
- Change PORT in .env
- Or kill process using port 3000

## 📄 License

ISC

---

For more information, see the main [README.md](../README.md)
