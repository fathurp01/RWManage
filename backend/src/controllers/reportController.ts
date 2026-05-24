import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { JenisTransaksi, JenisBayar, Prisma, StatusIuran } from "@prisma/client";
import { prisma } from "../lib/prisma";

type ReportFormat = "PDF" | "XLSX";

interface ReportQuery {
  wilayah_rw_id?: string;
  masjid_id?: string;
  tahun?: string;
  bulan?: string;
  format?: ReportFormat;
}

interface MonthSeriesItem {
  bulan: number;
  label: string;
  iuran_lunas_count: number;
  iuran_belum_count: number;
  iuran_lunas_nominal: number;
  iuran_belum_nominal: number;
  kas_masuk: number;
  kas_keluar: number;
  kas_saldo: number;
  zis_uang_zakat: number;
  zis_uang_infaq: number;
  zis_beras_kg: number;
}

interface RwReportPayload {
  scope: "RW";
  wilayah_rw: {
    id: string;
    nama_kompleks: string;
    no_rw: string;
  };
  periode: {
    tahun: number;
    bulan: number | null;
    label: string;
  };
  summary: {
    total_warga: number;
    total_iuran_lunas_count: number;
    total_iuran_belum_count: number;
    total_iuran_lunas_nominal: number;
    total_iuran_belum_nominal: number;
    total_kas_masuk: number;
    total_kas_keluar: number;
    saldo_kas: number;
  };
  series: MonthSeriesItem[];
}

interface MasjidReportPayload {
  scope: "MASJID";
  masjid: {
    id: string;
    nama_masjid: string;
    alamat: string;
    blok_wilayah: {
      nama_blok: string;
      no_rt: string | null;
      nama_kompleks: string;
      no_rw: string;
    };
  };
  periode: {
    tahun: number;
    bulan: number | null;
    label: string;
  };
  summary: {
    total_kas_masuk: number;
    total_kas_keluar: number;
    saldo_kas: number;
    total_zis_uang_zakat: number;
    total_zis_uang_infaq: number;
    total_zis_beras_kg: number;
    total_transaksi_zis: number;
  };
  series: MonthSeriesItem[];
}

const MONTH_LABELS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const decimalToNumber = (value: Prisma.Decimal | null | undefined): number => {
  if (!value) {
    return 0;
  }

  return Number(value);
};

const toInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const getDateRange = (tahun: number, bulan?: number | null) => {
  const start = bulan
    ? new Date(tahun, bulan - 1, 1, 0, 0, 0, 0)
    : new Date(tahun, 0, 1, 0, 0, 0, 0);

  const end = bulan
    ? new Date(tahun, bulan, 0, 23, 59, 59, 999)
    : new Date(tahun, 11, 31, 23, 59, 59, 999);

  return { start, end };
};

const buildPeriodLabel = (tahun: number, bulan: number | null): string => {
  return bulan ? `${MONTH_LABELS[bulan - 1]} ${tahun}` : `Tahun ${tahun}`;
};

const buildMonthSeriesSkeleton = (): MonthSeriesItem[] => {
  return Array.from({ length: 12 }, (_, index) => ({
    bulan: index + 1,
    label: MONTH_LABELS[index],
    iuran_lunas_count: 0,
    iuran_belum_count: 0,
    iuran_lunas_nominal: 0,
    iuran_belum_nominal: 0,
    kas_masuk: 0,
    kas_keluar: 0,
    kas_saldo: 0,
    zis_uang_zakat: 0,
    zis_uang_infaq: 0,
    zis_beras_kg: 0,
  }));
};

const getAuthorizedRw = async (userId: string, requestedRwId?: string) => {
  if (requestedRwId) {
    const relation = await prisma.wilayahRW.findFirst({
      where: {
        id: requestedRwId,
        user_id: userId,
      },
      select: {
        id: true,
        nama_kompleks: true,
        no_rw: true,
        user: {
          select: {
            nama: true,
          },
        },
      },
    });

    return relation ? { ...relation, desa: relation.user.nama } : null;
  }

  const relation = await prisma.wilayahRW.findUnique({
    where: { user_id: userId },
    select: {
      id: true,
      nama_kompleks: true,
      no_rw: true,
      user: {
        select: {
          nama: true,
        },
      },
    },
  });

  return relation ? { ...relation, desa: relation.user.nama } : null;
};

