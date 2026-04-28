# RWManage - Rumah Warga Management System

A comprehensive full-stack application for managing residential communities (RW), including features for Masjid management, Zakat/Charity (ZIS), and community fund management (Kas).

## 📋 Project Structure

```
RWManage/
├── backend/        # Express.js + TypeScript API server
├── frontend/       # Next.js + React web application
└── README.md       # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd RWManage
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure your .env with database and app settings
   npm run db:push      # Initialize database
   npm run db:seed      # Optional: seed sample data
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env.local
   # Configure your .env.local with API endpoint
   ```

## 📚 Development

### Backend Development
```bash
cd backend
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run test         # Run tests
npm run test:security # Run security tests
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start dev server (port 3001)
npm run build        # Build for production
npm run start        # Start production server
```

## 🏗️ Technology Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **Security**: bcrypt, rate limiting, CORS
- **Testing**: Jest

### Frontend
- **Framework**: Next.js 16
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **HTTP Client**: Axios
- **Icons**: Hugeicons + Lucide

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Request validation with Zod
- Security-focused test suite

## 📝 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/rwmanage
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
NODE_ENV=production
PORT=3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 🚢 Deployment

### Build for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Environment Setup
Ensure proper environment variables are configured in your hosting platform:
- Backend: `.env` file
- Frontend: `.env.local` file

## 📖 API Documentation

API endpoints are organized by feature:
- `/api/auth` - Authentication endpoints
- `/api/rw` - RW (residential) management
- `/api/masjid` - Masjid management
- `/api/zis` - Zakat/Charity management
- `/api/kas` - Fund management
- `/api/reports` - Reporting endpoints
- `/api/share-links` - Share link management

## 🧪 Testing

```bash
cd backend
npm run test              # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:security    # Run security tests only
```

## 📦 Database

Uses PostgreSQL with Prisma ORM. Schema is defined in `backend/prisma/schema.prisma`.

### Database Commands
```bash
cd backend
npm run db:push   # Push schema changes
npm run db:seed   # Run seed file
```

## 🎯 Features

- **Authentication**: Secure JWT-based user authentication
- **RW Management**: Manage residential communities and members
- **Masjid Integration**: Track masjid-related activities and finances
- **ZIS Management**: Handle Zakat, Infaq, and Sadaqah (charity)
- **Fund Management**: Track community funds and expenses
- **Reporting**: Generate financial and activity reports
- **Share Links**: Create shareable links for public data access
- **Transparent Ledger**: Public transparency page for community

## 📄 License

ISC

## 👥 Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
3. Push to the branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Last Updated**: 2026-04-28
