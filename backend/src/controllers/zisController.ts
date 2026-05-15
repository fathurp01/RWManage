import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { JenisBayar, PengaturanZis, Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";

interface CreateTransaksiZisBody {
  masjid_id?: string;
  nama_kk?: string;
  alamat_muzaqi?: string;
  jumlah_jiwa?: number | string;
  jenis_bayar?: JenisBayar;
  nominal_infaq?: number | string;
  waktu_transaksi?: string;
}

interface GetDashboardZisQuery {
  masjid_id?: string;
}

interface GetTransaksiZisQuery {
  masjid_id?: string;
  start_date?: string;
  end_date?: string;
  page?: string | number;
  limit?: string | number;
}

interface ExportZisQuery {
  masjid_id?: string;
  start_date?: string;
  end_date?: string;
  format?: "PDF" | "XLSX";
}

const createKodeUnikZisCandidate = (date: Date): string => {
  const year2 = String(date.getFullYear()).slice(-2);
  const month2 = String(date.getMonth() + 1).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `ZIS-${year2}${month2}-${suffix}`;
};

const generateKodeUnikZis = async (client: typeof prisma): Promise<string> => {
  const now = new Date();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = createKodeUnikZisCandidate(now);
    const exists = await client.transaksiZis.findUnique({
      where: { kode_unik: candidate },
      select: { id: true },
    });

    if (!exists) {
      return candidate;
    }
  }

  throw new Error("Gagal membuat kode unik ZIS.");
};

const toNonNegativeNumber = (
  value: number | string | undefined,
  fallback = 0
): number => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return NaN;
  }

  return parsed;
};

const toPositiveInteger = (value: number | string | undefined): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return NaN;
  }
  return parsed;
};

const decimalToNumber = (value: Prisma.Decimal | null): number => {
  if (!value) {
    return 0;
  }
  return Number(value);
};

const roundTo2 = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const formatCurrencyId = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const getAuthorizedMasjidId = async (
  client: typeof prisma,
  req: Request,
  requestedMasjidId?: string
): Promise<string | null> => {
  if (!req.user?.id) {
    return null;
  }

  if (requestedMasjidId) {
    const relation = await client.pengurusMasjid.findFirst({
      where: {
        user_id: req.user.id,
        masjid_id: requestedMasjidId,
      },
      select: {
        masjid_id: true,
      },
    });

    return relation?.masjid_id ?? null;
  }

  const firstRelation = await client.pengurusMasjid.findFirst({
    where: { user_id: req.user.id },
    select: { masjid_id: true },
    orderBy: { id: "asc" },
  });

  return firstRelation?.masjid_id ?? null;
};

const calculateDistribution = (
  pengaturan: Pick<
    PengaturanZis,
    "persen_fakir" | "persen_amil" | "persen_fisabilillah" | "persen_lainnya"
  >,
  totalValue: number
) => {
  const fakir = (pengaturan.persen_fakir / 100) * totalValue;
  const amil = (pengaturan.persen_amil / 100) * totalValue;
  const fisabilillah = (pengaturan.persen_fisabilillah / 100) * totalValue;
  const lainnya = (pengaturan.persen_lainnya / 100) * totalValue;

  return {
    fakir: roundTo2(fakir),
    amil: roundTo2(amil),
    fisabilillah: roundTo2(fisabilillah),
    lainnya: roundTo2(lainnya),
  };
};

const getAvailableZisBalance = async (
  client: typeof prisma,
  masjid_id: string,
  exclude_pencatatan_id?: string
) => {
  const [aggregateZis, sumDistribusi, pengaturan] = await Promise.all([
    client.transaksiZis.aggregate({
      where: { masjid_id },
      _sum: { total_beras_kg: true, nominal_zakat: true, nominal_infaq: true },
    }),
    client.pencatatanDistribusi.groupBy({
      by: ["kategori", "jenis"],
      where: { masjid_id, ...(exclude_pencatatan_id ? { id: { not: exclude_pencatatan_id } } : {}) },
      _sum: { nominal: true },
    }),
    client.pengaturanZis.findUnique({ where: { masjid_id } })
  ]);

  const totalBeras = roundTo2(decimalToNumber(aggregateZis._sum.total_beras_kg));
  const totalUangZakat = roundTo2(decimalToNumber(aggregateZis._sum.nominal_zakat));

  const used: Record<string, { uang: number; beras: number }> = {
    FAKIR: { uang: 0, beras: 0 }, AMIL: { uang: 0, beras: 0 },
    FISABILILLAH: { uang: 0, beras: 0 }, LAINNYA: { uang: 0, beras: 0 },
  };
  sumDistribusi.forEach(d => {
    const nominal = decimalToNumber(d._sum.nominal);
    if (d.jenis === "UANG") used[d.kategori].uang += nominal;
    if (d.jenis === "BERAS") used[d.kategori].beras += nominal;
  });

  if (!pengaturan) throw new Error("Pengaturan ZIS tidak ditemukan");

  const allocUang = calculateDistribution(pengaturan, totalUangZakat);
  const allocBeras = calculateDistribution(pengaturan, totalBeras);

  return {
    FAKIR: { uang: Math.max(0, allocUang.fakir - used.FAKIR.uang), beras: Math.max(0, allocBeras.fakir - used.FAKIR.beras) },
    AMIL: { uang: Math.max(0, allocUang.amil - used.AMIL.uang), beras: Math.max(0, allocBeras.amil - used.AMIL.beras) },
    FISABILILLAH: { uang: Math.max(0, allocUang.fisabilillah - used.FISABILILLAH.uang), beras: Math.max(0, allocBeras.fisabilillah - used.FISABILILLAH.beras) },
    LAINNYA: { uang: Math.max(0, allocUang.lainnya - used.LAINNYA.uang), beras: Math.max(0, allocBeras.lainnya - used.LAINNYA.beras) },
  };
};

// Helper: parse date filter
const parseDateRange = (start_date?: string, end_date?: string) => {
  const startParsed = start_date ? new Date(start_date) : null;
  const endParsed = end_date ? new Date(end_date) : null;
  if (endParsed) endParsed.setHours(23, 59, 59, 999);
  return { startParsed, endParsed };
};

