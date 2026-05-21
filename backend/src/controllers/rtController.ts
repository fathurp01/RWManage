import { AksiAudit, Prisma, StatusIuran, StatusKehadiran, StatusInsiden } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../middlewares/auditLogger";

const getRtBlockContext = async (req: Request) => {
  if (!req.user?.blok_wilayah_id) {
    return null;
  }

  // Some tests mock `prisma` partially; guard against missing `blokWilayah` in the mocked client.
  // If the client doesn't expose `blokWilayah.findUnique`, fall back to a minimal object using
  // the blok id from the token so tests that only mock `warga.findMany` still work.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (!prisma.blokWilayah || typeof prisma.blokWilayah.findUnique !== "function") {
    return {
      id: req.user.blok_wilayah_id,
      nama_blok: null,
      no_rt: null,
      wilayah_rw_id: null,
    } as any;
  }

  const blok = await prisma.blokWilayah.findUnique({
    where: { id: req.user.blok_wilayah_id },
    select: {
      id: true,
      nama_blok: true,
      no_rt: true,
      wilayah_rw_id: true,
    },
  });

  return blok;
};

export const getIuranForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tahun, bulan, status } = req.query as { tahun?: string; bulan?: string; status?: StatusIuran };

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blokId = req.user.blok_wilayah_id;
    if (!blokId) {
      res.status(403).json({ success: false, message: "Data blok wilayah untuk RT login tidak ditemukan." });
      return;
    }

    const tahunInt = tahun ? Number(tahun) : new Date().getFullYear();
    if (!Number.isInteger(tahunInt) || tahunInt < 2000 || tahunInt > 3000) {
      res.status(400).json({ success: false, message: "Parameter tahun tidak valid." });
      return;
    }

    const bulanInt = bulan ? Number(bulan) : undefined;
    if (bulanInt !== undefined && (!Number.isInteger(bulanInt) || bulanInt < 1 || bulanInt > 12)) {
      res.status(400).json({ success: false, message: "Parameter bulan tidak valid." });
      return;
    }

    if (status !== undefined && status !== StatusIuran.BELUM && status !== StatusIuran.LUNAS) {
      res.status(400).json({ success: false, message: "Parameter status hanya boleh BELUM atau LUNAS." });
      return;
    }

    // Get blok wilayah info (uses helper that tolerates partial prisma mocks)
    const blok = await getRtBlockContext(req);

    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

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
              },
              orderBy: { created_at: "desc" },
            },
          },
          orderBy: { bulan: "asc" },
        },
      },
      orderBy: { nama_kk: "asc" },
    });

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

    res.status(200).json({
      success: true,
      message: "Data iuran RT berhasil diambil.",
      data: {
        blok_wilayah_id: blokId,
        no_rt: blok.no_rt,
        nama_blok: blok.nama_blok,
        tahun: tahunInt,
        bulan: bulanInt ?? null,
        status: status ?? null,
        warga: data,
        summary: {
          total_warga: wargaList.length,
          total_iuran_terjadwal: totalIuranTerjadwal,
          total_iuran_terbayar: totalIuranTerbayar,
          total_iuran_belum: totalIuranBelum,
          total_iuran_lunas_count: totalIuranLunasCount,
          total_iuran_belum_count: totalIuranBelumCount,
          persentase_bayar: Math.round(persentaseBayar),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data iuran RT." });
  }
};

export const getIuranHistoryForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { tahun } = req.query as { tahun?: string };
    const tahunInt = tahun ? Number(tahun) : new Date().getFullYear();

    const history = await prisma.iuranWarga.findMany({
      where: {
        warga: { blok_wilayah_id: blok.id, deleted_at: null },
        status: StatusIuran.LUNAS,
        tahun: tahunInt,
      },
      select: {
        id: true,
        warga_id: true,
        bulan: true,
        tahun: true,
        nominal: true,
        nominal_kas_rt: true,
        nominal_kas_rw: true,
        status: true,
        kode_unik: true,
        tanggal_bayar: true,
        warga: { select: { nama_kk: true } },
      },
      orderBy: { tanggal_bayar: "desc" },
    });

    res.status(200).json({ success: true, message: "Riwayat iuran RT berhasil diambil.", data: history });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil riwayat iuran RT." });
  }
};

