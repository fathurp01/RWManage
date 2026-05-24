# RWManage - Rumah Warga Management System

A comprehensive, full-stack application built for managing residential communities (RW/RT), including features for Masjid management, Zakat/Charity (ZIS), community fund management (Kas), incident reporting, and security patrolling (Performa Ronda). The system ensures Bank-Grade Security through HttpOnly Cookies, CSRF guards, Rate Limiting, and strict input validation via Zod.

## 📋 Project Structure

```
RWManage/
├── backend/        # Express.js + TypeScript API server
├── frontend/       # Next.js 15 (App Router) + React application
├── ecosystem.config.js # PM2 Production setup configuration
└── README.md       # This file
```

## 🚀 Getting Started & Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git
- PM2 (for production deployment)

### 1. Database Setup
Ensure you have PostgreSQL running. Create a database (e.g., `rwmanage`).

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```
Edit the `.env` file to match your environment, specifically updating `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL`.

Run database migrations to initialize tables:
```bash
# For development
npm run db:push

# To seed initial data (Superadmin, roles, etc)
npm run db:seed
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.local.example .env.local
```
Ensure `NEXT_PUBLIC_API_URL` points to your backend API URL (e.g., `http://localhost:3000/api` for local development or your production URL).

## 📚 Development Mode

To run the application locally for development:

**Backend:**
```bash
cd backend
npm run dev  # Starts the server on port 3000
```

**Frontend:**
```bash
cd frontend
npm run dev  # Starts the Next.js server on port 3001
```

## 🚢 Production Deployment (VPS/cPanel)

This project has been optimized for traditional hosting using Node.js and PM2, with Next.js compiled to Standalone mode.

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```
   *(This creates an optimized standalone Next.js server in `.next/standalone`)*

2. **Build Backend**:
   ```bash
   cd backend
   npm run build
   ```

3. **Database Migration**:
   ```bash
   cd backend
   npm run db:deploy  # Safely applies migrations to the production DB
   ```

4. **Start via PM2**:
   From the root of the project:
   ```bash
   pm2 start ecosystem.config.js
   ```
   This will spin up both the backend dan frontend di server Anda.

## 🧪 Testing the Application (Ensuring No Errors)

To verify that the recent security enhancements and production prep did not break the app, you can test it both automatically and manually.

### 1. Automated E2E Testing (Frontend)
The frontend uses Playwright to perform end-to-end tests mapping out all primary flows.
```bash
cd frontend
npx playwright test
```
*Note: Ensure both the backend and frontend development servers are running before executing E2E tests, as they simulate a real user navigating the browser.*

### 2. Automated API Testing (Backend)
The backend uses Jest and Supertest for unit and integration testing.
```bash
cd backend
npm run test           # Run standard tests
npm run test:security  # Run dedicated security tests
```

### 3. Manual Testing Verification
If you are already running both `npm run dev` servers, you can test manually:
1. Open `http://localhost:3001` (or your local IP) in your browser.
2. Login as superadmin (`superadmin@rwmanage.com` / `superadmin123` if you ran `db:seed`).
3. Verify that the **Auth Cookies** are being set as `HttpOnly` and `Secure`.
4. Check features like **Kas**, **Laporan Insiden**, and **Ronda** to ensure they load and can save data without errors.
5. Try opening the login page, then closing the tab and reopening `http://localhost:3001/dashboard/admin` to confirm persistent session works without saving tokens in `localStorage`.