export const createTransaksiZisWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      masjid_id,
      nama_kk,
      alamat_muzaqi,
      jumlah_jiwa,
      jenis_bayar,
      nominal_infaq,
      waktu_transaksi,
    } = req.body as CreateTransaksiZisBody;

    if (!masjid_id || !nama_kk || !alamat_muzaqi || !jumlah_jiwa || !jenis_bayar) {
      res.status(400).json({
        success: false,
        message:
          "masjid_id, nama_kk, alamat_muzaqi, jumlah_jiwa, dan jenis_bayar wajib diisi.",
      });
      return;
    }

    if (jenis_bayar !== JenisBayar.UANG && jenis_bayar !== JenisBayar.BERAS) {
      res.status(400).json({
        success: false,
        message: "jenis_bayar hanya boleh UANG atau BERAS.",
      });
      return;
    }

    const jumlahJiwaInt = toPositiveInteger(jumlah_jiwa);
    if (Number.isNaN(jumlahJiwaInt)) {
      res.status(400).json({
        success: false,
        message: "jumlah_jiwa harus berupa bilangan bulat lebih dari 0.",
      });
      return;
    }

    const nominalInfaq = toNonNegativeNumber(nominal_infaq);
    if (Number.isNaN(nominalInfaq)) {
      res.status(400).json({
        success: false,
        message: "nominal_infaq harus angka >= 0.",
      });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(client, req, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message:
          "Anda tidak memiliki akses ke masjid ini atau belum terdaftar sebagai pengurus masjid.",
      });
      return;
    }

    const pengaturan = await client.pengaturanZis.findUnique({
      where: { masjid_id: authorizedMasjidId },
    });

    if (!pengaturan) {
      res.status(404).json({
        success: false,
        message: "Pengaturan ZIS untuk masjid ini belum tersedia.",
      });
      return;
    }

    // Perhitungan Zakat — gunakan nilai manual jika ada, otomatis jika tidak
    const bodyNominalZakat = (req.body as any).nominal_zakat;
    const bodyTotalBeras = (req.body as any).total_beras_kg;

    let calculatedZakatUang = 0;
    let calculatedTotalBeras = 0;

    if (jenis_bayar === JenisBayar.UANG) {
      if (bodyNominalZakat !== undefined && bodyNominalZakat !== "" && !Number.isNaN(Number(bodyNominalZakat)) && Number(bodyNominalZakat) > 0) {
        calculatedZakatUang = Math.round(Number(bodyNominalZakat));
      } else {
        calculatedZakatUang = Math.round(jumlahJiwaInt * 2.5 * Number(pengaturan.harga_beras_per_kg));
      }
    } else if (jenis_bayar === JenisBayar.BERAS) {
      if (bodyTotalBeras !== undefined && bodyTotalBeras !== "" && !Number.isNaN(Number(bodyTotalBeras)) && Number(bodyTotalBeras) > 0) {
        calculatedTotalBeras = Number(bodyTotalBeras);
      } else {
        calculatedTotalBeras = jumlahJiwaInt * 2.5;
      }
    }

    const now = waktu_transaksi ? new Date(waktu_transaksi) : new Date();

    const kodeUnik = await generateKodeUnikZis(client);

    const transaksi = await client.transaksiZis.create({
      data: {
        masjid_id: authorizedMasjidId,
        kode_unik: kodeUnik,
        nama_kk,
        alamat_muzaqi,
        jumlah_jiwa: jumlahJiwaInt,
        jenis_bayar,
        nominal_zakat: new Prisma.Decimal(calculatedZakatUang),
        nominal_infaq: new Prisma.Decimal(nominalInfaq),
        total_beras_kg: new Prisma.Decimal(calculatedTotalBeras),
        waktu_transaksi: now,
      },
      select: {
        id: true,
        masjid_id: true,
        kode_unik: true,
        nama_kk: true,
        alamat_muzaqi: true,
        jumlah_jiwa: true,
        jenis_bayar: true,
        nominal_zakat: true,
        nominal_infaq: true,
        total_beras_kg: true,
        waktu_transaksi: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Transaksi ZIS berhasil ditambahkan.",
      data: transaksi,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat transaksi ZIS.",
    });
  }
};

export const createTransaksiZis = async (
  req: Request,
  res: Response
): Promise<void> => {
  return createTransaksiZisWithClient(prisma, req, res);
};

export const getDashboardZisWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { masjid_id } = req.query as GetDashboardZisQuery;

    const authorizedMasjidId = await getAuthorizedMasjidId(client, req, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message:
          "Anda tidak memiliki akses ke masjid ini atau belum terdaftar sebagai pengurus masjid.",
      });
      return;
    }

    const pengaturan = await client.pengaturanZis.findUnique({
      where: { masjid_id: authorizedMasjidId },
      select: {
        id: true,
        masjid_id: true,
        persen_fakir: true,
        persen_amil: true,
        persen_fisabilillah: true,
        persen_lainnya: true,
        harga_beras_per_kg: true,
        is_harga_auto_api: true,
      },
    });

    if (!pengaturan) {
      res.status(404).json({
        success: false,
        message: "Pengaturan ZIS untuk masjid ini belum tersedia.",
      });
      return;
    }

    // Aggregate sum + total KK & jiwa
    const [aggregate, countResult] = await Promise.all([
      client.transaksiZis.aggregate({
        where: { masjid_id: authorizedMasjidId },
        _sum: {
          total_beras_kg: true,
          nominal_zakat: true,
          nominal_infaq: true,
          jumlah_jiwa: true,
        },
        _count: { id: true },
      }),
      // total KK = distinct nama_kk? We'll just use count of rows as total KK
      Promise.resolve(null),
    ]);

    const totalBeras = roundTo2(decimalToNumber(aggregate._sum.total_beras_kg));
    const totalUangZakat = roundTo2(decimalToNumber(aggregate._sum.nominal_zakat));
    const totalInfaq = roundTo2(decimalToNumber(aggregate._sum.nominal_infaq));
    const totalKk = aggregate._count.id;
    const totalJiwa = aggregate._sum.jumlah_jiwa ?? 0;

    const distribusiUang = calculateDistribution(pengaturan, totalUangZakat);
    const distribusiBerasKg = calculateDistribution(pengaturan, totalBeras);

    // Deduct distributed amounts
    const sumDistribusi = await client.pencatatanDistribusi.groupBy({
      by: ["kategori", "jenis"],
      where: { masjid_id: authorizedMasjidId },
      _sum: { nominal: true }
    });

    const used: Record<string, { uang: number; beras: number }> = {
      FAKIR: { uang: 0, beras: 0 }, AMIL: { uang: 0, beras: 0 },
      FISABILILLAH: { uang: 0, beras: 0 }, LAINNYA: { uang: 0, beras: 0 },
    };
    sumDistribusi.forEach(d => {
      const nominal = decimalToNumber(d._sum.nominal);
      if (d.jenis === "UANG") used[d.kategori].uang += nominal;
      if (d.jenis === "BERAS") used[d.kategori].beras += nominal;
    });

    distribusiUang.fakir = Math.max(0, roundTo2(distribusiUang.fakir - used.FAKIR.uang));
    distribusiUang.amil = Math.max(0, roundTo2(distribusiUang.amil - used.AMIL.uang));
    distribusiUang.fisabilillah = Math.max(0, roundTo2(distribusiUang.fisabilillah - used.FISABILILLAH.uang));
    distribusiUang.lainnya = Math.max(0, roundTo2(distribusiUang.lainnya - used.LAINNYA.uang));

    distribusiBerasKg.fakir = Math.max(0, roundTo2(distribusiBerasKg.fakir - used.FAKIR.beras));
    distribusiBerasKg.amil = Math.max(0, roundTo2(distribusiBerasKg.amil - used.AMIL.beras));
    distribusiBerasKg.fisabilillah = Math.max(0, roundTo2(distribusiBerasKg.fisabilillah - used.FISABILILLAH.beras));
    distribusiBerasKg.lainnya = Math.max(0, roundTo2(distribusiBerasKg.lainnya - used.LAINNYA.beras));

    const totalDanaDistribusi = totalUangZakat + totalInfaq;

    res.status(200).json({
      success: true,
      message: "Dashboard ZIS berhasil diambil.",
      data: {
        masjid_id: authorizedMasjidId,
        pengaturan_zis: pengaturan,
        total_beras: totalBeras,
        total_uang_zakat: totalUangZakat,
        total_infaq: totalInfaq,
        total_kk: totalKk,
        total_jiwa: totalJiwa,
        total_dana_distribusi: totalDanaDistribusi,
        distribusi_uang_zakat: {
          persen: {
            fakir: pengaturan.persen_fakir,
            amil: pengaturan.persen_amil,
            fisabilillah: pengaturan.persen_fisabilillah,
            lainnya: pengaturan.persen_lainnya,
          },
          nominal: distribusiUang,
        },
        distribusi_beras_kg: {
          persen: {
            fakir: pengaturan.persen_fakir,
            amil: pengaturan.persen_amil,
            fisabilillah: pengaturan.persen_fisabilillah,
            lainnya: pengaturan.persen_lainnya,
          },
          nominal_kg: distribusiBerasKg,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil dashboard ZIS.",
    });
  }
};

