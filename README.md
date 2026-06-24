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

Terdapat dua skenario utama untuk mendepoly aplikasi ini: menggunakan cloud provider modern seperti **Render.com** (dikombinasikan dengan Supabase), atau menggunakan **cPanel / VPS Tradisional**. Keduanya memiliki pendekatan arsitektur yang berbeda untuk menangani Autentikasi dan Cookie Lintas Domain (Cross-Domain Cookies).

### Opsi A: Cloud Deployment (Render.com + Supabase) — Rekomendasi
Arsitektur ini menggunakan **Next.js API Rewrites** di Frontend untuk mem-proxy request API secara internal ke Backend. Seluruh aplikasi akan tampak berjalan di 1 domain yang sama (`rwmanage.onrender.com`), sehingga sangat aman dari CSRF dan bebas blokir cookie pihak ketiga oleh browser.

1. **Siapkan Database Supabase**:
   - Buat project di [Supabase](https://supabase.com/).
   - Dapatkan `DATABASE_URL` (Port 6543, Transaction Pooler) dan `DIRECT_URL` (Port 5432, Session Mode).
2. **Push Kode ke GitHub**:
   - Pastikan kode terbaru ada di repositori GitHub Anda.
3. **Deploy via Render Blueprint**:
   - Masuk ke dashboard Render -> **New** -> **Blueprint**.
   - Hubungkan repositori GitHub Anda. Render akan otomatis membaca file `render.yaml` dan membuat Web Service Backend & Frontend.
4. **Set Environment Variables**:
   - Render akan meminta input `DATABASE_URL` dan `DIRECT_URL` di dashboard secara otomatis. Masukkan kredensial Supabase Anda.
5. **Bagaimana Sistem Bekerja**:
   - Frontend otomatis menggunakan proxy (`/api/*`) di `next.config.ts` untuk meneruskan request ke backend secara transparan.
   - Backend akan mendeteksi status produksi dan otomatis menerbitkan Auth Cookie dengan keamanan `SameSite: Lax` yang anti-tembus oleh sistem pihak ketiga.

---

### Opsi B: Traditional / cPanel Deployment (PM2 / Node App)
Opsi untuk hosting VPS atau cPanel berbasis Node.js. Skenario ini umumnya mengharuskan Frontend dan Backend dipisah ke *subdomain berbeda* (misal: `app.domain.com` dan `api.domain.com`), yang akan memicu restriksi Cross-Site Cookie oleh browser (seperti Safari/Chrome).

Untuk mengatasinya, sistem telah dilengkapi dukungan *Dynamic Variables* khusus untuk konfigurasi server tradisional.

#### 1. Setup Environment Backend
Buat file `.env` di dalam folder `backend/`:
```env
# Koneksi Database
DATABASE_URL="postgresql://user:pass@host:5432/db"
DIRECT_URL="postgresql://user:pass@host:5432/db"

# Keamanan JWT & Server
JWT_SECRET="secret-key-anda"
NODE_ENV="production"
PORT=3000

# Pengaturan CORS & Cookie Lintas Subdomain (PENTING UNTUK CPANEL)
FRONTEND_URL="https://app.domainanda.com"
COOKIE_SAME_SITE="none"          # Wajib "none" agar cookie diizinkan menyeberang antar subdomain
COOKIE_DOMAIN=".domainanda.com"  # Isi root domain Anda dengan awalan TITIK
COOKIE_SECURE="true"             # Wajib true (HTTPS harus aktif di cPanel)
```

#### 2. Konfigurasi Frontend
Pada folder `frontend/`, pastikan Anda menyesuaikan `.env.production` saat akan membuild aplikasi di cPanel agar mengarah ke API eksternal:
```env
NEXT_PUBLIC_API_URL="https://api.domainanda.com"
```
*(Catatan Penting: Jika Anda men-deploy terpisah di cPanel, disarankan untuk menghapus sementara blok `rewrites()` di file `next.config.ts` agar Next.js menembak API secara eksternal alih-alih menganggap API berada di domain internal).*

#### 3. Build Proyek di cPanel/VPS
Buka terminal cPanel atau SSH, lalu kompilasi proyek:

**A. Build Backend:**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy  # Sinkronisasi tabel ke database
npm run build              # Menghasilkan dist/src/server.js
```

**B. Build Frontend:**
```bash
cd ../frontend
npm install
npm run build              # Menghasilkan folder `.next/standalone`
```

#### 4. Menjalankan Layanan via PM2
Gunakan file bawaan `ecosystem.config.js` dari folder utama untuk menjaga server Node.js tetap menyala:
```bash
pm2 start ecosystem.config.js
```
*(Tips Tambahan: Jika cPanel Anda menggunakan fitur native "Setup Node.js App" tanpa PM2, arahkan Application Startup File milik backend ke `dist/src/server.js`, dan milik frontend ke `.next/standalone/server.js`).*

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
