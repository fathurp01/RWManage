import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface ListRwMasjidQuery {
  blok_wilayah_id?: string;
  search?: string;
}

interface CreateRwMasjidBody {
  blok_wilayah_id?: string;
  nama_masjid?: string;
  alamat?: string;
}

interface UpdateRwMasjidBody {
  blok_wilayah_id?: string;
  nama_masjid?: string;
  alamat?: string;
}

interface RwMasjidParams {
  masjid_id?: string;
}

const getRwWilayahByUserId = async (userId: string) => {
  return prisma.wilayahRW.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
};

export const listRwMasjid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { blok_wilayah_id, search } = req.query as ListRwMasjidQuery;

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    if (blok_wilayah_id) {
      const blok = await prisma.blokWilayah.findUnique({
        where: { id: blok_wilayah_id },
        select: { id: true, wilayah_rw_id: true },
      });

      if (!blok) {
        res.status(404).json({
          success: false,
          message: "Blok wilayah tidak ditemukan.",
        });
        return;
      }

      if (blok.wilayah_rw_id !== rwWilayah.id) {
        res.status(403).json({
          success: false,
          message: "Akses ditolak. Blok wilayah ini tidak berada di RW Anda.",
        });
        return;
      }
    }

    const normalizedSearch = search?.trim();

    const masjidList = await prisma.masjid.findMany({
      where: {
        blok_wilayah: {
          wilayah_rw_id: rwWilayah.id,
        },
        ...(blok_wilayah_id
          ? {
              blok_wilayah_id,
            }
          : {}),
        ...(normalizedSearch
          ? {
              OR: [
                {
                  nama_masjid: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
                {
                  alamat: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
                {
                  blok_wilayah: {
                    nama_blok: {
                      contains: normalizedSearch,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        nama_masjid: true,
        alamat: true,
        blok_wilayah_id: true,
        blok_wilayah: {
          select: {
            id: true,
            nama_blok: true,
            no_rt: true,
            wilayah_rw: {
              select: {
                id: true,
                nama_kompleks: true,
                no_rw: true,
              },
            },
          },
        },
        pengurus_masjid: {
          where: {
            user: {
              status_akun: "APPROVED",
            },
          },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                nama: true,
              },
            },
          },
        },
      },
      orderBy: [{ nama_masjid: "asc" }],
    });

    res.status(200).json({
      success: true,
      message: "Data masjid wilayah RW berhasil diambil.",
      data: masjidList,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data masjid RW.",
    });
  }
};

export const createRwMasjid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { blok_wilayah_id, nama_masjid, alamat } = req.body as CreateRwMasjidBody;

    if (!blok_wilayah_id || !nama_masjid || !alamat) {
      res.status(400).json({
        success: false,
        message: "blok_wilayah_id, nama_masjid, dan alamat wajib diisi.",
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

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { id: true, wilayah_rw_id: true },
    });

    if (!blok) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    if (blok.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Blok wilayah ini tidak berada di RW Anda.",
      });
      return;
    }

    const masjid = await prisma.masjid.create({
      data: {
        blok_wilayah_id,
        nama_masjid: nama_masjid.trim(),
        alamat: alamat.trim(),
      },
      select: {
        id: true,
        nama_masjid: true,
        alamat: true,
        blok_wilayah_id: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Masjid berhasil ditambahkan.",
      data: masjid,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menambahkan masjid.",
    });
  }
};

export const updateRwMasjid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { masjid_id } = req.params as RwMasjidParams;
    const { blok_wilayah_id, nama_masjid, alamat } = req.body as UpdateRwMasjidBody;

    if (!masjid_id) {
      res.status(400).json({
        success: false,
        message: "masjid_id wajib diisi.",
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

    if (blok_wilayah_id === undefined && nama_masjid === undefined && alamat === undefined) {
      res.status(400).json({
        success: false,
        message: "Minimal satu field harus dikirim untuk update masjid.",
      });
      return;
    }

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const existingMasjid = await prisma.masjid.findUnique({
      where: { id: masjid_id },
      select: {
        id: true,
        blok_wilayah_id: true,
        blok_wilayah: {
          select: {
            wilayah_rw_id: true,
          },
        },
      },
    });

    if (!existingMasjid) {
      res.status(404).json({
        success: false,
        message: "Masjid tidak ditemukan.",
      });
      return;
    }

    if (existingMasjid.blok_wilayah.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Masjid ini tidak berada di wilayah RW Anda.",
      });
      return;
    }

    if (blok_wilayah_id) {
      const blok = await prisma.blokWilayah.findUnique({
        where: { id: blok_wilayah_id },
        select: { id: true, wilayah_rw_id: true },
      });

      if (!blok) {
        res.status(404).json({
          success: false,
          message: "Blok wilayah tujuan tidak ditemukan.",
        });
        return;
      }

      if (blok.wilayah_rw_id !== rwWilayah.id) {
        res.status(403).json({
          success: false,
          message: "Akses ditolak. Blok wilayah tujuan tidak berada di RW Anda.",
        });
        return;
      }
    }

    const updatedMasjid = await prisma.masjid.update({
      where: { id: masjid_id },
      data: {
        ...(blok_wilayah_id !== undefined ? { blok_wilayah_id } : {}),
        ...(nama_masjid !== undefined ? { nama_masjid: nama_masjid.trim() } : {}),
        ...(alamat !== undefined ? { alamat: alamat.trim() } : {}),
      },
      select: {
        id: true,
        nama_masjid: true,
        alamat: true,
        blok_wilayah_id: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Data masjid berhasil diperbarui.",
      data: updatedMasjid,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memperbarui masjid.",
    });
  }
};