export const getDashboardZis = async (
  req: Request,
  res: Response
): Promise<void> => {
  return getDashboardZisWithClient(prisma, req, res);
};

// ─── Full list with date filter ───────────────────────────────────────────────

export const getTransaksiZisList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { masjid_id, start_date, end_date, page, limit } = req.query as GetTransaksiZisQuery;

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message:
          "Anda tidak memiliki akses ke masjid ini atau belum terdaftar sebagai pengurus masjid.",
      });
      return;
    }

    const { startParsed, endParsed } = parseDateRange(start_date, end_date);

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const skip = (pageNum - 1) * limitNum;

    const whereClause: Prisma.TransaksiZisWhereInput = {
      masjid_id: authorizedMasjidId,
      ...(startParsed || endParsed
        ? {
            waktu_transaksi: {
              ...(startParsed ? { gte: startParsed } : {}),
              ...(endParsed ? { lte: endParsed } : {}),
            },
          }
        : {}),
    };

    const [total_count, transaksi] = await Promise.all([
      prisma.transaksiZis.count({ where: whereClause }),
      prisma.transaksiZis.findMany({
        where: whereClause,
        orderBy: { waktu_transaksi: "desc" },
        skip,
        take: limitNum,
        select: {
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
        },
      }),
    ]);

    const total_pages = Math.ceil(total_count / limitNum);

    res.status(200).json({
      success: true,
      message: "Daftar transaksi ZIS berhasil diambil.",
      data: transaksi,
      meta: {
        total_count,
        total_pages,
        current_page: pageNum,
        limit: limitNum,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil transaksi ZIS.",
    });
  }
};

// ─── Delete transaksi ZIS ─────────────────────────────────────────────────────

export const deleteTransaksiZis = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { transaksi_id } = req.params as { transaksi_id?: string };
    if (!transaksi_id) {
      res.status(400).json({ success: false, message: "transaksi_id wajib diisi." });
      return;
    }

    const existing = await prisma.transaksiZis.findUnique({
      where: { id: transaksi_id },
      select: { id: true, masjid_id: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: "Transaksi tidak ditemukan." });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, existing.masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }



    // Check if deleting this transaction will make ZIS distribution balance negative
    const balances = await getAvailableZisBalance(prisma, authorizedMasjidId);
    const settings = await prisma.pengaturanZis.findUnique({ where: { masjid_id: authorizedMasjidId } });
    
    if (settings) {
      const trans = await prisma.transaksiZis.findUnique({ where: { id: transaksi_id } });
      if (trans) {
        const categories = ["FAKIR", "AMIL", "FISABILILLAH", "LAINNYA"];
        const zakatNominal = Number(trans.nominal_zakat || 0);
        const berasNominal = Number(trans.total_beras_kg || 0);
        
        for (const cat of categories) {
          const catKey = cat as "FAKIR" | "AMIL" | "FISABILILLAH" | "LAINNYA";
          const percent = Number(settings[`persen_${cat.toLowerCase()}` as keyof typeof settings] || 0);
          
          const reductionUang = (percent / 100) * zakatNominal;
          const reductionBeras = (percent / 100) * berasNominal;
          
          // Re-calculate used amount without Math.max(0) to see the true debt
          const sumDist = await prisma.pencatatanDistribusi.aggregate({
            where: { masjid_id: authorizedMasjidId, kategori: cat as any, jenis: "UANG" },
            _sum: { nominal: true }
          });
          const sumBeras = await prisma.pencatatanDistribusi.aggregate({
            where: { masjid_id: authorizedMasjidId, kategori: cat as any, jenis: "BERAS" },
            _sum: { nominal: true }
          });
          
          const totalUang = await prisma.transaksiZis.aggregate({
            where: { masjid_id: authorizedMasjidId, id: { not: transaksi_id } },
            _sum: { nominal_zakat: true }
          });
          const totalBeras = await prisma.transaksiZis.aggregate({
            where: { masjid_id: authorizedMasjidId, id: { not: transaksi_id } },
            _sum: { total_beras_kg: true }
          });
          
          const newAllocUang = (percent / 100) * Number(totalUang._sum.nominal_zakat || 0);
          const newAllocBeras = (percent / 100) * Number(totalBeras._sum.total_beras_kg || 0);
          
          if (newAllocUang < Number(sumDist._sum.nominal || 0)) {
            res.status(400).json({ success: false, message: `Tidak bisa menghapus. Dana zakat kategori ${cat} sudah terdistribusi melebihi sisa alokasi baru.` });
            return;
          }
          if (newAllocBeras < Number(sumBeras._sum.nominal || 0)) {
            res.status(400).json({ success: false, message: `Tidak bisa menghapus. Beras kategori ${cat} sudah terdistribusi melebihi sisa alokasi baru.` });
            return;
          }
        }
      }
    }

    await prisma.transaksiZis.delete({ where: { id: transaksi_id } });
    res.status(200).json({ success: true, message: "Transaksi ZIS berhasil dihapus." });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus transaksi." });
  }
};