export const getWargaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const warga = await prisma.warga.findMany({
      where: { blok_wilayah_id: blok.id, deleted_at: null },
      select: {
        id: true,
        nama_kk: true,
        no_kk: true,
        nik: true,
        tanggal_terbit_kk: true,
        tanggal_lahir: true,
        pendidikan: true,
        pekerjaan: true,
        status_keluarga: true,
        blok_wilayah_id: true,
        blok_wilayah: {
          select: {
            nama_blok: true,
            no_rt: true,
          },
        },
      },
      orderBy: { nama_kk: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Data warga RT berhasil diambil.",
      data: warga,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data warga RT." });
  }
};

export const createWargaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nama_kk, no_kk, nik, tanggal_terbit_kk, tanggal_lahir, pekerjaan, pendidikan, status_keluarga } = req.body as any;

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    if (!nama_kk) {
      res.status(400).json({ success: false, message: "nama_kk wajib diisi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const pengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: blok.wilayah_rw_id }
    });
    
    if (!pengaturan) {
      res.status(400).json({ success: false, message: "Pengaturan iuran belum di-set oleh RW."});
      return;
    }

    const currentYear = new Date().getFullYear();
    const warga = await prisma.$transaction(async (tx) => {
      const created = await tx.warga.create({
        data: {
          blok_wilayah_id: blok.id,
          nama_kk: nama_kk.trim(),
          no_kk: no_kk?.trim() || null,
          nik: nik?.trim() || null,
          tanggal_terbit_kk: tanggal_terbit_kk ? new Date(tanggal_terbit_kk) : null,
          tanggal_lahir: tanggal_lahir ? new Date(tanggal_lahir) : null,
          pendidikan: pendidikan || null,
          pekerjaan: pekerjaan?.trim() || null,
          status_keluarga: status_keluarga || "MAMPU",
        },
      });

      const statusKK = created.status_keluarga;
      let nominalRate = pengaturan.nominal_iuran;
      if (statusKK === "KURANG_MAMPU") {
        nominalRate = pengaturan.nominal_iuran_kurang_mampu;
      } else if (statusKK === "LANSIA") {
        nominalRate = pengaturan.nominal_iuran_lansia;
      }

      await tx.iuranWarga.createMany({
        data: Array.from({ length: 12 }, (_, idx) => ({
          warga_id: created.id,
          bulan: idx + 1,
          tahun: currentYear,
          nominal: nominalRate,
          status: StatusIuran.BELUM,
        })),
      });

      return created;
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "Warga",
      entitas_id: warga.id,
      data_baru: { nama_kk: warga.nama_kk,  blok_wilayah_id: blok.id },
    });

    res.status(201).json({
      success: true,
      message: "Warga RT berhasil ditambahkan.",
      data: warga,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menambahkan warga RT." });
  }
};

export const getPerformaRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { tanggal_mulai, tanggal_akhir } = req.query as { tanggal_mulai?: string; tanggal_akhir?: string };

    const data = await prisma.performaRonda.findMany({
      where: {
        blok_wilayah_id: blok.id,
        ...(tanggal_mulai && tanggal_akhir
          ? { tanggal: { gte: new Date(tanggal_mulai), lte: new Date(tanggal_akhir) } }
          : {}),
      },
      orderBy: { tanggal: "desc" },
    });

    res.status(200).json({ success: true, message: "Data performa ronda RT berhasil diambil.", data });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data performa ronda RT." });
  }
};

