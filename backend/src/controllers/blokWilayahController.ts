import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface CreateBlokBody {
  wilayah_rw_id?: string;
  nama_blok?: string;
  no_rt?: string;
}

interface UpdateBlokBody {
  nama_blok?: string;
  no_rt?: string;
}

export const createBlokWilayah = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { wilayah_rw_id, nama_blok, no_rt } = req.body as CreateBlokBody;

    if (!wilayah_rw_id || !nama_blok || !no_rt) {
      res.status(400).json({
        success: false,
        message: "wilayah_rw_id, nama_blok, dan no_rt wajib diisi.",
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
    const wilayah = await prisma.wilayahRW.findUnique({
      where: { id: wilayah_rw_id },
      select: { user_id: true },
    });

    if (!wilayah) {
      res.status(404).json({
        success: false,
        message: "Wilayah RW tidak ditemukan.",
      });
      return;
    }

    if (wilayah.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    // Check for existing nama_blok or no_rt
    const existingBlok = await prisma.blokWilayah.findFirst({
      where: {
        wilayah_rw_id,
        OR: [
          { nama_blok: { equals: nama_blok, mode: 'insensitive' } },
          ...(no_rt ? [{ no_rt: { equals: no_rt, mode: 'insensitive' } }] : [])
        ]
      }
    });

    if (existingBlok) {
      res.status(409).json({
        success: false,
        message: existingBlok.nama_blok.toLowerCase() === nama_blok.toLowerCase()
          ? `Nama blok "${nama_blok}" sudah terdaftar.` 
          : `Nomor RT "${no_rt}" sudah terdaftar.`,
      });
      return;
    }

    const blok = await prisma.blokWilayah.create({
      data: {
        wilayah_rw_id,
        nama_blok,
        no_rt: no_rt || null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Blok wilayah berhasil ditambahkan.",
      data: blok,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat blok wilayah.",
    });
  }
};

export const getBlokWilayahList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { wilayah_rw_id } = req.query as { wilayah_rw_id?: string };

    if (!wilayah_rw_id) {
      res.status(400).json({
        success: false,
        message: "wilayah_rw_id harus diisi.",
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
    const wilayah = await prisma.wilayahRW.findUnique({
      where: { id: wilayah_rw_id },
      select: { user_id: true },
    });

    if (!wilayah) {
      res.status(404).json({
        success: false,
        message: "Wilayah RW tidak ditemukan.",
      });
      return;
    }

    if (wilayah.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const bloks = await prisma.blokWilayah.findMany({
      where: { wilayah_rw_id },
      include: {
        performa_ronda: {
          select: { id: true }
        },
        users: {
          select: { role: true }
        },
        _count: {
          select: { 
            warga: true, 
            masjid: true 
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const formattedBloks = bloks.map((b) => {
      const rtCount = b.users.filter((u) => u.role === "RT").length;
      const pengurusCount = b.users.filter((u) => u.role === "PENGURUS_MASJID").length;
      
      const { users, ...rest } = b;
      return {
        ...rest,
        _count: {
          ...rest._count,
          rt_users: rtCount,
          pengurus_masjid_users: pengurusCount,
          users: rtCount + pengurusCount,
        }
      };
    });

    res.status(200).json({
      success: true,
      message: "Data blok wilayah berhasil diambil.",
      data: formattedBloks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data blok wilayah.",
    });
  }
};

export const updateBlokWilayah = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.blok_id;
    const blok_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    const { nama_blok, no_rt } = req.body as UpdateBlokBody;

    if (!blok_id) {
      res.status(400).json({
        success: false,
        message: "blok_id harus diisi.",
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

    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_id },
      select: { wilayah_rw_id: true, wilayah_rw: { select: { user_id: true } } },
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

    if (nama_blok || no_rt) {
      const existingBlok = await prisma.blokWilayah.findFirst({
        where: {
          wilayah_rw_id: blok.wilayah_rw_id,
          id: { not: blok_id },
          OR: [
            ...(nama_blok ? [{ nama_blok: { equals: nama_blok, mode: 'insensitive' } }] : []),
            ...(no_rt ? [{ no_rt: { equals: no_rt, mode: 'insensitive' } }] : [])
          ]
        }
      });

      if (existingBlok) {
        res.status(409).json({
          success: false,
          message: existingBlok.nama_blok.toLowerCase() === (nama_blok || '').toLowerCase()
            ? `Nama blok "${nama_blok}" sudah terdaftar.` 
            : `Nomor RT "${no_rt}" sudah terdaftar.`,
        });
        return;
      }
    }

    const updated = await prisma.blokWilayah.update({
      where: { id: blok_id },
      data: {
        ...(nama_blok && { nama_blok }),
        ...(no_rt && { no_rt }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Blok wilayah berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate blok wilayah.",
    });
  }
};

export const deleteBlokWilayah = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw2 = (req.params as Record<string, unknown>)?.blok_id;
    const blok_id = Array.isArray(raw2) ? raw2[0] : (raw2 as string | undefined);

    if (!blok_id) {
      res.status(400).json({
        success: false,
        message: "blok_id harus diisi.",
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

    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_id },
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

    // Hard delete (model does not have `deleted_at` field)
    await prisma.blokWilayah.delete({ where: { id: blok_id } });

    res.status(200).json({
      success: true,
      message: "Blok wilayah berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus blok wilayah.",
    });
  }
};