// ─── Update transaksi ZIS ─────────────────────────────────────────────────────

export const updateTransaksiZis = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { transaksi_id } = req.params as { transaksi_id?: string };
    if (!transaksi_id) {
      res.status(400).json({ success: false, message: "transaksi_id wajib diisi." });
      return;
    }

    const existing = await prisma.transaksiZis.findUnique({
      where: { id: transaksi_id },
      select: { id: true, masjid_id: true, nominal_infaq: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: "Transaksi tidak ditemukan." });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, existing.masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const {
      nama_kk,
      alamat_muzaqi,
      jumlah_jiwa,
      jenis_bayar,
      nominal_infaq,
      waktu_transaksi,
    } = req.body as CreateTransaksiZisBody;

    const jumlahJiwaInt = jumlah_jiwa !== undefined ? toPositiveInteger(jumlah_jiwa) : undefined;
    if (jumlahJiwaInt !== undefined && Number.isNaN(jumlahJiwaInt)) {
      res.status(400).json({ success: false, message: "jumlah_jiwa harus bilangan bulat > 0." });
      return;
    }

    const pengaturan = await prisma.pengaturanZis.findUnique({
      where: { masjid_id: authorizedMasjidId },
    });

    if (!pengaturan) {
      res.status(404).json({ success: false, message: "Pengaturan ZIS untuk masjid ini belum tersedia." });
      return;
    }

    // Determine values to update. If missing, fetch existing to calculate correctly.
    let finalJenisBayar = jenis_bayar;
    let finalJumlahJiwa = jumlahJiwaInt;

    if (!finalJenisBayar || !finalJumlahJiwa) {
      const trx = await prisma.transaksiZis.findUnique({ where: { id: transaksi_id } });
      if (!trx) return;
      if (!finalJenisBayar) finalJenisBayar = trx.jenis_bayar;
      if (!finalJumlahJiwa) finalJumlahJiwa = trx.jumlah_jiwa;
    }

    let calculatedZakatUang = 0;
    let calculatedTotalBeras = 0;

    const bodyNominalZakat = (req.body as any).nominal_zakat;
    const bodyTotalBeras = (req.body as any).total_beras_kg;

    if (finalJenisBayar === JenisBayar.UANG) {
      if (bodyNominalZakat !== undefined && bodyNominalZakat !== "" && !Number.isNaN(Number(bodyNominalZakat)) && Number(bodyNominalZakat) > 0) {
        calculatedZakatUang = Math.round(Number(bodyNominalZakat));
      } else {
        calculatedZakatUang = Math.round((finalJumlahJiwa ?? 0) * 2.5 * Number(pengaturan.harga_beras_per_kg));
      }
    } else if (finalJenisBayar === JenisBayar.BERAS) {
      if (bodyTotalBeras !== undefined && bodyTotalBeras !== "" && !Number.isNaN(Number(bodyTotalBeras)) && Number(bodyTotalBeras) > 0) {
        calculatedTotalBeras = Number(bodyTotalBeras);
      } else {
        calculatedTotalBeras = (finalJumlahJiwa ?? 0) * 2.5; 
      }
    }

    // Check if update will make ZIS distribution balance negative
    const settings = await prisma.pengaturanZis.findUnique({ where: { masjid_id: authorizedMasjidId } });
    if (settings) {
      const categories = ["FAKIR", "AMIL", "FISABILILLAH", "LAINNYA"];
      for (const cat of categories) {
        const percent = Number(settings[`persen_${cat.toLowerCase()}` as keyof typeof settings] || 0);
        
        const sumDist = await prisma.pencatatanDistribusi.aggregate({
          where: { masjid_id: authorizedMasjidId, kategori: cat as any, jenis: "UANG" },
          _sum: { nominal: true }
        });
        const sumBeras = await prisma.pencatatanDistribusi.aggregate({
          where: { masjid_id: authorizedMasjidId, kategori: cat as any, jenis: "BERAS" },
          _sum: { nominal: true }
        });
        
        // Projected total after update
        const allTransactions = await prisma.transaksiZis.findMany({
          where: { masjid_id: authorizedMasjidId },
          select: { id: true, nominal_zakat: true, total_beras_kg: true }
        });
        
        let newTotalUang = 0;
        let newTotalBeras = 0;
        
        for (const t of allTransactions) {
          if (t.id === transaksi_id) {
            newTotalUang += calculatedZakatUang;
            newTotalBeras += calculatedTotalBeras;
          } else {
            newTotalUang += Number(t.nominal_zakat || 0);
            newTotalBeras += Number(t.total_beras_kg || 0);
          }
        }
        
        const newAllocUang = (percent / 100) * newTotalUang;
        const newAllocBeras = (percent / 100) * newTotalBeras;
        
        if (newAllocUang < Number(sumDist._sum.nominal || 0)) {
          res.status(400).json({ success: false, message: `Tidak bisa mengubah. Dana zakat kategori ${cat} sudah terdistribusi melebihi alokasi baru.` });
          return;
        }
        if (newAllocBeras < Number(sumBeras._sum.nominal || 0)) {
          res.status(400).json({ success: false, message: `Tidak bisa mengubah. Beras kategori ${cat} sudah terdistribusi melebihi alokasi baru.` });
          return;
        }
      }
    }

    const updated = await prisma.transaksiZis.update({
      where: { id: transaksi_id },
      data: {
        ...(nama_kk !== undefined ? { nama_kk } : {}),
        ...(alamat_muzaqi !== undefined ? { alamat_muzaqi } : {}),
        ...(jumlahJiwaInt !== undefined ? { jumlah_jiwa: jumlahJiwaInt } : {}),
        ...(jenis_bayar !== undefined ? { jenis_bayar } : {}),
        nominal_zakat: new Prisma.Decimal(calculatedZakatUang),
        nominal_infaq: new Prisma.Decimal(nominal_infaq !== undefined ? Number(nominal_infaq) : existing.nominal_infaq || 0),
        total_beras_kg: new Prisma.Decimal(calculatedTotalBeras),
        ...(waktu_transaksi !== undefined ? { waktu_transaksi: new Date(waktu_transaksi) } : {}),
      },
      select: {
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
      },
    });

    res.status(200).json({ success: true, message: "Transaksi ZIS berhasil diperbarui.", data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat memperbarui transaksi." });
  }
};

// ─── Export Rekap Muzaqi (daftar donatur) ─────────────────────────────────────

export const exportRekapMuzaqi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { masjid_id, start_date, end_date, format } = req.query as ExportZisQuery;

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const masjid = await prisma.masjid.findUnique({
      where: { id: authorizedMasjidId },
      select: { nama_masjid: true, alamat: true },
    });

    const { startParsed, endParsed } = parseDateRange(start_date, end_date);

    const transaksi = await prisma.transaksiZis.findMany({
      where: {
        masjid_id: authorizedMasjidId,
        ...(startParsed || endParsed
          ? {
              waktu_transaksi: {
                ...(startParsed ? { gte: startParsed } : {}),
                ...(endParsed ? { lte: endParsed } : {}),
              },
            }
          : {}),
      },
      orderBy: { waktu_transaksi: "asc" },
      select: {
        kode_unik: true,
        nama_kk: true,
        alamat_muzaqi: true,
        jumlah_jiwa: true,
        jenis_bayar: true,
        nominal_zakat: true,
        nominal_infaq: true,
        total_beras_kg: true,
        waktu_transaksi: true,
      },
    });

    const fmt = String(format ?? "XLSX").toUpperCase();
    const isAll = !start_date || !end_date;
    const periodeDisplay = isAll ? "Semua Periode" : `${start_date} s.d ${end_date}`;
    const filename = `rekap-muzaqi-${isAll ? "semua" : `${start_date}_sd_${end_date}`}`;

    if (fmt === "PDF") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}.pdf"`);
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      doc.pipe(res);

      let totalJiwa = 0;
      let totalUangZakat = 0;
      let totalInfaq = 0;
      let totalBerasKg = 0;

      transaksi.forEach((t) => {
        totalJiwa += t.jumlah_jiwa ?? 0;
        totalUangZakat += Number(t.nominal_zakat) || 0;
        totalInfaq += Number(t.nominal_infaq) || 0;
        totalBerasKg += Number(t.total_beras_kg) || 0;
      });

      // Top browser-like print header
      const now = new Date();
      const printDateStr = now.toLocaleDateString("en-US", { year: "2-digit", month: "numeric", day: "numeric" }) + ", " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      doc.fontSize(8).font("Helvetica").fillColor("black");
      doc.text(printDateStr, 50, 20, { align: "left" });
      doc.text("Rekap Muzaqi", 50, 20, { width: 500, align: "center" });

      doc.y = 50; 

      doc.fontSize(18).font("Helvetica-Bold").fillColor("#1e293b").text("Rekap Muzaqi", 50, 50, { align: "left" });
      doc.moveDown(0.2);
      doc.fontSize(12).font("Helvetica").fillColor("#64748b").text(`Periode: ${periodeDisplay}`, { align: "left" });
      doc.moveDown(1.5);

      // Summary Stats
      doc.fontSize(11).font("Helvetica").fillColor("#334155");
      const summaryY = doc.y;
      doc.text(`Total Transaksi: `, 50, summaryY, { continued: true }).font("Helvetica-Bold").text(`${transaksi.length}`);
      doc.font("Helvetica").text(`Total Jiwa: `, 300, summaryY, { continued: true }).font("Helvetica-Bold").text(`${totalJiwa}`);
      
      const summaryY2 = summaryY + 20;
      doc.font("Helvetica").text(`Total Beras: `, 50, summaryY2, { continued: true }).font("Helvetica-Bold").text(`${totalBerasKg.toFixed(2)} kg`);
      doc.font("Helvetica").text(`Total Uang Zakat: `, 300, summaryY2, { continued: true }).font("Helvetica-Bold").text(`${formatCurrencyId(totalUangZakat)}`);
      
      const summaryY3 = summaryY2 + 20;
      doc.font("Helvetica").text(`Total Infaq: `, 50, summaryY3, { continued: true }).font("Helvetica-Bold").text(`${formatCurrencyId(totalInfaq)}`);
      
      doc.y = summaryY3 + 30;

      // Table Header Setup
      const headers = ["No", "Nama KK", "Alamat Muzaqi", "Jiwa", "Jenis", "Nominal Zakat", "Infaq"];
      const colWidths = [25, 110, 110, 40, 45, 85, 85];
      const startX = 50;
      let currentY = doc.y;

      const drawRow = (rowData: string[], isHeader = false) => {
        doc.font(isHeader ? "Helvetica-Bold" : "Helvetica")
           .fillColor(isHeader ? "#1e293b" : "#475569")
           .fontSize(9);
        
        const rowHeight = 22; 

        if (currentY + rowHeight > doc.page.height - 50) {
          doc.addPage();
          currentY = 50;
        }

        let currentX = startX;
        const rowY = currentY; // Freeze Y coordinate for this entire row

        rowData.forEach((text, i) => {
          doc.text(text, currentX + 4, rowY + 6, { width: colWidths[i] - 8, align: "left" });
          doc.rect(currentX, rowY, colWidths[i], rowHeight).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
          currentX += colWidths[i];
        });
        currentY += rowHeight;
      };

      // Draw Headers
      drawRow(headers, true);

      // Draw Data Rows
      transaksi.forEach((t, idx) => {
        const jenis = t.jenis_bayar === "UANG" ? "Uang" : "Beras";
        let nominalZakat = formatCurrencyId(Number(t.nominal_zakat) || 0);
        if (t.jenis_bayar === "BERAS") {
          nominalZakat = `${Number(t.total_beras_kg).toFixed(2)} kg`; // using comma instead of formatCurrency if needed
        }
        drawRow([
          String(idx + 1),
          t.nama_kk || "-",
          t.alamat_muzaqi || "-",
          String(t.jumlah_jiwa || 0),
          jenis,
          nominalZakat,
          formatCurrencyId(Number(t.nominal_infaq) || 0),
        ], false);
      });

      doc.end();
      return;
    }

    // Default: XLSX
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "RWManage";
    const sheet = workbook.addWorksheet("Rekap Muzaqi");
    sheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Kode Unik", key: "kode_unik", width: 28 },
      { header: "Nama KK", key: "nama_kk", width: 24 },
      { header: "Alamat Muzaqi", key: "alamat_muzaqi", width: 22 },
      { header: "Jiwa", key: "jumlah_jiwa", width: 8 },
      { header: "Jenis", key: "jenis_bayar", width: 8 },
      { header: "Nominal Zakat", key: "nominal_zakat", width: 18 },
      { header: "Infaq", key: "nominal_infaq", width: 18 },
      { header: "Beras (kg)", key: "total_beras_kg", width: 12 },
      { header: "Waktu", key: "waktu_transaksi", width: 22 },
    ];
    sheet.addRows(
      transaksi.map((item, idx) => ({
        no: idx + 1,
        kode_unik: item.kode_unik,
        nama_kk: item.nama_kk,
        alamat_muzaqi: item.alamat_muzaqi,
        jumlah_jiwa: item.jumlah_jiwa,
        jenis_bayar: item.jenis_bayar,
        nominal_zakat: Number(item.nominal_zakat),
        nominal_infaq: Number(item.nominal_infaq),
        total_beras_kg: Number(item.total_beras_kg),
        waktu_transaksi: new Date(item.waktu_transaksi).toLocaleString("id-ID"),
      }))
    );
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengekspor rekap muzaqi." });
  }
};

