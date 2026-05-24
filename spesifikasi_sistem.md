# Spesifikasi Sistem: RWManage (Rumah Warga Management System)

Dokumen ini mendeskripsikan secara lengkap spesifikasi arsitektur, basis data, fungsionalitas modul, fitur keamanan (Bank-Grade Security), struktur direktori, dan petunjuk operasional sistem **RWManage**.

---

## 1. Ringkasan Sistem
**RWManage** adalah platform manajemen digital terintegrasi untuk pengelolaan lingkungan perumahan tingkat Rukun Warga (RW) dan Rukun Tetangga (RT). Sistem ini mengintegrasikan administrasi kependudukan, iuran bulanan (dan cicilan), pencatatan keuangan (Kas RT & RW), koordinasi keamanan (jadwal & presensi ronda), pelaporan insiden, manajemen Zakat, Infaq, dan Sedekah (ZIS) masjid, serta transparansi keuangan publik.

---

## 2. Arsitektur Teknologi

### 2.1. Frontend (Client-Side)
- **Framework Utama**: Next.js 15 (App Router) + React 19 + TypeScript.
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI primitives).
- **State & Kredensial**: React Context (`AuthContext`) untuk mengelola sesi user terautentikasi. Token disimpan di sisi server via cookies untuk keamanan maksimal.
- **Koneksi API**: Axios instance (`api`) terkonfigurasi dengan opsi `withCredentials: true` untuk memfasilitasi pengiriman httpOnly cookie.
- **Paket Ikon**: Lucide React + Hugeicons.
- **Pengujian E2E**: Playwright.

### 2.2. Backend (Server-Side)
- **Runtime**: Node.js + Express.js + TypeScript.
- **ORM & Database**: Prisma ORM terhubung ke PostgreSQL.
- **Dokumen Generator**: PDFKit (pembuatan kwitansi dan laporan rekapitulasi PDF premium).
- **Pengunggahan Berkas**: Multer (menyimpan foto bukti insiden dan berkas identitas warga di direktori lokal server `/uploads`).
- **Pengujian Unit**: Jest + Supertest.

### 2.3. Lapisan Keamanan (Bank-Grade Security)
1. **HttpOnly Cookies**: Token JWT disimpan dalam cookie `token` dengan opsi `httpOnly: true`, `secure: true`, dan `sameSite: 'strict'` untuk meniadakan ancaman pencurian sesi via serangan XSS.
2. **CSRF Protection**: Middleware `csrfGuard` terpasang untuk melindungi endpoint yang memodifikasi data dari serangan Cross-Site Request Forgery.
3. **Anti Brute-Force (Rate Limiting)**: Menggunakan `express-rate-limit` pada rute-rute sensitif (registrasi, login, dan reset password) dengan peningkatan limit adaptif di mode development.
4. **Strong Password Hashing**: Hashing sandi menggunakan Bcrypt dengan ketetapan `SALT_ROUNDS = 12` secara merata di seluruh komponen pendaftaran dan reset.
5. **Validasi Input Ketat (Zod Schema)**: Semua payload request body dan parameter rute (terutama validasi format UUID) disaring secara ketat sebelum diproses oleh controller database.

---

## 3. Spesifikasi Skema Basis Data (PostgreSQL via Prisma)

Sistem menggunakan Prisma ORM dengan relasi tabel sebagai berikut:

### 3.1. Enums
- **`Role`**: Tingkat otoritas pengguna (`RW`, `RT`, `PENGURUS_MASJID`, `SUPERADMIN`).
- **`StatusAkun`**: Status verifikasi registrasi atau permintaan (`PENDING`, `APPROVED`, `REJECTED`).
- **`JenisTransaksi`**: Jenis arus keuangan (`MASUK`, `KELUAR`).
- **`StatusIuran`**: Status tagihan bulanan warga (`LUNAS`, `BELUM`).
- **`StatusSetoran`**: Status pengiriman iuran RT ke RW (`BELUM`, `PENDING`, `TERKONFIRMASI`).
- **`JenisBayar`**: Metode pembayaran ZIS (`UANG`, `BERAS`).
- **`StatusKeluarga`**: Profil kemampuan sosial warga (`MAMPU`, `KURANG_MAMPU`, `LANSIA`).
- **`JenisZakat`**: Klasifikasi zakat (`FITRAH`, `MAAL`).
- **`StatusKehadiran`**: Presensi ronda (`HADIR`, `LIBUR`, `IZIN`, `ALFA`).
- **`StatusInsiden`**: Alur penanganan laporan keamanan (`LAPORAN`, `PROSES`, `SELESAI`, `DITUTUP`).
- **`TipeDokumen`**: Jenis berkas kependudukan (`KTP`, `PASPORT`, `SIM`, `LAINNYA`).
- **`KategoriDistribusi`**: Klasifikasi penerimaan zakat (`FAKIR`, `AMIL`, `FISABILILLAH`, `LAINNYA`).
- **`AksiAudit`**: Aksi pencatatan riwayat (`CREATE`, `READ`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `APPROVE`, `REJECT`).

