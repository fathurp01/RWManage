import { randomBytes } from "crypto";
import { JenisTransaksi, Prisma, StatusIuran } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface CreateShareLinkBody {
  expires_in_days?: number;
}

interface ShareTokenParams {
  token?: string;
}

type ShareScope = "RW" | "MASJID";

const decimalToNumber = (value: Prisma.Decimal | null | undefined): number => {
  if (!value) {
    return 0;
  }

  return Number(value);
};

const buildToken = (): string => {
  return randomBytes(24).toString("hex");
};

const getExpiryDate = (expiresInDays?: number): Date | null => {
  if (!expiresInDays || !Number.isInteger(expiresInDays) || expiresInDays <= 0) {
    return null;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  return expiresAt;
};

const buildMonthSkeleton = () => {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    paid_count: 0,
    unpaid_count: 0,
    kas_masuk: 0,
    kas_keluar: 0,
    kas_saldo: 0,
    zis_uang_zakat: 0,
    zis_uang_infaq: 0,
  }));
};

const getAuthorizedRw = async (userId: string) => {
  return prisma.wilayahRW.findUnique({
    where: { user_id: userId },
    select: {
      id: true,
      nama_kompleks: true,
      no_rw: true,
    },
  });
};

const getAuthorizedMasjid = async (userId: string) => {
  const relation = await prisma.pengurusMasjid.findFirst({
    where: { user_id: userId },
    orderBy: { id: "asc" },
    select: {
      masjid: {
        select: {
          id: true,
          nama_masjid: true,
          alamat: true,
          blok_wilayah: {
            select: {
              nama_blok: true,
              no_rt: true,
              wilayah_rw: {
                select: {
                  nama_kompleks: true,
                  no_rw: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return relation?.masjid ?? null;
};

const getRwAggregatePublicPayload = async (scopeId: string) => {
  const tahun = new Date().getFullYear();
  const startDate = new Date(tahun, 0, 1, 0, 0, 0, 0);
  const endDate = new Date(tahun, 11, 31, 23, 59, 59, 999);

  const rw = await prisma.wilayahRW.findUnique({
    where: { id: scopeId },
    select: {
      id: true,
      nama_kompleks: true,
      no_rw: true,
    },
  });

  if (!rw) {
    return null;
  }

  const wargaList = await prisma.warga.findMany({
    where: {
      deleted_at: null,
      blok_wilayah: {
        wilayah_rw_id: rw.id,
      },
    },
    select: {
      id: true,
    },
  });

  const wargaIds = wargaList.map((item) => item.id);

  const iuranList = wargaIds.length
    ? await prisma.iuranWarga.findMany({
        where: {
          warga_id: { in: wargaIds },
          tahun,
        },
        select: {
          bulan: true,
          status: true,
          nominal: true,
        },
      })
    : [];

  const kasList = await prisma.kasRW.findMany({
    where: {
      wilayah_rw_id: rw.id,
      tanggal: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      tanggal: true,
      jenis_transaksi: true,
      nominal: true,
    },
  });

  const series = buildMonthSkeleton();

  let paidCount = 0;
  let unpaidCount = 0;
  let paidNominal = 0;
  let unpaidNominal = 0;

  iuranList.forEach((item) => {
    const target = series[item.bulan - 1];
    const nominal = decimalToNumber(item.nominal);

    if (item.status === StatusIuran.LUNAS) {
      target.paid_count += 1;
      paidCount += 1;
      paidNominal += nominal;
    } else {
      target.unpaid_count += 1;
      unpaidCount += 1;
      unpaidNominal += nominal;
    }
  });

  let kasMasuk = 0;
  let kasKeluar = 0;
  kasList.forEach((item) => {
    const target = series[item.tanggal.getMonth()];
    const nominal = decimalToNumber(item.nominal);

    if (item.jenis_transaksi === JenisTransaksi.MASUK) {
      target.kas_masuk += nominal;
      kasMasuk += nominal;
    } else {
      target.kas_keluar += nominal;
      kasKeluar += nominal;
    }
  });

  let runningSaldo = 0;
  series.forEach((item) => {
    runningSaldo += item.kas_masuk - item.kas_keluar;
    item.kas_saldo = runningSaldo;
  });

  return {
    scope: "RW" as ShareScope,
    entity: rw,
    year: tahun,
    summary: {
      total_warga: wargaList.length,
      paid_count: paidCount,
      unpaid_count: unpaidCount,
      paid_nominal: paidNominal,
      unpaid_nominal: unpaidNominal,
      kas_masuk: kasMasuk,
      kas_keluar: kasKeluar,
      kas_saldo: kasMasuk - kasKeluar,
    },
    series,
  };
};

const getMasjidAggregatePublicPayload = async (scopeId: string) => {
  const tahun = new Date().getFullYear();
  const startDate = new Date(tahun, 0, 1, 0, 0, 0, 0);
  const endDate = new Date(tahun, 11, 31, 23, 59, 59, 999);

  const masjid = await prisma.masjid.findUnique({
    where: { id: scopeId },
    select: {
      id: true,
      nama_masjid: true,
      alamat: true,
      blok_wilayah: {
        select: {
          nama_blok: true,
          no_rt: true,
          wilayah_rw: {
            select: {
              nama_kompleks: true,
              no_rw: true,
            },
          },
        },
      },
    },
  });

  if (!masjid) {
    return null;
  }

  const kasList = await prisma.kasMasjid.findMany({
    where: {
      masjid_id: masjid.id,
      tanggal: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      tanggal: true,
      jenis_transaksi: true,
      nominal: true,
    },
  });

  const zisList = await prisma.transaksiZis.findMany({
    where: {
      masjid_id: masjid.id,
      waktu_transaksi: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      waktu_transaksi: true,
      nominal_zakat: true,
      nominal_infaq: true,
    },
  });

  const series = buildMonthSkeleton();

  let kasMasuk = 0;
  let kasKeluar = 0;
  kasList.forEach((item) => {
    const target = series[item.tanggal.getMonth()];
    const nominal = decimalToNumber(item.nominal);

    if (item.jenis_transaksi === JenisTransaksi.MASUK) {
      target.kas_masuk += nominal;
      kasMasuk += nominal;
    } else {
      target.kas_keluar += nominal;
      kasKeluar += nominal;
    }
  });

  let zisZakat = 0;
  let zisInfaq = 0;
  zisList.forEach((item) => {
    const target = series[item.waktu_transaksi.getMonth()];
    const zakat = decimalToNumber(item.nominal_zakat);
    const infaq = decimalToNumber(item.nominal_infaq);
    target.zis_uang_zakat += zakat;
    target.zis_uang_infaq += infaq;
    zisZakat += zakat;
    zisInfaq += infaq;
  });

  let runningSaldo = 0;
  series.forEach((item) => {
    runningSaldo += item.kas_masuk - item.kas_keluar;
    item.kas_saldo = runningSaldo;
  });

  return {
    scope: "MASJID" as ShareScope,
    entity: masjid,
    year: tahun,
    summary: {
      kas_masuk: kasMasuk,
      kas_keluar: kasKeluar,
      kas_saldo: kasMasuk - kasKeluar,
      zis_zakat: zisZakat,
      zis_infaq: zisInfaq,
      total_transaksi_zis: zisList.length,
    },
    series,
  };
};

const createShareLink = async (
  scope: ShareScope,
  scopeId: string,
  expiresInDays?: number
) => {
  const token = buildToken();
  const expiresAt = getExpiryDate(expiresInDays);

  return prisma.shareLink.create({
    data: {
      token,
      scope,
      scope_id: scopeId,
      expires_at: expiresAt,
    },
    select: {
      id: true,
      token: true,
      scope: true,
      scope_id: true,
      expires_at: true,
      revoked_at: true,
      created_at: true,
    },
  });
};

const listShareLinks = async (scope: ShareScope, scopeId: string) => {
  return prisma.shareLink.findMany({
    where: {
      scope,
      scope_id: scopeId,
    },
    select: {
      id: true,
      token: true,
      scope: true,
      scope_id: true,
      expires_at: true,
      revoked_at: true,
      created_at: true,
    },
    orderBy: [{ created_at: "desc" }],
  });
};

const revokeShareLink = async (scope: ShareScope, scopeId: string, token: string) => {
  const existing = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      id: true,
      scope: true,
      scope_id: true,
      revoked_at: true,
    },
  });

  if (!existing || existing.scope !== scope || existing.scope_id !== scopeId) {
    return null;
  }

  if (existing.revoked_at) {
    return existing;
  }

  return prisma.shareLink.update({
    where: { token },
    data: {
      revoked_at: new Date(),
    },
    select: {
      id: true,
      token: true,
      scope: true,
      scope_id: true,
      expires_at: true,
      revoked_at: true,
      created_at: true,
    },
  });
};

export const createRwShareLink = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rw = await getAuthorizedRw(req.user.id);
    if (!rw) {
      res.status(403).json({ success: false, message: "Wilayah RW tidak ditemukan." });
      return;
    }

    const { expires_in_days } = req.body as CreateShareLinkBody;
    const link = await createShareLink("RW", rw.id, expires_in_days);

    res.status(201).json({
      success: true,
      message: "Share link RW berhasil dibuat.",
      data: {
        ...link,
        public_url: `/public/shared/${link.token}`,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat membuat share link RW." });
  }
};

export const listRwShareLinks = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rw = await getAuthorizedRw(req.user.id);
    if (!rw) {
      res.status(403).json({ success: false, message: "Wilayah RW tidak ditemukan." });
      return;
    }

    const items = await listShareLinks("RW", rw.id);
    res.status(200).json({
      success: true,
      message: "Daftar share link RW berhasil diambil.",
      data: {
        scope: "RW",
        scope_id: rw.id,
        items: items.map((item) => ({
          ...item,
          public_url: `/public/shared/${item.token}`,
        })),
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil share link RW." });
  }
};

export const revokeRwShareLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as ShareTokenParams;

    if (!token) {
      res.status(400).json({ success: false, message: "Token wajib diisi." });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rw = await getAuthorizedRw(req.user.id);
    if (!rw) {
      res.status(403).json({ success: false, message: "Wilayah RW tidak ditemukan." });
      return;
    }

    const revoked = await revokeShareLink("RW", rw.id, token);
    if (!revoked) {
      res.status(404).json({ success: false, message: "Share link RW tidak ditemukan." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Share link RW berhasil dinonaktifkan.",
      data: revoked,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menonaktifkan share link RW." });
  }
};

export const createMasjidShareLink = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const masjid = await getAuthorizedMasjid(req.user.id);
    if (!masjid) {
      res.status(403).json({ success: false, message: "Masjid tidak ditemukan." });
      return;
    }

    const { expires_in_days } = req.body as CreateShareLinkBody;
    const link = await createShareLink("MASJID", masjid.id, expires_in_days);

    res.status(201).json({
      success: true,
      message: "Share link Masjid berhasil dibuat.",
      data: {
        ...link,
        public_url: `/public/shared/${link.token}`,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat membuat share link Masjid." });
  }
};

export const listMasjidShareLinks = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const masjid = await getAuthorizedMasjid(req.user.id);
    if (!masjid) {
      res.status(403).json({ success: false, message: "Masjid tidak ditemukan." });
      return;
    }

    const items = await listShareLinks("MASJID", masjid.id);
    res.status(200).json({
      success: true,
      message: "Daftar share link Masjid berhasil diambil.",
      data: {
        scope: "MASJID",
        scope_id: masjid.id,
        items: items.map((item) => ({
          ...item,
          public_url: `/public/shared/${item.token}`,
        })),
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil share link Masjid." });
  }
};

export const revokeMasjidShareLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as ShareTokenParams;

    if (!token) {
      res.status(400).json({ success: false, message: "Token wajib diisi." });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const masjid = await getAuthorizedMasjid(req.user.id);
    if (!masjid) {
      res.status(403).json({ success: false, message: "Masjid tidak ditemukan." });
      return;
    }

    const revoked = await revokeShareLink("MASJID", masjid.id, token);
    if (!revoked) {
      res.status(404).json({ success: false, message: "Share link Masjid tidak ditemukan." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Share link Masjid berhasil dinonaktifkan.",
      data: revoked,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menonaktifkan share link Masjid." });
  }
};

export const getPublicSharedDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as ShareTokenParams;

    if (!token) {
      res.status(400).json({ success: false, message: "Token wajib diisi." });
      return;
    }

    const link = await prisma.shareLink.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        scope: true,
        scope_id: true,
        expires_at: true,
        revoked_at: true,
        created_at: true,
      },
    });

    if (!link) {
      res.status(404).json({ success: false, message: "Share link tidak ditemukan." });
      return;
    }

    if (link.revoked_at) {
      res.status(410).json({ success: false, message: "Share link sudah dinonaktifkan." });
      return;
    }

    if (link.expires_at && link.expires_at < new Date()) {
      res.status(410).json({ success: false, message: "Share link sudah kedaluwarsa." });
      return;
    }

    if (link.scope === "RW") {
      const payload = await getRwAggregatePublicPayload(link.scope_id);

      if (!payload) {
        res.status(404).json({ success: false, message: "Data publik RW tidak ditemukan." });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Data transparansi publik RW berhasil diambil.",
        data: {
          link: {
            scope: link.scope,
            created_at: link.created_at,
            expires_at: link.expires_at,
          },
          payload,
        },
      });
      return;
    }

    if (link.scope === "MASJID") {
      const payload = await getMasjidAggregatePublicPayload(link.scope_id);

      if (!payload) {
        res.status(404).json({ success: false, message: "Data publik Masjid tidak ditemukan." });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Data transparansi publik Masjid berhasil diambil.",
        data: {
          link: {
            scope: link.scope,
            created_at: link.created_at,
            expires_at: link.expires_at,
          },
          payload,
        },
      });
      return;
    }

    res.status(404).json({ success: false, message: "Scope share link tidak valid." });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data share link publik." });
  }
};

export const getPublicSharedMuzaqi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as ShareTokenParams;

    if (!token) {
      res.status(400).json({ success: false, message: "Token wajib diisi." });
      return;
    }

    const link = await prisma.shareLink.findUnique({
      where: { token },
      select: { scope: true, scope_id: true, expires_at: true, revoked_at: true },
    });

    if (!link) {
      res.status(404).json({ success: false, message: "Share link tidak ditemukan." });
      return;
    }

    if (link.revoked_at) {
      res.status(410).json({ success: false, message: "Share link sudah dinonaktifkan." });
      return;
    }

    if (link.expires_at && link.expires_at < new Date()) {
      res.status(410).json({ success: false, message: "Share link sudah kedaluwarsa." });
      return;
    }

    // Optional date filters: accept ?start_date=ISO&end_date=ISO; if not provided, return all available
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };

    const parseDate = (s?: string, endOfDay = false) => {
      if (!s) return undefined;
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return undefined;
      if (endOfDay) {
        d.setHours(23, 59, 59, 999);
      }
      return d;
    };

    const gte = parseDate(start_date, false);
    const lte = parseDate(end_date, true);

    const baseSelect = {
      id: true,
      kode_unik: true,
      nama_kk: true,
      alamat_muzaqi: true,
      jumlah_jiwa: true,
      jenis_bayar: true,
      nominal_zakat: true,
      nominal_infaq: true,
      total_beras_kg: true,
      waktu_transaksi: true,
    } as const;

    let transactions = [] as any[];

    if (link.scope === "MASJID") {
      const where: any = { masjid_id: link.scope_id };
      if (gte || lte) where.waktu_transaksi = {};
      if (gte) where.waktu_transaksi.gte = gte;
      if (lte) where.waktu_transaksi.lte = lte;

      transactions = await prisma.transaksiZis.findMany({
        where,
        orderBy: { waktu_transaksi: "desc" },
        select: baseSelect,
      });
    } else {
      const masjids = await prisma.masjid.findMany({
        where: { blok_wilayah: { wilayah_rw_id: link.scope_id } },
        select: { id: true },
      });
      const masjidIds = masjids.map((m) => m.id);
      if (!masjidIds.length) {
        transactions = [];
      } else {
        const where: any = { masjid_id: { in: masjidIds } };
        if (gte || lte) where.waktu_transaksi = {};
        if (gte) where.waktu_transaksi.gte = gte;
        if (lte) where.waktu_transaksi.lte = lte;

        transactions = await prisma.transaksiZis.findMany({
          where,
          orderBy: { waktu_transaksi: "desc" },
          select: baseSelect,
        });
      }
    }

    res.status(200).json({ success: true, data: transactions });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil daftar muzaqi." });
  }
};
