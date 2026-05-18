-- CreateEnum
CREATE TYPE "StatusKeluarga" AS ENUM ('MAMPU', 'KURANG_MAMPU', 'LANSIA');

-- AlterTable
ALTER TABLE "pengaturan_iuran_rw" ADD COLUMN     "nominal_iuran_kurang_mampu" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "nominal_iuran_lansia" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "warga" ADD COLUMN     "nik" TEXT,
ADD COLUMN     "no_kk" TEXT,
ADD COLUMN     "pekerjaan" TEXT,
ADD COLUMN     "pendidikan" TEXT,
ADD COLUMN     "status_keluarga" "StatusKeluarga" NOT NULL DEFAULT 'MAMPU',
ADD COLUMN     "tanggal_lahir" TIMESTAMP(3),
ADD COLUMN     "tanggal_terbit_kk" TIMESTAMP(3);