### 3.2. Model Tabel Utama
1. **`User` (`users`)**: Menyimpan akun pengguna sistem (RW, RT, Pengurus Masjid, Superadmin) lengkap dengan relasi ke wilayah kerja dan status persetujuan registrasi.
2. **`WilayahRW` (`wilayah_rw`)**: Profil wilayah administrasi tingkat RW yang terikat langsung ke akun pengguna pembuatnya (User RW).
3. **`BlokWilayah` (`blok_wilayah`)**: Unit blok/RT di bawah suatu RW. Menyimpan flag teguran ronda dari RW ke RT.
4. **`Masjid` (`masjid`)**: Entitas masjid yang beroperasi di suatu Blok Wilayah.
5. **`PengurusMasjid` (`pengurus_masjid`)**: Tabel penghubung relasi many-to-many antara User dan Masjid.
6. **`Warga` (`warga`)**: Menyimpan data kepala keluarga (KK) utama di suatu RT, status keluarga, dan relasi kependudukan.
7. **`AnggotaKeluarga` (`anggota_keluarga`)**: Data anggota keluarga yang terikat ke kepala keluarga (Warga).
8. **`IdentitasWarga` (`identitas_warga`)**: Unggahan dokumen resmi warga (KTP, SIM, dll.) lengkap dengan kolom verifikasi status verifikator.
9. **`IuranWarga` (`iuran_warga`)**: Tagihan iuran warga per-bulan & per-tahun. Menyimpan `kode_unik` untuk pembayaran warga dan relasi ke `SetoranIuranRT`.
10. **`CicilanIuran` (`cicilan_iuran`)**: Fitur keringanan bagi warga kurang mampu/lansia untuk mengangsur iuran dalam beberapa bulan.
11. **`PembayaranCicilan` (`pembayaran_cicilan`)**: Histori transaksi angsuran cicilan.
12. **`KasRW` (`kas_rw`)**: Buku kas keuangan tingkat RW.
13. **`KasRT` (`kas_rt`)**: Buku kas keuangan tingkat RT.
14. **`KasMasjid` (`kas_masjid`)**: Buku kas keuangan masjid.
15. **`TransaksiZis` (`transaksi_zis`)**: Catatan penerimaan zakat & infaq dari warga (muzakki).
16. **`PengaturanZis` (`pengaturan_zis`)**: Konfigurasi alokasi persentase asnaf zakat dan harga beras acuan masjid.
17. **`PencatatanDistribusi` (`pencatatan_distribusi`)**: Log penyaluran zakat/infaq ke asnaf (mustahik).
18. **`PerformaRonda` (`performa_ronda`)**: Evaluasi kehadiran ronda warga per-hari di suatu RT.
19. **`JadwalRonda` (`jadwal_ronda`)**: Konfigurasi hari, jam, dan kelompok ronda warga.
20. **`RondaPetugas` (`ronda_petugas`)**: Daftar nama warga yang ditugaskan masuk dalam jadwal ronda tertentu.
21. **`PresensiRonda` (`presensi_ronda`)**: Log kehadiran harian petugas ronda.
22. **`LaporanInsiden` (`laporan_insiden`)**: Laporan kejadian darurat, kriminalitas, atau sosial di wilayah RW/RT dilengkapi koordinat lokasi, deskripsi tindakan resolusi, dan foto bukti.
23. **`AuditLog` (`audit_log`)**: Log audit tak terhapus untuk mencatat semua perubahan data (CRUD) yang dilakukan user.
24. **`UserPreference` (`user_preference`)**: Preferensi UI pengguna (tema gelap/terang, bahasa, opsi notifikasi).
25. **`ShareLink` (`share_link`)**: Token tautan publik berbatas waktu untuk membagikan dashboard kas & ZIS masjid secara transparan.
26. **`PengaturanIuranRW` (`pengaturan_iuran_rw`)**: Tarif iuran resmi yang ditetapkan RW, termasuk porsi pembagian kas RT (misal 70%) dan RW (30%).
27. **`SetoranIuranRT` (`setoran_iuran_rt`)**: Rekapitulasi setoran dana iuran dari RT ke RW yang perlu ditinjau & disetujui RW sebelum diakumulasikan ke saldo RW.
28. **`PasswordResetRequest` (`password_reset_request`)**: Permohonan pemulihan/reset sandi pengguna yang diajukan ke admin.

