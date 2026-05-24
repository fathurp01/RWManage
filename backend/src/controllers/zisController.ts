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
  tahun?: string | number;
}

interface GetTransaksiZisQuery {
  masjid_id?: string;
  search?: string;
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
  const [aggregateZis, sumDistribusi] = await Promise.all([
    client.transaksiZis.aggregate({
      where: { masjid_id },
      _sum: { total_beras_kg: true, nominal_zakat: true, nominal_infaq: true },
    }),
    client.pencatatanDistribusi.groupBy({
      by: ["kategori", "jenis"],
      where: { masjid_id, ...(exclude_pencatatan_id ? { id: { not: exclude_pencatatan_id } } : {}) },
      _sum: { nominal: true },
    })
  ]);

  let pengaturan = await client.pengaturanZis.findUnique({ where: { masjid_id } });
  if (!pengaturan) {
    pengaturan = await client.pengaturanZis.create({
      data: {
        masjid_id,
        harga_beras_per_kg: 15000,
      },
    });
  }

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

    let pengaturan = await client.pengaturanZis.findUnique({
      where: { masjid_id: authorizedMasjidId },
    });

    if (!pengaturan) {
      pengaturan = await client.pengaturanZis.create({
        data: {
          masjid_id: authorizedMasjidId,
          harga_beras_per_kg: 15000,
        },
      });
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
    const { masjid_id, tahun } = req.query as GetDashboardZisQuery;

    const authorizedMasjidId = await getAuthorizedMasjidId(client, req, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message:
          "Anda tidak memiliki akses ke masjid ini atau belum terdaftar sebagai pengurus masjid.",
      });
      return;
    }

    let pengaturan = await client.pengaturanZis.findUnique({
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
      pengaturan = await client.pengaturanZis.create({
        data: {
          masjid_id: authorizedMasjidId,
          harga_beras_per_kg: 15000,
        },
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
    }

    let whereTransaksi: Prisma.TransaksiZisWhereInput = { masjid_id: authorizedMasjidId };
    let whereDistribusi: Prisma.PencatatanDistribusiWhereInput = { masjid_id: authorizedMasjidId };

    if (tahun) {
      const yr = Number(tahun);
      const startOfYear = new Date(yr, 0, 1);
      const endOfYear = new Date(yr, 11, 31, 23, 59, 59, 999);
      whereTransaksi.waktu_transaksi = {
        gte: startOfYear,
        lte: endOfYear,
      };
      whereDistribusi.tanggal = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    // Aggregate sum + total KK & jiwa
    const [aggregate, countResult] = await Promise.all([
      client.transaksiZis.aggregate({
        where: whereTransaksi,
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
      where: whereDistribusi,
      _sum: { nominal: true }
    });

    const used: Record<string, { uang: number; beras: number }> = {
      FAKIR: { uang: 0, beras: 0 }, AMIL: { uang: 0, beras: 0 },
      FISABILILLAH: { uang: 0, beras: 0 }, LAINNYA: { uang: 0, beras: 0 },
    };
    let totalTerdistribusiUang = 0;
    let totalTerdistribusiBeras = 0;

    sumDistribusi.forEach(d => {
      const nominal = decimalToNumber(d._sum.nominal);
      if (d.jenis === "UANG") {
        used[d.kategori].uang += nominal;
        totalTerdistribusiUang += nominal;
      }
      if (d.jenis === "BERAS") {
        used[d.kategori].beras += nominal;
        totalTerdistribusiBeras += nominal;
      }
    });

    distribusiUang.fakir = Math.max(0, roundTo2(distribusiUang.fakir - used.FAKIR.uang));
    distribusiUang.amil = Math.max(0, roundTo2(distribusiUang.amil - used.AMIL.uang));
    distribusiUang.fisabilillah = Math.max(0, roundTo2(distribusiUang.fisabilillah - used.FISABILILLAH.uang));
    distribusiUang.lainnya = Math.max(0, roundTo2(distribusiUang.lainnya - used.LAINNYA.uang));

    distribusiBerasKg.fakir = Math.max(0, roundTo2(distribusiBerasKg.fakir - used.FAKIR.beras));
    distribusiBerasKg.amil = Math.max(0, roundTo2(distribusiBerasKg.amil - used.AMIL.beras));
    distribusiBerasKg.fisabilillah = Math.max(0, roundTo2(distribusiBerasKg.fisabilillah - used.FISABILILLAH.beras));
    distribusiBerasKg.lainnya = Math.max(0, roundTo2(distribusiBerasKg.lainnya - used.LAINNYA.beras));

    // Extract unique years from all transactions and distributions for this masjid
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);

    const [allTrxDates, allDistDates] = await Promise.all([
      client.transaksiZis.findMany({
        where: { masjid_id: authorizedMasjidId },
        select: { waktu_transaksi: true },
      }),
      client.pencatatanDistribusi.findMany({
        where: { masjid_id: authorizedMasjidId },
        select: { tanggal: true },
      }),
    ]);

    allTrxDates.forEach((t) => {
      const yr = new Date(t.waktu_transaksi).getFullYear();
      if (!Number.isNaN(yr)) {
        yearsSet.add(yr);
      }
    });

    allDistDates.forEach((d) => {
      const yr = new Date(d.tanggal).getFullYear();
      if (!Number.isNaN(yr)) {
        yearsSet.add(yr);
      }
    });

    const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

    const totalDanaDistribusi = totalUangZakat + totalInfaq;

    res.status(200).json({
      success: true,
      message: "Dashboard ZIS berhasil diambil.",
      years: availableYears,
      data: {
        masjid_id: authorizedMasjidId,
        pengaturan_zis: pengaturan,
        total_beras: totalBeras,
        total_uang_zakat: totalUangZakat,
        total_infaq: totalInfaq,
        total_kk: totalKk,
        total_jiwa: totalJiwa,
        total_dana_distribusi: totalDanaDistribusi,
        total_terdistribusi_uang: totalTerdistribusiUang,
        total_terdistribusi_beras: totalTerdistribusiBeras,
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
  } catch (err) {
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
    const { masjid_id, search, start_date, end_date, page, limit } = req.query as GetTransaksiZisQuery;

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
      ...(search?.trim()
        ? {
            OR: [
              { nama_kk: { contains: search.trim(), mode: "insensitive" } },
              { alamat_muzaqi: { contains: search.trim(), mode: "insensitive" } },
              { kode_unik: { contains: search.trim(), mode: "insensitive" } },
            ],
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



    // Deletion allowed regardless of distribution status to allow correcting human input errors


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

    let pengaturan = await prisma.pengaturanZis.findUnique({
      where: { masjid_id: authorizedMasjidId },
    });

    if (!pengaturan) {
      pengaturan = await prisma.pengaturanZis.create({
        data: {
          masjid_id: authorizedMasjidId,
          harga_beras_per_kg: 15000,
        },
      });
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

    // Update allowed regardless of distribution status to allow correcting human input errors


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
      const doc = new PDFDocument({ margin: 40, size: "A4" });
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

      // Header logic
      doc.fontSize(15).font("Helvetica-Bold").fillColor("#312e81").text("LAPORAN REKAPITULASI DAFTAR MUZAQI ZIS", { align: "center" });
      doc.moveDown(0.25);
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e293b").text(masjid?.nama_masjid.toUpperCase() || "MASJID", { align: "center" });
      doc.fontSize(10).font("Helvetica").fillColor("#64748b").text(`Alamat: ${masjid?.alamat || "-"}`, { align: "center" });
      doc.text(`Periode Laporan: ${periodeDisplay} | Dicetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });
      doc.moveDown(1.5);

      // Summary ZIS & Kas
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("Ringkasan Penerimaan ZIS Periode Ini:");
      doc.moveDown(0.4);
      
      let currentY = doc.y;
      doc.fontSize(10).font("Helvetica").fillColor("#334155");
      doc.text(`Total Transaksi (KK): ${transaksi.length} KK`, 40, currentY);
      doc.text(`Total Uang Zakat: ${formatCurrencyId(totalUangZakat)}`, 300, currentY);
      
      currentY += 15;
      doc.text(`Total Jiwa: ${totalJiwa} Jiwa`, 40, currentY);
      doc.text(`Total Beras Zakat: ${totalBerasKg.toFixed(2)} kg`, 300, currentY);
      
      currentY += 15;
      doc.font("Helvetica-Bold").text(`Total Infaq Terbuka: ${formatCurrencyId(totalInfaq)}`, 40, currentY);
      doc.moveDown(1.5);

      // Table Setup
      const headers = ["No", "Nama KK", "Alamat Muzaqi", "Jiwa", "Jenis", "Nominal Zakat", "Infaq"];
      const colWidths = [25, 110, 110, 40, 45, 90, 95];
      const colAligns: Array<"left" | "center" | "right"> = ["center", "left", "left", "center", "center", "right", "right"];
      const startX = 40;
      let tableY = doc.y;

      const drawRow = (rowData: string[], isHeader = false) => {
        const h = 22; 
        if (tableY + h > doc.page.height - 50) {
          doc.addPage();
          tableY = 40;
        }

        let x = startX;
        doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(8);

        rowData.forEach((text, i) => {
          if (isHeader) {
            doc.rect(x, tableY, colWidths[i], h).fillColor("#312e81").fill();
            doc.rect(x, tableY, colWidths[i], h).strokeColor("#cbd5e1").stroke();
            doc.fillColor("#ffffff").text(text, x + 4, tableY + 7, { width: colWidths[i] - 8, align: colAligns[i] });
          } else {
            doc.rect(x, tableY, colWidths[i], h).strokeColor("#e2e8f0").stroke();
            doc.fillColor("#1e293b").text(text, x + 4, tableY + 7, { width: colWidths[i] - 8, align: colAligns[i] });
          }
          x += colWidths[i];
        });
        tableY += h;
      };

      // Draw Headers
      drawRow(headers, true);

      // Draw Data Rows
      transaksi.forEach((t, idx) => {
        const jenis = t.jenis_bayar === "UANG" ? "Uang" : "Beras";
        let nominalZakat = formatCurrencyId(Number(t.nominal_zakat) || 0);
        if (t.jenis_bayar === "BERAS") {
          nominalZakat = `${Number(t.total_beras_kg).toFixed(2)} kg`;
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
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      doc.pipe(res);

      // Header logic
      doc.fontSize(15).font("Helvetica-Bold").fillColor("#312e81").text("LAPORAN REKAPITULASI ESTIMASI DISTRIBUSI ZAKAT", { align: "center" });
      doc.moveDown(0.25);
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e293b").text(masjid?.nama_masjid.toUpperCase() || "MASJID", { align: "center" });
      doc.fontSize(10).font("Helvetica").fillColor("#64748b").text(`Periode Laporan: ${periode} | Dicetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });
      doc.moveDown(1.5);

      const drawTable = (
        title: string,
        headers: string[],
        tableRows: string[][],
        colWidths: number[],
        colAligns: Array<"left" | "center" | "right">
      ) => {
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text(title, 40, doc.y);
        doc.moveDown(0.4);

        const startX = 40;
        let y = doc.y;

        const drawRow = (rowData: string[], isHeader = false) => {
          const rowHeight = 22; 

          if (y + rowHeight > doc.page.height - 50) {
            doc.addPage();
            y = 40;
          }

          let currentX = startX;
          doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);

          rowData.forEach((text, i) => {
            if (isHeader) {
              doc.rect(currentX, y, colWidths[i], rowHeight).fillColor("#312e81").fill();
              doc.rect(currentX, y, colWidths[i], rowHeight).strokeColor("#cbd5e1").stroke();
              doc.fillColor("#ffffff").text(text, currentX + 6, y + 7, { width: colWidths[i] - 12, align: colAligns[i] });
            } else {
              doc.rect(currentX, y, colWidths[i], rowHeight).strokeColor("#e2e8f0").stroke();
              doc.fillColor("#1e293b").text(text, currentX + 6, y + 7, { width: colWidths[i] - 12, align: colAligns[i] });
            }
            currentX += colWidths[i];
          });
          y += rowHeight;
        };

        if (headers.length > 0) {
          drawRow(headers, true);
        }
        tableRows.forEach(row => drawRow(row, false));
        doc.y = y + 15; 
      };

      // Table 1: Ringkasan Sumber Penerimaan Dana
      drawTable(
        "Ringkasan Penerimaan ZIS",
        ["Sumber ZIS", "Jumlah Penerimaan"],
        [
          ["Total Zakat Uang", formatCurrencyId(totalZakat)],
          ["Total Zakat Beras", `${totalBeras.toFixed(2)} kg`],
          ["Total Infaq Terbuka", formatCurrencyId(totalInfaq)]
        ],
        [300, 215],
        ["left", "right"]
      );

      // Table 2: Estimasi Distribusi Zakat Uang
      drawTable(
        "Estimasi Alokasi Distribusi Zakat Uang",
        ["Asnaf/Kategori", "Persentase", "Jumlah Alokasi"],
        [
          ["Fakir Miskin", `${pengaturan.persen_fakir}%`, formatCurrencyId(distribusiDana.fakir)],
          ["Amil Zakat", `${pengaturan.persen_amil}%`, formatCurrencyId(distribusiDana.amil)],
          ["Fisabilillah", `${pengaturan.persen_fisabilillah}%`, formatCurrencyId(distribusiDana.fisabilillah)],
          ["Kategori Lainnya", `${pengaturan.persen_lainnya}%`, formatCurrencyId(distribusiDana.lainnya)]
        ],
        [215, 100, 200],
        ["left", "center", "right"]
      );

      // Table 3: Estimasi Distribusi Zakat Beras
      drawTable(
        "Estimasi Alokasi Distribusi Zakat Beras",
        ["Asnaf/Kategori", "Persentase", "Jumlah Alokasi"],
        [
          ["Fakir Miskin", `${pengaturan.persen_fakir}%`, `${distribusiBeras.fakir.toFixed(2)} kg`],
          ["Amil Zakat", `${pengaturan.persen_amil}%`, `${distribusiBeras.amil.toFixed(2)} kg`],
          ["Fisabilillah", `${pengaturan.persen_fisabilillah}%`, `${distribusiBeras.fisabilillah.toFixed(2)} kg`],
          ["Kategori Lainnya", `${pengaturan.persen_lainnya}%`, `${distribusiBeras.lainnya.toFixed(2)} kg`]
        ],
        [215, 100, 200],
        ["left", "center", "right"]
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

    // 1. KOP RESMI (Official Header at the very top - split into columns to prevent overlap)
    const leftColW = 280;
    const rightColX = 330;
    const rightColW = doc.page.width - 40 - rightColX;

    // Left Column: Branding / App name
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#15803d").text("RWMANAGE ZIS", 40, 35, { width: leftColW });
    doc.fontSize(8).font("Helvetica").fillColor("#64748b").text(`${transaksi.masjid.nama_masjid || "Masjid"} • Pengelolaan Zakat & Infaq`, 40, 54, { width: leftColW });

    // Right Column: Title & Subtitle of the document
    doc.fontSize(10.5).font("Helvetica-Bold").fillColor("#15803d").text("KWITANSI ZAKAT & INFAQ", rightColX, 35, { width: rightColW, align: "right" });
    doc.fontSize(7.5).font("Helvetica").fillColor("#64748b").text("Bukti Pembayaran Resmi Terverifikasi", rightColX, 54, { width: rightColW, align: "right" });

    // Divider Line below the main Kop
    doc.moveTo(40, 75).lineTo(doc.page.width - 40, 75).strokeColor("#15803d").lineWidth(1.5).stroke();

    // 2. CARD CONTAINER
    const cardX = 40;
    const cardY = 95;
    const cardW = doc.page.width - 80;
    const cardH = 430;

    // Background of the card
    doc.roundedRect(cardX, cardY, cardW, cardH, 8).fillColor("#f8fafc").fill();

    // Thin outer border of the card
    doc.roundedRect(cardX, cardY, cardW, cardH, 8).strokeColor("#cbd5e1").lineWidth(1).stroke();

    // Left solid accent bar in Islamic Green `#15803d`
    doc.rect(cardX, cardY, 6, cardH).fillColor("#15803d").fill();

    // 3. DETAIL ITEMS
    const jenis = transaksi.jenis_bayar === "UANG" ? "Uang" : "Beras";
    let nominZakat = formatCurrencyId(Number(transaksi.nominal_zakat) || 0);
    if (transaksi.jenis_bayar === "BERAS") nominZakat = `${Number(transaksi.total_beras_kg).toFixed(2)} kg`;

    const items = [
      ["No. Kwitansi", transaksi.kode_unik],
      ["Tanggal & Waktu", dateFormatted],
      ["Nama Kepala Keluarga", transaksi.nama_kk || "-"],
      ["Alamat Muzaqi", transaksi.alamat_muzaqi || "-"],
      ["Jumlah Jiwa", `${transaksi.jumlah_jiwa || 0} jiwa`],
      ["Jenis Pembayaran", jenis],
      ["Nominal Zakat", nominZakat],
      ["Nominal Infaq", formatCurrencyId(Number(transaksi.nominal_infaq) || 0)],
    ];

    let labelY = cardY + 20;
    items.forEach(([label, value], idx) => {
      // Alternating rows backgrounds
      if (idx % 2 === 0) {
        doc.rect(cardX + 12, labelY - 4, cardW - 24, 20).fillColor("#ffffff").fill();
      }

      doc.font("Helvetica").fillColor("#475569").fontSize(9.5).text(label, cardX + 25, labelY);
      doc.font("Helvetica-Bold").fillColor("#1e293b").fontSize(9.5).text(value, cardX + 180, labelY, { width: cardW - 200 });

      // Subtle divider dotted line
      doc.moveTo(cardX + 20, labelY + 14)
         .lineTo(cardX + cardW - 20, labelY + 14)
         .strokeColor("#f1f5f9")
         .lineWidth(0.5)
         .stroke();

      labelY += 24;
    });

    // 4. SIGNATURE AREA AND CONCENTRIC STAMP
    const signX = cardX + cardW - 160;
    const signY = cardY + 240;

    doc.fillColor("#1e293b").font("Helvetica").fontSize(9.5).text("Petugas Zakat,", signX, signY, { width: 140, align: "center" });

    // Concentric LUNAS stamp next to the signature
    const stampX = cardX + cardW - 220;
    const stampY = cardY + 310;

    doc.circle(stampX, stampY, 32).strokeColor("#ef4444").lineWidth(1.5).stroke();
    doc.circle(stampX, stampY, 28).strokeColor("#ef4444").lineWidth(0.75).dash(1.5, { space: 1.5 }).stroke();
    doc.undash();

    doc.save();
    doc.translate(stampX, stampY);
    doc.rotate(-12);
    doc.fillColor("#ef4444").font("Helvetica-Bold").fontSize(10).text("LUNAS", -18, -4);
    doc.restore();

    // Signature line
    doc.moveTo(signX, signY + 80).lineTo(signX + 140, signY + 80).strokeColor("#94a3b8").lineWidth(1).stroke();
    doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(9.5).text(petugasNama, signX, signY + 85, { width: 140, align: "center" });

    // 5. FOOTER NOTES INSIDE THE CARD
    doc.fillColor("#64748b").font("Helvetica").fontSize(7.5).text("Kwitansi ini diterbitkan secara sah oleh sistem pengelola zakat masjid dan sah sebagai bukti penyerahan ZIS.", cardX + 25, cardY + cardH - 35);
    doc.text(`Waktu Cetak: ${new Date().toLocaleString("id-ID")} | Sumber Data: MASJID_ZIS_DB`, cardX + 25, cardY + cardH - 22);

    // 6. GLOBAL PAGE FOOTER
    doc.moveTo(40, 765).lineTo(doc.page.width - 40, 765).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(8).text("RWManage • Sistem Informasi & Pengelolaan Lingkungan RT/RW Mandiri Terintegrasi", 40, 775, { align: "center" });
    doc.text("Laporan ZIS dikelola secara aman dan transparan melalui takmir masjid terverifikasi.", 40, 787, { align: "center" });

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

      const EPSILON_UANG = 1.5;
      const EPSILON_BERAS = 0.05;

      if (jenis === "UANG" && nominal > avail.uang + EPSILON_UANG) {
        res.status(400).json({ success: false, message: `Nominal melebihi sisa dana uang untuk kategori ini (${formatCurrencyId(avail.uang)}).` });
        return;
      }
      
      if (jenis === "BERAS" && nominal > avail.beras + EPSILON_BERAS) {
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
    const { masjid_id, kategori, jenis, tahun } = req.query;

    const authorizedMasjidId = await getAuthorizedMasjidId(prisma, req, masjid_id as string);
    if (!authorizedMasjidId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    let dateFilter = {};
    if (tahun) {
      const yr = Number(tahun);
      dateFilter = {
        tanggal: {
          gte: new Date(yr, 0, 1),
          lte: new Date(yr, 11, 31, 23, 59, 59, 999),
        },
      };
    }

    const records = await prisma.pencatatanDistribusi.findMany({
      where: {
        masjid_id: authorizedMasjidId,
        ...(kategori ? { kategori: kategori as any } : {}),
        ...(jenis ? { jenis: jenis as any } : {}),
        ...dateFilter,
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

      const EPSILON_UANG = 1.5;
      const EPSILON_BERAS = 0.05;

      if (finalJenis === "UANG" && finalNominal > avail.uang + EPSILON_UANG) {
        res.status(400).json({ success: false, message: `Nominal melebihi sisa dana uang untuk kategori ini (${formatCurrencyId(avail.uang)}).` });
        return;
      }
      
      if (finalJenis === "BERAS" && finalNominal > avail.beras + EPSILON_BERAS) {
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

    const newPersenFakir = persen_fakir !== undefined ? Number(persen_fakir) : Number(existing.persen_fakir);
    const newPersenAmil = persen_amil !== undefined ? Number(persen_amil) : Number(existing.persen_amil);
    const newPersenFisabilillah = persen_fisabilillah !== undefined ? Number(persen_fisabilillah) : Number(existing.persen_fisabilillah);
    const newPersenLainnya = persen_lainnya !== undefined ? Number(persen_lainnya) : Number(existing.persen_lainnya);

    // Get current total zakat and distributions to check if the new percentages will cause a negative remaining balance
    const [aggregateZis, sumDistribusi] = await Promise.all([
      prisma.transaksiZis.aggregate({
        where: { masjid_id: authorizedMasjidId },
        _sum: { total_beras_kg: true, nominal_zakat: true },
      }),
      prisma.pencatatanDistribusi.groupBy({
        by: ["kategori", "jenis"],
        where: { masjid_id: authorizedMasjidId },
        _sum: { nominal: true },
      })
    ]);

    const totalBeras = roundTo2(decimalToNumber(aggregateZis._sum.total_beras_kg));
    const totalUangZakat = roundTo2(decimalToNumber(aggregateZis._sum.nominal_zakat));

    const used: Record<string, { uang: number; beras: number }> = {
      FAKIR: { uang: 0, beras: 0 },
      AMIL: { uang: 0, beras: 0 },
      FISABILILLAH: { uang: 0, beras: 0 },
      LAINNYA: { uang: 0, beras: 0 },
    };
    
    sumDistribusi.forEach(d => {
      const nominal = decimalToNumber(d._sum.nominal);
      const catKey = d.kategori as keyof typeof used;
      if (used[catKey]) {
        if (d.jenis === "UANG") used[catKey].uang += nominal;
        if (d.jenis === "BERAS") used[catKey].beras += nominal;
      }
    });

    const catDisplayNames: Record<string, string> = {
      FAKIR: "Fakir Miskin",
      AMIL: "Amil",
      FISABILILLAH: "Fisabilillah",
      LAINNYA: "Lainnya"
    };

    const newPercents = {
      FAKIR: newPersenFakir,
      AMIL: newPersenAmil,
      FISABILILLAH: newPersenFisabilillah,
      LAINNYA: newPersenLainnya
    };

    const EPSILON_UANG = 1.5;
    const EPSILON_BERAS = 0.05;

    for (const cat of ["FAKIR", "AMIL", "FISABILILLAH", "LAINNYA"] as const) {
      const percent = newPercents[cat];
      const newAllocUang = (percent / 100) * totalUangZakat;
      const newAllocBeras = (percent / 100) * totalBeras;

      if (newAllocUang + EPSILON_UANG < used[cat].uang) {
        res.status(400).json({
          success: false,
          message: `Tidak bisa mengurangi persentase alokasi ${catDisplayNames[cat]}. Dana yang sudah terdistribusi untuk kategori ini (Rp${Math.round(used[cat].uang).toLocaleString("id-ID")}) melebihi alokasi baru (Rp${Math.round(newAllocUang).toLocaleString("id-ID")}).`
        });
        return;
      }

      if (newAllocBeras + EPSILON_BERAS < used[cat].beras) {
        res.status(400).json({
          success: false,
          message: `Tidak bisa mengurangi persentase alokasi ${catDisplayNames[cat]}. Beras yang sudah terdistribusi untuk kategori ini (${used[cat].beras.toFixed(2)} kg) melebihi alokasi baru (${newAllocBeras.toFixed(2)} kg).`
        });
        return;
      }
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
