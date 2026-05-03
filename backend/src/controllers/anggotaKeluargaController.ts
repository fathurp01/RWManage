import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface CreateAnggotaBody {
  warga_id?: string;
  nama?: string;
  hubungan?: string;
  nik?: string;
  tanggal_lahir?: string;
  pendidikan?: string;
  pekerjaan?: string;
}

interface UpdateAnggotaBody {
  nama?: string;
  hubungan?: string;
  nik?: string;
  tanggal_lahir?: string;
  pendidikan?: string;
  pekerjaan?: string;
}

export const createAnggotaKeluarga = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { warga_id, nama, hubungan, nik, tanggal_lahir, pendidikan, pekerjaan } =
      req.body as CreateAnggotaBody;

    if (!warga_id || !nama || !hubungan) {
      res.status(400).json({
        success: false,
        message: "warga_id, nama, dan hubungan wajib diisi.",
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

    // Validasi warga ownership (RW yang punya blok punya warga)
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

    const anggota = await prisma.anggotaKeluarga.create({
      data: {
        warga_id,
        nama,
        hubungan,
        nik: nik || null,
        tanggal_lahir: tanggal_lahir ? new Date(tanggal_lahir) : null,
        pendidikan: pendidikan || null,
        pekerjaan: pekerjaan || null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Anggota keluarga berhasil ditambahkan.",
      data: anggota,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat anggota keluarga.",
    });
  }
};

export const getAnggotaKeluargaList = async (
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

    const anggota = await prisma.anggotaKeluarga.findMany({
      where: {
        warga_id,
        deleted_at: null,
      },
      orderBy: { created_at: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Data anggota keluarga berhasil diambil.",
      data: anggota,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data anggota keluarga.",
    });
  }
};

export const updateAnggotaKeluarga = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.anggota_id;
    const anggota_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    const { nama, hubungan, nik, tanggal_lahir, pendidikan, pekerjaan } =
      req.body as UpdateAnggotaBody;

    if (!anggota_id) {
      res.status(400).json({
        success: false,
        message: "anggota_id harus diisi.",
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

    const anggota = await prisma.anggotaKeluarga.findUnique({
      where: { id: anggota_id },
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

    if (!anggota) {
      res.status(404).json({
        success: false,
        message: "Anggota keluarga tidak ditemukan.",
      });
      return;
    }

    if (anggota.warga.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const updated = await prisma.anggotaKeluarga.update({
      where: { id: anggota_id },
      data: {
        ...(nama && { nama }),
        ...(hubungan && { hubungan }),
        ...(nik && { nik }),
        ...(tanggal_lahir && { tanggal_lahir: new Date(tanggal_lahir) }),
        ...(pendidikan && { pendidikan }),
        ...(pekerjaan && { pekerjaan }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Anggota keluarga berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate anggota keluarga.",
    });
  }
};

export const deleteAnggotaKeluarga = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.anggota_id;
    const anggota_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!anggota_id) {
      res.status(400).json({
        success: false,
        message: "anggota_id harus diisi.",
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

    const anggota = await prisma.anggotaKeluarga.findUnique({
      where: { id: anggota_id },
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

    if (!anggota) {
      res.status(404).json({
        success: false,
        message: "Anggota keluarga tidak ditemukan.",
      });
      return;
    }

    if (anggota.warga.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    await prisma.anggotaKeluarga.update({
      where: { id: anggota_id },
      data: { deleted_at: new Date() },
    });

    res.status(200).json({
      success: true,
      message: "Anggota keluarga berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus anggota keluarga.",
    });
  }
};
