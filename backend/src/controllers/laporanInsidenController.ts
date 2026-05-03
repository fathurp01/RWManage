import { Request, Response } from "express";
import { StatusInsiden } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface CreateLaporanBody {
  tipe_insiden?: string;
  tanggal_insiden?: string;
  lokasi?: string;
  deskripsi?: string;
  pelapor_nama?: string;
  pelapor_no_hp?: string;
}

interface UpdateLaporanBody {
  tipe_insiden?: string;
  tanggal_insiden?: string;
  lokasi?: string;
  deskripsi?: string;
  status?: StatusInsiden;
  tindakan_diambil?: string;
}

export const createLaporanInsiden = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      tipe_insiden,
      tanggal_insiden,
      lokasi,
      deskripsi,
      pelapor_nama,
      pelapor_no_hp,
    } = req.body as CreateLaporanBody;

    if (
      !tipe_insiden ||
      !tanggal_insiden ||
      !lokasi ||
      !deskripsi ||
      !pelapor_nama
    ) {
      res.status(400).json({
        success: false,
        message:
          "tipe_insiden, tanggal_insiden, lokasi, deskripsi, dan pelapor_nama wajib diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    // Get wilayah_rw_id from user
    const wilayahRW = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!wilayahRW) {
      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk membuat laporan insiden.",
      });
      return;
    }

    // Upload file jika ada
    const foto_bukti_url = (req as any).file?.filename
      ? `/uploads/${(req as any).file.filename}`
      : null;

    const laporan = await prisma.laporanInsiden.create({
      data: {
        wilayah_rw_id: wilayahRW.id,
        tipe_insiden,
        tanggal_insiden: new Date(tanggal_insiden),
        lokasi,
        deskripsi,
        pelapor_nama,
        pelapor_no_hp: pelapor_no_hp || null,
        foto_bukti_url,
        status: "LAPORAN",
      },
    });

    res.status(201).json({
      success: true,
      message: "Laporan insiden berhasil dibuat.",
      data: laporan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat laporan insiden.",
    });
  }
};

export const getLaporanInsidenList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, tanggal_mulai, tanggal_akhir } = req.query as {
      status?: StatusInsiden;
      tanggal_mulai?: string;
      tanggal_akhir?: string;
    };

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    // Get wilayah_rw_id from user
    const wilayahRW = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!wilayahRW) {
      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk melihat laporan insiden.",
      });
      return;
    }

    const laporan = await prisma.laporanInsiden.findMany({
      where: {
        wilayah_rw_id: wilayahRW.id,
        ...(status && { status }),
        ...(tanggal_mulai && tanggal_akhir
          ? {
              tanggal_insiden: {
                gte: new Date(tanggal_mulai),
                lte: new Date(tanggal_akhir),
              },
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Data laporan insiden berhasil diambil.",
      data: laporan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data laporan insiden.",
    });
  }
};

export const updateLaporanInsiden = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    const { tipe_insiden, tanggal_insiden, lokasi, deskripsi, status, tindakan_diambil } =
      req.body as UpdateLaporanBody;

    if (!laporan_id) {
      res.status(400).json({
        success: false,
        message: "laporan_id harus diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const laporan = await prisma.laporanInsiden.findUnique({
      where: { id: laporan_id },
      select: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!laporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    if (laporan.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const foto_bukti_url = (req as any).file?.filename
      ? `/uploads/${(req as any).file.filename}`
      : undefined;

    const updated = await prisma.laporanInsiden.update({
      where: { id: laporan_id },
      data: {
        ...(tipe_insiden && { tipe_insiden }),
        ...(tanggal_insiden && { tanggal_insiden: new Date(tanggal_insiden) }),
        ...(lokasi && { lokasi }),
        ...(deskripsi && { deskripsi }),
        ...(status && { status }),
        ...(tindakan_diambil && {
          tindakan_diambil,
          ditindaklanjuti_tanggal: new Date(),
        }),
        ...(foto_bukti_url && { foto_bukti_url }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Laporan insiden berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate laporan insiden.",
    });
  }
};

export const closeLaporanInsiden = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!laporan_id) {
      res.status(400).json({
        success: false,
        message: "laporan_id harus diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const laporan = await prisma.laporanInsiden.findUnique({
      where: { id: laporan_id },
      select: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!laporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    if (laporan.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const updated = await prisma.laporanInsiden.update({
      where: { id: laporan_id },
      data: { status: "DITUTUP" },
    });

    res.status(200).json({
      success: true,
      message: "Laporan insiden berhasil ditutup.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menutup laporan insiden.",
    });
  }
};

export const deleteLaporanInsiden = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!laporan_id) {
      res.status(400).json({
        success: false,
        message: "laporan_id harus diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const laporan = await prisma.laporanInsiden.findUnique({
      where: { id: laporan_id },
      select: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!laporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    if (laporan.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    await prisma.laporanInsiden.delete({
      where: { id: laporan_id },
    });

    res.status(200).json({
      success: true,
      message: "Laporan insiden berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus laporan insiden.",
    });
  }
};
