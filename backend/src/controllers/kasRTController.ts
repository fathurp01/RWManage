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

    if (!jenis_transaksi || !keterangan || nominal === undefined) {
      res.status(400).json({ success: false, message: "Data tidak lengkap." });
      return;
    }

    const parsedNominal = Number(nominal);
    if (!Number.isFinite(parsedNominal) || parsedNominal <= 0) {
      res.status(400).json({ success: false, message: "nominal harus berupa angka > 0." });
      return;
    }

    if (
      jenis_transaksi !== JenisTransaksi.MASUK &&
      jenis_transaksi !== JenisTransaksi.KELUAR
    ) {
      res.status(400).json({
        success: false,
        message: "jenis_transaksi hanya boleh MASUK atau KELUAR.",
      });
      return;
    }

    if (jenis_transaksi === JenisTransaksi.KELUAR) {
      const totalMasuk = await prisma.kasRT.aggregate({
        where: { blok_wilayah_id: blokId, jenis_transaksi: JenisTransaksi.MASUK },
        _sum: { nominal: true },
      });

      const totalKeluar = await prisma.kasRT.aggregate({
        where: { blok_wilayah_id: blokId, jenis_transaksi: JenisTransaksi.KELUAR },
        _sum: { nominal: true },
      });

      const currentSaldo = Number(totalMasuk._sum.nominal || 0) - Number(totalKeluar._sum.nominal || 0);

      if (parsedNominal > currentSaldo) {
        res.status(400).json({
          success: false,
          message: `Saldo tidak mencukupi. Saldo saat ini: Rp ${currentSaldo.toLocaleString("id-ID")}`,
        });
        return;
      }
    }

    const foto_bukti_url = (req as any).file?.filename ? `/uploads/${(req as any).file.filename}` : null;

    const result = await prisma.$transaction(async (tx) => {
      const kode_unik = await generateKodeUnik(tx);
      const kas = await tx.kasRT.create({
        data: {
          blok_wilayah_id: blokId,
          jenis_transaksi,
          keterangan: keterangan.trim(),
          nominal: parsedNominal,
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
      keterangan: `Menambahkan kas RT sebesar ${parsedNominal} (${jenis_transaksi})`,
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
      
      const currentMonth1 = new Date().getMonth() + 1;

      const iuranRT = iuranData.filter(i => {
        if (i.warga.blok_wilayah_id !== blok.id) return false;
        
        let matchesFilter = true;
        if (isFilterActive) {
          if (queryMonth !== undefined && i.bulan !== (queryMonth + 1)) matchesFilter = false;
          if (queryYear !== undefined && i.tahun !== queryYear) matchesFilter = false;
          
          // Jika memfilter tahun ini saja (tanpa bulan tertentu), batasi sampai bulan berjalan
          if (queryYear === currentYear && queryMonth === undefined && i.bulan > currentMonth1) {
            matchesFilter = false;
          }
        } else {
          // Default: Tahun berjalan s/d bulan berjalan
          if (i.tahun !== currentYear) {
            matchesFilter = false;
          } else if (i.bulan > currentMonth1) {
            matchesFilter = false;
          }
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

    if (
      jenis_transaksi === undefined &&
      tanggal === undefined &&
      keterangan === undefined &&
      nominal === undefined &&
      bukti_url === undefined &&
      foto_bukti_url === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "Minimal satu field harus dikirim untuk update.",
      });
      return;
    }

    const dataToUpdate: any = {};

    if (jenis_transaksi !== undefined) {
      if (
        jenis_transaksi !== JenisTransaksi.MASUK &&
        jenis_transaksi !== JenisTransaksi.KELUAR
      ) {
        res.status(400).json({
          success: false,
          message: "jenis_transaksi hanya boleh MASUK atau KELUAR.",
        });
        return;
      }
      if (jenis_transaksi === JenisTransaksi.KELUAR && existing.keterangan.toLowerCase().includes("iuran")) {
        res.status(400).json({
          success: false,
          message: "Transaksi yang bersumber dari iuran tidak boleh diubah menjadi jenis pengeluaran (KELUAR).",
        });
        return;
      }
      dataToUpdate.jenis_transaksi = jenis_transaksi;
    }

    if (tanggal !== undefined) {
      const testDate = new Date(tanggal);
      if (Number.isNaN(testDate.getTime())) {
        res.status(400).json({
          success: false,
          message: "Format tanggal tidak valid.",
        });
        return;
      }
      dataToUpdate.tanggal = testDate;
    }

    if (keterangan !== undefined) {
      dataToUpdate.keterangan = keterangan.trim();
    }

    if (nominal !== undefined) {
      const parsedNominal = Number(nominal);
      if (!Number.isFinite(parsedNominal) || parsedNominal <= 0) {
        res.status(400).json({
          success: false,
          message: "nominal harus berupa angka lebih dari 0.",
        });
        return;
      }
      dataToUpdate.nominal = parsedNominal;
    }

    if (bukti_url !== undefined) {
      dataToUpdate.bukti_url = bukti_url.trim() || null;
    }

    if (foto_bukti_url !== undefined) {
      dataToUpdate.bukti_foto_url = foto_bukti_url;
    }

    // Check for negative balance if this update changes nominal or type
    const finalJenis = dataToUpdate.jenis_transaksi ?? existing.jenis_transaksi;
    const finalNominal = dataToUpdate.nominal !== undefined ? Number(dataToUpdate.nominal) : Number(existing.nominal);

    if (finalJenis === JenisTransaksi.KELUAR || (existing.jenis_transaksi === JenisTransaksi.MASUK && finalJenis === JenisTransaksi.MASUK)) {
      const totalMasuk = await prisma.kasRT.aggregate({
        where: { blok_wilayah_id: existing.blok_wilayah_id, jenis_transaksi: JenisTransaksi.MASUK, id: { not: kas_id } },
        _sum: { nominal: true },
      });

      const totalKeluar = await prisma.kasRT.aggregate({
        where: { blok_wilayah_id: existing.blok_wilayah_id, jenis_transaksi: JenisTransaksi.KELUAR, id: { not: kas_id } },
        _sum: { nominal: true },
      });

      let projectedSaldo = Number(totalMasuk._sum.nominal || 0) - Number(totalKeluar._sum.nominal || 0);
      if (finalJenis === JenisTransaksi.MASUK) {
        projectedSaldo += finalNominal;
      } else {
        projectedSaldo -= finalNominal;
      }

      if (projectedSaldo < 0) {
        res.status(400).json({
          success: false,
          message: "Transaksi ini akan menyebabkan saldo menjadi negatif.",
        });
        return;
      }
    }

    const updated = await prisma.kasRT.update({
      where: { id: kas_id },
      data: dataToUpdate,
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "KasRT",
      entitas_id: updated.id,
      data_lama: existing,
      data_baru: updated,
      keterangan: `Memperbarui kas RT ${updated.kode_unik}`,
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

    // Parse keterangan to check if it's linked to an IuranWarga
    let parsedInfo: { nama_kk: string; bulan: number; tahun: number } | null = null;
    if (existing.keterangan) {
      const match1 = existing.keterangan.match(/(?:Iuran warga|Cicilan parsial iuran warga) (.+?) bln (\d+)\/(\d+)/i);
      if (match1) {
        parsedInfo = {
          nama_kk: match1[1].trim(),
          bulan: parseInt(match1[2], 10),
          tahun: parseInt(match1[3], 10)
        };
      } else {
        const match2 = existing.keterangan.match(/Iuran Warga:\s*(.+?)\s*\((\d+)\/(\d+)\)/i);
        if (match2) {
          parsedInfo = {
            nama_kk: match2[1].trim(),
            bulan: parseInt(match2[2], 10),
            tahun: parseInt(match2[3], 10)
          };
        }
      }
    }

    let iuranWarga: any = null;
    if (parsedInfo) {
      iuranWarga = await prisma.iuranWarga.findFirst({
        where: {
          bulan: parsedInfo.bulan,
          tahun: parsedInfo.tahun,
          warga: {
            nama_kk: parsedInfo.nama_kk,
            blok_wilayah_id: existing.blok_wilayah_id,
            deleted_at: null
          }
        }
      });

      if (iuranWarga && iuranWarga.setoran_id !== null) {
        res.status(400).json({
          success: false,
          message: "Tidak dapat menghapus transaksi ini karena pembayaran iuran telah disetorkan ke RW."
        });
        return;
      }
    }

    if (existing.jenis_transaksi === JenisTransaksi.MASUK) {
      const totalMasuk = await prisma.kasRT.aggregate({
        where: { blok_wilayah_id: existing.blok_wilayah_id, jenis_transaksi: JenisTransaksi.MASUK, id: { not: kas_id } },
        _sum: { nominal: true },
      });

      const totalKeluar = await prisma.kasRT.aggregate({
        where: { blok_wilayah_id: existing.blok_wilayah_id, jenis_transaksi: JenisTransaksi.KELUAR },
        _sum: { nominal: true },
      });

      const projectedSaldo = Number(totalMasuk._sum.nominal || 0) - Number(totalKeluar._sum.nominal || 0);

      if (projectedSaldo < 0) {
        res.status(400).json({
          success: false,
          message: "Menghapus transaksi ini akan menyebabkan saldo menjadi negatif.",
        });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.kasRT.delete({ where: { id: kas_id } });

      if (iuranWarga) {
        await tx.iuranWarga.update({
          where: { id: iuranWarga.id },
          data: {
            status: StatusIuran.BELUM,
            tanggal_bayar: null,
            kode_unik: null,
            nominal_kas_rt: null,
            nominal_kas_rw: null
          }
        });

        // Clean up associated installments if any
        const cicilan = await tx.cicilanIuran.findFirst({
          where: { iuran_id: iuranWarga.id }
        });
        if (cicilan) {
          await tx.cicilanIuran.update({
            where: { id: cicilan.id },
            data: { sudah_lunas: false }
          });

          const lastPembayaran = await tx.pembayaranCicilan.findFirst({
            where: { cicilan_id: cicilan.id },
            orderBy: { tanggal_bayar: "desc" }
          });
          if (lastPembayaran) {
            await tx.pembayaranCicilan.delete({
              where: { id: lastPembayaran.id }
            });
          }
        }
      }
    });

    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "KasRT",
      entitas_id: kas_id,
      data_lama: existing,
      keterangan: parsedInfo
        ? `Menghapus kas RT ${existing.kode_unik} dan membatalkan status lunas iuran warga ${parsedInfo.nama_kk} bln ${parsedInfo.bulan}/${parsedInfo.tahun}`
        : `Menghapus kas RT ${existing.kode_unik}`,
    });

    res.status(200).json({ success: true, message: "Data kas RT berhasil dihapus." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Gagal menghapus kas RT." });
  }
};