const getAuthorizedMasjid = async (userId: string, requestedMasjidId?: string) => {
  if (requestedMasjidId) {
    const relation = await prisma.pengurusMasjid.findFirst({
      where: {
        user_id: userId,
        masjid_id: requestedMasjidId,
      },
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
  }

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

const createRwSeries = (
  yearIuran: Array<{ bulan: number; status: StatusIuran; nominal: Prisma.Decimal }>,
  kasList: Array<{ tanggal: Date; jenis_transaksi: JenisTransaksi; nominal: Prisma.Decimal }>
) => {
  const series = buildMonthSeriesSkeleton();

  yearIuran.forEach((item) => {
    const target = series[item.bulan - 1];
    const nominal = decimalToNumber(item.nominal);

    if (item.status === StatusIuran.LUNAS) {
      target.iuran_lunas_count += 1;
      target.iuran_lunas_nominal += nominal;
    } else {
      target.iuran_belum_count += 1;
      target.iuran_belum_nominal += nominal;
    }
  });

  kasList.forEach((item) => {
    const target = series[item.tanggal.getMonth()];
    const nominal = decimalToNumber(item.nominal);

    if (item.jenis_transaksi === JenisTransaksi.MASUK) {
      target.kas_masuk += nominal;
    } else {
      target.kas_keluar += nominal;
    }
  });

  let runningSaldo = 0;
  series.forEach((item) => {
    item.kas_saldo = item.kas_masuk - item.kas_keluar;
    runningSaldo += item.kas_saldo;
    item.kas_saldo = runningSaldo;
  });

  return series;
};

const createMasjidSeries = (
  kasList: Array<{ tanggal: Date; jenis_transaksi: JenisTransaksi; nominal: Prisma.Decimal }>,
  zisList: Array<{
    waktu_transaksi: Date;
    nominal_zakat: Prisma.Decimal;
    nominal_infaq: Prisma.Decimal;
    total_beras_kg: Prisma.Decimal;
  }>
) => {
  const series = buildMonthSeriesSkeleton();

  kasList.forEach((item) => {
    const target = series[item.tanggal.getMonth()];
    const nominal = decimalToNumber(item.nominal);

    if (item.jenis_transaksi === JenisTransaksi.MASUK) {
      target.kas_masuk += nominal;
    } else {
      target.kas_keluar += nominal;
    }
  });

  zisList.forEach((item) => {
    const target = series[item.waktu_transaksi.getMonth()];
    target.zis_uang_zakat += decimalToNumber(item.nominal_zakat);
    target.zis_uang_infaq += decimalToNumber(item.nominal_infaq);
    target.zis_beras_kg += decimalToNumber(item.total_beras_kg);
  });

  let runningSaldo = 0;
  series.forEach((item) => {
    item.kas_saldo = item.kas_masuk - item.kas_keluar;
    runningSaldo += item.kas_saldo;
    item.kas_saldo = runningSaldo;
  });

  return series;
};

const buildRwReport = async (req: Request): Promise<RwReportPayload | null> => {
  if (!req.user?.id) {
    return null;
  }

  const query = req.query as ReportQuery;
  const tahun = toInt(query.tahun, new Date().getFullYear());
  const bulan = query.bulan ? toInt(query.bulan, 0) : null;
  const requestedRwId = query.wilayah_rw_id;

  if (bulan !== null && (bulan < 1 || bulan > 12)) {
    throw new Error("Bulan tidak valid.");
  }

  const rw = await getAuthorizedRw(req.user.id, requestedRwId);
  if (!rw) {
    return null;
  }

  const { start, end } = getDateRange(tahun, bulan);

  const activeWarga = await prisma.warga.findMany({
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

  const wargaIds = activeWarga.map((item) => item.id);

  const iuranList = wargaIds.length
    ? await prisma.iuranWarga.findMany({
        where: {
          warga_id: { in: wargaIds },
          tahun,
          ...(bulan !== null ? { bulan } : {}),
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
        gte: start,
        lte: end,
      },
    },
    select: {
      tanggal: true,
      jenis_transaksi: true,
      nominal: true,
    },
  });

  const series = createRwSeries(iuranList, kasList);

  const summary = iuranList.reduce(
    (accumulator, item) => {
      const nominal = decimalToNumber(item.nominal);
      if (item.status === StatusIuran.LUNAS) {
        accumulator.total_iuran_lunas_count += 1;
        accumulator.total_iuran_lunas_nominal += nominal;
      } else {
        accumulator.total_iuran_belum_count += 1;
        accumulator.total_iuran_belum_nominal += nominal;
      }

      return accumulator;
    },
    {
      total_iuran_lunas_count: 0,
      total_iuran_belum_count: 0,
      total_iuran_lunas_nominal: 0,
      total_iuran_belum_nominal: 0,
    }
  );

  const kasSummary = kasList.reduce(
    (accumulator, item) => {
      const nominal = decimalToNumber(item.nominal);
      if (item.jenis_transaksi === JenisTransaksi.MASUK) {
        accumulator.total_kas_masuk += nominal;
      } else {
        accumulator.total_kas_keluar += nominal;
      }

      return accumulator;
    },
    {
      total_kas_masuk: 0,
      total_kas_keluar: 0,
    }
  );

  return {
    scope: "RW",
    wilayah_rw: rw,
    periode: {
      tahun,
      bulan,
      label: buildPeriodLabel(tahun, bulan),
    },
    summary: {
      total_warga: activeWarga.length,
      total_iuran_lunas_count: summary.total_iuran_lunas_count,
      total_iuran_belum_count: summary.total_iuran_belum_count,
      total_iuran_lunas_nominal: summary.total_iuran_lunas_nominal,
      total_iuran_belum_nominal: summary.total_iuran_belum_nominal,
      total_kas_masuk: kasSummary.total_kas_masuk,
      total_kas_keluar: kasSummary.total_kas_keluar,
      saldo_kas: kasSummary.total_kas_masuk - kasSummary.total_kas_keluar,
    },
    series,
  };
};

const buildMasjidReport = async (req: Request): Promise<MasjidReportPayload | null> => {
  if (!req.user?.id) {
    return null;
  }

  const query = req.query as ReportQuery;
  const tahun = toInt(query.tahun, new Date().getFullYear());
  const bulan = query.bulan ? toInt(query.bulan, 0) : null;
  const requestedMasjidId = query.masjid_id;

  if (bulan !== null && (bulan < 1 || bulan > 12)) {
    throw new Error("Bulan tidak valid.");
  }

  const masjid = await getAuthorizedMasjid(req.user.id, requestedMasjidId);
  if (!masjid) {
    return null;
  }

  const { start, end } = getDateRange(tahun, bulan);

  const kasList = await prisma.kasMasjid.findMany({
    where: {
      masjid_id: masjid.id,
      tanggal: {
        gte: start,
        lte: end,
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
        gte: start,
        lte: end,
      },
    },
    select: {
      waktu_transaksi: true,
      nominal_zakat: true,
      nominal_infaq: true,
      total_beras_kg: true,
      jenis_bayar: true,
      jenis_zakat: true,
    },
  });

  const series = createMasjidSeries(kasList, zisList);

  const kasSummary = kasList.reduce(
    (accumulator, item) => {
      const nominal = decimalToNumber(item.nominal);
      if (item.jenis_transaksi === JenisTransaksi.MASUK) {
        accumulator.total_kas_masuk += nominal;
      } else {
        accumulator.total_kas_keluar += nominal;
      }

      return accumulator;
    },
    {
      total_kas_masuk: 0,
      total_kas_keluar: 0,
    }
  );

  const zisSummary = zisList.reduce(
    (accumulator, item) => {
      accumulator.total_zis_uang_zakat += decimalToNumber(item.nominal_zakat);
      accumulator.total_zis_uang_infaq += decimalToNumber(item.nominal_infaq);
      accumulator.total_zis_beras_kg += decimalToNumber(item.total_beras_kg);
      accumulator.total_transaksi_zis += 1;
      return accumulator;
    },
    {
      total_zis_uang_zakat: 0,
      total_zis_uang_infaq: 0,
      total_zis_beras_kg: 0,
      total_transaksi_zis: 0,
    }
  );

  return {
    scope: "MASJID",
    masjid: {
      id: masjid.id,
      nama_masjid: masjid.nama_masjid,
      alamat: masjid.alamat,
      blok_wilayah: {
        nama_blok: masjid.blok_wilayah.nama_blok,
        no_rt: masjid.blok_wilayah.no_rt,
        nama_kompleks: masjid.blok_wilayah.wilayah_rw.nama_kompleks,
        no_rw: masjid.blok_wilayah.wilayah_rw.no_rw,
      },
    },
    periode: {
      tahun,
      bulan,
      label: buildPeriodLabel(tahun, bulan),
    },
    summary: {
      total_kas_masuk: kasSummary.total_kas_masuk,
      total_kas_keluar: kasSummary.total_kas_keluar,
      saldo_kas: kasSummary.total_kas_masuk - kasSummary.total_kas_keluar,
      total_zis_uang_zakat: zisSummary.total_zis_uang_zakat,
      total_zis_uang_infaq: zisSummary.total_zis_uang_infaq,
      total_zis_beras_kg: zisSummary.total_zis_beras_kg,
      total_transaksi_zis: zisSummary.total_transaksi_zis,
    },
    series,
  };
};

const addSummarySheet = (workbook: ExcelJS.Workbook, title: string, rows: Array<[string, string]>) => {
  const sheet = workbook.addWorksheet("Ringkasan");
  sheet.addRow([title]);
  sheet.addRow(["Dicetak", new Date().toLocaleString("id-ID")]);
  sheet.addRow([]);

  rows.forEach((row) => sheet.addRow(row));

  sheet.getColumn(1).width = 32;
  sheet.getColumn(2).width = 24;
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.getRow(1).alignment = { vertical: "middle" };
};

const addSeriesSheet = (workbook: ExcelJS.Workbook, series: MonthSeriesItem[]) => {
  const sheet = workbook.addWorksheet("Series Bulanan");
  sheet.columns = [
    { header: "Bulan", key: "label", width: 18 },
    { header: "Iuran Lunas", key: "iuran_lunas_count", width: 12 },
    { header: "Iuran Belum", key: "iuran_belum_count", width: 12 },
    { header: "Kas Masuk", key: "kas_masuk", width: 16 },
    { header: "Kas Keluar", key: "kas_keluar", width: 16 },
    { header: "Saldo Kumulatif", key: "kas_saldo", width: 18 },
    { header: "ZIS Zakat", key: "zis_uang_zakat", width: 16 },
    { header: "ZIS Infaq", key: "zis_uang_infaq", width: 16 },
    { header: "Beras (Kg)", key: "zis_beras_kg", width: 14 },
  ];

  sheet.addRows(
    series.map((item) => ({
      label: item.label,
      iuran_lunas_count: item.iuran_lunas_count,
      iuran_belum_count: item.iuran_belum_count,
      kas_masuk: item.kas_masuk,
      kas_keluar: item.kas_keluar,
      kas_saldo: item.kas_saldo,
      zis_uang_zakat: item.zis_uang_zakat,
      zis_uang_infaq: item.zis_uang_infaq,
      zis_beras_kg: item.zis_beras_kg,
    }))
  );

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: "center" };
}

const exportRwExcel = async (res: Response, report: RwReportPayload) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RWManage";
  workbook.created = new Date();

  addSummarySheet(workbook, `Laporan RW - ${report.periode.label}`, [
    ["RW", `${report.wilayah_rw.no_rw} - ${report.wilayah_rw.nama_kompleks}`],
    ["Total Warga", String(report.summary.total_warga)],
    ["Iuran Lunas (Jumlah)", String(report.summary.total_iuran_lunas_count)],
    ["Iuran Belum (Jumlah)", String(report.summary.total_iuran_belum_count)],
    ["Iuran Lunas (Nominal)", formatCurrency(report.summary.total_iuran_lunas_nominal)],
    ["Iuran Belum (Nominal)", formatCurrency(report.summary.total_iuran_belum_nominal)],
    ["Kas Masuk", formatCurrency(report.summary.total_kas_masuk)],
    ["Kas Keluar", formatCurrency(report.summary.total_kas_keluar)],
    ["Saldo Kas", formatCurrency(report.summary.saldo_kas)],
  ]);
  addSeriesSheet(workbook, report.series);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `laporan-rw-${report.periode.tahun}${report.periode.bulan ? `-${String(report.periode.bulan).padStart(2, "0")}` : ""}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
};

const exportMasjidExcel = async (res: Response, report: MasjidReportPayload) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RWManage";
  workbook.created = new Date();

  addSummarySheet(workbook, `Laporan Masjid - ${report.periode.label}`, [
    ["Masjid", report.masjid.nama_masjid],
    ["Alamat", report.masjid.alamat],
    ["RW", `${report.masjid.blok_wilayah.no_rw} - ${report.masjid.blok_wilayah.nama_kompleks}`],
    ["RT / Blok", `${report.masjid.blok_wilayah.no_rt ?? "-"} / ${report.masjid.blok_wilayah.nama_blok}`],
    ["Total Beras (Kg)", report.summary.total_zis_beras_kg.toFixed(2)],
    ["ZIS Zakat", formatCurrency(report.summary.total_zis_uang_zakat)],
    ["ZIS Infaq", formatCurrency(report.summary.total_zis_uang_infaq)],
    ["Total Kas Masuk", formatCurrency(report.summary.total_kas_masuk)],
    ["Total Kas Keluar", formatCurrency(report.summary.total_kas_keluar)],
    ["Saldo Kas Saat Ini", formatCurrency(report.summary.saldo_kas)],
  ]);
  addSeriesSheet(workbook, report.series);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `laporan-masjid-${report.periode.tahun}${report.periode.bulan ? `-${String(report.periode.bulan).padStart(2, "0")}` : ""}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
};

export const getRwReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await buildRwReport(req);

    if (!report) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak atau RW tidak ditemukan.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Laporan RW berhasil diambil.",
      data: report,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat mengambil laporan RW.",
    });
  }
};

