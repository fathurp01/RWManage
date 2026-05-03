import { Request, Response } from "express";
import { StatusKehadiran } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface CreatePerformaBody {
  blok_wilayah_id?: string;
  tanggal?: string;
  nama_petugas?: string;
  status_kehadiran?: StatusKehadiran;
  catatan?: string;
}

interface UpdatePerformaBody {
  nama_petugas?: string;
  status_kehadiran?: StatusKehadiran;
  catatan?: string;
}

export const createPerformaRonda = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { blok_wilayah_id, tanggal, nama_petugas, status_kehadiran, catatan } =
      req.body as CreatePerformaBody;

    if (!blok_wilayah_id || !tanggal || !nama_petugas || !status_kehadiran) {
      res.status(400).json({
        success: false,
        message:
          "blok_wilayah_id, tanggal, nama_petugas, dan status_kehadiran wajib diisi.",
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

    // Validasi ownership
    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!blok) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    if (blok.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const performa = await prisma.performaRonda.create({
      data: {
        blok_wilayah_id,
        tanggal: new Date(tanggal),
        nama_petugas,
        status_kehadiran,
        catatan: catatan || null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Data performa ronda berhasil ditambahkan.",
      data: performa,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat data performa ronda.",
    });
  }
};

export const getPerformaRondaList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { blok_wilayah_id, tanggal_mulai, tanggal_akhir } = req.query as {
      blok_wilayah_id?: string;
      tanggal_mulai?: string;
      tanggal_akhir?: string;
    };

    if (!blok_wilayah_id) {
      res.status(400).json({
        success: false,
        message: "blok_wilayah_id harus diisi.",
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

    // Validasi ownership
    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!blok) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    if (blok.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const performa = await prisma.performaRonda.findMany({
      where: {
        blok_wilayah_id,
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
      message: "Data performa ronda berhasil diambil.",
      data: performa,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data performa ronda.",
    });
  }
};

export const updatePerformaRonda = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.performa_id;
    const performa_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    const { nama_petugas, status_kehadiran, catatan } =
      req.body as UpdatePerformaBody;

    if (!performa_id) {
      res.status(400).json({
        success: false,
        message: "performa_id harus diisi.",
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

    const performa = await prisma.performaRonda.findUnique({
      where: { id: performa_id },
      select: {
        blok_wilayah: {
          select: { wilayah_rw: { select: { user_id: true } } },
        },
      },
    });

    if (!performa) {
      res.status(404).json({
        success: false,
        message: "Data performa ronda tidak ditemukan.",
      });
      return;
    }

    if (performa.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const updated = await prisma.performaRonda.update({
      where: { id: performa_id },
      data: {
        ...(nama_petugas && { nama_petugas }),
        ...(status_kehadiran && { status_kehadiran }),
        ...(catatan && { catatan }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Data performa ronda berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate data performa ronda.",
    });
  }
};

export const deletePerformaRonda = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.performa_id;
    const performa_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!performa_id) {
      res.status(400).json({
        success: false,
        message: "performa_id harus diisi.",
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

    const performa = await prisma.performaRonda.findUnique({
      where: { id: performa_id },
      select: {
        blok_wilayah: {
          select: { wilayah_rw: { select: { user_id: true } } },
        },
      },
    });

    if (!performa) {
      res.status(404).json({
        success: false,
        message: "Data performa ronda tidak ditemukan.",
      });
      return;
    }

    if (performa.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    await prisma.performaRonda.delete({
      where: { id: performa_id },
    });

    res.status(200).json({
      success: true,
      message: "Data performa ronda berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus data performa ronda.",
    });
  }
};
