import { prisma } from "./src/lib/prisma";

async function main() {
  try {
    console.log("Checking all active cicilan in the database...");
    const allCicilan = await prisma.cicilanIuran.findMany({
      include: {
        iuran: {
          include: {
            warga: true
          }
        }
      }
    });

    console.log("Total cicilan found in DB:", allCicilan.length);
    allCicilan.forEach((cicilan, idx) => {
      console.log(`\n[${idx + 1}] Cicilan ID: ${cicilan.id}`);
      console.log(`- Sudah Lunas: ${cicilan.sudah_lunas}`);
      console.log(`- Total Cicilan: ${cicilan.total_cicilan}`);
      console.log(`- Jumlah Bulan: ${cicilan.jumlah_bulan}`);
      console.log(`- Periode Mulai: ${cicilan.bulan_mulai}/${cicilan.tahun_mulai}`);
      if (cicilan.iuran) {
        console.log(`- Iuran Bulan/Tahun: ${cicilan.iuran.bulan}/${cicilan.iuran.tahun}`);
        console.log(`- Iuran Status: ${cicilan.iuran.status}`);
        console.log(`- Iuran Nominal: ${cicilan.iuran.nominal}`);
        console.log(`- Nama Warga: ${cicilan.iuran.warga.nama_kk}`);
        console.log(`- Blok Warga ID: ${cicilan.iuran.warga.blok_wilayah_id}`);
      } else {
        console.log(`- No linked Iuran Warga found!`);
      }
    });
  } catch (error) {
    console.error("Error checking cicilan:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
