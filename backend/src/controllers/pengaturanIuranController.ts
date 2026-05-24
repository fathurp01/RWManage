import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { pengaturanIuranRWSchema } from "../validation/schemas";
import { AksiAudit, StatusIuran } from "@prisma/client";
import { recordAudit } from "../middlewares/auditLogger";

type PengaturanIuranSnapshot = {
  nominal_iuran: string | number;
  nominal_iuran_kurang_mampu: string | number;
  nominal_iuran_lansia: string | number;
  persen_rt: number;
  persen_rw: number;
};

type PengaturanIuranHistoryItem = {
  id: string;
  created_at: string;
  keterangan: string | null;
  data_lama: PengaturanIuranSnapshot | null;
  data_baru: PengaturanIuranSnapshot | null;
  perubahan: Array<{
    field: "nominal_iuran" | "nominal_iuran_kurang_mampu" | "nominal_iuran_lansia" | "persen_rt" | "persen_rw";
    label: string;
    lama: string | number | null;
    baru: string | number | null;
  }>;
  user: {
    id: string;
    nama: string;
    email: string;
    role: string;
  } | null;
};

const parseSnapshot = (value: string | null): PengaturanIuranSnapshot | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PengaturanIuranSnapshot>;

    if (
      parsed &&
      parsed.nominal_iuran !== undefined &&
      parsed.persen_rt !== undefined &&
      parsed.persen_rw !== undefined
    ) {
      return {
        nominal_iuran: parsed.nominal_iuran,
        nominal_iuran_kurang_mampu: parsed.nominal_iuran_kurang_mampu ?? 0,
        nominal_iuran_lansia: parsed.nominal_iuran_lansia ?? 0,
        persen_rt: Number(parsed.persen_rt),
        persen_rw: Number(parsed.persen_rw),
      };
    }
  } catch {
    return null;
  }

  return null;
};

const buildHistoryDiff = (
  oldSnapshot: PengaturanIuranSnapshot | null,
  newSnapshot: PengaturanIuranSnapshot | null
) => {
  const fields: Array<{
    field: "nominal_iuran" | "nominal_iuran_kurang_mampu" | "nominal_iuran_lansia" | "persen_rt" | "persen_rw";
    label: string;
  }> = [
    { field: "nominal_iuran", label: "Nominal Iuran Bulanan" },
    { field: "nominal_iuran_kurang_mampu", label: "Nominal Iuran Kurang Mampu" },
    { field: "nominal_iuran_lansia", label: "Nominal Iuran Lansia" },
    { field: "persen_rt", label: "Porsi Kas RT" },
    { field: "persen_rw", label: "Porsi Kas RW" },
  ];

  return fields
    .map((item) => ({
      field: item.field,
      label: item.label,
      lama: oldSnapshot ? oldSnapshot[item.field] : null,
      baru: newSnapshot ? newSnapshot[item.field] : null,
    }))
    .filter((item) => item.lama !== item.baru);
};

export const getPengaturanIuranRW = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Akses ditolak. Wilayah RW tidak ditemukan." });
      return;
    }

    let pengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id },
    });

    res.status(200).json({
      success: true,
      message: "Data pengaturan iuran berhasil diambil.",
      data: pengaturan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil pengaturan iuran." });
  }
};