// ─── Export Rekap Distribusi ──────────────────────────────────────────────────

export const exportRekapDistribusi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { masjid_id, start_date, end_date, format } = req.query as ExportZisQuery;

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const [masjid, pengaturan] = await Promise.all([
      prisma.masjid.findUnique({
        where: { id: authorizedMasjidId },
        select: { nama_masjid: true },
      }),
      prisma.pengaturanZis.findUnique({
        where: { masjid_id: authorizedMasjidId },
        select: {
          persen_fakir: true,
          persen_amil: true,
          persen_fisabilillah: true,
          persen_lainnya: true,
        },
      }),
    ]);

    if (!pengaturan) {
      res.status(404).json({ success: false, message: "Pengaturan ZIS belum tersedia." });
      return;
    }

    const { startParsed, endParsed } = parseDateRange(start_date, end_date);

    const aggregate = await prisma.transaksiZis.aggregate({
      where: {
        masjid_id: authorizedMasjidId,
        ...(startParsed || endParsed
          ? {
              waktu_transaksi: {
                ...(startParsed ? { gte: startParsed } : {}),
                ...(endParsed ? { lte: endParsed } : {}),
              },
            }
          : {}),
      },
      _sum: {
        nominal_zakat: true,
        nominal_infaq: true,
        total_beras_kg: true,
        jumlah_jiwa: true,
      },
      _count: { id: true },
    });

    const totalZakat = roundTo2(decimalToNumber(aggregate._sum.nominal_zakat));
    const totalInfaq = roundTo2(decimalToNumber(aggregate._sum.nominal_infaq));
    const totalBeras = roundTo2(decimalToNumber(aggregate._sum.total_beras_kg));
    const totalDana = totalZakat + totalInfaq;

    const distribusiDana = calculateDistribution(pengaturan, totalDana);
    const distribusiBeras = calculateDistribution(pengaturan, totalBeras);

    const periode = start_date && end_date ? `${start_date} s.d. ${end_date}` : "Semua Periode";
    const filename = `rekap-distribusi-${start_date && end_date ? `${start_date}_sd_${end_date}` : "semua"}`;

    const rows: Array<[string, string]> = [
      ["Masjid", masjid?.nama_masjid ?? "-"],
      ["Periode", periode],
      ["Dicetak", new Date().toLocaleString("id-ID")],
      ["", ""],
      ["── PENERIMAAN ──", ""],
      ["Total Transaksi (KK)", String(aggregate._count.id)],
      ["Total Jiwa", String(aggregate._sum.jumlah_jiwa ?? 0)],
      ["Total Uang Zakat", formatCurrencyId(totalZakat)],
      ["Total Infaq", formatCurrencyId(totalInfaq)],
      ["Total Dana Distribusi", formatCurrencyId(totalDana)],
      ["Total Beras", `${totalBeras.toFixed(2)} kg`],
      ["", ""],
      ["── DISTRIBUSI DANA ──", ""],
      [`Fakir Miskin (${pengaturan.persen_fakir}%)`, formatCurrencyId(distribusiDana.fakir)],
      [`Amil (${pengaturan.persen_amil}%)`, formatCurrencyId(distribusiDana.amil)],
      [`Fisabilillah (${pengaturan.persen_fisabilillah}%)`, formatCurrencyId(distribusiDana.fisabilillah)],
      [`Lainnya (${pengaturan.persen_lainnya}%)`, formatCurrencyId(distribusiDana.lainnya)],
      ["", ""],
      ["── DISTRIBUSI BERAS ──", ""],
      [`Fakir Miskin (${pengaturan.persen_fakir}%)`, `${distribusiBeras.fakir.toFixed(2)} kg`],
      [`Amil (${pengaturan.persen_amil}%)`, `${distribusiBeras.amil.toFixed(2)} kg`],
      [`Fisabilillah (${pengaturan.persen_fisabilillah}%)`, `${distribusiBeras.fisabilillah.toFixed(2)} kg`],
      [`Lainnya (${pengaturan.persen_lainnya}%)`, `${distribusiBeras.lainnya.toFixed(2)} kg`],
    ];

    const fmt = String(format ?? "XLSX").toUpperCase();

    if (fmt === "PDF") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}.pdf"`);
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      doc.pipe(res);

      // Top browser-like print header
      const now = new Date();
      const printDateStr = now.toLocaleDateString("en-US", { year: "2-digit", month: "numeric", day: "numeric" }) + ", " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      doc.fontSize(8).font("Helvetica").fillColor("black");
      doc.text(printDateStr, 50, 20, { align: "left" });
      doc.text("Rekap Distribusi", 50, 20, { width: 500, align: "center" });

      doc.y = 50; // Reset Y for main content

      doc.fontSize(18).font("Helvetica-Bold").fillColor("#1e293b").text("Rekap Distribusi Zakat", 50, 50, { align: "left" });
      doc.moveDown(0.2);
      doc.fontSize(12).font("Helvetica").fillColor("#64748b").text(`Periode: ${periode}`, { align: "left" });
      doc.moveDown(1.5);

      const drawTable = (
        title: string,
        headers: string[],
        tableRows: string[][],
        colWidths: number[],
        titleAlign: "left" | "right" = "left"
      ) => {
        doc.fontSize(12).font("Helvetica-Bold").fillColor("#334155").text(title, 50, doc.y, { width: 500, align: titleAlign });
        doc.moveDown(0.5);

        const startX = 50;
        let y = doc.y;

        const drawRow = (rowData: string[], isHeader = false) => {
          doc.font(isHeader ? "Helvetica-Bold" : "Helvetica")
             .fillColor(isHeader ? "#1e293b" : "#334155")
             .fontSize(10);
          
          const rowHeight = 24; 

          if (y + rowHeight > doc.page.height - 50) {
            doc.addPage();
            y = 50;
          }

          let currentX = startX;
          rowData.forEach((text, i) => {
            doc.text(text, currentX + 8, y + 7, { width: colWidths[i] - 16, align: "left" });
            doc.rect(currentX, y, colWidths[i], rowHeight).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
            currentX += colWidths[i];
          });
          y += rowHeight;
        };

        if (headers.length > 0) {
          drawRow(headers, true);
        }
        tableRows.forEach(row => drawRow(row, false));
        doc.y = y + 20; 
      };

      // Table 1: Ringkasan Sumber Dana
      drawTable(
        "Ringkasan Sumber Dana",
        [],
        [
          ["Total Zakat Uang", formatCurrencyId(totalZakat)],
          ["Total Zakat Beras", `${totalBeras.toFixed(2)} kg`],
          ["Total Infaq (Terpisah Kas Masjid)", formatCurrencyId(totalInfaq)]
        ],
        [300, 200],
        "left"
      );

      // Table 2: Distribusi Zakat Uang
      drawTable(
        "Distribusi Zakat Uang",
        ["Asnaf", "Persentase", "Nominal"],
        [
          ["Fakir Miskin", `${pengaturan.persen_fakir}%`, formatCurrencyId(distribusiDana.fakir)],
          ["Amil", `${pengaturan.persen_amil}%`, formatCurrencyId(distribusiDana.amil)],
          ["Fisabilillah", `${pengaturan.persen_fisabilillah}%`, formatCurrencyId(distribusiDana.fisabilillah)],
          ["Lainnya", `${pengaturan.persen_lainnya}%`, formatCurrencyId(distribusiDana.lainnya)]
        ],
        [200, 100, 200],
        "left"
      );

      // Table 3: Distribusi Zakat Beras
      drawTable(
        "Distribusi Zakat Beras",
        ["Asnaf", "Persentase", "Nominal"],
        [
          ["Fakir Miskin", `${pengaturan.persen_fakir}%`, `${distribusiBeras.fakir.toFixed(2)} kg`],
          ["Amil", `${pengaturan.persen_amil}%`, `${distribusiBeras.amil.toFixed(2)} kg`],
          ["Fisabilillah", `${pengaturan.persen_fisabilillah}%`, `${distribusiBeras.fisabilillah.toFixed(2)} kg`],
          ["Lainnya", `${pengaturan.persen_lainnya}%`, `${distribusiBeras.lainnya.toFixed(2)} kg`]
        ],
        [200, 100, 200],
        "left"
      );

      doc.end();
      return;
    }

    // XLSX
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "RWManage";
    const sheet = workbook.addWorksheet("Distribusi");
    sheet.getColumn(1).width = 34;
    sheet.getColumn(2).width = 24;
    rows.forEach(([label, value]) => {
      const row = sheet.addRow([label, value]);
      if (label.startsWith("──")) row.font = { bold: true };
    });
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengekspor rekap distribusi." });
  }
};

