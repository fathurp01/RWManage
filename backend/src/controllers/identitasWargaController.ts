import { Request, Response } from "express";
import { TipeDokumen } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface CreateIdentitasBody {
  warga_id?: string;
  tipe_dokumen?: TipeDokumen;
  nomor_dokumen?: string;
  tanggal_terbit?: string;
  tanggal_berlaku?: string;
}

interface UpdateIdentitasBody {
  tipe_dokumen?: TipeDokumen;
  nomor_dokumen?: string;
  tanggal_terbit?: string;
  tanggal_berlaku?: string;
}

export const createIdentitasWarga = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      warga_id,
      tipe_dokumen,
      nomor_dokumen,
      tanggal_terbit,
      tanggal_berlaku,
    } = req.body as CreateIdentitasBody;

    if (!warga_id || !tipe_dokumen || !nomor_dokumen) {
      res.status(400).json({
        success: false,
        message: "warga_id, tipe_dokumen, dan nomor_dokumen wajib diisi.",
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
    const warga = await prisma.warga.findUnique({
      where: { id: warga_id },
      select: {
        blok_wilayah: {
          select: { wilayah_rw: { select: { user_id: true } } },
        },
      },
    });

    if (!warga) {
      res.status(404).json({
        success: false,
        message: "Warga tidak ditemukan.",
      });
      return;
    }

    if (warga.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    // Upload file jika ada
    const dokumen_url = (req as any).file?.filename
      ? `/uploads/${(req as any).file.filename}`
      : null;

    const identitas = await prisma.identitasWarga.create({
      data: {
        warga_id,
        tipe_dokumen,
        nomor_dokumen,
        tanggal_terbit: tanggal_terbit ? new Date(tanggal_terbit) : null,
        tanggal_berlaku: tanggal_berlaku ? new Date(tanggal_berlaku) : null,
        dokumen_url,
      },
    });

    res.status(201).json({
      success: true,
      message: "Data identitas berhasil ditambahkan.",
      data: identitas,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat data identitas.",
    });
  }
};

export const getIdentitasWargaList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { warga_id } = req.query as { warga_id?: string };

    if (!warga_id) {
      res.status(400).json({
        success: false,
        message: "warga_id harus diisi.",
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
    const warga = await prisma.warga.findUnique({
      where: { id: warga_id },
      select: {
        blok_wilayah: {
          select: { wilayah_rw: { select: { user_id: true } } },
        },
      },
    });

    if (!warga) {
      res.status(404).json({
        success: false,
        message: "Warga tidak ditemukan.",
      });
      return;
    }

    if (warga.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const identitas = await prisma.identitasWarga.findMany({
      where: {
        warga_id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Data identitas berhasil diambil.",
      data: identitas,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data identitas.",
    });
  }
};

export const updateIdentitasWarga = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.identitas_id;
    const identitas_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    const {
      tipe_dokumen,
      nomor_dokumen,
      tanggal_terbit,
      tanggal_berlaku,
    } = req.body as UpdateIdentitasBody;

    if (!identitas_id) {
      res.status(400).json({
        success: false,
        message: "identitas_id harus diisi.",
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

    const identitas = await prisma.identitasWarga.findUnique({
      where: { id: identitas_id },
      select: {
        warga: {
          select: {
            blok_wilayah: {
              select: { wilayah_rw: { select: { user_id: true } } },
            },
          },
        },
      },
    });

    if (!identitas) {
      res.status(404).json({
        success: false,
        message: "Data identitas tidak ditemukan.",
      });
      return;
    }

    if (identitas.warga.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const dokumen_url = (req as any).file?.filename
      ? `/uploads/${(req as any).file.filename}`
      : undefined;

    const updated = await prisma.identitasWarga.update({
      where: { id: identitas_id },
      data: {
        ...(tipe_dokumen && { tipe_dokumen }),
        ...(nomor_dokumen && { nomor_dokumen }),
        ...(tanggal_terbit && { tanggal_terbit: new Date(tanggal_terbit) }),
        ...(tanggal_berlaku && { tanggal_berlaku: new Date(tanggal_berlaku) }),
        ...(dokumen_url && { dokumen_url }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Data identitas berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate data identitas.",
    });
  }
};

export const verifyIdentitasWarga = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.identitas_id;
    const identitas_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!identitas_id) {
      res.status(400).json({
        success: false,
        message: "identitas_id harus diisi.",
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

    const identitas = await prisma.identitasWarga.findUnique({
      where: { id: identitas_id },
      select: {
        warga: {
          select: {
            blok_wilayah: {
              select: { wilayah_rw: { select: { user_id: true } } },
            },
          },
        },
      },
    });

    if (!identitas) {
      res.status(404).json({
        success: false,
        message: "Data identitas tidak ditemukan.",
      });
      return;
    }

    if (identitas.warga.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const verified = await prisma.identitasWarga.update({
      where: { id: identitas_id },
      data: {
        verified_at: new Date(),
        verified_by: req.user.id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Data identitas berhasil diverifikasi.",
      data: verified,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memverifikasi identitas.",
    });
  }
};

export const deleteIdentitasWarga = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.identitas_id;
    const identitas_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!identitas_id) {
      res.status(400).json({
        success: false,
        message: "identitas_id harus diisi.",
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

    const identitas = await prisma.identitasWarga.findUnique({
      where: { id: identitas_id },
      select: {
        warga: {
          select: {
            blok_wilayah: {
              select: { wilayah_rw: { select: { user_id: true } } },
            },
          },
        },
      },
    });

    if (!identitas) {
      res.status(404).json({
        success: false,
        message: "Data identitas tidak ditemukan.",
      });
      return;
    }

    if (identitas.warga.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    await prisma.identitasWarga.update({
      where: { id: identitas_id },
      data: { deleted_at: new Date() },
    });

    res.status(200).json({
      success: true,
      message: "Data identitas berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus data identitas.",
    });
  }
};