export const upsertPengaturanIuranRW = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Akses ditolak. Wilayah RW tidak ditemukan." });
      return;
    }

    const { nominal_iuran, nominal_iuran_kurang_mampu, nominal_iuran_lansia, persen_rt, persen_rw } = req.body;

    const previousPengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id },
    });
    
    // Validasi basic
    if (nominal_iuran === undefined) {
      res.status(400).json({ success: false, message: "nominal_iuran wajib diisi." });
      return;
    }

    const pRt = persen_rt ?? 70.0;
    const pRw = persen_rw ?? 30.0;

    if (pRt + pRw !== 100.0) {
      res.status(400).json({ success: false, message: "Total persen RT dan RW harus 100%." });
      return;
    }

    const pengaturan = await prisma.$transaction(async (tx) => {
      const saved = await tx.pengaturanIuranRW.upsert({
        where: { wilayah_rw_id: rwWilayah.id },
        update: {
          nominal_iuran: Number(nominal_iuran),
          nominal_iuran_kurang_mampu: Number(nominal_iuran_kurang_mampu ?? 0),
          nominal_iuran_lansia: Number(nominal_iuran_lansia ?? 0),
          persen_rt: Number(pRt),
          persen_rw: Number(pRw),
        },
        create: {
          wilayah_rw_id: rwWilayah.id,
          nominal_iuran: Number(nominal_iuran),
          nominal_iuran_kurang_mampu: Number(nominal_iuran_kurang_mampu ?? 0),
          nominal_iuran_lansia: Number(nominal_iuran_lansia ?? 0),
          persen_rt: Number(pRt),
          persen_rw: Number(pRw),
        },
      });

      // Update nominal of all unpaid iurans for MAMPU warga
      await tx.iuranWarga.updateMany({
        where: {
          status: StatusIuran.BELUM,
          warga: {
            deleted_at: null,
            status_keluarga: "MAMPU",
            blok_wilayah: {
              wilayah_rw_id: rwWilayah.id,
            },
          },
        },
        data: {
          nominal: Number(nominal_iuran),
        },
      });

      // Update nominal of all unpaid iurans for KURANG_MAMPU warga
      await tx.iuranWarga.updateMany({
        where: {
          status: StatusIuran.BELUM,
          warga: {
            deleted_at: null,
            status_keluarga: "KURANG_MAMPU",
            blok_wilayah: {
              wilayah_rw_id: rwWilayah.id,
            },
          },
        },
        data: {
          nominal: Number(nominal_iuran_kurang_mampu ?? 0),
        },
      });

      // Update nominal of all unpaid iurans for LANSIA warga
      await tx.iuranWarga.updateMany({
        where: {
          status: StatusIuran.BELUM,
          warga: {
            deleted_at: null,
            status_keluarga: "LANSIA",
            blok_wilayah: {
              wilayah_rw_id: rwWilayah.id,
            },
          },
        },
        data: {
          nominal: Number(nominal_iuran_lansia ?? 0),
        },
      });

      return saved;
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "PengaturanIuranRW",
      entitas_id: pengaturan.id,
      data_lama: previousPengaturan,
      data_baru: pengaturan,
      keterangan: "Perubahan nominal iuran bulanan dan pembagian kas RT/RW.",
    });

    res.status(200).json({
      success: true,
      message: "Pengaturan iuran berhasil disimpan.",
      data: pengaturan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menyimpan pengaturan iuran." });
  }
};

export const getPengaturanIuranHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Akses ditolak. Wilayah RW tidak ditemukan." });
      return;
    }

    const currentPengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id },
      select: { id: true },
    });

    if (!currentPengaturan) {
      res.status(200).json({
        success: true,
        message: "Riwayat pengaturan iuran belum tersedia.",
        data: [],
      });
      return;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entitas: "PengaturanIuranRW",
        entitas_id: currentPengaturan.id,
      },
      include: {
        user: {
          select: { id: true, nama: true, email: true, role: true },
        },
      },
      orderBy: { created_at: "asc" },
    });

    const historyAscending = auditLogs.reduce<{
      items: PengaturanIuranHistoryItem[];
      lastSnapshot: PengaturanIuranSnapshot | null;
    }>((acc, log) => {
      const dataBaru = parseSnapshot(log.data_baru);
      const dataLama = parseSnapshot(log.data_lama) ?? acc.lastSnapshot;
      const perubahan = buildHistoryDiff(dataLama, dataBaru);

      acc.items.push({
        id: log.id,
        created_at: log.created_at.toISOString(),
        keterangan: log.keterangan,
        data_lama: dataLama,
        data_baru: dataBaru,
        perubahan,
        user: log.user,
      });

      acc.lastSnapshot = dataBaru ?? dataLama;
      return acc;
    }, { items: [], lastSnapshot: null });

    res.status(200).json({
      success: true,
      message: "Riwayat pengaturan iuran berhasil diambil.",
      data: historyAscending.items.reverse(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil riwayat pengaturan iuran.",
    });
  }
};

export const exportPengaturanIuranHistoryPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true, no_rw: true, nama_kompleks: true },
    });

    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Akses ditolak. Wilayah RW tidak ditemukan." });
      return;
    }

    const currentPengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id },
      select: { id: true },
    });

    if (!currentPengaturan) {
      res.status(404).json({ success: false, message: "Histori pengaturan iuran belum tersedia." });
      return;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entitas: "PengaturanIuranRW",
        entitas_id: currentPengaturan.id,
      },
      include: {
        user: {
          select: { id: true, nama: true, email: true, role: true },
        },
      },
      orderBy: { created_at: "asc" },
    });

    const historyAscending = auditLogs.reduce<{
      items: PengaturanIuranHistoryItem[];
      lastSnapshot: PengaturanIuranSnapshot | null;
    }>((acc, log) => {
      const dataBaru = parseSnapshot(log.data_baru);
      const dataLama = parseSnapshot(log.data_lama) ?? acc.lastSnapshot;
      const perubahan = buildHistoryDiff(dataLama, dataBaru);

      acc.items.push({
        id: log.id,
        created_at: log.created_at.toISOString(),
        keterangan: log.keterangan,
        data_lama: dataLama,
        data_baru: dataBaru,
        perubahan,
        user: log.user,
      });

      acc.lastSnapshot = dataBaru ?? dataLama;
      return acc;
    }, { items: [], lastSnapshot: null });

    const history = historyAscending.items.reverse();

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    const filename = `histori-pengaturan-iuran-rw-${rwWilayah.no_rw}-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    const formatCurrency = (val: any) => {
      if (val === null || val === undefined) return "-";
      const numericValue = Number(val);
      if (!Number.isFinite(numericValue)) return "-";
      if (numericValue === 0) return "Rp 0 (Gratis)";
      return `Rp ${numericValue.toLocaleString("id-ID")}`;
    };

    const formatPercent = (val: any) => {
      if (val === null || val === undefined) return "-";
      const numericValue = Number(val);
      if (!Number.isFinite(numericValue)) return "-";
      return `${numericValue}%`;
    };

    const formatDateTime = (value: string) =>
      new Date(value).toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB";

    // Header RW Branding
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#312e81").text("LAPORAN REKAPITULASI HISTORI PERUBAHAN PENGATURAN IURAN RT", { align: "center" });
    doc.moveDown(0.25);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e293b").text(`WILAYAH RW ${rwWilayah.no_rw} - KOMPLEKS ${rwWilayah.nama_kompleks.toUpperCase()}`, { align: "center" });
    doc.fontSize(10).font("Helvetica").fillColor("#64748b").text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });
    doc.moveDown(1.5);

    // Summary stats
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("Ringkasan Kebijakan Iuran Periode Ini:");
    doc.moveDown(0.4);

    let currentY = doc.y;
    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    doc.text(`Total Perubahan: ${history.length} kali`, 40, currentY);
    if (history.length > 0) {
      doc.text(`Terakhir Diubah: ${formatDateTime(history[0].created_at)}`, 300, currentY);
    }
    doc.moveDown(1.5);

    // Table drawing
    const headers = ["Waktu", "Diubah Oleh", "Detail Perubahan", "Catatan"];
    const colWidths = [110, 110, 170, 125];
    const colAligns: Array<"left" | "center" | "right"> = ["center", "left", "left", "left"];
    let tableY = doc.y;

    const drawRowDynamic = (rowData: string[], isHeader = false) => {
      doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(8);
      
      let maxH = 22;
      if (!isHeader) {
        rowData.forEach((text, i) => {
          const textHeight = doc.heightOfString(text, { width: colWidths[i] - 8 }) + 10;
          if (textHeight > maxH) {
            maxH = textHeight;
          }
        });
      }

      if (tableY + maxH > 750) {
        doc.addPage();
        tableY = 40;
      }

      let x = 40;
      rowData.forEach((text, i) => {
        if (isHeader) {
          doc.rect(x, tableY, colWidths[i], maxH).fillColor("#312e81").fill();
          doc.rect(x, tableY, colWidths[i], maxH).strokeColor("#cbd5e1").stroke();
          doc.fillColor("#ffffff").text(text, x + 4, tableY + (maxH - 8) / 2, { width: colWidths[i] - 8, align: colAligns[i] });
        } else {
          doc.rect(x, tableY, colWidths[i], maxH).strokeColor("#e2e8f0").stroke();
          doc.fillColor("#1e293b").text(text, x + 4, tableY + 5, { width: colWidths[i] - 8, align: colAligns[i] });
        }
        x += colWidths[i];
      });
      tableY += maxH;
    };

    drawRowDynamic(headers, true);
    
    history.forEach((item) => {
      const changesText = item.perubahan.map((change) => {
        const isNominal = ["nominal_iuran", "nominal_iuran_kurang_mampu", "nominal_iuran_lansia"].includes(change.field);
        const lamaStr = isNominal ? formatCurrency(Number(change.lama)) : formatPercent(change.lama);
        const baruStr = isNominal ? formatCurrency(Number(change.baru)) : formatPercent(change.baru);
        return `${change.label}: ${lamaStr} -> ${baruStr}`;
      }).join("\n");

      drawRowDynamic([
        formatDateTime(item.created_at),
        `${item.user?.nama || item.user?.email || "-"} (${item.user?.role || "-"})`,
        changesText || "Tidak ada perubahan nilai",
        item.keterangan ? `"${item.keterangan}"` : "-"
      ]);
    });

    // Add Signature section
    const signatureHeight = 100;
    if (tableY + signatureHeight > 750) {
      doc.addPage();
      tableY = 40;
    }

    doc.y = tableY;
    doc.moveDown(2);
    tableY = doc.y;
    
    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    const today = new Date();
    const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    doc.text(`Kota Bandung, ${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`, 350, tableY, { align: "center", width: 200 });
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").text("Ketua RW", 350, doc.y, { align: "center", width: 200 });
    doc.moveDown(3.5);
    doc.font("Helvetica-Bold").text("( ____________________ )", 350, doc.y, { align: "center", width: 200 });

    doc.end();
  } catch (error) {
    console.error("Error exporting pengaturan iuran history PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengekspor histori iuran ke PDF." });
    }
  }
};