// ─── Recent transaksi (kept for backward compat) ──────────────────────────────

export const getRecentTransaksiZis = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { masjid_id } = req.query as { masjid_id?: string };

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke masjid ini atau belum terdaftar sebagai pengurus masjid.",
      });
      return;
    }

    const transaksi = await prisma.transaksiZis.findMany({
      where: { masjid_id: authorizedMasjidId },
      orderBy: { waktu_transaksi: "desc" },
      take: 10,
      select: {
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
      },
    });

    res.status(200).json({
      success: true,
      message: "Riwayat transaksi ZIS berhasil diambil.",
      data: transaksi,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil riwayat transaksi ZIS.",
    });
  }
};

// ─── Export Kwitansi ──────────────────────────────────────────────────────────

export const exportKwitansiZis = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { transaksi_id } = req.params as { transaksi_id: string };

    const transaksi = await prisma.transaksiZis.findUnique({
      where: { id: transaksi_id },
      include: { masjid: true },
    });

    if (!transaksi) {
      res.status(404).json({ success: false, message: "Transaksi tidak ditemukan." });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, transaksi.masjid_id);
    if (!authorizedMasjidId || authorizedMasjidId !== transaksi.masjid_id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const userId = (req as any).user?.id as string | undefined;
    let petugasNama = "Petugas Zakat";
    if (userId) {
      const petugas = await prisma.user.findUnique({
        where: { id: userId },
        select: { nama: true },
      });
      petugasNama = petugas?.nama || petugasNama;
    }

    const tglParsed = new Date(transaksi.waktu_transaksi);
    const dateFormatted = `${tglParsed.getDate()}/${tglParsed.getMonth() + 1}/${tglParsed.getFullYear()}, ${tglParsed.getHours().toString().padStart(2, '0')}.${tglParsed.getMinutes().toString().padStart(2, '0')}.${tglParsed.getSeconds().toString().padStart(2, '0')}`;

    const filename = `Kwitansi-${transaksi.kode_unik}`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    // Draw frame
    doc.roundedRect(40, 40, doc.page.width - 80, 450, 10).strokeColor("#15803d").lineWidth(1.5).stroke();

    // Top left text
    doc.fillColor("#94a3b8").fontSize(22).font("Helvetica-Bold").text("ZIS", 60, 65);

    // Top right headers
    doc.fillColor("#15803d").fontSize(18).text("Kwitansi Zakat & Infaq", 60, 60, { width: doc.page.width - 120, align: "right" });
    doc.fillColor("#64748b").fontSize(10).font("Helvetica").text(`${transaksi.masjid.nama_masjid || "Masjid"} • Bukti Pembayaran Resmi`, 60, 80, { width: doc.page.width - 120, align: "right" });

    // Separator Line
    doc.moveTo(60, 105).lineTo(doc.page.width - 60, 105).strokeColor("#dcfce3").lineWidth(1.5).stroke();

    // Kv details
    doc.fillColor("#475569").fontSize(10);
    doc.font("Helvetica").text("No. Kwitansi: ", 60, 125, { continued: true }).font("Helvetica-Bold").fillColor("#1e293b").text(transaksi.kode_unik);
    doc.font("Helvetica").fillColor("#475569").text(`Tanggal: ${dateFormatted}`, 60, 140);

    // Transaksi details array
    let labelY = 175;
    const drawKwitansiRow = (label: string, value: string) => {
      doc.font("Helvetica").fillColor("#64748b").fontSize(11).text(label, 60, labelY);
      doc.font("Helvetica-Bold").fillColor("#1e293b").text(value, 230, labelY);
      // Dotted horizontal line separator
      doc.moveTo(60, labelY + 15).lineTo(doc.page.width - 60, labelY + 15).strokeColor("#cbd5e1").lineWidth(0.5).dash(2, { space: 2 }).stroke();
      doc.undash();
      labelY += 25;
    };

    drawKwitansiRow("Nama Kepala Keluarga", transaksi.nama_kk || "-");
    drawKwitansiRow("Alamat Muzaqi", transaksi.alamat_muzaqi || "-");
    drawKwitansiRow("Jumlah Jiwa", `${transaksi.jumlah_jiwa || 0} jiwa`);
    
    const jenis = transaksi.jenis_bayar === "UANG" ? "Uang" : "Beras";
    drawKwitansiRow("Jenis Pembayaran", jenis);
    
    let nominZakat = formatCurrencyId(Number(transaksi.nominal_zakat) || 0);
    if (transaksi.jenis_bayar === "BERAS") nominZakat = `${Number(transaksi.total_beras_kg).toFixed(2)} kg`;
    drawKwitansiRow("Nominal Zakat", nominZakat);
    
    drawKwitansiRow("Nominal Infaq", formatCurrencyId(Number(transaksi.nominal_infaq) || 0));

    // Signatures
    const signY = labelY + 30;
    doc.fillColor("#1e293b").font("Helvetica").fontSize(11).text("Petugas Zakat", 380, signY, { width: 140, align: "center" });

    // LUNAS Stamp
    const stampX = 450;
    const stampY = signY + 60;
    doc.circle(stampX, stampY, 35).strokeColor("#ef4444").lineWidth(2).stroke();
    doc.save();
    doc.translate(stampX, stampY);
    doc.rotate(-15);
    doc.fillColor("#ef4444").font("Helvetica-Bold").fontSize(14).text("LUNAS", -25, -6);
    doc.restore();

    // Signature line
    doc.moveTo(370, signY + 110).lineTo(530, signY + 110).strokeColor("#94a3b8").lineWidth(1).stroke();
    doc.fillColor("#1e293b").font("Helvetica-Bold").text(petugasNama, 370, signY + 115, { width: 160, align: "center" });

    // Footer note
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(8).text("Kwitansi ini dicetak otomatis dari sistem pengelola zakat masjid.", 60, signY + 115);

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengekspor kwitansi" });
  }
};