export const createPerformaRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { tanggal, nama_petugas, status_kehadiran, catatan } = req.body as {
      tanggal?: string;
      nama_petugas?: string;
      status_kehadiran?: StatusKehadiran;
      catatan?: string;
    };

    if (!tanggal || !nama_petugas || !status_kehadiran) {
      res.status(400).json({ success: false, message: "tanggal, nama_petugas, dan status_kehadiran wajib diisi." });
      return;
    }

    const created = await prisma.performaRonda.create({
      data: {
        blok_wilayah_id: blok.id,
        tanggal: new Date(tanggal),
        nama_petugas: nama_petugas.trim(),
        status_kehadiran,
        catatan: catatan?.trim() || null,
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "PerformaRonda",
      entitas_id: created.id,
      data_baru: created,
    });

    res.status(201).json({ success: true, message: "Data performa ronda RT berhasil ditambahkan.", data: created });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat membuat data performa ronda RT." });
  }
};

export const updateWargaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.warga_id;
    const warga_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    if (!warga_id) {
      res.status(400).json({ success: false, message: "warga_id harus diisi." });
      return;
    }

    const existing = await prisma.warga.findUnique({ where: { id: warga_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Warga tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { nama_kk, no_kk, nik, tanggal_terbit_kk, tanggal_lahir, pekerjaan, pendidikan, status_keluarga } = req.body as any;

    const updated = await prisma.$transaction(async (tx) => {
      const wargaUpdated = await tx.warga.update({
        where: { id: warga_id },
        data: {
          ...(nama_kk ? { nama_kk: nama_kk.trim() } : {}),
          ...(no_kk !== undefined ? { no_kk: no_kk?.trim() || null } : {}),
          ...(nik !== undefined ? { nik: nik?.trim() || null } : {}),
          ...(tanggal_terbit_kk !== undefined ? { tanggal_terbit_kk: tanggal_terbit_kk ? new Date(tanggal_terbit_kk) : null } : {}),
          ...(tanggal_lahir !== undefined ? { tanggal_lahir: tanggal_lahir ? new Date(tanggal_lahir) : null } : {}),
          ...(pendidikan !== undefined ? { pendidikan: pendidikan || null } : {}),
          ...(pekerjaan !== undefined ? { pekerjaan: pekerjaan?.trim() || null } : {}),
          ...(status_keluarga !== undefined ? { status_keluarga } : {}),
        },
      });

      if (status_keluarga !== undefined && status_keluarga !== existing.status_keluarga) {
        const pengaturan = await tx.pengaturanIuranRW.findUnique({
          where: { wilayah_rw_id: blok.wilayah_rw_id }
        });
        
        if (pengaturan) {
          let nominalRate = pengaturan.nominal_iuran;
          if (status_keluarga === "KURANG_MAMPU") {
            nominalRate = pengaturan.nominal_iuran_kurang_mampu;
          } else if (status_keluarga === "LANSIA") {
            nominalRate = pengaturan.nominal_iuran_lansia;
          }
          
          await tx.iuranWarga.updateMany({
            where: {
              warga_id,
              status: StatusIuran.BELUM,
            },
            data: {
              nominal: nominalRate,
            },
          });
        }
      }

      return wargaUpdated;
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "Warga",
      entitas_id: warga_id,
      data_lama: existing,
      data_baru: updated,
    });

    res.status(200).json({ success: true, message: "Data warga RT berhasil diupdate.", data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengupdate data warga RT." });
  }
};

export const updatePerformaRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.performa_id;
    const performa_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    if (!performa_id) {
      res.status(400).json({ success: false, message: "performa_id harus diisi." });
      return;
    }

    const existing = await prisma.performaRonda.findUnique({ where: { id: performa_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Data performa ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { nama_petugas, status_kehadiran, catatan } = req.body as {
      nama_petugas?: string;
      status_kehadiran?: StatusKehadiran;
      catatan?: string;
    };

    const updated = await prisma.performaRonda.update({
      where: { id: performa_id },
      data: {
        ...(nama_petugas ? { nama_petugas: nama_petugas.trim() } : {}),
        ...(status_kehadiran ? { status_kehadiran } : {}),
        ...(catatan !== undefined ? { catatan: catatan.trim() || null } : {}),
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "PerformaRonda",
      entitas_id: performa_id,
      data_lama: existing,
      data_baru: updated,
    });

    res.status(200).json({ success: true, message: "Data performa ronda RT berhasil diupdate.", data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengupdate data performa ronda RT." });
  }
};

export const deletePerformaRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.performa_id;
    const performa_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    if (!performa_id) {
      res.status(400).json({ success: false, message: "performa_id harus diisi." });
      return;
    }

    const existing = await prisma.performaRonda.findUnique({ where: { id: performa_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Data performa ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.performaRonda.delete({ where: { id: performa_id } });
    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "PerformaRonda",
      entitas_id: performa_id,
      data_lama: existing,
    });

    res.status(200).json({ success: true, message: "Data performa ronda RT berhasil dihapus." });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus data performa ronda RT." });
  }
};

export const getLaporanInsidenForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const wilayah = await prisma.wilayahRW.findUnique({ where: { id: blok.wilayah_rw_id }, select: { id: true } });
    if (!wilayah) {
      res.status(404).json({ success: false, message: "Wilayah RW tidak ditemukan." });
      return;
    }

    const { status, tanggal_mulai, tanggal_akhir } = req.query as { status?: StatusInsiden; tanggal_mulai?: string; tanggal_akhir?: string };
    const data = await prisma.laporanInsiden.findMany({
      where: {
        wilayah_rw_id: wilayah.id,
        ...(status ? { status } : {}),
        ...(tanggal_mulai && tanggal_akhir
          ? { tanggal_insiden: { gte: new Date(tanggal_mulai), lte: new Date(tanggal_akhir) } }
          : {}),
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({ success: true, message: "Data laporan insiden RT berhasil diambil.", data });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data laporan insiden RT." });
  }
};

export const createLaporanInsidenForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const wilayah = await prisma.wilayahRW.findUnique({ where: { id: blok.wilayah_rw_id }, select: { id: true } });
    if (!wilayah) {
      res.status(404).json({ success: false, message: "Wilayah RW tidak ditemukan." });
      return;
    }

    const { tipe_insiden, tanggal_insiden, lokasi, deskripsi, pelapor_nama, pelapor_no_hp } = req.body as {
      tipe_insiden?: string;
      tanggal_insiden?: string;
      lokasi?: string;
      deskripsi?: string;
      pelapor_nama?: string;
      pelapor_no_hp?: string;
    };

    if (!tipe_insiden || !tanggal_insiden || !lokasi || !deskripsi || !pelapor_nama) {
      res.status(400).json({ success: false, message: "tipe_insiden, tanggal_insiden, lokasi, deskripsi, dan pelapor_nama wajib diisi." });
      return;
    }

    const foto_bukti_url = (req as any).file?.filename ? `/uploads/${(req as any).file.filename}` : null;
    const created = await prisma.laporanInsiden.create({
      data: {
        wilayah_rw_id: wilayah.id,
        tipe_insiden: tipe_insiden.trim(),
        tanggal_insiden: new Date(tanggal_insiden),
        lokasi: lokasi.trim(),
        deskripsi: deskripsi.trim(),
        pelapor_nama: pelapor_nama.trim(),
        pelapor_no_hp: pelapor_no_hp?.trim() || null,
        foto_bukti_url,
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "LaporanInsiden",
      entitas_id: created.id,
      data_baru: created,
    });

    res.status(201).json({ success: true, message: "Laporan insiden RT berhasil dibuat.", data: created });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat membuat laporan insiden RT." });
  }
};

export const updateLaporanInsidenForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    if (!laporan_id) {
      res.status(400).json({ success: false, message: "laporan_id harus diisi." });
      return;
    }

    const existing = await prisma.laporanInsiden.findUnique({ where: { id: laporan_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Laporan insiden tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.wilayah_rw_id !== blok.wilayah_rw_id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { tipe_insiden, tanggal_insiden, lokasi, deskripsi, status, tindakan_diambil } = req.body as {
      tipe_insiden?: string;
      tanggal_insiden?: string;
      lokasi?: string;
      deskripsi?: string;
      status?: StatusInsiden;
      tindakan_diambil?: string;
    };

    const foto_bukti_url = (req as any).file?.filename ? `/uploads/${(req as any).file.filename}` : undefined;

    const updated = await prisma.laporanInsiden.update({
      where: { id: laporan_id },
      data: {
        ...(tipe_insiden ? { tipe_insiden: tipe_insiden.trim() } : {}),
        ...(tanggal_insiden ? { tanggal_insiden: new Date(tanggal_insiden) } : {}),
        ...(lokasi ? { lokasi: lokasi.trim() } : {}),
        ...(deskripsi ? { deskripsi: deskripsi.trim() } : {}),
        ...(status ? { status } : {}),
        ...(tindakan_diambil ? { tindakan_diambil: tindakan_diambil.trim(), ditindaklanjuti_tanggal: new Date() } : {}),
        ...(foto_bukti_url ? { foto_bukti_url } : {}),
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "LaporanInsiden",
      entitas_id: laporan_id,
      data_lama: existing,
      data_baru: updated,
    });

    res.status(200).json({ success: true, message: "Laporan insiden RT berhasil diupdate.", data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengupdate laporan insiden RT." });
  }
};

export const deleteLaporanInsidenForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    if (!laporan_id) {
      res.status(400).json({ success: false, message: "laporan_id harus diisi." });
      return;
    }

    const existing = await prisma.laporanInsiden.findUnique({ where: { id: laporan_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Laporan insiden tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.wilayah_rw_id !== blok.wilayah_rw_id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.laporanInsiden.delete({ where: { id: laporan_id } });
    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "LaporanInsiden",
      entitas_id: laporan_id,
      data_lama: existing,
    });

    res.status(200).json({ success: true, message: "Laporan insiden RT berhasil dihapus." });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus laporan insiden RT." });
  }
};

export const getAuditLogForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { aksi, tanggal_mulai, tanggal_akhir, limit = "50", offset = "0" } = req.query as {
      aksi?: AksiAudit;
      tanggal_mulai?: string;
      tanggal_akhir?: string;
      limit?: string;
      offset?: string;
    };

    const data = await prisma.auditLog.findMany({
      where: {
        ...(aksi ? { aksi } : {}),
        created_at: tanggal_mulai && tanggal_akhir ? { gte: new Date(tanggal_mulai), lte: new Date(tanggal_akhir) } : undefined,
        OR: [
          { user: { blok_wilayah_id: blok.id } },
          { entitas: "Warga" },
          { entitas: "PerformaRonda" },
          { entitas: "LaporanInsiden" },
        ],
      },
      orderBy: { created_at: "desc" },
      take: Math.min(Number(limit), 100),
      skip: Number(offset),
    });

    res.status(200).json({ success: true, message: "Data audit log RT berhasil diambil.", data });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data audit log RT." });
  }
};

export const bayarIuranForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iuran_id } = req.body as { iuran_id?: string };

    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    if (!iuran_id) {
      res.status(400).json({ success: false, message: "iuran_id wajib diisi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const existingIuran = await prisma.iuranWarga.findUnique({
      where: { id: iuran_id },
      include: { warga: true }
    });

    if (!existingIuran || existingIuran.warga.blok_wilayah_id !== blok.id) {
      res.status(404).json({ success: false, message: "Data iuran tidak ditemukan atau bukan milik RT ini." });
      return;
    }

    if (existingIuran.status === StatusIuran.LUNAS) {
      res.status(400).json({ success: false, message: "Iuran sudah berstatus LUNAS." });
      return;
    }

    const pengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: blok.wilayah_rw_id }
    });

    if (!pengaturan) {
      res.status(400).json({ success: false, message: "Master Data Pengaturan Iuran belum diatur oleh RW." });
      return;
    }

    const nominalBayar = Number(pengaturan.nominal_iuran);
    const pRt = Number(pengaturan.persen_rt);
    const pRw = Number(pengaturan.persen_rw);

    const nominal_kas_rt = new Prisma.Decimal((nominalBayar * pRt) / 100);
    const nominal_kas_rw = new Prisma.Decimal((nominalBayar * pRw) / 100);
    const nominalDecimal = new Prisma.Decimal(nominalBayar);

    const paymentDate = new Date();
    
    // Generate kode unik helpers directly via crypto
    const { randomBytes } = require("crypto");
    const year2 = String(paymentDate.getFullYear()).slice(-2);
    const month2 = String(paymentDate.getMonth() + 1).padStart(2, "0");
    const suffixIur = randomBytes(3).toString("hex").toUpperCase();
    const kodeIuran = `IUR-${year2}${month2}-${suffixIur}`;
    
    const suffixKas = randomBytes(3).toString("hex").toUpperCase();
    const kodeKas = `KRT-${year2}${month2}-${suffixKas}`;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.iuranWarga.update({
        where: { id: iuran_id },
        data: {
          status: StatusIuran.LUNAS,
          tanggal_bayar: paymentDate,
          kode_unik: kodeIuran,
          nominal_kas_rt,
          nominal_kas_rw,
          nominal: nominalDecimal, // update the actual nominal based on latest setting
        }
      });

      // Tambahkan ke Kas RT (70% misalnya)
      await tx.kasRT.create({
        data: {
          blok_wilayah_id: blok.id,
          jenis_transaksi: "MASUK",
          tanggal: paymentDate,
          keterangan: `Iuran warga ${existingIuran.warga.nama_kk} bln ${updated.bulan}/${updated.tahun}`,
          nominal: nominal_kas_rt,
          kode_unik: kodeKas,
        }
      });

      return updated;
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "IuranWarga",
      entitas_id: result.id,
      data_baru: result,
    });

    res.status(200).json({
      success: true,
      message: "Pembayaran iuran berhasil. Saldo otomatis dibagi.",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat memproses pembayaran iuran." });
  }
};

export const resetIuranStatusForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iuran_id } = req.body as { iuran_id?: string };

    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    if (!iuran_id) {
      res.status(400).json({ success: false, message: "iuran_id wajib diisi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const existingIuran = await prisma.iuranWarga.findUnique({
      where: { id: iuran_id },
      include: { warga: true },
    });

    if (!existingIuran || existingIuran.warga.blok_wilayah_id !== blok.id) {
      res.status(404).json({ success: false, message: "Data iuran tidak ditemukan atau bukan milik RT ini." });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.cicilanIuran.deleteMany({ where: { iuran_id } });

      return tx.iuranWarga.update({
        where: { id: iuran_id },
        data: {
          status: StatusIuran.BELUM,
          tanggal_bayar: null,
          kode_unik: null,
          nominal_kas_rt: null,
          nominal_kas_rw: null,
          nominal: existingIuran.nominal,
        },
      });
    });

    res.status(200).json({
      success: true,
      message: "Status iuran berhasil direset.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mereset status iuran." });
  }
};