---

## 4. Fungsionalitas Modul Sistem

### 4.1. Modul Autentikasi & Verifikasi Akun
- **Registrasi Mandiri**: Calon pengurus mendaftar dengan memilih peran (RW, RT, Pengurus Masjid), melengkapi email, nomor handphone, wilayah RT/RW, atau memilih masjid.
- **Persetujuan Registrasi**: Pengguna dengan peran RW bertugas menyetujui akun RT baru di wilayahnya. Superadmin menyetujui akun RW dan Pengurus Masjid baru. Akun berstatus `PENDING` tidak dapat mengakses dashboard.
- **Pemulihan Password**: Permintaan lupa password melampirkan alasan dan kata sandi baru. Permintaan masuk antrean persetujuan Superadmin sebelum aktif.

### 4.2. Modul Keuangan & Pembayaran Kependudukan
- **Tarif Iuran Wilayah**: Pengurus RW mengatur tarif iuran default bulanan untuk tiga kategori warga (Mampu, Kurang Mampu, Lansia) beserta persentase pembagian alokasi untuk Kas RT dan Kas RW.
- **Tagihan Iuran Bulanan**: Sistem secara otomatis menagih iuran bulanan untuk setiap KK terdaftar. 
- **Skema Cicilan**: Warga kurang mampu/lansia dapat mengajukan cicilan iuran bulanan dalam jangka waktu tertentu (misal iuran Rp100.000 dicicil 4x dalam 4 bulan).
- **Setoran Iuran RT ke RW**: 
  - RT menagih dan mengumpulkan iuran dari warganya (masuk ke penampungan sementara).
  - RT mengajukan setoran kolektif ke RW dengan mengunggah foto bukti transfer.
  - RW meninjau pengajuan setoran dan menekan "Setujui" (Terkonfirmasi). Uang porsi RW secara otomatis masuk ke saldo Kas RW, dan status iuran terkait dinyatakan lunas.

### 4.3. Modul Manajemen Kas & Pendapatan
- **Kas RT & Kas RW**: Pencatatan mandiri transaksi pengeluaran (misal perbaikan selokan, pembelian alat ronda) dan pemasukan non-iuran lengkap dengan unggahan kwitansi digital.
- **Kas Masjid**: Pencatatan arus keuangan masjid terpisah dari kas wilayah.

### 4.4. Modul Keamanan Wilayah & Ronda
- **Jadwal Ronda**: RT membuat slot jadwal ronda berdasarkan hari (0-6) dan jam operasional, lalu memasukkan daftar nama warga (petugas).
- **Absensi Ronda**: RT mengisi absensi ronda harian berdasarkan daftar nama terjadwal. Kehadiran diakumulasikan dalam tabel `PerformaRonda`.
- **Teguran Ronda**: Pengurus RW memantau rekapitulasi performa ronda seluruh RT. RW dapat mengirimkan pesan teguran resmi langsung ke dashboard RT tertentu jika tingkat kehadiran ronda di bawah standar.