// ─── Pencatatan Distribusi ─────────────────────────────────────────────────────

export const createPencatatanDistribusi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { masjid_id, kategori, jenis, nominal, deskripsi, tanggal } = req.body;

    if (!masjid_id || !kategori || !jenis || nominal === undefined) {
      res.status(400).json({ success: false, message: "masjid_id, kategori, jenis, dan nominal wajib diisi." });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    try {
      const balances = await getAvailableZisBalance(prisma, authorizedMasjidId);
      const avail = balances[kategori as keyof typeof balances];
      if (!avail) {
        res.status(400).json({ success: false, message: "Kategori tidak valid." });
        return;
      }

      if (jenis === "UANG" && nominal > avail.uang) {
        res.status(400).json({ success: false, message: `Nominal melebihi sisa dana uang untuk kategori ini (${formatCurrencyId(avail.uang)}).` });
        return;
      }
      
      if (jenis === "BERAS" && nominal > avail.beras) {
        res.status(400).json({ success: false, message: `Nominal melebihi sisa beras untuk kategori ini (${avail.beras.toFixed(2)} kg).` });
        return;
      }
    } catch (e: any) {
      res.status(500).json({ success: false, message: "Gagal memverifikasi saldo ZIS." });
      return;
    }

    const record = await prisma.pencatatanDistribusi.create({
      data: {
        masjid_id: authorizedMasjidId,
        kategori,
        jenis,
        nominal: new Prisma.Decimal(nominal),
        deskripsi,
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        dicatat_oleh: req.user?.id,
      },
    });

    res.status(201).json({ success: true, message: "Pencatatan distribusi berhasil.", data: record });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mencatat distribusi." });
  }
};

