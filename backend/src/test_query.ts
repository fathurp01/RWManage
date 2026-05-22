import { prisma } from "./lib/prisma";

async function main() {
  try {
    console.log("Starting DB query test...");
    
    // Query list of masjids
    const masjids = await prisma.masjid.findMany({
      select: {
        id: true,
        nama_masjid: true,
      }
    });
    console.log("Masjids in DB:", masjids);

    // Query list of pengurus masjid relations
    const pengurus = await prisma.pengurusMasjid.findMany({
      include: {
        user: { select: { id: true, nama: true, role: true } }
      }
    });
    console.log("Pengurus in DB:", pengurus);

    // Run query similar to getKasMasjid
    const kasList = await prisma.kasMasjid.findMany({
      select: {
        id: true,
        masjid_id: true,
        jenis_transaksi: true,
        tanggal: true,
        keterangan: true,
        nominal: true,
        bukti_url: true,
        bukti_foto_url: true,
        kode_unik: true,
      }
    });
    console.log("Kas list queried successfully, count:", kasList.length);
  } catch (error) {
    console.error("DB Query failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