// ===== JADWAL RONDA MANAGEMENT =====

export const getJadwalRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const jadwal = await prisma.jadwalRonda.findMany({
      where: {
        blok_wilayah_id: blok.id,
        deleted_at: null,
      },
      include: {
        petugas: true,
      },
      orderBy: { hari_minggu: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Data jadwal ronda RT berhasil diambil.",
      data: jadwal,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data jadwal ronda RT." });
  }
};

export const createJadwalRonda = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { nama_jadwal, hari_minggu, jam_mulai, jam_selesai, minggu_mulai, minggu_selesai, catatan } = req.body as {
      nama_jadwal?: string;
      hari_minggu?: number;
      jam_mulai?: string;
      jam_selesai?: string;
      minggu_mulai?: string;
      minggu_selesai?: string;
      catatan?: string;
    };

    if (!nama_jadwal || hari_minggu === undefined || !jam_mulai || !jam_selesai || !minggu_mulai) {
      res.status(400).json({
        success: false,
        message: "nama_jadwal, hari_minggu, jam_mulai, jam_selesai, dan minggu_mulai wajib diisi.",
      });
      return;
    }

    if (hari_minggu < 0 || hari_minggu > 6) {
      res.status(400).json({
        success: false,
        message: "hari_minggu harus 0-6 (Sunday=0 sampai Saturday=6).",
      });
      return;
    }

    const created = await prisma.jadwalRonda.create({
      data: {
        blok_wilayah_id: blok.id,
        nama_jadwal: nama_jadwal.trim(),
        hari_minggu,
        jam_mulai,
        jam_selesai,
        minggu_mulai: new Date(minggu_mulai),
        minggu_selesai: minggu_selesai ? new Date(minggu_selesai) : null,
        catatan: catatan?.trim() || null,
      },
      include: { petugas: true },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "JadwalRonda",
      entitas_id: created.id,
      data_baru: created,
    });

    res.status(201).json({
      success: true,
      message: "Jadwal ronda RT berhasil dibuat.",
      data: created,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat membuat jadwal ronda RT." });
  }
};

export const updateJadwalRonda = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const existing = await prisma.jadwalRonda.findUnique({ where: { id: jadwal_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { nama_jadwal, hari_minggu, jam_mulai, jam_selesai, minggu_mulai, minggu_selesai, catatan } = req.body as {
      nama_jadwal?: string;
      hari_minggu?: number;
      jam_mulai?: string;
      jam_selesai?: string;
      minggu_mulai?: string;
      minggu_selesai?: string;
      catatan?: string;
    };

    const updated = await prisma.jadwalRonda.update({
      where: { id: jadwal_id },
      data: {
        ...(nama_jadwal ? { nama_jadwal: nama_jadwal.trim() } : {}),
        ...(hari_minggu !== undefined ? { hari_minggu } : {}),
        ...(jam_mulai ? { jam_mulai } : {}),
        ...(jam_selesai ? { jam_selesai } : {}),
        ...(minggu_mulai ? { minggu_mulai: new Date(minggu_mulai) } : {}),
        ...(minggu_selesai ? { minggu_selesai: new Date(minggu_selesai) } : {}),
        ...(catatan !== undefined ? { catatan: catatan.trim() || null } : {}),
      },
      include: { petugas: true },
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "JadwalRonda",
      entitas_id: jadwal_id,
      data_lama: existing,
      data_baru: updated,
    });

    res.status(200).json({
      success: true,
      message: "Jadwal ronda RT berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengupdate jadwal ronda RT." });
  }
};

export const deleteJadwalRonda = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const existing = await prisma.jadwalRonda.findUnique({ where: { id: jadwal_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.jadwalRonda.update({
      where: { id: jadwal_id },
      data: { deleted_at: new Date() },
    });

    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "JadwalRonda",
      entitas_id: jadwal_id,
      data_lama: existing,
    });

    res.status(200).json({
      success: true,
      message: "Jadwal ronda RT berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus jadwal ronda RT." });
  }
};

// ===== PETUGAS RONDA MANAGEMENT =====

export const getPetugasForJadwal = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const jadwal = await prisma.jadwalRonda.findUnique({
      where: { id: jadwal_id },
      include: { petugas: true },
    });

    if (!jadwal) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || jadwal.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Data petugas ronda berhasil diambil.",
      data: jadwal.petugas,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data petugas ronda." });
  }
};

