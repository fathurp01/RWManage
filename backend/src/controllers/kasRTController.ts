import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { JenisTransaksi, AksiAudit, StatusIuran } from "@prisma/client";
import { randomBytes } from "crypto";
import { recordAudit } from "../middlewares/auditLogger";

const createKodeUnikCandidate = (prefix: "KRT", date: Date): string => {
  const year2 = String(date.getFullYear()).slice(-2);
  const month2 = String(date.getMonth() + 1).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${year2}${month2}-${suffix}`;
};

const generateKodeUnik = async (client: any): Promise<string> => {
  const now = new Date();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = createKodeUnikCandidate("KRT", now);
    const exists = await client.kasRT.findUnique({
      where: { kode_unik: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
  }
  throw new Error(`Gagal membuat kode unik KRT.`);
};

export const getKasRT = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    let blokId = req.user.blok_wilayah_id;

    // Jika user adalah RW (View Only mode), blok_wilayah_id dikirim via query
    if (req.user.role === "RW") {
      const targetBlokId = req.query.blok_wilayah_id as string;
      if (!targetBlokId) {
        res.status(400).json({ success: false, message: "blok_wilayah_id dibutuhkan untuk role RW." });
        return;
      }
      
      const rwWilayah = await prisma.wilayahRW.findUnique({ where: { user_id: req.user.id }});
      const targetBlok = await prisma.blokWilayah.findUnique({ where: { id: targetBlokId }});
      
      if (!targetBlok || targetBlok.wilayah_rw_id !== rwWilayah?.id) {
        res.status(403).json({ success: false, message: "Akses ditolak. Blok tidak berada di RW Anda." });
        return;
      }
      blokId = targetBlokId;
    }

    if (!blokId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const kasRT = await prisma.kasRT.findMany({
      where: { blok_wilayah_id: blokId },
      orderBy: { tanggal: "desc" },
    });

    const summary = await prisma.kasRT.groupBy({
      by: ['jenis_transaksi'],
      where: { blok_wilayah_id: blokId },
      _sum: { nominal: true },
    });

    const pemasukan = Number(summary.find(s => s.jenis_transaksi === "MASUK")?._sum.nominal || 0);
    const pengeluaran = Number(summary.find(s => s.jenis_transaksi === "KELUAR")?._sum.nominal || 0);
    const total_saldo = pemasukan - pengeluaran;

    res.status(200).json({
      success: true,
      data: {
        transaksi: kasRT,
        saldo: total_saldo,
        pemasukan,
        pengeluaran,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil kas RT." });
  }
};

export const createKasRT = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    const blokId = req.user.blok_wilayah_id;
    if (!blokId) {
      res.status(403).json({ success: false, message: "Data RT tidak valid." });
      return;
    }

    const { jenis_transaksi, keterangan, nominal, tanggal, bukti_url } = req.body;

    if (!jenis_transaksi || !keterangan || !nominal) {
      res.status(400).json({ success: false, message: "Data tidak lengkap." });
      return;
    }

    const foto_bukti_url = (req as any).file?.filename ? `/uploads/${(req as any).file.filename}` : null;

    const result = await prisma.$transaction(async (tx) => {
      const kode_unik = await generateKodeUnik(tx);
      const kas = await tx.kasRT.create({
        data: {
          blok_wilayah_id: blokId,
          jenis_transaksi,
          keterangan,
          nominal: Number(nominal),
          tanggal: tanggal ? new Date(tanggal) : new Date(),
          bukti_url: bukti_url || null,
          bukti_foto_url: foto_bukti_url || null,
          kode_unik,
        },
      });
      return kas;
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "KasRT",
      entitas_id: result.id,
      data_baru: result,
    });

    res.status(201).json({
      success: true,
      message: "Transaksi kas RT berhasil dicatat.",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mencatat kas RT." });
  }
};

export const getAllKasRTSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id || req.user.role !== "RW") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RW." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      include: { blok_wilayah: true }
    });

    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Data RW tidak valid." });
      return;
    }

    const queryMonth = req.query.month !== undefined && req.query.month !== "" ? Number(req.query.month) : undefined;
    const queryYear = req.query.year !== undefined && req.query.year !== "" ? Number(req.query.year) : undefined;

    const currentYear = new Date().getFullYear();
    const isFilterActive = queryMonth !== undefined || queryYear !== undefined;

    // Hitung per RT
    const blokIds = rwWilayah.blok_wilayah.map(b => b.id);
    
    // Fetch all KasRT items to do flexible filtering
    const kasRTList = await prisma.kasRT.findMany({
      where: { blok_wilayah_id: { in: blokIds } }
    });

    // Extract unique years from all transactions
    const yearsSet = new Set<number>();
    kasRTList.forEach(t => {
      const yr = new Date(t.tanggal).getFullYear();
      if (!Number.isNaN(yr)) {
        yearsSet.add(yr);
      }
    });
    yearsSet.add(currentYear);
    const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

    // Summary Iuran per RT (untuk melihat tingkat kepatuhan bayar)
    const iuranData = await prisma.iuranWarga.findMany({
      where: { warga: { blok_wilayah_id: { in: blokIds } } },
      select: {
        bulan: true,
        tahun: true,
        status: true,
        warga: { select: { blok_wilayah_id: true } }
      }
    });

    const results = rwWilayah.blok_wilayah.map(blok => {
      let masuk = 0;
      let keluar = 0;
      let allTimeMasuk = 0;
      let allTimeKeluar = 0;

      const blokTransactions = kasRTList.filter(t => t.blok_wilayah_id === blok.id);

      blokTransactions.forEach(t => {
        const nominal = Number(t.nominal);
        if (t.jenis_transaksi === "MASUK") {
          allTimeMasuk += nominal;
        } else {
          allTimeKeluar += nominal;
        }

        const dateObj = new Date(t.tanggal);
        const itemMonth = dateObj.getMonth(); // 0-11
        const itemYear = dateObj.getFullYear();

        let matchesFilter = true;
        if (isFilterActive) {
          if (queryMonth !== undefined && itemMonth !== queryMonth) matchesFilter = false;
          if (queryYear !== undefined && itemYear !== queryYear) matchesFilter = false;
        } else {
          if (itemYear !== currentYear) matchesFilter = false;
        }

        if (matchesFilter) {
          if (t.jenis_transaksi === "MASUK") {
            masuk += nominal;
          } else {
            keluar += nominal;
          }
        }
      });
      
      const iuranRT = iuranData.filter(i => {
        if (i.warga.blok_wilayah_id !== blok.id) return false;
        
        let matchesFilter = true;
        if (isFilterActive) {
          if (queryMonth !== undefined && i.bulan !== (queryMonth + 1)) matchesFilter = false;
          if (queryYear !== undefined && i.tahun !== queryYear) matchesFilter = false;
        } else {
          if (i.tahun !== currentYear) matchesFilter = false;
        }
        return matchesFilter;
      });

      const totalIuran = iuranRT.length;
      const lunasIuran = iuranRT.filter(i => i.status === StatusIuran.LUNAS).length;
      const persentaseBayar = totalIuran > 0 ? (lunasIuran / totalIuran) * 100 : 0;

      return {
        blok_wilayah_id: blok.id,
        nama_blok: blok.nama_blok,
        no_rt: blok.no_rt,
        total_masuk: masuk,
        total_keluar: keluar,
        saldo: allTimeMasuk - allTimeKeluar,
        persentase_bayar: persentaseBayar,
        persentase_serapan: masuk > 0 ? ((keluar / masuk) * 100) : 0
      };
    });

    res.status(200).json({
      success: true,
      data: results,
      years: availableYears
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memuat summary kas RT." });
  }
};

export const updateKasRT = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    const { kas_id } = req.params as { kas_id: string };
    const { jenis_transaksi, keterangan, nominal, tanggal, bukti_url } = req.body;
    const foto_bukti_url = (req as any).file?.filename ? `/uploads/${(req as any).file.filename}` : undefined;

    const existing = await prisma.kasRT.findUnique({ where: { id: kas_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Data kas tidak ditemukan." });
      return;
    }

    if (existing.blok_wilayah_id !== req.user.blok_wilayah_id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const updated = await prisma.kasRT.update({
      where: { id: kas_id },
      data: {
        jenis_transaksi: jenis_transaksi || existing.jenis_transaksi,
        keterangan: keterangan || existing.keterangan,
        nominal: nominal !== undefined ? Number(nominal) : existing.nominal,
        tanggal: tanggal ? new Date(tanggal) : existing.tanggal,
        bukti_url: bukti_url !== undefined ? (bukti_url || null) : existing.bukti_url,
        bukti_foto_url: foto_bukti_url !== undefined ? foto_bukti_url : existing.bukti_foto_url,
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "KasRT",
      entitas_id: updated.id,
      data_lama: existing,
      data_baru: updated,
    });

    res.status(200).json({ success: true, message: "Data kas RT berhasil diperbarui.", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memperbarui kas RT." });
  }
};

export const deleteKasRT = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    const { kas_id } = req.params as { kas_id: string };

    const existing = await prisma.kasRT.findUnique({ where: { id: kas_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Data kas tidak ditemukan." });
      return;
    }

    if (existing.blok_wilayah_id !== req.user.blok_wilayah_id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.kasRT.delete({ where: { id: kas_id } });

    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "KasRT",
      entitas_id: kas_id,
      data_lama: existing,
    });

    res.status(200).json({ success: true, message: "Data kas RT berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menghapus kas RT." });
  }
};
