import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface CreateMasjidBody {
  wilayah_rw_id?: string;
  nama_masjid?: string;
  alamat?: string;
}

interface UpdateMasjidBody {
  nama_masjid?: string;
  alamat?: string;
}

export const createMasjid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { wilayah_rw_id, nama_masjid, alamat } = req.body as CreateMasjidBody;

    if (!wilayah_rw_id || !nama_masjid || !alamat) {
      res.status(400).json({
        success: false,
        message:
          "wilayah_rw_id, nama_masjid, dan alamat wajib diisi.",
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

    const masjid = await prisma.masjid.create({
      data: {
        blok_wilayah_id: wilayah_rw_id,
        nama_masjid,
        alamat,
      },
    });

    res.status(201).json({
      success: true,
      message: "Data masjid berhasil ditambahkan.",
      data: masjid,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat data masjid.",
    });
  }
};

export const getMasjidList = async (
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

    const masjids = await prisma.masjid.findMany({
      where: {
        blok_wilayah_id: wilayah_rw_id,
      },
      include: {
        kas_masjid: {
          select: { id: true }
        },
        pengurus_masjid: {
          include: {
            user: {
              select: { nama: true }
            }
          }
        }
      },
      orderBy: { nama_masjid: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Data masjid berhasil diambil.",
      data: masjids,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data masjid.",
    });
  }
};

export const getMasjidDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.masjid_id;
    const masjid_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!masjid_id) {
      res.status(400).json({
        success: false,
        message: "masjid_id harus diisi.",
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

    const masjid = await prisma.masjid.findUnique({
      where: { id: masjid_id },
      include: {
        kas_masjid: true,
        pengurus_masjid: true,
        blok_wilayah: { include: { wilayah_rw: { select: { user_id: true } } } },
      },
    });

    if (!masjid) {
      res.status(404).json({
        success: false,
        message: "Data masjid tidak ditemukan.",
      });
      return;
    }

    // Validasi ownership
    if (masjid.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Detail masjid berhasil diambil.",
      data: masjid,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil detail masjid.",
    });
  }
};

export const updateMasjid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw2 = (req.params as Record<string, unknown>)?.masjid_id;
    const masjid_id = Array.isArray(raw2) ? raw2[0] : (raw2 as string | undefined);
    const { nama_masjid, alamat } = req.body as UpdateMasjidBody;

    if (!masjid_id) {
      res.status(400).json({
        success: false,
        message: "masjid_id harus diisi.",
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

    const masjid = await prisma.masjid.findUnique({
      where: { id: masjid_id },
      select: { blok_wilayah: { select: { wilayah_rw: { select: { user_id: true } } } } },
    });

    if (!masjid) {
      res.status(404).json({
        success: false,
        message: "Data masjid tidak ditemukan.",
      });
      return;
    }

    if (masjid.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const updated = await prisma.masjid.update({
      where: { id: masjid_id },
      data: {
        ...(nama_masjid && { nama_masjid }),
        ...(alamat && { alamat }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Data masjid berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate data masjid.",
    });
  }
};

export const deleteMasjid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw3 = (req.params as Record<string, unknown>)?.masjid_id;
    const masjid_id = Array.isArray(raw3) ? raw3[0] : (raw3 as string | undefined);

    if (!masjid_id) {
      res.status(400).json({
        success: false,
        message: "masjid_id harus diisi.",
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

    const masjid = await prisma.masjid.findUnique({
      where: { id: masjid_id },
      select: { blok_wilayah: { select: { wilayah_rw: { select: { user_id: true } } } } },
    });

    if (!masjid) {
      res.status(404).json({
        success: false,
        message: "Data masjid tidak ditemukan.",
      });
      return;
    }

    if (masjid.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

          // Check if there are any pengurus linked to this masjid
      const hasPengurus = await prisma.pengurusMasjid.findFirst({
        where: { masjid_id: masjid_id },
        select: { id: true },
      });
      if (hasPengurus) {
        res.status(409).json({
          success: false,
          message: "Masjid masih memiliki pengurus yang terdaftar. Harap hapus akun pengurus terlebih dahulu.",
        });
        return;
      }

    res.status(200).json({
      success: true,
      message: "Data masjid berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus data masjid.",
    });
  }
};
