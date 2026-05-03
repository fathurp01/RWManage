import { randomUUID } from "crypto";
import { JenisTransaksi, Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface CreateKasMasjidBody {
  masjid_id?: string;
  jenis_transaksi?: JenisTransaksi;
  tanggal?: string;
  keterangan?: string;
  nominal?: number | string;
  bukti_url?: string;
}

interface GetKasMasjidQuery {
  masjid_id?: string;
  jenis_transaksi?: JenisTransaksi;
  search?: string;
  start_date?: string;
  end_date?: string;
}

interface KasMasjidIdParams {
  kas_id?: string;
}

interface UpdateKasMasjidBody {
  jenis_transaksi?: JenisTransaksi;
  tanggal?: string;
  keterangan?: string;
  nominal?: number | string;
  bukti_url?: string;
}

const generateKodeUnikKasMasjid = (): string => {
  const year = new Date().getFullYear();
  return `KMS-${year}-${randomUUID().toUpperCase()}`;
};

const parsePositiveNumber = (
  value: number | string | undefined
): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const getAuthorizedMasjidId = async (
  userId: string,
  requestedMasjidId?: string
): Promise<string | null> => {
  if (requestedMasjidId) {
    const relation = await prisma.pengurusMasjid.findFirst({
      where: {
        user_id: userId,
        masjid_id: requestedMasjidId,
      },
      select: {
        masjid_id: true,
      },
    });

    return relation?.masjid_id ?? null;
  }

  const firstRelation = await prisma.pengurusMasjid.findFirst({
    where: { user_id: userId },
    select: { masjid_id: true },
    orderBy: { id: "asc" },
  });

  return firstRelation?.masjid_id ?? null;
};

export const createKasMasjid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { masjid_id, jenis_transaksi, tanggal, keterangan, nominal, bukti_url } =
      req.body as CreateKasMasjidBody;

    const nominalKas = parsePositiveNumber(nominal);

    if (!masjid_id || !jenis_transaksi || !keterangan || nominalKas === null) {
      res.status(400).json({
        success: false,
        message:
          "masjid_id, jenis_transaksi, keterangan, dan nominal (angka > 0) wajib diisi.",
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

    if (
      jenis_transaksi !== JenisTransaksi.MASUK &&
      jenis_transaksi !== JenisTransaksi.KELUAR
    ) {
      res.status(400).json({
        success: false,
        message: "jenis_transaksi hanya boleh MASUK atau KELUAR.",
      });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(req.user.id, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda tidak memiliki akses ke masjid ini.",
      });
      return;
    }

    let tanggalParsed = new Date();
    if (tanggal) {
      const testDate = new Date(tanggal);
      if (Number.isNaN(testDate.getTime())) {
        res.status(400).json({
          success: false,
          message: "Format tanggal tidak valid.",
        });
        return;
      }
      tanggalParsed = testDate;
    }

    const kas = await prisma.kasMasjid.create({
      data: {
        masjid_id: authorizedMasjidId,
        jenis_transaksi,
        tanggal: tanggalParsed,
        keterangan,
        nominal: new Prisma.Decimal(nominalKas),
        bukti_url,
        kode_unik: generateKodeUnikKasMasjid(),
      },
      select: {
        id: true,
        masjid_id: true,
        jenis_transaksi: true,
        tanggal: true,
        keterangan: true,
        nominal: true,
        bukti_url: true,
        kode_unik: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Data kas masjid berhasil ditambahkan.",
      data: kas,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menambahkan kas masjid.",
    });
  }
};

export const getKasMasjid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { masjid_id, jenis_transaksi, search, start_date, end_date } =
      req.query as GetKasMasjidQuery;

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(req.user.id, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda tidak memiliki akses ke masjid ini.",
      });
      return;
    }

    const normalizedSearch = search?.trim();

    const startDateParsed = start_date ? new Date(start_date) : null;
    if (start_date && (!startDateParsed || Number.isNaN(startDateParsed.getTime()))) {
      res.status(400).json({
        success: false,
        message: "Parameter start_date tidak valid.",
      });
      return;
    }

    const endDateParsed = end_date ? new Date(end_date) : null;
    if (end_date && (!endDateParsed || Number.isNaN(endDateParsed.getTime()))) {
      res.status(400).json({
        success: false,
        message: "Parameter end_date tidak valid.",
      });
      return;
    }

    if (startDateParsed && endDateParsed && startDateParsed > endDateParsed) {
      res.status(400).json({
        success: false,
        message: "start_date tidak boleh lebih besar dari end_date.",
      });
      return;
    }

    const kasList = await prisma.kasMasjid.findMany({
      where: {
        masjid_id: authorizedMasjidId,
        ...(jenis_transaksi
          ? {
              jenis_transaksi,
            }
          : {}),
        ...(normalizedSearch
          ? {
              OR: [
                {
                  keterangan: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
                {
                  kode_unik: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
        ...(startDateParsed || endDateParsed
          ? {
              tanggal: {
                ...(startDateParsed
                  ? {
                      gte: startDateParsed,
                    }
                  : {}),
                ...(endDateParsed
                  ? {
                      lte: endDateParsed,
                    }
                  : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        masjid_id: true,
        jenis_transaksi: true,
        tanggal: true,
        keterangan: true,
        nominal: true,
        bukti_url: true,
        kode_unik: true,
      },
      orderBy: [{ tanggal: "desc" }, { id: "desc" }],
    });

    const summary = kasList.reduce(
      (acc, item) => {
        const nominalValue = Number(item.nominal);
        if (item.jenis_transaksi === JenisTransaksi.MASUK) {
          acc.total_masuk += nominalValue;
        } else {
          acc.total_keluar += nominalValue;
        }

        return acc;
      },
      {
        total_masuk: 0,
        total_keluar: 0,
      }
    );

    res.status(200).json({
      success: true,
      message: "Data kas masjid berhasil diambil.",
      data: {
        masjid_id: authorizedMasjidId,
        items: kasList,
        summary: {
          total_masuk: summary.total_masuk,
          total_keluar: summary.total_keluar,
          saldo: summary.total_masuk - summary.total_keluar,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data kas masjid.",
    });
  }
};

export const updateKasMasjid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.kas_id;
    const kas_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    const { jenis_transaksi, tanggal, keterangan, nominal, bukti_url } =
      req.body as UpdateKasMasjidBody;

    if (!kas_id) {
      res.status(400).json({
        success: false,
        message: "kas_id wajib diisi.",
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

    const existingKas = await prisma.kasMasjid.findUnique({
      where: { id: kas_id },
      select: {
        id: true,
        masjid_id: true,
      },
    });

    if (!existingKas) {
      res.status(404).json({
        success: false,
        message: "Data kas masjid tidak ditemukan.",
      });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(req.user.id, existingKas.masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda tidak memiliki akses ke data kas ini.",
      });
      return;
    }

    if (
      jenis_transaksi === undefined &&
      tanggal === undefined &&
      keterangan === undefined &&
      nominal === undefined &&
      bukti_url === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "Minimal satu field harus dikirim untuk update.",
      });
      return;
    }

    const dataToUpdate: {
      jenis_transaksi?: JenisTransaksi;
      tanggal?: Date;
      keterangan?: string;
      nominal?: Prisma.Decimal;
      bukti_url?: string | null;
    } = {};

    if (jenis_transaksi !== undefined) {
      if (
        jenis_transaksi !== JenisTransaksi.MASUK &&
        jenis_transaksi !== JenisTransaksi.KELUAR
      ) {
        res.status(400).json({
          success: false,
          message: "jenis_transaksi hanya boleh MASUK atau KELUAR.",
        });
        return;
      }
      dataToUpdate.jenis_transaksi = jenis_transaksi;
    }

    if (tanggal !== undefined) {
      const parsedDate = new Date(tanggal);
      if (Number.isNaN(parsedDate.getTime())) {
        res.status(400).json({
          success: false,
          message: "Format tanggal tidak valid.",
        });
        return;
      }
      dataToUpdate.tanggal = parsedDate;
    }

    if (keterangan !== undefined) {
      dataToUpdate.keterangan = keterangan.trim();
    }

    if (nominal !== undefined) {
      const parsedNominal = parsePositiveNumber(nominal);
      if (parsedNominal === null) {
        res.status(400).json({
          success: false,
          message: "nominal harus berupa angka lebih dari 0.",
        });
        return;
      }
      dataToUpdate.nominal = new Prisma.Decimal(parsedNominal);
    }

    if (bukti_url !== undefined) {
      dataToUpdate.bukti_url = bukti_url.trim() ? bukti_url : null;
    }

    const updatedKas = await prisma.kasMasjid.update({
      where: { id: kas_id },
      data: dataToUpdate,
      select: {
        id: true,
        masjid_id: true,
        jenis_transaksi: true,
        tanggal: true,
        keterangan: true,
        nominal: true,
        bukti_url: true,
        kode_unik: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Data kas masjid berhasil diperbarui.",
      data: updatedKas,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memperbarui kas masjid.",
    });
  }
};

export const deleteKasMasjid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.kas_id;
    const kas_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!kas_id) {
      res.status(400).json({
        success: false,
        message: "kas_id wajib diisi.",
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

    const existingKas = await prisma.kasMasjid.findUnique({
      where: { id: kas_id },
      select: {
        id: true,
        masjid_id: true,
      },
    });

    if (!existingKas) {
      res.status(404).json({
        success: false,
        message: "Data kas masjid tidak ditemukan.",
      });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(req.user.id, existingKas.masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda tidak memiliki akses ke data kas ini.",
      });
      return;
    }

    const deletedKas = await prisma.kasMasjid.delete({
      where: { id: kas_id },
      select: {
        id: true,
        kode_unik: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Data kas masjid berhasil dihapus.",
      data: deletedKas,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus kas masjid.",
    });
  }
};
