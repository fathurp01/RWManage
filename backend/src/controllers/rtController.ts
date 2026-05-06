import { AksiAudit, Prisma, StatusIuran, StatusKehadiran, StatusInsiden } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../middlewares/auditLogger";

const getRtBlockContext = async (req: Request) => {
  if (!req.user?.blok_wilayah_id) {
    return null;
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

    // Get blok wilayah info
    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blokId },
      select: {
        id: true,
        nama_blok: true,
        no_rt: true,
      },
    });

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
    const totalIuranTerjadwal = allIuran.length * 12; // Assume 12 months per warga
    const totalIuranTerbayar = allIuran.filter((i) => i.status === StatusIuran.LUNAS).length;
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
          persentase_bayar: Math.round(persentaseBayar),
        },
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data iuran RT." });
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
        
        blok_wilayah_id: true,
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
    const { nama_kk } = req.body as { nama_kk?: string };

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
          
        },
      });

      await tx.iuranWarga.createMany({
        data: Array.from({ length: 12 }, (_, idx) => ({
          warga_id: created.id,
          bulan: idx + 1,
          tahun: currentYear,
          nominal: pengaturan.nominal_iuran,
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
