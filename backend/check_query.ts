import { prisma } from "./src/lib/prisma";

async function main() {
  try {
    console.log("Starting Prisma query check...");
    
    // Find one warga or check schema structure
    const sampleWarga = await prisma.warga.findFirst({
      where: { deleted_at: null },
      select: {
        id: true,
        nama_kk: true,
        iuran_warga: {
          select: {
            id: true,
            bulan: true,
            tahun: true,
            nominal: true,
            status: true,
            kode_unik: true,
            tanggal_bayar: true,
            cicilan: {
              select: {
                id: true,
                total_cicilan: true,
                nominal_per_bulan: true,
                jumlah_bulan: true,
                bulan_mulai: true,
                tahun_mulai: true,
                sudah_lunas: true,
                created_at: true,
                pembayaran: {
                  select: {
                    id: true,
                    nominal: true,
                    tanggal_bayar: true,
                    keterangan: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log("Query completed successfully!");
    console.log("Sample Warga:", JSON.stringify(sampleWarga, null, 2));
  } catch (error) {
    console.error("Prisma Query Failed:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
