/*
  Warnings:

  - You are about to drop the column `tarif_iuran_bulanan` on the `warga` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusSetoran" AS ENUM ('BELUM', 'PENDING', 'TERKONFIRMASI');

-- CreateEnum
CREATE TYPE "JenisZakat" AS ENUM ('FITRAH', 'MAAL');

-- CreateEnum
CREATE TYPE "KategoriDistribusi" AS ENUM ('FAKIR', 'AMIL', 'FISABILILLAH', 'LAINNYA');

-- AlterTable
ALTER TABLE "iuran_warga" ADD COLUMN     "nominal_kas_rt" DECIMAL(10,2),
ADD COLUMN     "nominal_kas_rw" DECIMAL(10,2),
ADD COLUMN     "setoran_id" TEXT;

-- AlterTable
ALTER TABLE "laporan_insiden" ADD COLUMN     "blok_wilayah_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transaksi_zis" ADD COLUMN     "jenis_zakat" "JenisZakat" NOT NULL DEFAULT 'FITRAH';

-- AlterTable
ALTER TABLE "warga" DROP COLUMN "tarif_iuran_bulanan";

-- CreateTable
CREATE TABLE "pengaturan_iuran_rw" (
    "id" TEXT NOT NULL,
    "wilayah_rw_id" TEXT NOT NULL,
    "nominal_iuran" DECIMAL(10,2) NOT NULL,
    "persen_rt" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
    "persen_rw" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengaturan_iuran_rw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kas_rt" (
    "id" TEXT NOT NULL,
    "blok_wilayah_id" TEXT NOT NULL,
    "jenis_transaksi" "JenisTransaksi" NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keterangan" TEXT NOT NULL,
    "nominal" DECIMAL(10,2) NOT NULL,
    "bukti_url" TEXT,
    "kode_unik" TEXT NOT NULL,

    CONSTRAINT "kas_rt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setoran_iuran_rt" (
    "id" TEXT NOT NULL,
    "blok_wilayah_id" TEXT NOT NULL,
    "wilayah_rw_id" TEXT NOT NULL,
    "nominal" DECIMAL(10,2) NOT NULL,
    "status" "StatusSetoran" NOT NULL DEFAULT 'PENDING',
    "tanggal_setor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggal_konfirmasi" TIMESTAMP(3),
    "bukti_url" TEXT,

    CONSTRAINT "setoran_iuran_rt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_ronda" (
    "id" TEXT NOT NULL,
    "blok_wilayah_id" TEXT NOT NULL,
    "nama_jadwal" TEXT NOT NULL,
    "hari_minggu" INTEGER NOT NULL,
    "jam_mulai" TEXT NOT NULL,
    "jam_selesai" TEXT NOT NULL,
    "minggu_mulai" TIMESTAMP(3) NOT NULL,
    "minggu_selesai" TIMESTAMP(3),
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "jadwal_ronda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ronda_petugas" (
    "id" TEXT NOT NULL,
    "jadwal_ronda_id" TEXT NOT NULL,
    "nama_petugas" TEXT NOT NULL,
    "no_hp" TEXT,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ronda_petugas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presensi_ronda" (
    "id" TEXT NOT NULL,
    "jadwal_ronda_id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "nama_petugas" TEXT NOT NULL,
    "status_hadir" "StatusKehadiran" NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presensi_ronda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pencatatan_distribusi" (
    "id" TEXT NOT NULL,
    "masjid_id" TEXT NOT NULL,
    "kategori" "KategoriDistribusi" NOT NULL,
    "jenis" "JenisBayar" NOT NULL,
    "nominal" DECIMAL(10,2) NOT NULL,
    "deskripsi" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dicatat_oleh" TEXT,

    CONSTRAINT "pencatatan_distribusi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pengaturan_iuran_rw_wilayah_rw_id_key" ON "pengaturan_iuran_rw"("wilayah_rw_id");

-- CreateIndex
CREATE UNIQUE INDEX "kas_rt_kode_unik_key" ON "kas_rt"("kode_unik");

-- CreateIndex
CREATE UNIQUE INDEX "ronda_petugas_jadwal_ronda_id_nama_petugas_key" ON "ronda_petugas"("jadwal_ronda_id", "nama_petugas");

-- CreateIndex
CREATE UNIQUE INDEX "presensi_ronda_jadwal_ronda_id_tanggal_nama_petugas_key" ON "presensi_ronda"("jadwal_ronda_id", "tanggal", "nama_petugas");

-- AddForeignKey
ALTER TABLE "iuran_warga" ADD CONSTRAINT "iuran_warga_setoran_id_fkey" FOREIGN KEY ("setoran_id") REFERENCES "setoran_iuran_rt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_insiden" ADD CONSTRAINT "laporan_insiden_blok_wilayah_id_fkey" FOREIGN KEY ("blok_wilayah_id") REFERENCES "blok_wilayah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengaturan_iuran_rw" ADD CONSTRAINT "pengaturan_iuran_rw_wilayah_rw_id_fkey" FOREIGN KEY ("wilayah_rw_id") REFERENCES "wilayah_rw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kas_rt" ADD CONSTRAINT "kas_rt_blok_wilayah_id_fkey" FOREIGN KEY ("blok_wilayah_id") REFERENCES "blok_wilayah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setoran_iuran_rt" ADD CONSTRAINT "setoran_iuran_rt_blok_wilayah_id_fkey" FOREIGN KEY ("blok_wilayah_id") REFERENCES "blok_wilayah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setoran_iuran_rt" ADD CONSTRAINT "setoran_iuran_rt_wilayah_rw_id_fkey" FOREIGN KEY ("wilayah_rw_id") REFERENCES "wilayah_rw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_ronda" ADD CONSTRAINT "jadwal_ronda_blok_wilayah_id_fkey" FOREIGN KEY ("blok_wilayah_id") REFERENCES "blok_wilayah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ronda_petugas" ADD CONSTRAINT "ronda_petugas_jadwal_ronda_id_fkey" FOREIGN KEY ("jadwal_ronda_id") REFERENCES "jadwal_ronda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presensi_ronda" ADD CONSTRAINT "presensi_ronda_jadwal_ronda_id_fkey" FOREIGN KEY ("jadwal_ronda_id") REFERENCES "jadwal_ronda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pencatatan_distribusi" ADD CONSTRAINT "pencatatan_distribusi_masjid_id_fkey" FOREIGN KEY ("masjid_id") REFERENCES "masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
