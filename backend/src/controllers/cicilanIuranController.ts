import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface CreateCicilanBody {
  iuran_id?: string;
  jumlah_bulan?: number | string;
  bulan_mulai?: number | string;
  tahun_mulai?: number | string;
}

export const createCicilanIuran = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { iuran_id, jumlah_bulan, bulan_mulai, tahun_mulai } =
      req.body as CreateCicilanBody;

    if (!iuran_id || !jumlah_bulan || !bulan_mulai || !tahun_mulai) {
      res.status(400).json({
        success: false,
        message:
          "iuran_id, jumlah_bulan, bulan_mulai, dan tahun_mulai wajib diisi.",
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

    const jmlBulan = Number(jumlah_bulan);
    const blnMulai = Number(bulan_mulai);
    const thnMulai = Number(tahun_mulai);

    if (
      !Number.isInteger(jmlBulan) ||
      jmlBulan <= 0 ||
      !Number.isInteger(blnMulai) ||
      blnMulai < 1 ||
      blnMulai > 12 ||
      !Number.isInteger(thnMulai) ||
      thnMulai < 2000
    ) {
      res.status(400).json({
        success: false,
        message:
          "jumlah_bulan harus > 0, bulan_mulai 1-12, tahun_mulai >= 2000.",
      });
      return;
    }

    // Validasi iuran ownership
    const iuran = await prisma.iuranWarga.findUnique({
      where: { id: iuran_id },
      select: {
        warga: {
          select: {
            id: true,
            blok_wilayah: {
              select: { wilayah_rw: { select: { user_id: true } } },
            },
          },
        },
        nominal: true,
      },
    });

    if (!iuran) {
      res.status(404).json({
        success: false,
        message: "Iuran tidak ditemukan.",
      });
      return;
    }

    if (iuran.warga.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const nominalPerBulan = iuran.nominal.dividedBy(jmlBulan);

    const cicilan = await prisma.cicilanIuran.create({
      data: {
        warga_id: iuran.warga.id,
        iuran_id,
        total_cicilan: iuran.nominal,
        nominal_per_bulan: nominalPerBulan,
        jumlah_bulan: jmlBulan,
        bulan_mulai: blnMulai,
        tahun_mulai: thnMulai,
      },
    });

    res.status(201).json({
      success: true,
      message: "Cicilan iuran berhasil dibuat.",
      data: cicilan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat cicilan iuran.",
    });
  }
};

export const getCicilanIuranList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { warga_id, iuran_id } = req.query as {
      warga_id?: string;
      iuran_id?: string;
    };

    if (!warga_id && !iuran_id) {
      res.status(400).json({
        success: false,
        message: "warga_id atau iuran_id harus diisi.",
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

    if (warga_id) {
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
    }

    const cicilan = await prisma.cicilanIuran.findMany({
      where: {
        ...(warga_id && { warga_id }),
        ...(iuran_id && { iuran_id }),
      },
      include: {
        iuran: true,
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Data cicilan iuran berhasil diambil.",
      data: cicilan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data cicilan iuran.",
    });
  }
};

export const updateCicilanStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.cicilan_id;
    const cicilan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!cicilan_id) {
      res.status(400).json({
        success: false,
        message: "cicilan_id harus diisi.",
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

    const cicilan = await prisma.cicilanIuran.findUnique({
      where: { id: cicilan_id },
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

    if (!cicilan) {
      res.status(404).json({
        success: false,
        message: "Cicilan tidak ditemukan.",
      });
      return;
    }

    if (cicilan.warga.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const updated = await prisma.cicilanIuran.update({
      where: { id: cicilan_id },
      data: { sudah_lunas: true },
    });

    res.status(200).json({
      success: true,
      message: "Cicilan berhasil ditandai lunas.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate cicilan.",
    });
  }
};

export const deleteCicilanIuran = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.cicilan_id;
    const cicilan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!cicilan_id) {
      res.status(400).json({
        success: false,
        message: "cicilan_id harus diisi.",
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

    const cicilan = await prisma.cicilanIuran.findUnique({
      where: { id: cicilan_id },
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

    if (!cicilan) {
      res.status(404).json({
        success: false,
        message: "Cicilan tidak ditemukan.",
      });
      return;
    }

    if (cicilan.warga.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    await prisma.cicilanIuran.delete({
      where: { id: cicilan_id },
    });

    res.status(200).json({
      success: true,
      message: "Cicilan berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus cicilan.",
    });
  }
};