### 4.5. Modul Penanganan Kejadian (Insiden)
- **Pelaporan Kejadian**: RT/RW mencatat kejadian di wilayah (misal pencurian, kebakaran, keributan sosial).
- **Resolusi**: Status insiden dapat diubah (`LAPORAN` -> `PROSES` -> `SELESAI` -> `DITUTUP`) dengan mengisi kolom tindakan resolusi yang diambil.
- **Ekspor PDF Premium**: Dokumen PDF laporan insiden dicetak **satu kejadian per halaman** dengan Kop Surat Resmi RT/RW, metadata detail pelapor & kontak, dan menyertakan foto bukti kejadian berukuran besar secara dinamis di sisa ruang halaman.

### 4.6. Modul Transparansi & Dashboard Publik
- **Share Links**: Pengurus masjid dan RW dapat menerbitkan tautan khusus untuk membagikan diagram kas dan histori muzaqi ZIS secara publik. Tautan memiliki masa kedaluwarsa dan dapat dicabut sewaktu-waktu.
- **Cek Kode Unik**: Halaman beranda publik menyediakan form verifikasi transaksi. Warga dapat memasukkan kode unik kwitansi iuran, kas, atau ZIS untuk memvalidasi keabsahan data di sistem, lengkap dengan opsi ekspor PDF kwitansi dengan stempel digital verified.

### 4.7. Modul Superadmin & Audit
- **Audit Logs**: Rekaman aktivitas sensitif (seperti pembuatan data, pembaruan iuran, approval akun, login) secara immutable untuk kepatuhan keamanan data.
- **Sistem Monitor**: Grafik real-time statistik CPU, pemakaian memori, uptime backend, dan beban antrean persetujuan.

---

## 5. Struktur Direktori Proyek

```
RWManage/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Definisi model basis data & relasi
│   │   └── seed.ts            # Skrip pembenihan data awal (users, blok, warga, dll)
│   ├── src/
│   │   ├── controllers/       # Logika bisnis endpoint (auth, rw, rt, zis, dll)
│   │   ├── middlewares/       # Penjaga keamanan (auth, rateLimit, csrfGuard, validateRequest)
│   │   ├── routes/            # Rute Express API (api.ts, kasRTRoutes.ts, dll)
│   │   ├── validation/        # Skema validasi request input (schemas.ts)
│   │   ├── app.ts             # Inisialisasi Express & Middleware global
│   │   └── server.ts          # Entry point server backend
│   ├── tests/                 # Unit & integration testing backend
│   └── package.json
│
├── frontend/
│   ├── app/                   # Folder Rute Next.js (App Router)
│   │   ├── auth/              # Halaman Login, Register, & Forgot Password
│   │   ├── dashboard/         # Dashboard berdasar peran (rw, rt, masjid, superadmin)
│   │   ├── public/            # Halaman publik (cek kwitansi & share link dashboard)
│   │   ├── layout.tsx         # Layout global frontend
│   │   └── page.tsx           # Landing page utama
│   ├── components/            # UI Components reusable (ui/, custom components)
│   ├── context/               # Global states (AuthContext.tsx)
│   ├── lib/                   # Utilitas frontend (Axios instance `api`)
│   ├── middleware.ts          # Next.js Middleware untuk pengamanan rute dashboard
│   ├── package.json
│   └── tsconfig.json
```

---

## 6. Petunjuk Operasional

### 6.1. Variabel Lingkungan (Environment Variables)

**Backend (`backend/.env`):**
```ini
DATABASE_URL="postgresql://username:password@localhost:5432/rwmanage?schema=public"
JWT_SECRET="masukkan_jwt_secret_key_yang_sangat_kuat_disini"
JWT_EXPIRY="7d"
PORT=3000
NODE_ENV="development"
```

**Frontend (`frontend/.env.local`):**
```ini
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

### 6.2. Menjalankan Mode Pengembangan (Development)

1. Jalankan database PostgreSQL lokal Anda.
2. Setup Backend:
   ```bash
   cd backend
   npm install
   npm run db:push
   npm run db:seed
   npm run dev
   ```
   *Backend berjalan pada port 3000.*

3. Setup Frontend:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   *Frontend berjalan pada port 3001.*

### 6.3. Perintah Pengujian (Testing)

**Menjalankan Test Suite Keamanan & Validasi Backend:**
```bash
cd backend
npm run test
```

**Menjalankan Test E2E Frontend:**
```bash
cd frontend
npx playwright test
```