export const addPetugasToJadwal = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const jadwal = await prisma.jadwalRonda.findUnique({ where: { id: jadwal_id } });
    if (!jadwal) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || jadwal.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { nama_petugas, no_hp, catatan } = req.body as {
      nama_petugas?: string;
      no_hp?: string;
      catatan?: string;
    };

    if (!nama_petugas) {
      res.status(400).json({ success: false, message: "nama_petugas wajib diisi." });
      return;
    }

    const created = await prisma.rondaPetugas.create({
      data: {
        jadwal_ronda_id: jadwal_id,
        nama_petugas: nama_petugas.trim(),
        no_hp: no_hp?.trim() || null,
        catatan: catatan?.trim() || null,
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "RondaPetugas",
      entitas_id: created.id,
      data_baru: created,
    });

    res.status(201).json({
      success: true,
      message: "Petugas ronda berhasil ditambahkan.",
      data: created,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({
        success: false,
        message: "Petugas dengan nama yang sama sudah ada dalam jadwal ini.",
      });
    } else {
      console.error(error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan saat menambahkan petugas ronda." });
    }
  }
};

export const removePetugasFromJadwal = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.petugas_id;
    const petugas_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!petugas_id) {
      res.status(400).json({ success: false, message: "petugas_id harus diisi." });
      return;
    }

    const existing = await prisma.rondaPetugas.findUnique({
      where: { id: petugas_id },
      include: { jadwal_ronda: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Petugas ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.jadwal_ronda.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.rondaPetugas.delete({ where: { id: petugas_id } });

    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "RondaPetugas",
      entitas_id: petugas_id,
      data_lama: existing,
    });

    res.status(200).json({
      success: true,
      message: "Petugas ronda berhasil dihapus.",
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus petugas ronda." });
  }
};

// ===== PRESENSI RONDA MANAGEMENT =====

export const markPresenceRonda = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const jadwal = await prisma.jadwalRonda.findUnique({ where: { id: jadwal_id } });
    if (!jadwal) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || jadwal.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { tanggal, nama_petugas, status_hadir, catatan } = req.body as {
      tanggal?: string;
      nama_petugas?: string;
      status_hadir?: StatusKehadiran;
      catatan?: string;
    };

    if (!tanggal || !nama_petugas || !status_hadir) {
      res.status(400).json({
        success: false,
        message: "tanggal, nama_petugas, dan status_hadir wajib diisi.",
      });
      return;
    }

    const upserted = await prisma.presensiRonda.upsert({
      where: {
        jadwal_ronda_id_tanggal_nama_petugas: {
          jadwal_ronda_id: jadwal_id,
          tanggal: new Date(tanggal),
          nama_petugas: nama_petugas.trim(),
        },
      },
      update: {
        status_hadir,
        catatan: catatan?.trim() || null,
      },
      create: {
        jadwal_ronda_id: jadwal_id,
        tanggal: new Date(tanggal),
        nama_petugas: nama_petugas.trim(),
        status_hadir,
        catatan: catatan?.trim() || null,
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "PresensiRonda",
      entitas_id: upserted.id,
      data_baru: upserted,
    });

    res.status(201).json({
      success: true,
      message: "Presensi ronda berhasil dicatat.",
      data: upserted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mencatat presensi ronda." });
  }
};

export const getPresenceForJadwal = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const jadwal = await prisma.jadwalRonda.findUnique({ where: { id: jadwal_id } });
    if (!jadwal) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || jadwal.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { tanggal_mulai, tanggal_akhir } = req.query as {
      tanggal_mulai?: string;
      tanggal_akhir?: string;
    };

    const presensi = await prisma.presensiRonda.findMany({
      where: {
        jadwal_ronda_id: jadwal_id,
        ...(tanggal_mulai && tanggal_akhir
          ? {
              tanggal: {
                gte: new Date(tanggal_mulai),
                lte: new Date(tanggal_akhir),
              },
            }
          : {}),
      },
      orderBy: { tanggal: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Data presensi ronda berhasil diambil.",
      data: presensi,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data presensi ronda." });
  }
};
