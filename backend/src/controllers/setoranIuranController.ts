import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { StatusIuran, StatusSetoran, AksiAudit, JenisTransaksi } from "@prisma/client";
import { recordAudit } from "../middlewares/auditLogger";

export const getSetoranRT = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    const blokId = req.user.blok_wilayah_id;
    if (!blokId) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const setoran = await prisma.setoranIuranRT.findMany({
      where: { blok_wilayah_id: blokId },
      orderBy: { tanggal_setor: "desc" }
    });

    // Hitung Titipan yang belum disetor (Status LUNAS, tapi setoran_id null)
    const belumDisetor = await prisma.iuranWarga.aggregate({
      where: {
        warga: { blok_wilayah_id: blokId },
        status: StatusIuran.LUNAS,
        setoran_id: null
      },
      _sum: { nominal_kas_rw: true, nominal: true }
    });

    res.status(200).json({
      success: true,
      data: {
        history: setoran,
        titipan_belum_setor: belumDisetor._sum.nominal_kas_rw || 0,
        total_pemasukan_iuran: belumDisetor._sum.nominal || 0,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data setoran." });
  }
};

export const submitSetoran = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    const blokId = req.user.blok_wilayah_id;
    const blok = await prisma.blokWilayah.findUnique({ where: { id: blokId! } });
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    // Cari iuran yang belum disetor
    const iuranList = await prisma.iuranWarga.findMany({
      where: {
        warga: { blok_wilayah_id: blok.id },
        status: StatusIuran.LUNAS,
        setoran_id: null
      }
    });

    if (iuranList.length === 0) {
      res.status(400).json({ success: false, message: "Tidak ada iuran yang bisa disetor." });
      return;
    }

    const totalKasRW = iuranList.reduce((acc, curr) => acc + Number(curr.nominal_kas_rw || 0), 0);
    const { bukti_url } = req.body;

    const setoran = await prisma.$transaction(async (tx) => {
      const created = await tx.setoranIuranRT.create({
        data: {
          blok_wilayah_id: blok.id,
          wilayah_rw_id: blok.wilayah_rw_id,
          nominal: totalKasRW,
          status: StatusSetoran.PENDING,
          bukti_url: bukti_url || null,
        }
      });

      // Update semua iuranWarga
      await tx.iuranWarga.updateMany({
        where: { id: { in: iuranList.map(i => i.id) } },
        data: { setoran_id: created.id }
      });

      return created;
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "SetoranIuranRT",
      entitas_id: setoran.id,
      data_baru: setoran,
    });

    res.status(201).json({
      success: true,
      message: "Setoran berhasil disubmit dan menunggu konfirmasi RW.",
      data: setoran
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat submit setoran." });
  }
};

export const getSetoranForRW = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id || req.user.role !== "RW") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RW." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({ where: { user_id: req.user.id } });
    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Data wilayah RW tidak ditemukan." });
      return;
    }

    const { status } = req.query;

    const setoran = await prisma.setoranIuranRT.findMany({
      where: {
        wilayah_rw_id: rwWilayah.id,
        ...(status ? { status: status as StatusSetoran } : {})
      },
      include: {
        blok_wilayah: { select: { nama_blok: true, no_rt: true } }
      },
      orderBy: { tanggal_setor: "desc" }
    });

    res.status(200).json({
      success: true,
      data: setoran
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data setoran untuk RW." });
  }
};

export const approveSetoran = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id || req.user.role !== "RW") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RW." });
      return;
    }

    const setoranId = req.params.setoran_id as string;
    const existing = await prisma.setoranIuranRT.findUnique({
      where: { id: setoranId },
      include: { blok_wilayah: true }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Data setoran tidak ditemukan." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({ where: { user_id: req.user.id } });
    if (!rwWilayah || existing.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    if (existing.status === StatusSetoran.TERKONFIRMASI) {
      res.status(400).json({ success: false, message: "Setoran ini sudah terkonfirmasi." });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.setoranIuranRT.update({
        where: { id: setoranId },
        data: {
          status: StatusSetoran.TERKONFIRMASI,
          tanggal_konfirmasi: new Date(),
        }
      });

      // Catat ke KasRW
      // Generate kode unik for KAS RW
      const { randomBytes } = require("crypto");
      const year2 = String(new Date().getFullYear()).slice(-2);
      const month2 = String(new Date().getMonth() + 1).padStart(2, "0");
      const suffix = randomBytes(3).toString("hex").toUpperCase();
      const candidate = `KAS-${year2}${month2}-${suffix}`;

      await tx.kasRW.create({
        data: {
          wilayah_rw_id: rwWilayah.id,
          jenis_transaksi: JenisTransaksi.MASUK,
          keterangan: `Setoran Iuran dari ${existing.blok_wilayah?.nama_blok} (RT ${existing.blok_wilayah?.no_rt ?? "-"})`,
          nominal: existing.nominal,
          kode_unik: candidate, // Should ideally use generateKodeUnik but doing random here for simplicity
        }
      });

      return updated;
    });

    await recordAudit(req, {
      aksi: AksiAudit.APPROVE,
      entitas: "SetoranIuranRT",
      entitas_id: result.id,
      data_baru: result,
    });

    res.status(200).json({
      success: true,
      message: "Setoran berhasil dikonfirmasi dan masuk ke Kas RW.",
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat approve setoran." });
  }
};