export const getMasjidReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await buildMasjidReport(req);

    if (!report) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak atau masjid tidak ditemukan.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Laporan masjid berhasil diambil.",
      data: report,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat mengambil laporan masjid.",
    });
  }
};

export const exportRwReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await buildRwReport(req);

    if (!report) {
      res.status(403).json({ success: false, message: "Laporan tidak ditemukan." });
      return;
    }

    const format = String((req.query as ReportQuery).format ?? "PDF").toUpperCase() as ReportFormat;
    if (format === "XLSX") {
      await exportRwExcel(res, report);
      return;
    }

    const filename = `laporan-rw-${report.periode.tahun}${report.periode.bulan ? `-${String(report.periode.bulan).padStart(2, "0")}` : ""}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    const MONTH_LABELS_SHORT = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
    ];

    // Header RW Branding
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#312e81").text("LAPORAN BULANAN RUKUN WARGA (RW)", { align: "center" });
    doc.moveDown(0.25);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e293b").text(`WILAYAH RW ${report.wilayah_rw.no_rw || ""} / KOMPLEKS ${report.wilayah_rw.nama_kompleks?.toUpperCase() || ""}`, { align: "center" });
    doc.fontSize(10).font("Helvetica").fillColor("#64748b").text(`Periode Laporan: ${report.periode.label}`, { align: "center" });
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });
    doc.moveDown(1.5);

    // Summary Block
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("Ringkasan Laporan RW:");
    doc.moveDown(0.4);

    const cardY = doc.y;
    const cardHeight = 80;
    doc.rect(40, cardY, 515, cardHeight).fillColor("#f8fafc").fill();
    doc.rect(40, cardY, 515, cardHeight).strokeColor("#e2e8f0").stroke();

    // Inside text
    doc.fillColor("#1e293b");
    
    // Column 1: Wilayah (x = 55)
    doc.fontSize(9).font("Helvetica-Bold").text("Data Wilayah", 55, cardY + 10);
    doc.font("Helvetica").fontSize(9);
    doc.text(`Kompleks: ${report.wilayah_rw.nama_kompleks}`, 55, cardY + 25, { width: 150 });
    doc.text(`No RW: RW ${report.wilayah_rw.no_rw}`, 55, cardY + 40, { width: 150 });
    doc.text(`Total Warga: ${report.summary.total_warga} Jiwa`, 55, cardY + 55, { width: 150 });

    // Column 2: Iuran (x = 220)
    doc.font("Helvetica-Bold").text("Status Iuran Warga", 220, cardY + 10);
    doc.font("Helvetica");
    doc.text(`Lunas: ${report.summary.total_iuran_lunas_count} KK (${formatCurrency(report.summary.total_iuran_lunas_nominal)})`, 220, cardY + 25, { width: 160 });
    doc.text(`Belum Lunas: ${report.summary.total_iuran_belum_count} KK (${formatCurrency(report.summary.total_iuran_belum_nominal)})`, 220, cardY + 40, { width: 160 });

    // Column 3: Kas (x = 395)
    doc.font("Helvetica-Bold").text("Ringkasan Keuangan", 395, cardY + 10);
    doc.font("Helvetica");
    doc.text(`Kas Masuk: ${formatCurrency(report.summary.total_kas_masuk)}`, 395, cardY + 25, { width: 150 });
    doc.text(`Kas Keluar: ${formatCurrency(report.summary.total_kas_keluar)}`, 395, cardY + 40, { width: 150 });
    doc.font("Helvetica-Bold").fillColor("#312e81").text(`Saldo Kas: ${formatCurrency(report.summary.saldo_kas)}`, 395, cardY + 55, { width: 150 });

    doc.y = cardY + cardHeight + 20;

    // Table drawing
    const headers = ["Bulan", "Lunas", "Belum", "Masuk", "Keluar", "Saldo"];
    const colWidths = [80, 80, 80, 90, 90, 90];
    let tableY = doc.y;

    const drawRow = (rowData: string[], isHeader = false) => {
        const h = 22;
        if (tableY + h > 750) {
            doc.addPage();
            tableY = 40;
        }
        let x = 40;
        doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(9);
        rowData.forEach((text, i) => {
            if (isHeader) {
                doc.rect(x, tableY, colWidths[i], h).fillColor("#312e81").fill();
                doc.rect(x, tableY, colWidths[i], h).strokeColor("#cbd5e1").stroke();
                doc.fillColor("#ffffff").text(text, x + 6, tableY + 7, { width: colWidths[i] - 12, align: i === 0 ? "left" : (i === 1 || i === 2 ? "center" : "right") });
            } else {
                doc.rect(x, tableY, colWidths[i], h).strokeColor("#e2e8f0").stroke();
                doc.fillColor("#1e293b").text(text, x + 6, tableY + 7, { width: colWidths[i] - 12, align: i === 0 ? "left" : (i === 1 || i === 2 ? "center" : "right") });
            }
            x += colWidths[i];
        });
        tableY += h;
    };

    drawRow(headers, true);
    report.series.forEach(item => {
        drawRow([
            item.label,
            String(item.iuran_lunas_count),
            String(item.iuran_belum_count),
            formatCurrency(item.kas_masuk),
            formatCurrency(item.kas_keluar),
            formatCurrency(item.kas_saldo)
        ]);
    });

    // Add Signature section at the end of PDF
    const signatureHeight = 100;
    if (tableY + signatureHeight > 750) {
        doc.addPage();
        tableY = 40;
    }

    doc.moveDown(2);
    tableY = doc.y;
    
    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    const today = new Date();
    doc.text(`Kota Bandung, ${today.getDate()} ${MONTH_LABELS_SHORT[today.getMonth()]} ${today.getFullYear()}`, 350, tableY, { align: "center", width: 200 });
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").text("Ketua RW", 350, doc.y, { align: "center", width: 200 });
    doc.moveDown(3.5);
    doc.font("Helvetica-Bold").text("( ____________________ )", 350, doc.y, { align: "center", width: 200 });

    doc.end();
  } catch (error) {
    res.status(400).json({ success: false, message: "Gagal ekspor laporan." });
  }
};

export const exportMasjidReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await buildMasjidReport(req);

    if (!report) {
      res.status(403).json({ success: false, message: "Laporan tidak ditemukan." });
      return;
    }

    const format = String((req.query as ReportQuery).format ?? "PDF").toUpperCase() as ReportFormat;
    if (format === "XLSX") {
      await exportMasjidExcel(res, report);
      return;
    }

    const filename = `laporan-masjid-${report.periode.tahun}${report.periode.bulan ? `-${String(report.periode.bulan).padStart(2, "0")}` : ""}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    // Header logic
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#312e81").text("LAPORAN REKAPITULASI BULANAN MASJID", { align: "center" });
    doc.moveDown(0.25);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e293b").text(report.masjid.nama_masjid.toUpperCase(), { align: "center" });
    doc.fontSize(10).font("Helvetica").fillColor("#64748b").text(`Wilayah: RW ${report.masjid.blok_wilayah.no_rw}, RT ${report.masjid.blok_wilayah.no_rt ?? "-"} / Blok ${report.masjid.blok_wilayah.nama_blok}`, { align: "center" });
    doc.text(`Periode Laporan: ${report.periode.label} | Dicetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });
    doc.moveDown(1.5);

    // Summary ZIS & Kas
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("Ringkasan Keuangan Periode Ini:");
    doc.moveDown(0.4);
    
    let currentY = doc.y;
    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    doc.text(`Total Kas Masuk: ${formatCurrency(report.summary.total_kas_masuk)}`, 40, currentY);
    doc.text(`ZIS Zakat: ${formatCurrency(report.summary.total_zis_uang_zakat)}`, 300, currentY);
    
    currentY += 15;
    doc.text(`Total Kas Keluar: ${formatCurrency(report.summary.total_kas_keluar)}`, 40, currentY);
    doc.text(`ZIS Infaq: ${formatCurrency(report.summary.total_zis_uang_infaq)}`, 300, currentY);
    
    currentY += 15;
    doc.font("Helvetica-Bold").text(`Saldo Kas Akhir: ${formatCurrency(report.summary.saldo_kas)}`, 40, currentY);
    doc.font("Helvetica").text(`Total Beras ZIS: ${report.summary.total_zis_beras_kg.toFixed(2)} kg`, 300, currentY);
    doc.moveDown(1.5);

    // Table
    const headers = ["Bulan", "Kas Masuk", "Kas Keluar", "Zakat", "Infaq", "Beras"];
    const colWidths = [70, 95, 95, 95, 95, 60];
    const colAligns: Array<"left" | "center" | "right"> = ["center", "right", "right", "right", "right", "right"];
    let tableY = doc.y;

    const drawRow = (rowData: string[], isHeader = false) => {
        const h = 22;
        if (tableY + h > 750) {
            doc.addPage();
            tableY = 40;
        }
        let x = 40;
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

    drawRow(headers, true);
    report.series.forEach(item => {
        drawRow([
            item.label,
            formatCurrency(item.kas_masuk),
            formatCurrency(item.kas_keluar),
            formatCurrency(item.zis_uang_zakat),
            formatCurrency(item.zis_uang_infaq),
            `${item.zis_beras_kg.toFixed(1)} kg`
        ]);
    });

    doc.end();
  } catch (error) {
    res.status(400).json({ success: false, message: "Gagal ekspor laporan." });
  }
};
