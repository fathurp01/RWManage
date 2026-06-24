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

## 🚢 Production Deployment

Terdapat dua opsi deployment untuk aplikasi ini: menggunakan cloud provider **Render.com** (otomatis via Render Blueprint) atau **cPanel/VPS** tradisional (menggunakan PM2).

### Opsi A: Cloud Deployment (Render.com) — Rekomendasi
Deployment otomatis dan gratis menggunakan file konfigurasi `render.yaml` yang tersedia di branch `cloud-render`.

1. **Push Branch `cloud-render` ke GitHub**:
   ```bash
   git push origin cloud-render
   ```
2. **Buat Blueprint Instance**:
   - Masuk ke dashboard [Render.com](https://dashboard.render.com).
   - Klik **New +** -> **Blueprint**.
   - Hubungkan repositori GitHub Anda dan pilih branch **`cloud-render`**.
3. **Approve & Deploy**:
   - Render secara otomatis akan mendeteksi dan membuat PostgreSQL database (`rwmanage-db`), backend API (`rwmanage-backend`), serta Next.js frontend (`rwmanage-frontend`).
   - Env dan konektivitas antarlayanan akan di-setup secara otomatis.
   - Database migration akan berjalan otomatis pada fase startup backend.

*Catatan: Seeding database awal bisa dijalankan manual lewat menu **Shell** di layanan backend Render dengan perintah `npm run db:seed`.*

---

### Opsi B: Traditional/cPanel Deployment (PM2)
Opsi untuk hosting VPS atau cPanel berbasis Node.js yang sudah terpasang PM2.

#### 1. Prasyarat & File `.env`
Pastikan Anda membuat file `.env` di dalam folder `backend/` dengan isi:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/nama_db"
JWT_SECRET="secret-key-anda"
JWT_EXPIRY="1d"
PORT=3000
NODE_ENV="production"
FRONTEND_URL="https://domain-frontend-anda.com"
```
Dan pastikan file `.env.production` (atau `.env`) di folder `frontend/` sudah memiliki `NEXT_PUBLIC_API_URL` yang mengarah ke URL API backend Anda (dibutuhkan pada saat build time).

#### 2. Konfigurasi Standalone Next.js
Pastikan file `frontend/next.config.ts` sudah menyertakan `output: "standalone"` agar folder build standalone terbuat dengan benar.

#### 3. Build Proyek di cPanel/VPS
Jalankan instruksi berikut di terminal cPanel/SSH Anda:

**A. Build Backend:**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy  # Menerapkan migrasi schema ke database cPanel
npm run build              # Menghasilkan dist/src/server.js
```

**B. Build Frontend:**
```bash
cd ../frontend
npm install
npm run build              # Menghasilkan folder standalone .next/standalone/server.js
```

#### 4. Menjalankan via PM2
Kembali ke root direktori proyek, lalu jalankan:
```bash
pm2 start ecosystem.config.js
```
Ini akan menyalakan backend dan frontend secara bersamaan dan menjaganya tetap aktif di background.


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
