-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RW', 'RT', 'PENGURUS_MASJID', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "StatusAkun" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JenisTransaksi" AS ENUM ('MASUK', 'KELUAR');

-- CreateEnum
CREATE TYPE "StatusIuran" AS ENUM ('LUNAS', 'BELUM');

-- CreateEnum
CREATE TYPE "JenisBayar" AS ENUM ('UANG', 'BERAS');

-- CreateEnum
CREATE TYPE "StatusKehadiran" AS ENUM ('HADIR', 'LIBUR', 'IZIN', 'ALFA');

-- CreateEnum
CREATE TYPE "StatusInsiden" AS ENUM ('LAPORAN', 'PROSES', 'SELESAI', 'DITUTUP');

-- CreateEnum
CREATE TYPE "TipeDokumen" AS ENUM ('KTP', 'PASPORT', 'SIM', 'LAINNYA');

-- CreateEnum
CREATE TYPE "AksiAudit" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "no_hp" TEXT NOT NULL,
    "blok_wilayah_id" TEXT,
    "role" "Role" NOT NULL,
    "status_akun" "StatusAkun" NOT NULL DEFAULT 'PENDING',
    "alasan_penolakan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wilayah_rw" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nama_kompleks" TEXT NOT NULL,
    "no_rw" TEXT NOT NULL,

    CONSTRAINT "wilayah_rw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blok_wilayah" (
    "id" TEXT NOT NULL,
    "wilayah_rw_id" TEXT NOT NULL,
    "nama_blok" TEXT NOT NULL,
    "no_rt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blok_wilayah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masjid" (
    "id" TEXT NOT NULL,
    "blok_wilayah_id" TEXT NOT NULL,
    "nama_masjid" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,

    CONSTRAINT "masjid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengurus_masjid" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "masjid_id" TEXT NOT NULL,

    CONSTRAINT "pengurus_masjid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warga" (
    "id" TEXT NOT NULL,
    "blok_wilayah_id" TEXT NOT NULL,
    "nama_kk" TEXT NOT NULL,
    "tarif_iuran_bulanan" DECIMAL(10,2) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "warga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anggota_keluarga" (
    "id" TEXT NOT NULL,
    "warga_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "hubungan" TEXT NOT NULL,
    "nik" TEXT,
    "tanggal_lahir" TIMESTAMP(3),
    "pendidikan" TEXT,
    "pekerjaan" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anggota_keluarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identitas_warga" (
    "id" TEXT NOT NULL,
    "warga_id" TEXT NOT NULL,
    "tipe_dokumen" "TipeDokumen" NOT NULL,
    "nomor_dokumen" TEXT NOT NULL,
    "tanggal_terbit" TIMESTAMP(3),
    "tanggal_berlaku" TIMESTAMP(3),
    "dokumen_url" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identitas_warga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iuran_warga" (
    "id" TEXT NOT NULL,
    "warga_id" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "nominal" DECIMAL(10,2) NOT NULL,
    "status" "StatusIuran" NOT NULL DEFAULT 'BELUM',
    "kode_unik" TEXT,
    "tanggal_bayar" TIMESTAMP(3),

    CONSTRAINT "iuran_warga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cicilan_iuran" (
    "id" TEXT NOT NULL,
    "warga_id" TEXT NOT NULL,
    "iuran_id" TEXT NOT NULL,
    "total_cicilan" DECIMAL(10,2) NOT NULL,
    "nominal_per_bulan" DECIMAL(10,2) NOT NULL,
    "jumlah_bulan" INTEGER NOT NULL,
    "bulan_mulai" INTEGER NOT NULL,
    "tahun_mulai" INTEGER NOT NULL,
    "sudah_lunas" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cicilan_iuran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kas_rw" (
    "id" TEXT NOT NULL,
    "wilayah_rw_id" TEXT NOT NULL,
    "jenis_transaksi" "JenisTransaksi" NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keterangan" TEXT NOT NULL,
    "nominal" DECIMAL(10,2) NOT NULL,
    "bukti_url" TEXT,
    "bukti_foto_url" TEXT,
    "kode_unik" TEXT NOT NULL,

    CONSTRAINT "kas_rw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kas_masjid" (
    "id" TEXT NOT NULL,
    "masjid_id" TEXT NOT NULL,
    "jenis_transaksi" "JenisTransaksi" NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keterangan" TEXT NOT NULL,
    "nominal" DECIMAL(10,2) NOT NULL,
    "bukti_url" TEXT,
    "kode_unik" TEXT NOT NULL,

    CONSTRAINT "kas_masjid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaksi_zis" (
    "id" TEXT NOT NULL,
    "masjid_id" TEXT NOT NULL,
    "kode_unik" TEXT NOT NULL,
    "nama_kk" TEXT NOT NULL,
    "alamat_muzaqi" TEXT NOT NULL,
    "jumlah_jiwa" INTEGER NOT NULL,
    "jenis_bayar" "JenisBayar" NOT NULL,
    "nominal_zakat" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "nominal_infaq" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_beras_kg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "waktu_transaksi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaksi_zis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan_zis" (
    "id" TEXT NOT NULL,
    "masjid_id" TEXT NOT NULL,
    "persen_fakir" DOUBLE PRECISION NOT NULL DEFAULT 62.5,
    "persen_amil" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "persen_fisabilillah" DOUBLE PRECISION NOT NULL DEFAULT 11.0,
    "persen_lainnya" DOUBLE PRECISION NOT NULL DEFAULT 18.5,
    "harga_beras_per_kg" DECIMAL(10,2) NOT NULL,
    "is_harga_auto_api" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pengaturan_zis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performa_ronda" (
    "id" TEXT NOT NULL,
    "blok_wilayah_id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "nama_petugas" TEXT NOT NULL,
    "status_kehadiran" "StatusKehadiran" NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performa_ronda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_insiden" (
    "id" TEXT NOT NULL,
    "wilayah_rw_id" TEXT NOT NULL,
    "tipe_insiden" TEXT NOT NULL,
    "tanggal_insiden" TIMESTAMP(3) NOT NULL,
    "lokasi" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "status" "StatusInsiden" NOT NULL DEFAULT 'LAPORAN',
    "pelapor_nama" TEXT NOT NULL,
    "pelapor_no_hp" TEXT,
    "foto_bukti_url" TEXT,
    "ditindaklanjuti_tanggal" TIMESTAMP(3),
    "tindakan_diambil" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_insiden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "aksi" "AksiAudit" NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitas_id" TEXT NOT NULL,
    "data_lama" TEXT,
    "data_baru" TEXT,
    "keterangan" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preference" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dark_mode" BOOLEAN NOT NULL DEFAULT false,
    "tema_warna" TEXT DEFAULT 'blue',
    "bahasa" TEXT DEFAULT 'id',
    "notifikasi_email" BOOLEAN NOT NULL DEFAULT true,
    "notifikasi_sms" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_link" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wilayah_rw_user_id_key" ON "wilayah_rw"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "iuran_warga_kode_unik_key" ON "iuran_warga"("kode_unik");

-- CreateIndex
CREATE UNIQUE INDEX "kas_rw_kode_unik_key" ON "kas_rw"("kode_unik");

-- CreateIndex
CREATE UNIQUE INDEX "kas_masjid_kode_unik_key" ON "kas_masjid"("kode_unik");

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_zis_kode_unik_key" ON "transaksi_zis"("kode_unik");

-- CreateIndex
CREATE UNIQUE INDEX "pengaturan_zis_masjid_id_key" ON "pengaturan_zis"("masjid_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preference_user_id_key" ON "user_preference"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_link_token_key" ON "share_link"("token");

-- CreateIndex
CREATE INDEX "share_link_scope_scope_id_idx" ON "share_link"("scope", "scope_id");

-- CreateIndex
CREATE INDEX "share_link_expires_at_idx" ON "share_link"("expires_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_blok_wilayah_id_fkey" FOREIGN KEY ("blok_wilayah_id") REFERENCES "blok_wilayah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wilayah_rw" ADD CONSTRAINT "wilayah_rw_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blok_wilayah" ADD CONSTRAINT "blok_wilayah_wilayah_rw_id_fkey" FOREIGN KEY ("wilayah_rw_id") REFERENCES "wilayah_rw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masjid" ADD CONSTRAINT "masjid_blok_wilayah_id_fkey" FOREIGN KEY ("blok_wilayah_id") REFERENCES "blok_wilayah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengurus_masjid" ADD CONSTRAINT "pengurus_masjid_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengurus_masjid" ADD CONSTRAINT "pengurus_masjid_masjid_id_fkey" FOREIGN KEY ("masjid_id") REFERENCES "masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warga" ADD CONSTRAINT "warga_blok_wilayah_id_fkey" FOREIGN KEY ("blok_wilayah_id") REFERENCES "blok_wilayah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anggota_keluarga" ADD CONSTRAINT "anggota_keluarga_warga_id_fkey" FOREIGN KEY ("warga_id") REFERENCES "warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identitas_warga" ADD CONSTRAINT "identitas_warga_warga_id_fkey" FOREIGN KEY ("warga_id") REFERENCES "warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iuran_warga" ADD CONSTRAINT "iuran_warga_warga_id_fkey" FOREIGN KEY ("warga_id") REFERENCES "warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cicilan_iuran" ADD CONSTRAINT "cicilan_iuran_warga_id_fkey" FOREIGN KEY ("warga_id") REFERENCES "warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cicilan_iuran" ADD CONSTRAINT "cicilan_iuran_iuran_id_fkey" FOREIGN KEY ("iuran_id") REFERENCES "iuran_warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kas_rw" ADD CONSTRAINT "kas_rw_wilayah_rw_id_fkey" FOREIGN KEY ("wilayah_rw_id") REFERENCES "wilayah_rw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kas_masjid" ADD CONSTRAINT "kas_masjid_masjid_id_fkey" FOREIGN KEY ("masjid_id") REFERENCES "masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_zis" ADD CONSTRAINT "transaksi_zis_masjid_id_fkey" FOREIGN KEY ("masjid_id") REFERENCES "masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengaturan_zis" ADD CONSTRAINT "pengaturan_zis_masjid_id_fkey" FOREIGN KEY ("masjid_id") REFERENCES "masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performa_ronda" ADD CONSTRAINT "performa_ronda_blok_wilayah_id_fkey" FOREIGN KEY ("blok_wilayah_id") REFERENCES "blok_wilayah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_insiden" ADD CONSTRAINT "laporan_insiden_wilayah_rw_id_fkey" FOREIGN KEY ("wilayah_rw_id") REFERENCES "wilayah_rw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
