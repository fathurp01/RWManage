import { prisma } from "./src/lib/prisma";
import { Role } from "@prisma/client";

async function main() {
  try {
    console.log("Checking RT users in database...");
    const rtUsers = await prisma.user.findMany({
      where: {
        role: Role.RT,
      },
      select: {
        id: true,
        email: true,
        blok_wilayah_id: true,
        status_akun: true,
      },
    });

    console.log("RT Users found:", JSON.stringify(rtUsers, null, 2));

    for (const user of rtUsers) {
      if (!user.blok_wilayah_id) {
        console.log(`User ${user.email} has no blok_wilayah_id.`);
        continue;
      }

      console.log(`\nSimulating query for user ${user.email} with block ${user.blok_wilayah_id}...`);
      // Simulate getRtBlockContext helper
      const blok = await prisma.blokWilayah.findUnique({
        where: { id: user.blok_wilayah_id },
        select: {
          id: true,
          nama_blok: true,
          no_rt: true,
          wilayah_rw_id: true,
        },
      });

      console.log("Block details:", blok);

      if (!blok) {
        console.log(`Block not found for id ${user.blok_wilayah_id}`);
        continue;
      }

      // Query warga list
      const wargaList = await prisma.warga.findMany({
        where: {
          blok_wilayah_id: user.blok_wilayah_id,
          deleted_at: null,
        },
        select: {
          id: true,
          nama_kk: true,
          iuran_warga: {
            where: {
              tahun: 2026,
            },
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
                    orderBy: { tanggal_bayar: "asc" },
                  },
                },
                orderBy: { created_at: "desc" },
              },
            },
            orderBy: { bulan: "asc" },
          },
        },
        orderBy: { nama_kk: "asc" },
      });

      console.log(`Warga count: ${wargaList.length}`);
    }

  } catch (error) {
    console.error("Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
