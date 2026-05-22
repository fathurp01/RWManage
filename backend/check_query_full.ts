import { prisma } from "./src/lib/prisma";
import { Prisma, StatusIuran } from "@prisma/client";

async function main() {
  try {
    console.log("Starting full getIuranForRt simulation...");

    const tahunInt = 2026;
    const bulanInt = undefined;
    const status = undefined;

    // Get a sample block
    const blok = await prisma.blokWilayah.findFirst({
      select: {
        id: true,
        nama_blok: true,
        no_rt: true,
        wilayah_rw_id: true,
      }
    });

    if (!blok) {
      console.log("No blok found in database.");
      return;
    }

    const blokId = blok.id;
    console.log("Using blokId:", blokId);

    const wargaList = await prisma.warga.findMany({
      where: {
        blok_wilayah_id: blokId,
        deleted_at: null,
      },
      select: {
        id: true,
        nama_kk: true,
        iuran_warga: {
          where: {
            tahun: tahunInt,
            ...(bulanInt ? { bulan: bulanInt } : {}),
            ...(status ? { status } : {}),
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

    console.log("Query complete, count of Warga:", wargaList.length);

    const data = wargaList.map((warga) => {
      const iuranByMonth = new Map(warga.iuran_warga.map((item) => [item.bulan, item]));

      const bulanSource = bulanInt ? [bulanInt] : Array.from({ length: 12 }, (_, idx) => idx + 1);

      const iuranBySelection = bulanSource
        .map((bulanItem) => {
          const found = iuranByMonth.get(bulanItem);

          if (found) {
            return found;
          }

          if (status === StatusIuran.LUNAS) {
            return null;
          }

          return {
            id: null,
            bulan: bulanItem,
            tahun: tahunInt,
            nominal: new Prisma.Decimal(0),
            status: StatusIuran.BELUM,
            kode_unik: null,
            tanggal_bayar: null,
            cicilan: [],
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      return {
        id: warga.id,
        nama_kk: warga.nama_kk,
        iuran: iuranBySelection,
      };
    }).filter((item) => item.iuran.length > 0 || status !== StatusIuran.LUNAS);

    console.log("Mapping complete, processed count:", data.length);

    // Calculate summary
    const allIuran = wargaList.flatMap((w) => w.iuran_warga);
    const totalIuranTerjadwal = allIuran.reduce((acc, item) => acc + Number(item.nominal || 0), 0);
    const totalIuranTerbayar = allIuran
      .filter((i) => i.status === StatusIuran.LUNAS)
      .reduce((acc, item) => acc + Number(item.nominal || 0), 0);
    const totalIuranBelum = totalIuranTerjadwal - totalIuranTerbayar;
    const totalIuranLunasCount = allIuran.filter((i) => i.status === StatusIuran.LUNAS).length;
    const totalIuranBelumCount = allIuran.filter((i) => i.status === StatusIuran.BELUM).length;
    const persentaseBayar = totalIuranTerjadwal > 0 ? (totalIuranTerbayar / totalIuranTerjadwal) * 100 : 0;

    console.log("Summary calculations complete.");
    console.log("Persentase Bayar:", persentaseBayar);
  } catch (error) {
    console.error("Simulation failed with error:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