export const getPencatatanDistribusiList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { masjid_id, kategori, jenis } = req.query;

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, masjid_id as string);
    if (!authorizedMasjidId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const records = await prisma.pencatatanDistribusi.findMany({
      where: {
        masjid_id: authorizedMasjidId,
        ...(kategori ? { kategori: kategori as any } : {}),
        ...(jenis ? { jenis: jenis as any } : {}),
      },
      orderBy: { tanggal: "desc" },
    });

    res.status(200).json({ success: true, data: records });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data distribusi." });
  }
};

export const updatePencatatanDistribusi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { kategori, jenis, nominal, deskripsi, tanggal } = req.body;

    const existing = await prisma.pencatatanDistribusi.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Data tidak ditemukan." });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, existing.masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    try {
      const balances = await getAvailableZisBalance(prisma, authorizedMasjidId, id);
      
      const finalKategori = kategori || existing.kategori;
      const finalJenis = jenis || existing.jenis;
      const finalNominal = nominal !== undefined ? Number(nominal) : decimalToNumber(existing.nominal);
      
      const avail = balances[finalKategori as keyof typeof balances];
      if (!avail) {
        res.status(400).json({ success: false, message: "Kategori tidak valid." });
        return;
      }

      if (finalJenis === "UANG" && finalNominal > avail.uang) {
        res.status(400).json({ success: false, message: `Nominal melebihi sisa dana uang untuk kategori ini (${formatCurrencyId(avail.uang)}).` });
        return;
      }
      
      if (finalJenis === "BERAS" && finalNominal > avail.beras) {
        res.status(400).json({ success: false, message: `Nominal melebihi sisa beras untuk kategori ini (${avail.beras.toFixed(2)} kg).` });
        return;
      }
    } catch (e: any) {
      res.status(500).json({ success: false, message: "Gagal memverifikasi saldo ZIS." });
      return;
    }

    const updated = await prisma.pencatatanDistribusi.update({
      where: { id },
      data: {
        ...(kategori && { kategori }),
        ...(jenis && { jenis }),
        ...(nominal !== undefined && { nominal: new Prisma.Decimal(nominal) }),
        ...(deskripsi !== undefined && { deskripsi }),
        ...(tanggal && { tanggal: new Date(tanggal) }),
      },
    });

    res.status(200).json({ success: true, message: "Data berhasil diubah.", data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengubah data." });
  }
};

export const deletePencatatanDistribusi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.pencatatanDistribusi.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Data tidak ditemukan." });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, existing.masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.pencatatanDistribusi.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Data berhasil dihapus." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus data." });
  }
};

// ─── Pengaturan ZIS ────────────────────────────────────────────────────────────

export const updatePengaturanZis = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { persen_fakir, persen_amil, persen_fisabilillah, persen_lainnya } = req.body;

    const existing = await prisma.pengaturanZis.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Pengaturan tidak ditemukan." });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, existing.masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const updated = await prisma.pengaturanZis.update({
      where: { id },
      data: {
        ...(persen_fakir !== undefined && { persen_fakir: Number(persen_fakir) }),
        ...(persen_amil !== undefined && { persen_amil: Number(persen_amil) }),
        ...(persen_fisabilillah !== undefined && { persen_fisabilillah: Number(persen_fisabilillah) }),
        ...(persen_lainnya !== undefined && { persen_lainnya: Number(persen_lainnya) }),
      },
    });

    res.status(200).json({ success: true, message: "Pengaturan berhasil diperbarui.", data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat memperbarui pengaturan ZIS." });
  }
};
