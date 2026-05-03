import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { pengaturanIuranRWSchema } from "../validation/schemas";
import { AksiAudit } from "@prisma/client";
import { recordAudit } from "../middlewares/auditLogger";

export const getPengaturanIuranRW = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Akses ditolak. Wilayah RW tidak ditemukan." });
      return;
    }

    let pengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id },
    });

    res.status(200).json({
      success: true,
      message: "Data pengaturan iuran berhasil diambil.",
      data: pengaturan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil pengaturan iuran." });
  }
};

export const upsertPengaturanIuranRW = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Akses ditolak. Wilayah RW tidak ditemukan." });
      return;
    }

    const { nominal_iuran, persen_rt, persen_rw } = req.body;
    
    // Validasi basic
    if (!nominal_iuran) {
      res.status(400).json({ success: false, message: "nominal_iuran wajib diisi." });
      return;
    }

    const pRt = persen_rt ?? 70.0;
    const pRw = persen_rw ?? 30.0;

    if (pRt + pRw !== 100.0) {
      res.status(400).json({ success: false, message: "Total persen RT dan RW harus 100%." });
      return;
    }

    const pengaturan = await prisma.pengaturanIuranRW.upsert({
      where: { wilayah_rw_id: rwWilayah.id },
      update: {
        nominal_iuran: Number(nominal_iuran),
        persen_rt: Number(pRt),
        persen_rw: Number(pRw),
      },
      create: {
        wilayah_rw_id: rwWilayah.id,
        nominal_iuran: Number(nominal_iuran),
        persen_rt: Number(pRt),
        persen_rw: Number(pRw),
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "PengaturanIuranRW",
      entitas_id: pengaturan.id,
      data_baru: pengaturan,
    });

    res.status(200).json({
      success: true,
      message: "Pengaturan iuran berhasil disimpan.",
      data: pengaturan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menyimpan pengaturan iuran." });
  }
};
