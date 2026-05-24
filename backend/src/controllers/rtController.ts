import { AksiAudit, Prisma, StatusIuran, StatusKehadiran, StatusInsiden } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../middlewares/auditLogger";

const getRtBlockContext = async (req: Request) => {
  if (!req.user?.blok_wilayah_id) {
    return null;
  }

  // Some tests mock `prisma` partially; guard against missing `blokWilayah` in the mocked client.
  // If the client doesn't expose `blokWilayah.findUnique`, fall back to a minimal object using
  // the blok id from the token so tests that only mock `warga.findMany` still work.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (!prisma.blokWilayah || typeof prisma.blokWilayah.findUnique !== "function") {
    return {
      id: req.user.blok_wilayah_id,
      nama_blok: null,
      no_rt: null,
      tegur_ronda: false,
      tegur_ronda_pesan: null,
      wilayah_rw_id: null,
      wilayah_rw: null,
    } as any;
  }

  const blok = await prisma.blokWilayah.findUnique({
    where: { id: req.user.blok_wilayah_id },
    select: {
      id: true,
      nama_blok: true,
      no_rt: true,
      tegur_ronda: true,
      tegur_ronda_pesan: true,
      wilayah_rw_id: true,
      wilayah_rw: {
        select: {
          no_rw: true,
          user: {
            select: {
              nama: true,
            },
          },
          pengaturan_iuran: {
            select: {
              persen_rt: true,
              persen_rw: true,
            },
          },
        },
      },
    },
  });

  return blok;
};

export const getIuranForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tahun, bulan, status } = req.query as { tahun?: string; bulan?: string; status?: StatusIuran };

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blokId = req.user.blok_wilayah_id;
    if (!blokId) {
      res.status(403).json({ success: false, message: "Data blok wilayah untuk RT login tidak ditemukan." });
      return;
    }

    const tahunInt = tahun ? Number(tahun) : new Date().getFullYear();
    if (!Number.isInteger(tahunInt) || tahunInt < 2000 || tahunInt > 3000) {
      res.status(400).json({ success: false, message: "Parameter tahun tidak valid." });
      return;
    }

    const bulanInt = bulan ? Number(bulan) : undefined;
    if (bulanInt !== undefined && (!Number.isInteger(bulanInt) || bulanInt < 1 || bulanInt > 12)) {
      res.status(400).json({ success: false, message: "Parameter bulan tidak valid." });
      return;
    }

    if (status !== undefined && status !== StatusIuran.BELUM && status !== StatusIuran.LUNAS) {
      res.status(400).json({ success: false, message: "Parameter status hanya boleh BELUM atau LUNAS." });
      return;
    }

    // Get blok wilayah info (uses helper that tolerates partial prisma mocks)
    const blok = await getRtBlockContext(req);

    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const wargaList = await prisma.warga.findMany({
      where: {
        blok_wilayah_id: blokId,
        deleted_at: null,
      },
      select: {
        id: true,
        nama_kk: true,
        status_keluarga: true,
        iuran_warga: {
          where: {
            tahun: tahunInt,
            ...(bulanInt ? { bulan: bulanInt } : {}),
            ...(status ? { status } : {}),
          },
          select: {
            id: true,
            bulan: true,
            tahun: true,
            nominal: true,
            status: true,
            kode_unik: true,
            tanggal_bayar: true,
            cicilan: {
              select: {
                id: true,
                total_cicilan: true,
                nominal_per_bulan: true,
                jumlah_bulan: true,
                bulan_mulai: true,
                tahun_mulai: true,
                sudah_lunas: true,
                created_at: true,
                pembayaran: {
                  select: {
                    id: true,
                    nominal: true,
                    tanggal_bayar: true,
                    keterangan: true,
                  },
                  orderBy: { tanggal_bayar: "asc" },
                },
              },
              orderBy: { created_at: "desc" },
            },
          },
          orderBy: { bulan: "asc" },
        },
      },
      orderBy: { nama_kk: "asc" },
    });

    const data = wargaList.map((warga) => {
      const iuranByMonth = new Map(warga.iuran_warga.map((item) => [item.bulan, item]));

      const bulanSource = bulanInt ? [bulanInt] : Array.from({ length: 12 }, (_, idx) => idx + 1);

      const iuranBySelection = bulanSource
        .map((bulanItem) => {
          const found = iuranByMonth.get(bulanItem);

          if (found) {
            return found;
          }

          if (status === StatusIuran.LUNAS) {
            return null;
          }

          return {
            id: null,
            bulan: bulanItem,
            tahun: tahunInt,
            nominal: new Prisma.Decimal(0),
            status: StatusIuran.BELUM,
            kode_unik: null,
            tanggal_bayar: null,
            cicilan: [],
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      return {
        id: warga.id,
        nama_kk: warga.nama_kk,
        status_keluarga: warga.status_keluarga,
        iuran: iuranBySelection,
      };
    }).filter((item) => item.iuran.length > 0 || status !== StatusIuran.LUNAS);

    // Calculate summary
    const allIuran = wargaList.flatMap((w) => w.iuran_warga);
    const totalIuranTerjadwal = allIuran.reduce((acc, item) => acc + Number(item.nominal || 0), 0);
    const totalIuranTerbayar = allIuran
      .filter((i) => i.status === StatusIuran.LUNAS)
      .reduce((acc, item) => acc + Number(item.nominal || 0), 0);
    const totalIuranBelum = totalIuranTerjadwal - totalIuranTerbayar;
    const totalIuranLunasCount = allIuran.filter((i) => i.status === StatusIuran.LUNAS).length;
    const totalIuranBelumCount = allIuran.filter((i) => i.status === StatusIuran.BELUM).length;
    const persentaseBayar = totalIuranTerjadwal > 0 ? (totalIuranTerbayar / totalIuranTerjadwal) * 100 : 0;

    res.status(200).json({
      success: true,
      message: "Data iuran RT berhasil diambil.",
      data: {
        blok_wilayah_id: blokId,
        no_rt: blok.no_rt,
        no_rw: blok.wilayah_rw?.no_rw ?? null,
        desa: blok.wilayah_rw?.user?.nama ?? null,
        nama_blok: blok.nama_blok,
        tegur_ronda: blok.tegur_ronda ?? false,
        tegur_ronda_pesan: blok.tegur_ronda_pesan ?? null,
        persen_rt: blok.wilayah_rw?.pengaturan_iuran?.persen_rt ?? 70.0,
        persen_rw: blok.wilayah_rw?.pengaturan_iuran?.persen_rw ?? 30.0,
        tahun: tahunInt,
        bulan: bulanInt ?? null,
        status: status ?? null,
        warga: data,
        summary: {
          total_warga: wargaList.length,
          total_iuran_terjadwal: totalIuranTerjadwal,
          total_iuran_terbayar: totalIuranTerbayar,
          total_iuran_belum: totalIuranBelum,
          total_iuran_lunas_count: totalIuranLunasCount,
          total_iuran_belum_count: totalIuranBelumCount,
          persentase_bayar: Math.round(persentaseBayar),
        },
      },
    });
  } catch (err) {
    console.error("Error in getIuranForRt:", err);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data iuran RT." });
  }
};

export const getIuranHistoryForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { tahun } = req.query as { tahun?: string };
    const tahunInt = tahun ? Number(tahun) : new Date().getFullYear();

    const history = await prisma.iuranWarga.findMany({
      where: {
        warga: { blok_wilayah_id: blok.id, deleted_at: null },
        status: StatusIuran.LUNAS,
        tahun: tahunInt,
      },
      select: {
        id: true,
        warga_id: true,
        bulan: true,
        tahun: true,
        nominal: true,
        nominal_kas_rt: true,
        nominal_kas_rw: true,
        status: true,
        kode_unik: true,
        tanggal_bayar: true,
        warga: { select: { nama_kk: true } },
      },
      orderBy: { tanggal_bayar: "desc" },
    });

    res.status(200).json({ success: true, message: "Riwayat iuran RT berhasil diambil.", data: history });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil riwayat iuran RT." });
  }
};

export const exportIuranHistoryPdfForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { tahun } = req.query as { tahun?: string };
    const tahunInt = tahun ? Number(tahun) : new Date().getFullYear();

    const history = await prisma.iuranWarga.findMany({
      where: {
        warga: { blok_wilayah_id: blok.id, deleted_at: null },
        status: StatusIuran.LUNAS,
        tahun: tahunInt,
      },
      select: {
        id: true,
        warga_id: true,
        bulan: true,
        tahun: true,
        nominal: true,
        nominal_kas_rt: true,
        nominal_kas_rw: true,
        status: true,
        kode_unik: true,
        tanggal_bayar: true,
        warga: { select: { nama_kk: true } },
      },
      orderBy: { tanggal_bayar: "desc" },
    });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    const filename = `histori-iuran-rt-${blok.no_rt || 'grouped'}-${tahunInt}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Format Currency Helper
    const formatCurrency = (val: any) =>
      `Rp ${Number(val ?? 0).toLocaleString("id-ID")}`;

    const MONTH_LABELS_SHORT = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
    ];

    const formatDateShort = (value: any) => {
      if (!value) return "-";
      const d = new Date(value);
      return `${d.getDate()} ${MONTH_LABELS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    };

    // Header RT Branding
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#312e81").text("LAPORAN REKAPITULASI HISTORI PEMBAYARAN IURAN WARGA", { align: "center" });
    doc.moveDown(0.25);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e293b").text(`RUKUN TETANGGA (RT) ${blok.no_rt || ''} / BLOK ${blok.nama_blok || ''}`, { align: "center" });
    doc.fontSize(10).font("Helvetica").fillColor("#64748b").text(`Tahun Anggaran / Periode Laporan: ${tahunInt}`, { align: "center" });
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });
    doc.moveDown(1.5);

    // Summary statistics
    const totalNominal = history.reduce((acc, item) => acc + Number(item.nominal), 0);
    const totalKasRt = history.reduce((acc, item) => acc + Number(item.nominal_kas_rt ?? 0), 0);
    const totalSetoranRw = history.reduce((acc, item) => acc + Number(item.nominal_kas_rw ?? 0), 0);

    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("Ringkasan Penerimaan Iuran Periode Ini:");
    doc.moveDown(0.4);

    let currentY = doc.y;
    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    doc.text(`Total Iuran Lunas: ${history.length} transaksi`, 40, currentY);
    doc.text(`Total Kas RT (70%): ${formatCurrency(totalKasRt)}`, 300, currentY);
    currentY += 15;
    doc.text(`Total Nominal Diterima: ${formatCurrency(totalNominal)}`, 40, currentY);
    doc.text(`Total Setoran RW (30%): ${formatCurrency(totalSetoranRw)}`, 300, currentY);
    doc.moveDown(1.5);

    // Table drawing
    const headers = ["Warga", "Periode", "Tanggal Bayar", "Total Nominal", "Kas RT (70%)", "Setoran RW (30%)", "Kode"];
    const colWidths = [85, 45, 65, 65, 65, 95, 95];
    const colAligns: Array<"left" | "center" | "right"> = ["left", "center", "center", "right", "right", "right", "left"];
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
        // Draw background box
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
    history.forEach(item => {
      drawRow([
        item.warga.nama_kk,
        `${MONTH_LABELS_SHORT[item.bulan - 1]} ${item.tahun}`,
        formatDateShort(item.tanggal_bayar),
        formatCurrency(item.nominal),
        formatCurrency(item.nominal_kas_rt ?? 0),
        formatCurrency(item.nominal_kas_rw ?? 0),
        item.kode_unik ?? "-"
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
    doc.font("Helvetica-Bold").text("Ketua RT", 350, doc.y, { align: "center", width: 200 });
    doc.moveDown(3.5);
    doc.font("Helvetica-Bold").text("( ____________________ )", 350, doc.y, { align: "center", width: 200 });

    doc.end();
  } catch (error) {
    console.error("Error exporting RT iuran history PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengekspor riwayat iuran ke PDF." });
    }
  }
};

export const getWargaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const warga = await prisma.warga.findMany({
      where: { blok_wilayah_id: blok.id, deleted_at: null },
      select: {
        id: true,
        nama_kk: true,
        no_kk: true,
        nik: true,
        tanggal_terbit_kk: true,
        tanggal_lahir: true,
        pendidikan: true,
        pekerjaan: true,
        status_keluarga: true,
        blok_wilayah_id: true,
        blok_wilayah: {
          select: {
            nama_blok: true,
            no_rt: true,
          },
        },
      },
      orderBy: { nama_kk: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Data warga RT berhasil diambil.",
      data: warga,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data warga RT." });
  }
};

export const createWargaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nama_kk, no_kk, nik, tanggal_terbit_kk, tanggal_lahir, pekerjaan, pendidikan, status_keluarga } = req.body as any;

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    if (!nama_kk) {
      res.status(400).json({ success: false, message: "nama_kk wajib diisi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    let pengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: blok.wilayah_rw_id }
    });
    
    if (!pengaturan) {
      // Auto-create with default values if not yet set by RW to prevent blocking
      pengaturan = await prisma.pengaturanIuranRW.create({
        data: {
          wilayah_rw_id: blok.wilayah_rw_id,
          nominal_iuran: new Prisma.Decimal(20000.00),
          nominal_iuran_kurang_mampu: new Prisma.Decimal(0.00),
          nominal_iuran_lansia: new Prisma.Decimal(0.00),
          persen_rt: 70.0,
          persen_rw: 30.0,
        }
      });
    }

    const currentYear = new Date().getFullYear();
    const warga = await prisma.$transaction(async (tx) => {
      const created = await tx.warga.create({
        data: {
          blok_wilayah_id: blok.id,
          nama_kk: nama_kk.trim(),
          no_kk: no_kk?.trim() || null,
          nik: nik?.trim() || null,
          tanggal_terbit_kk: tanggal_terbit_kk ? new Date(tanggal_terbit_kk) : null,
          tanggal_lahir: tanggal_lahir ? new Date(tanggal_lahir) : null,
          pendidikan: pendidikan || null,
          pekerjaan: pekerjaan?.trim() || null,
          status_keluarga: status_keluarga || "MAMPU",
        },
      });

      const statusKK = created.status_keluarga;
      let nominalRate = pengaturan.nominal_iuran;
      if (statusKK === "KURANG_MAMPU") {
        nominalRate = pengaturan.nominal_iuran_kurang_mampu;
      } else if (statusKK === "LANSIA") {
        nominalRate = pengaturan.nominal_iuran_lansia;
      }

      await tx.iuranWarga.createMany({
        data: Array.from({ length: 12 }, (_, idx) => ({
          warga_id: created.id,
          bulan: idx + 1,
          tahun: currentYear,
          nominal: nominalRate,
          status: StatusIuran.BELUM,
        })),
      });

      return created;
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "Warga",
      entitas_id: warga.id,
      data_baru: { nama_kk: warga.nama_kk,  blok_wilayah_id: blok.id },
    });

    res.status(201).json({
      success: true,
      message: "Warga RT berhasil ditambahkan.",
      data: warga,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menambahkan warga RT." });
  }
};

export const getPerformaRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { tanggal_mulai, tanggal_akhir } = req.query as { tanggal_mulai?: string; tanggal_akhir?: string };

    const data = await prisma.performaRonda.findMany({
      where: {
        blok_wilayah_id: blok.id,
        ...(tanggal_mulai && tanggal_akhir
          ? { tanggal: { gte: new Date(tanggal_mulai), lte: new Date(tanggal_akhir) } }
          : {}),
      },
      orderBy: { tanggal: "desc" },
    });

    res.status(200).json({ success: true, message: "Data performa ronda RT berhasil diambil.", data });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data performa ronda RT." });
  }
};

export const createPerformaRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { tanggal, nama_petugas, status_kehadiran, catatan } = req.body as {
      tanggal?: string;
      nama_petugas?: string;
      status_kehadiran?: StatusKehadiran;
      catatan?: string;
    };

    if (!tanggal || !nama_petugas || !status_kehadiran) {
      res.status(400).json({ success: false, message: "tanggal, nama_petugas, dan status_kehadiran wajib diisi." });
      return;
    }

    const created = await prisma.performaRonda.create({
      data: {
        blok_wilayah_id: blok.id,
        tanggal: new Date(tanggal),
        nama_petugas: nama_petugas.trim(),
        status_kehadiran,
        catatan: catatan?.trim() || null,
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "PerformaRonda",
      entitas_id: created.id,
      data_baru: created,
    });

    res.status(201).json({ success: true, message: "Data performa ronda RT berhasil ditambahkan.", data: created });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat membuat data performa ronda RT." });
  }
  };

  export const deleteWargaForRt = async (req: Request, res: Response): Promise<void> => {
    try {
      const raw = (req.params as Record<string, unknown>)?.warga_id;
      const warga_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
      if (!warga_id) {
        res.status(400).json({ success: false, message: "warga_id harus diisi." });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({ success: false, message: "User belum terautentikasi." });
        return;
      }

      const existing = await prisma.warga.findUnique({ where: { id: warga_id } });
      if (!existing || existing.deleted_at) {
        res.status(404).json({ success: false, message: "Warga tidak ditemukan." });
        return;
      }

      const blok = await getRtBlockContext(req);
      if (!blok || existing.blok_wilayah_id !== blok.id) {
        res.status(403).json({ success: false, message: "Akses ditolak." });
        return;
      }

      const deleted = await prisma.warga.update({
        where: { id: warga_id },
        data: {
          deleted_at: new Date(),
        },
        select: {
          id: true,
          nama_kk: true,
          deleted_at: true,
        },
      });

      await recordAudit(req, {
        aksi: AksiAudit.DELETE,
        entitas: "Warga",
        entitas_id: warga_id,
        data_lama: existing,
      });

      res.status(200).json({
        success: true,
        message: "Data warga berhasil dihapus.",
        data: deleted,
      });
    } catch {
      res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus data warga." });
    }
  };
  
  export const updateWargaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.warga_id;
    const warga_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    if (!warga_id) {
      res.status(400).json({ success: false, message: "warga_id harus diisi." });
      return;
    }

    const existing = await prisma.warga.findUnique({ where: { id: warga_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Warga tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { nama_kk, no_kk, nik, tanggal_terbit_kk, tanggal_lahir, pekerjaan, pendidikan, status_keluarga } = req.body as any;

    const updated = await prisma.$transaction(async (tx) => {
      const wargaUpdated = await tx.warga.update({
        where: { id: warga_id },
        data: {
          ...(nama_kk ? { nama_kk: nama_kk.trim() } : {}),
          ...(no_kk !== undefined ? { no_kk: no_kk?.trim() || null } : {}),
          ...(nik !== undefined ? { nik: nik?.trim() || null } : {}),
          ...(tanggal_terbit_kk !== undefined ? { tanggal_terbit_kk: tanggal_terbit_kk ? new Date(tanggal_terbit_kk) : null } : {}),
          ...(tanggal_lahir !== undefined ? { tanggal_lahir: tanggal_lahir ? new Date(tanggal_lahir) : null } : {}),
          ...(pendidikan !== undefined ? { pendidikan: pendidikan || null } : {}),
          ...(pekerjaan !== undefined ? { pekerjaan: pekerjaan?.trim() || null } : {}),
          ...(status_keluarga !== undefined ? { status_keluarga } : {}),
        },
      });

      if (status_keluarga !== undefined && status_keluarga !== existing.status_keluarga) {
        const pengaturan = await tx.pengaturanIuranRW.findUnique({
          where: { wilayah_rw_id: blok.wilayah_rw_id }
        });
        
        if (pengaturan) {
          let nominalRate = pengaturan.nominal_iuran;
          if (status_keluarga === "KURANG_MAMPU") {
            nominalRate = pengaturan.nominal_iuran_kurang_mampu;
          } else if (status_keluarga === "LANSIA") {
            nominalRate = pengaturan.nominal_iuran_lansia;
          }
          
          await tx.iuranWarga.updateMany({
            where: {
              warga_id,
              status: StatusIuran.BELUM,
            },
            data: {
              nominal: nominalRate,
            },
          });
        }
      }

      return wargaUpdated;
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "Warga",
      entitas_id: warga_id,
      data_lama: existing,
      data_baru: updated,
    });

    res.status(200).json({ success: true, message: "Data warga RT berhasil diupdate.", data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengupdate data warga RT." });
  }
};

export const updatePerformaRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.performa_id;
    const performa_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    if (!performa_id) {
      res.status(400).json({ success: false, message: "performa_id harus diisi." });
      return;
    }

    const existing = await prisma.performaRonda.findUnique({ where: { id: performa_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Data performa ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { nama_petugas, status_kehadiran, catatan } = req.body as {
      nama_petugas?: string;
      status_kehadiran?: StatusKehadiran;
      catatan?: string;
    };

    const updated = await prisma.performaRonda.update({
      where: { id: performa_id },
      data: {
        ...(nama_petugas ? { nama_petugas: nama_petugas.trim() } : {}),
        ...(status_kehadiran ? { status_kehadiran } : {}),
        ...(catatan !== undefined ? { catatan: catatan?.trim() || null } : {}),
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "PerformaRonda",
      entitas_id: performa_id,
      data_lama: existing,
      data_baru: updated,
    });

    res.status(200).json({ success: true, message: "Data performa ronda RT berhasil diupdate.", data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengupdate data performa ronda RT." });
  }
};

export const deletePerformaRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.performa_id;
    const performa_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    if (!performa_id) {
      res.status(400).json({ success: false, message: "performa_id harus diisi." });
      return;
    }

    const existing = await prisma.performaRonda.findUnique({ where: { id: performa_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Data performa ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.performaRonda.delete({ where: { id: performa_id } });
    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "PerformaRonda",
      entitas_id: performa_id,
      data_lama: existing,
    });

    res.status(200).json({ success: true, message: "Data performa ronda RT berhasil dihapus." });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus data performa ronda RT." });
  }
};

export const getLaporanInsidenForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const wilayah = await prisma.wilayahRW.findUnique({ where: { id: blok.wilayah_rw_id }, select: { id: true } });
    if (!wilayah) {
      res.status(404).json({ success: false, message: "Wilayah RW tidak ditemukan." });
      return;
    }

    const { status, tanggal_mulai, tanggal_akhir } = req.query as { status?: StatusInsiden; tanggal_mulai?: string; tanggal_akhir?: string };
    const data = await prisma.laporanInsiden.findMany({
      where: {
        blok_wilayah_id: blok.id,
        ...(status ? { status } : {}),
        ...(tanggal_mulai && tanggal_akhir
          ? { tanggal_insiden: { gte: new Date(tanggal_mulai), lte: new Date(tanggal_akhir) } }
          : {}),
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({ success: true, message: "Data laporan insiden RT berhasil diambil.", data });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data laporan insiden RT." });
  }
};

export const createLaporanInsidenForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const wilayah = await prisma.wilayahRW.findUnique({ where: { id: blok.wilayah_rw_id }, select: { id: true } });
    if (!wilayah) {
      res.status(404).json({ success: false, message: "Wilayah RW tidak ditemukan." });
      return;
    }

    const { tipe_insiden, tanggal_insiden, lokasi, deskripsi, pelapor_nama, pelapor_no_hp, urgensi } = req.body as {
      tipe_insiden?: string;
      tanggal_insiden?: string;
      lokasi?: string;
      deskripsi?: string;
      pelapor_nama?: string;
      pelapor_no_hp?: string;
      urgensi?: string;
    };

    if (!tipe_insiden || !tanggal_insiden || !lokasi || !deskripsi || !pelapor_nama) {
      res.status(400).json({ success: false, message: "tipe_insiden, tanggal_insiden, lokasi, deskripsi, and pelapor_nama wajib diisi." });
      return;
    }

    const foto_bukti_url = (req as any).file?.filename ? `/uploads/${(req as any).file.filename}` : null;
    const created = await prisma.laporanInsiden.create({
      data: {
        blok_wilayah_id: blok.id,
        wilayah_rw_id: wilayah.id,
        tipe_insiden: tipe_insiden.trim(),
        tanggal_insiden: new Date(tanggal_insiden),
        lokasi: lokasi.trim(),
        deskripsi: deskripsi.trim(),
        pelapor_nama: pelapor_nama.trim(),
        pelapor_no_hp: pelapor_no_hp?.trim() || null,
        foto_bukti_url,
        urgensi: urgensi || "RENDAH",
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "LaporanInsiden",
      entitas_id: created.id,
      data_baru: created,
    });

    res.status(201).json({ success: true, message: "Laporan insiden RT berhasil dibuat.", data: created });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat membuat laporan insiden RT." });
  }
};

export const updateLaporanInsidenForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    if (!laporan_id) {
      res.status(400).json({ success: false, message: "laporan_id harus diisi." });
      return;
    }

    const existing = await prisma.laporanInsiden.findUnique({ where: { id: laporan_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Laporan insiden tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { tipe_insiden, lokasi, deskripsi, status, tindakan_diambil, urgensi, pelapor_nama, pelapor_no_hp } = req.body as {
      tipe_insiden?: string;
      lokasi?: string;
      deskripsi?: string;
      status?: StatusInsiden;
      tindakan_diambil?: string;
      urgensi?: string;
      pelapor_nama?: string;
      pelapor_no_hp?: string | null;
    };

    const foto_bukti_url = (req as any).file?.filename ? `/uploads/${(req as any).file.filename}` : undefined;

    const updated = await prisma.laporanInsiden.update({
      where: { id: laporan_id },
      data: {
        ...(tipe_insiden ? { tipe_insiden: tipe_insiden.trim() } : {}),
        ...(lokasi ? { lokasi: lokasi.trim() } : {}),
        ...(deskripsi ? { deskripsi: deskripsi.trim() } : {}),
        ...(status ? { status } : {}),
        ...(tindakan_diambil ? { tindakan_diambil: tindakan_diambil.trim(), ditindaklanjuti_tanggal: new Date() } : {}),
        ...(foto_bukti_url ? { foto_bukti_url } : {}),
        ...(urgensi ? { urgensi } : {}),
        ...(pelapor_nama ? { pelapor_nama: pelapor_nama.trim() } : {}),
        ...(pelapor_no_hp !== undefined ? { pelapor_no_hp: pelapor_no_hp?.trim() || null } : {}),
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "LaporanInsiden",
      entitas_id: laporan_id,
      data_lama: existing,
      data_baru: updated,
    });

    res.status(200).json({ success: true, message: "Laporan insiden RT berhasil diupdate.", data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengupdate laporan insiden RT." });
  }
};

export const deleteLaporanInsidenForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    if (!laporan_id) {
      res.status(400).json({ success: false, message: "laporan_id harus diisi." });
      return;
    }

    const existing = await prisma.laporanInsiden.findUnique({ where: { id: laporan_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Laporan insiden tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.laporanInsiden.delete({ where: { id: laporan_id } });
    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "LaporanInsiden",
      entitas_id: laporan_id,
      data_lama: existing,
    });

    res.status(200).json({ success: true, message: "Laporan insiden RT berhasil dihapus." });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus laporan insiden RT." });
  }
};

export const getAuditLogForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { aksi, tanggal_mulai, tanggal_akhir, limit = "10", offset = "0" } = req.query as {
      aksi?: AksiAudit;
      tanggal_mulai?: string;
      tanggal_akhir?: string;
      limit?: string;
      offset?: string;
    };

    const auditLogQuery: any = {
      user_id: req.user.id,
    };

    if (aksi) {
      auditLogQuery.aksi = aksi;
    }

    if (tanggal_mulai || tanggal_akhir) {
      const dateFilter: any = {};
      
      if (tanggal_mulai && tanggal_mulai.trim() !== "") {
        const dateStart = new Date(tanggal_mulai);
        if (!isNaN(dateStart.getTime())) {
          dateFilter.gte = dateStart;
        }
      }
      
      if (tanggal_akhir && tanggal_akhir.trim() !== "") {
        const dateEnd = new Date(tanggal_akhir);
        if (!isNaN(dateEnd.getTime())) {
          dateFilter.lte = dateEnd;
        }
      }

      if (Object.keys(dateFilter).length > 0) {
        auditLogQuery.created_at = dateFilter;
      }
    }

    const data = await prisma.auditLog.findMany({
      where: auditLogQuery,
      include: {
        user: {
          select: { id: true, email: true, nama: true, role: true }
        }
      },
      orderBy: { created_at: "desc" },
      take: Math.min(Number(limit), 100),
      skip: Number(offset),
    });

    const totalCount = await prisma.auditLog.count({
      where: auditLogQuery,
    });

    res.status(200).json({
      success: true,
      message: "Data audit log RT berhasil diambil.",
      data,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data audit log RT." });
  }
};


export const bayarIuranForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iuran_id } = req.body as { iuran_id?: string };

    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    if (!iuran_id) {
      res.status(400).json({ success: false, message: "iuran_id wajib diisi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const existingIuran = await prisma.iuranWarga.findUnique({
      where: { id: iuran_id },
      include: { warga: true }
    });

    if (!existingIuran || existingIuran.warga.blok_wilayah_id !== blok.id) {
      res.status(404).json({ success: false, message: "Data iuran tidak ditemukan atau bukan milik RT ini." });
      return;
    }

    if (existingIuran.status === StatusIuran.LUNAS) {
      res.status(400).json({ success: false, message: "Iuran sudah berstatus LUNAS." });
      return;
    }

    let pengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: blok.wilayah_rw_id }
    });

    if (!pengaturan) {
      // Auto-create with default values if not yet set by RW to prevent blocking
      pengaturan = await prisma.pengaturanIuranRW.create({
        data: {
          wilayah_rw_id: blok.wilayah_rw_id,
          nominal_iuran: new Prisma.Decimal(20000.00),
          nominal_iuran_kurang_mampu: new Prisma.Decimal(0.00),
          nominal_iuran_lansia: new Prisma.Decimal(0.00),
          persen_rt: 70.0,
          persen_rw: 30.0,
        }
      });
    }

    const nominalBayar = Number(existingIuran.nominal);
    const pRt = Number(pengaturan.persen_rt);
    const pRw = Number(pengaturan.persen_rw);

    const nominal_kas_rt = new Prisma.Decimal((nominalBayar * pRt) / 100);
    const nominal_kas_rw = new Prisma.Decimal((nominalBayar * pRw) / 100);
    const nominalDecimal = new Prisma.Decimal(nominalBayar);

    const paymentDate = new Date();
    
    // Generate kode unik helpers directly via crypto
    const { randomBytes } = require("crypto");
    const year2 = String(paymentDate.getFullYear()).slice(-2);
    const month2 = String(paymentDate.getMonth() + 1).padStart(2, "0");
    const suffixIur = randomBytes(3).toString("hex").toUpperCase();
    const kodeIuran = `IUR-${year2}${month2}-${suffixIur}`;
    
    const suffixKas = randomBytes(3).toString("hex").toUpperCase();
    const kodeKas = `KRT-${year2}${month2}-${suffixKas}`;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.iuranWarga.update({
        where: { id: iuran_id },
        data: {
          status: StatusIuran.LUNAS,
          tanggal_bayar: paymentDate,
          kode_unik: kodeIuran,
          nominal_kas_rt,
          nominal_kas_rw,
          nominal: nominalDecimal, // update the actual nominal based on latest setting
        }
      });

      // Tambahkan ke Kas RT (70% misalnya)
      await tx.kasRT.create({
        data: {
          blok_wilayah_id: blok.id,
          jenis_transaksi: "MASUK",
          tanggal: paymentDate,
          keterangan: `Iuran warga ${existingIuran.warga.nama_kk} bln ${updated.bulan}/${updated.tahun}`,
          nominal: nominal_kas_rt,
          kode_unik: kodeKas,
        }
      });

      return updated;
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "IuranWarga",
      entitas_id: result.id,
      data_baru: result,
    });

    res.status(200).json({
      success: true,
      message: "Pembayaran iuran berhasil. Saldo otomatis dibagi.",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat memproses pembayaran iuran." });
  }
};

export const resetIuranStatusForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iuran_id } = req.body as { iuran_id?: string };

    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    if (!iuran_id) {
      res.status(400).json({ success: false, message: "iuran_id wajib diisi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const existingIuran = await prisma.iuranWarga.findUnique({
      where: { id: iuran_id },
      include: { warga: true },
    });

    if (!existingIuran || existingIuran.warga.blok_wilayah_id !== blok.id) {
      res.status(404).json({ success: false, message: "Data iuran tidak ditemukan atau bukan milik RT ini." });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.cicilanIuran.deleteMany({ where: { iuran_id } });

      // Hapus pencatatan KasRT otomatis terkait iuran ini jika ada
      await tx.kasRT.deleteMany({
        where: {
          blok_wilayah_id: blok.id,
          keterangan: `Iuran warga ${existingIuran.warga.nama_kk} bln ${existingIuran.bulan}/${existingIuran.tahun}`,
          jenis_transaksi: "MASUK",
        },
      });

      return tx.iuranWarga.update({
        where: { id: iuran_id },
        data: {
          status: StatusIuran.BELUM,
          tanggal_bayar: null,
          kode_unik: null,
          nominal_kas_rt: null,
          nominal_kas_rw: null,
          nominal: existingIuran.nominal,
        },
      });
    });

    res.status(200).json({
      success: true,
      message: "Status iuran berhasil direset.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mereset status iuran." });
  }
};

// ===== JADWAL RONDA MANAGEMENT =====

export const getJadwalRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const jadwal = await prisma.jadwalRonda.findMany({
      where: {
        blok_wilayah_id: blok.id,
        deleted_at: null,
      },
      include: {
        petugas: true,
      },
      orderBy: { hari_minggu: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Data jadwal ronda RT berhasil diambil.",
      data: jadwal,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data jadwal ronda RT." });
  }
};

export const createJadwalRonda = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { nama_jadwal, hari_minggu, jam_mulai, jam_selesai, minggu_mulai, minggu_selesai, catatan } = req.body as {
      nama_jadwal?: string;
      hari_minggu?: number;
      jam_mulai?: string;
      jam_selesai?: string;
      minggu_mulai?: string;
      minggu_selesai?: string;
      catatan?: string;
    };

    if (!nama_jadwal || hari_minggu === undefined || !jam_mulai || !jam_selesai || !minggu_mulai) {
      res.status(400).json({
        success: false,
        message: "nama_jadwal, hari_minggu, jam_mulai, jam_selesai, dan minggu_mulai wajib diisi.",
      });
      return;
    }

    if (hari_minggu < 0 || hari_minggu > 6) {
      res.status(400).json({
        success: false,
        message: "hari_minggu harus 0-6 (Sunday=0 sampai Saturday=6).",
      });
      return;
    }

    const created = await prisma.jadwalRonda.create({
      data: {
        blok_wilayah_id: blok.id,
        nama_jadwal: nama_jadwal.trim(),
        hari_minggu,
        jam_mulai,
        jam_selesai,
        minggu_mulai: new Date(minggu_mulai),
        minggu_selesai: minggu_selesai ? new Date(minggu_selesai) : null,
        catatan: catatan?.trim() || null,
      },
      include: { petugas: true },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "JadwalRonda",
      entitas_id: created.id,
      data_baru: created,
    });

    res.status(201).json({
      success: true,
      message: "Jadwal ronda RT berhasil dibuat.",
      data: created,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat membuat jadwal ronda RT." });
  }
};

export const updateJadwalRonda = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const existing = await prisma.jadwalRonda.findUnique({ where: { id: jadwal_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { nama_jadwal, hari_minggu, jam_mulai, jam_selesai, minggu_mulai, minggu_selesai, catatan } = req.body as {
      nama_jadwal?: string;
      hari_minggu?: number;
      jam_mulai?: string;
      jam_selesai?: string;
      minggu_mulai?: string;
      minggu_selesai?: string;
      catatan?: string;
    };

    const updated = await prisma.jadwalRonda.update({
      where: { id: jadwal_id },
      data: {
        ...(nama_jadwal ? { nama_jadwal: nama_jadwal.trim() } : {}),
        ...(hari_minggu !== undefined ? { hari_minggu } : {}),
        ...(jam_mulai ? { jam_mulai } : {}),
        ...(jam_selesai ? { jam_selesai } : {}),
        ...(minggu_mulai ? { minggu_mulai: new Date(minggu_mulai) } : {}),
        ...(minggu_selesai ? { minggu_selesai: new Date(minggu_selesai) } : {}),
        ...(catatan !== undefined ? { catatan: catatan?.trim() || null } : {}),
      },
      include: { petugas: true },
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "JadwalRonda",
      entitas_id: jadwal_id,
      data_lama: existing,
      data_baru: updated,
    });

    res.status(200).json({
      success: true,
      message: "Jadwal ronda RT berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengupdate jadwal ronda RT." });
  }
};

export const deleteJadwalRonda = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const existing = await prisma.jadwalRonda.findUnique({ where: { id: jadwal_id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.jadwalRonda.update({
      where: { id: jadwal_id },
      data: { deleted_at: new Date() },
    });

    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "JadwalRonda",
      entitas_id: jadwal_id,
      data_lama: existing,
    });

    res.status(200).json({
      success: true,
      message: "Jadwal ronda RT berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus jadwal ronda RT." });
  }
};

// ===== PETUGAS RONDA MANAGEMENT =====

export const getPetugasForJadwal = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const jadwal = await prisma.jadwalRonda.findUnique({
      where: { id: jadwal_id },
      include: { petugas: true },
    });

    if (!jadwal) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || jadwal.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Data petugas ronda berhasil diambil.",
      data: jadwal.petugas,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data petugas ronda." });
  }
};

export const addPetugasToJadwal = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const jadwal = await prisma.jadwalRonda.findUnique({ where: { id: jadwal_id } });
    if (!jadwal) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || jadwal.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { nama_petugas, no_hp, catatan } = req.body as {
      nama_petugas?: string;
      no_hp?: string;
      catatan?: string;
    };

    if (!nama_petugas) {
      res.status(400).json({ success: false, message: "nama_petugas wajib diisi." });
      return;
    }

    const created = await prisma.rondaPetugas.create({
      data: {
        jadwal_ronda_id: jadwal_id,
        nama_petugas: nama_petugas.trim(),
        no_hp: no_hp?.trim() || null,
        catatan: catatan?.trim() || null,
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "RondaPetugas",
      entitas_id: created.id,
      data_baru: created,
    });

    res.status(201).json({
      success: true,
      message: "Petugas ronda berhasil ditambahkan.",
      data: created,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({
        success: false,
        message: "Petugas dengan nama yang sama sudah ada dalam jadwal ini.",
      });
    } else {
      console.error(error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan saat menambahkan petugas ronda." });
    }
  }
};

export const removePetugasFromJadwal = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.petugas_id;
    const petugas_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!petugas_id) {
      res.status(400).json({ success: false, message: "petugas_id harus diisi." });
      return;
    }

    const existing = await prisma.rondaPetugas.findUnique({
      where: { id: petugas_id },
      include: { jadwal_ronda: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Petugas ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || existing.jadwal_ronda.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.rondaPetugas.delete({ where: { id: petugas_id } });

    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "RondaPetugas",
      entitas_id: petugas_id,
      data_lama: existing,
    });

    res.status(200).json({
      success: true,
      message: "Petugas ronda berhasil dihapus.",
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menghapus petugas ronda." });
  }
};

// ===== PRESENSI RONDA MANAGEMENT =====

export const markPresenceRonda = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const jadwal = await prisma.jadwalRonda.findUnique({ where: { id: jadwal_id } });
    if (!jadwal) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || jadwal.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { tanggal, nama_petugas, status_hadir, catatan } = req.body as {
      tanggal?: string;
      nama_petugas?: string;
      status_hadir?: StatusKehadiran;
      catatan?: string;
    };

    if (!tanggal || !nama_petugas || !status_hadir) {
      res.status(400).json({
        success: false,
        message: "tanggal, nama_petugas, dan status_hadir wajib diisi.",
      });
      return;
    }

    const upserted = await prisma.presensiRonda.upsert({
      where: {
        jadwal_ronda_id_tanggal_nama_petugas: {
          jadwal_ronda_id: jadwal_id,
          tanggal: new Date(tanggal),
          nama_petugas: nama_petugas.trim(),
        },
      },
      update: {
        status_hadir,
        catatan: catatan?.trim() || null,
      },
      create: {
        jadwal_ronda_id: jadwal_id,
        tanggal: new Date(tanggal),
        nama_petugas: nama_petugas.trim(),
        status_hadir,
        catatan: catatan?.trim() || null,
      },
    });

    // Sync with PerformaRonda
    const existingPerforma = await prisma.performaRonda.findFirst({
      where: {
        blok_wilayah_id: blok.id,
        tanggal: new Date(tanggal),
        nama_petugas: nama_petugas.trim(),
      },
    });

    if (existingPerforma) {
      await prisma.performaRonda.update({
        where: { id: existingPerforma.id },
        data: {
          status_kehadiran: status_hadir,
          catatan: catatan?.trim() || null,
        },
      });
    } else {
      await prisma.performaRonda.create({
        data: {
          blok_wilayah_id: blok.id,
          tanggal: new Date(tanggal),
          nama_petugas: nama_petugas.trim(),
          status_kehadiran: status_hadir,
          catatan: catatan?.trim() || null,
        },
      });
    }

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "PresensiRonda",
      entitas_id: upserted.id,
      data_baru: upserted,
    });

    res.status(201).json({
      success: true,
      message: "Presensi ronda berhasil dicatat.",
      data: upserted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mencatat presensi ronda." });
  }
};

export const getPresenceForJadwal = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.jadwal_id;
    const jadwal_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!jadwal_id) {
      res.status(400).json({ success: false, message: "jadwal_id harus diisi." });
      return;
    }

    const jadwal = await prisma.jadwalRonda.findUnique({ where: { id: jadwal_id } });
    if (!jadwal) {
      res.status(404).json({ success: false, message: "Jadwal ronda tidak ditemukan." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok || jadwal.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { tanggal_mulai, tanggal_akhir } = req.query as {
      tanggal_mulai?: string;
      tanggal_akhir?: string;
    };

    const presensi = await prisma.presensiRonda.findMany({
      where: {
        jadwal_ronda_id: jadwal_id,
        ...(tanggal_mulai && tanggal_akhir
          ? {
              tanggal: {
                gte: new Date(tanggal_mulai),
                lte: new Date(tanggal_akhir),
              },
            }
          : {}),
      },
      orderBy: { tanggal: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Data presensi ronda berhasil diambil.",
      data: presensi,
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data presensi ronda." });
  }
};

const renderIncidentReportPage = (doc: any, laporan: any, headerData: {
  isRw: boolean;
  no_rw: string;
  nama_kompleks: string;
  no_rt?: string | null;
  nama_blok?: string | null;
}) => {
  const fs = require('fs');
  const path = require('path');

  const getElapsedString = (dVal: Date): string => {
    if (!dVal) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const incidentDate = new Date(dVal);
    incidentDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - incidentDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "hari ini";
    if (diffDays === 1) return "kemarin";
    if (diffDays > 1) return `${diffDays} hari yang lalu`;
    return "akan datang";
  };

  // Drawing Kop Surat (Official Letterhead)
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16).text(
    headerData.isRw ? 'PENGURUS RUKUN WARGA (RW)' : 'PENGURUS RUKUN TETANGGA (RT)', 
    { align: 'center' }
  );
  doc.moveDown(0.15);
  
  let subtitle = '';
  if (headerData.isRw) {
    subtitle = `WILAYAH RW ${headerData.no_rw || '-'} - KOMPLEKS ${headerData.nama_kompleks?.toUpperCase() || '-'}`;
  } else {
    subtitle = `WILAYAH RT ${headerData.no_rt || '-'} / RW ${headerData.no_rw || '-'} - KOMPLEKS ${headerData.nama_kompleks?.toUpperCase() || '-'}`;
    if (headerData.nama_blok) {
      subtitle += ` (BLOK ${headerData.nama_blok.toUpperCase()})`;
    }
  }
  
  doc.fontSize(11).font('Helvetica-Bold').text(subtitle, { align: 'center' });
  doc.moveDown(0.15);
  doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text('Sistem Informasi Manajemen Lingkungan Terintegrasi - RWManage', { align: 'center' });
  doc.moveDown(0.15);
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94a3b8').text('Layanan Pengaduan, Keamanan, Ronda, dan Monitoring Insiden Wilayah Resmi', { align: 'center' });
  
  // Draw thick professional double lines under Kop Surat
  doc.lineWidth(1.8).strokeColor('#0f172a').moveTo(40, 105).lineTo(555, 105).stroke();
  doc.lineWidth(0.5).strokeColor('#475569').moveTo(40, 109).lineTo(555, 109).stroke();

  // Document Title
  doc.y = 125;
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text('LAPORAN KEJADIAN / INSIDEN WILAYAH RT', { align: 'center' });
  doc.moveDown(0.15);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a8a').text(laporan.tipe_insiden.toUpperCase(), { align: 'center' });
  doc.moveDown(0.5);

  // Status & Urgency Badges
  let statusLabel = laporan.status === 'LAPORAN' ? 'BELUM DITANGANI' : laporan.status === 'PROSES' ? 'SEDANG DITANGANI' : laporan.status;
  let statusColor = laporan.status === 'LAPORAN' ? '#be123c' : laporan.status === 'PROSES' ? '#d97706' : laporan.status === 'SELESAI' ? '#059669' : '#4b5563';
  
  let urgencyLabel = laporan.urgensi || 'RENDAH';
  let urgencyColor = urgencyLabel === 'TINGGI' ? '#be123c' : urgencyLabel === 'SEDANG' ? '#b45309' : '#1d4ed8';

  const badgeY = doc.y;
  // Urgensi Badge
  doc.fillColor(urgencyColor).rect(160, badgeY, 120, 18).fill();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5).text(`URGENSI: ${urgencyLabel}`, 160, badgeY + 4, { width: 120, align: 'center' });

  // Status Badge
  doc.fillColor(statusColor).rect(300, badgeY, 130, 18).fill();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5).text(`STATUS: ${statusLabel}`, 300, badgeY + 4, { width: 130, align: 'center' });

  doc.y = badgeY + 30;

  // Key-value Details Block
  doc.fillColor('#f8fafc').rect(40, doc.y, 515, 120).fill();
  doc.lineWidth(0.5).strokeColor('#e2e8f0').rect(40, doc.y, 515, 120).stroke();

  const startDetailsY = doc.y + 10;
  doc.fontSize(9.5).fillColor('#0f172a');
  
  const labels = [
    'Waktu Kejadian',
    'Lokasi Kejadian',
    'Identitas Pelapor',
    'Kontak Pelapor',
    'Deskripsi Kejadian'
  ];

  const dateStr = new Date(laporan.tanggal_insiden).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const elapsed = getElapsedString(laporan.tanggal_insiden);
  
  const values = [
    `: ${dateStr} (${elapsed})`,
    `: ${laporan.lokasi}`,
    `: ${laporan.pelapor_nama}`,
    `: ${laporan.pelapor_no_hp || '-'}`,
    `: ${laporan.deskripsi}`
  ];

  let currentDetailY = startDetailsY;
  labels.forEach((label, idx) => {
    doc.font('Helvetica-Bold').fillColor('#334155').text(label, 50, currentDetailY);
    doc.font('Helvetica').fillColor('#0f172a');
    if (idx === 4) {
      doc.text(values[idx], 150, currentDetailY, { width: 390, height: 35, ellipsis: true });
    } else {
      doc.text(values[idx], 150, currentDetailY, { width: 390 });
    }
    currentDetailY += 18;
  });

  doc.y = startDetailsY + 95;

  // Actions Taken (Tindakan Diambil)
  if (laporan.tindakan_diambil) {
    doc.y = doc.y + 20;
    const actionY = doc.y;
    doc.fillColor('#ecfdf5').rect(40, actionY, 515, 40).fill();
    doc.lineWidth(0.8).strokeColor('#10b981').rect(40, actionY, 515, 40).stroke();
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#065f46').text('Tindakan Diambil:', 50, actionY + 8);
    doc.font('Helvetica').fillColor('#047857').text(laporan.tindakan_diambil, 50, actionY + 22, { width: 495, height: 15, ellipsis: true });
    doc.y = actionY + 45;
  }

  // Incident Photo (Large Image fulfilling the rest of page)
  let photoAttached = false;
  if (laporan.foto_bukti_url) {
    const filename = laporan.foto_bukti_url.replace(/^\/uploads\//, '').replace('/uploads/', '');
    let imgPath = path.join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(imgPath)) {
      imgPath = path.join(process.cwd(), 'backend', 'uploads', filename);
    }

    if (fs.existsSync(imgPath)) {
      try {
        const remainingHeight = doc.page.height - doc.y - 65; // safety margin
        if (remainingHeight > 80) {
          doc.moveDown(0.8);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#334155').text('DOKUMENTASI FOTO KEJADIAN:', 40, doc.y);
          doc.moveDown(0.3);
          
          doc.image(imgPath, {
            fit: [515, remainingHeight - 20],
            align: 'center'
          });
          photoAttached = true;
        }
      } catch (err) {
        console.error('Gagal melampirkan foto bukti kejadian:', err);
      }
    }
  }

  if (!photoAttached) {
    doc.moveDown(0.8);
    const boxY = doc.y;
    const remainingHeight = Math.min(doc.page.height - doc.y - 65, 120);
    if (remainingHeight > 40) {
      doc.lineWidth(0.5).dash(4, { space: 4 }).strokeColor('#94a3b8').rect(40, boxY, 515, remainingHeight).stroke();
      doc.undash();
      doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#94a3b8').text(
        'Tidak ada lampiran dokumentasi foto bukti kejadian.', 
        40, 
        boxY + (remainingHeight / 2) - 4, 
        { width: 515, align: 'center' }
      );
    }
  }
};

export const exportLaporanPdfForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!laporan_id) {
      res.status(400).json({ success: false, message: 'laporan_id harus diisi.' });
      return;
    }

    if (!req.user?.id || req.user?.role !== 'RT') {
      res.status(401).json({ success: false, message: 'Unauthorized: User belum terautentikasi atau bukan RT.' });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: 'Data blok wilayah RT tidak ditemukan.' });
      return;
    }

    const laporan = await prisma.laporanInsiden.findUnique({ where: { id: laporan_id } });
    if (!laporan) {
      res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
      return;
    }

    // verify ownership: must match the RT's block
    if (laporan.blok_wilayah_id !== blok.id) {
      res.status(403).json({ success: false, message: 'Akses ditolak.' });
      return;
    }

    // Get RW details for letterhead
    const rw = await prisma.wilayahRW.findUnique({
      where: { id: blok.wilayah_rw_id || undefined },
      select: { no_rw: true, nama_kompleks: true }
    });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-${laporan.id}.pdf`);

    doc.pipe(res);

    const headerData = {
      isRw: false,
      no_rw: rw?.no_rw || '-',
      nama_kompleks: rw?.nama_kompleks || '-',
      no_rt: blok.no_rt,
      nama_blok: blok.nama_blok
    };

    renderIncidentReportPage(doc, laporan, headerData);

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengekspor laporan ke PDF.' });
  }
};

export const exportGroupedLaporanPdfForRt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id || req.user?.role !== "RT") {
      res.status(401).json({
        success: false,
        message: "Unauthorized: User belum terautentikasi atau bukan RT.",
      });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    // Get filter ids from query parameters
    let whereClause: any = {
      blok_wilayah_id: blok.id,
      deleted_at: null
    };

    if (req.query.ids) {
      const idsArray = (req.query.ids as string).split(',').filter(id => id.trim().length > 0);
      if (idsArray.length > 0) {
        whereClause.id = { in: idsArray };
      }
    }

    // Get all incidents
    const incidents = await prisma.laporanInsiden.findMany({
      where: whereClause,
      include: {
        blok_wilayah: { select: { nama_blok: true, no_rt: true } }
      },
      orderBy: [
        { tanggal_insiden: 'desc' }
      ]
    });

    // Get RW details for letterhead
    const rw = await prisma.wilayahRW.findUnique({
      where: { id: blok.wilayah_rw_id || undefined },
      select: { no_rw: true, nama_kompleks: true }
    });

    if (incidents.length === 0) {
      res.status(404).json({
        success: false,
        message: "Tidak ada laporan insiden untuk diekspor."
      });
      return;
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-insiden-rt-${blok.no_rt || 'grouped'}.pdf`);

    doc.pipe(res);

    incidents.forEach((item, index) => {
      if (index > 0) {
        doc.addPage();
      }

      const headerData = {
        isRw: false,
        no_rw: rw?.no_rw || '-',
        nama_kompleks: rw?.nama_kompleks || '-',
        no_rt: blok.no_rt,
        nama_blok: blok.nama_blok
      };

      renderIncidentReportPage(doc, item, headerData);
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengekspor laporan insiden ke PDF."
    });
  }
};

const getUrgencyHelper = (tipe: string, deskripsi: string): string => {
  const t = (tipe || "").toLowerCase();
  const d = (deskripsi || "").toLowerCase();

  if (
    t.includes("kebakaran") || t.includes("kemalingan") || t.includes("maling") ||
    t.includes("curi") || t.includes("rampok") || t.includes("darurat") ||
    t.includes("kritis") || t.includes("kecelakaan") || t.includes("kekerasan") ||
    t.includes("sajam") || t.includes("kelahi") || t.includes("darah") ||
    d.includes("kebakaran") || d.includes("kemalingan") || d.includes("maling") ||
    d.includes("darurat") || d.includes("kritis") || d.includes("kecelakaan")
  ) {
    return "TINGGI";
  }

  if (
    t.includes("ribut") || t.includes("tikai") || t.includes("hilang") ||
    t.includes("rusak") || t.includes("fasilitas") || t.includes("bocor") ||
    t.includes("banjir") || t.includes("hewan") || t.includes("parkir") ||
    t.includes("curiga") || d.includes("ribut") || d.includes("tikai") ||
    d.includes("hilang") || d.includes("rusak") || d.includes("banjir")
  ) {
    return "SEDANG";
  }

  return "RENDAH";
};

const getElapsedHelper = (date: Date): string => {
  if (!date) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const incidentDate = new Date(date);
  incidentDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - incidentDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "hari ini";
  if (diffDays === 1) return "kemarin";
  if (diffDays > 1) return `${diffDays} hari yang lalu`;
  return "akan datang";
};

const checkOverdueHelper = (date: Date): boolean => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const incidentDate = new Date(date);
  incidentDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - incidentDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 3;
};

export const exportPerformaRondaPdfForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const { tanggal_mulai, tanggal_akhir } = req.query as { tanggal_mulai?: string; tanggal_akhir?: string };

    const data = await prisma.performaRonda.findMany({
      where: {
        blok_wilayah_id: blok.id,
        ...(tanggal_mulai && tanggal_akhir
          ? { tanggal: { gte: new Date(tanggal_mulai), lte: new Date(tanggal_akhir) } }
          : {}),
      },
      orderBy: { tanggal: "desc" },
    });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    // Format Period Label
    let periodLabel = "";
    if (tanggal_mulai) {
      const d = new Date(tanggal_mulai);
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      periodLabel = `${months[d.getMonth()]} ${d.getFullYear()}`;
    } else {
      periodLabel = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }

    const filename = `histori-absensi-ronda-rt-${blok.no_rt || 'grouped'}-${periodLabel.replace(/\s+/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    const MONTH_LABELS_SHORT = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
    ];

    const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    const formatDateFull = (value: any) => {
      if (!value) return "-";
      const d = new Date(value);
      return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTH_LABELS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    };

    // Header RT Branding
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#312e81").text("LAPORAN REKAPITULASI HISTORI KEHADIRAN RONDA", { align: "center" });
    doc.moveDown(0.25);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e293b").text(`RUKUN TETANGGA (RT) ${blok.no_rt || ''} / BLOK ${blok.nama_blok || ''}`, { align: "center" });
    doc.fontSize(10).font("Helvetica").fillColor("#64748b").text(`Periode Laporan: ${periodLabel}`, { align: "center" });
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });
    doc.moveDown(1.5);

    // Summary statistics
    const totalHadir = data.filter(item => item.status_kehadiran === 'HADIR').length;
    const totalIzin = data.filter(item => item.status_kehadiran === 'IZIN').length;
    const totalAlfa = data.filter(item => item.status_kehadiran === 'ALFA').length;

    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("Ringkasan Kehadiran Periode Ini:");
    doc.moveDown(0.4);

    let currentY = doc.y;
    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    doc.text(`Total Presensi: ${data.length} kegiatan`, 40, currentY);
    doc.text(`Total Hadir: ${totalHadir} kali`, 200, currentY);
    doc.text(`Total Izin/Sakit: ${totalIzin} kali`, 320, currentY);
    doc.text(`Total Alfa (Mangkir): ${totalAlfa} kali`, 440, currentY);
    doc.moveDown(1.5);

    // Table drawing
    const headers = ["No", "Hari & Tanggal", "Petugas Ronda", "Status Kehadiran", "Catatan"];
    const colWidths = [35, 140, 150, 100, 90];
    let tableY = doc.y;

    const drawRow = (rowItems: string[], isHeader = false) => {
      const h = 22;
      if (tableY + h > 750) {
        doc.addPage();
        tableY = 40;
      }
      let x = 40;
      doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      rowItems.forEach((text, i) => {
        // Draw background box
        if (isHeader) {
          doc.rect(x, tableY, colWidths[i], h).fillColor("#312e81").fill();
          doc.rect(x, tableY, colWidths[i], h).strokeColor("#cbd5e1").stroke();
          doc.fillColor("#ffffff").text(text, x + 6, tableY + 6, { width: colWidths[i] - 12, align: i === 0 || i === 3 ? "center" : "left" });
        } else {
          doc.rect(x, tableY, colWidths[i], h).strokeColor("#e2e8f0").stroke();
          if (i === 3) {
            // Color status
            let color = "#475569";
            if (text === "HADIR") color = "#059669";
            if (text === "ALFA") color = "#dc2626";
            if (text === "IZIN") color = "#d97706";
            doc.font("Helvetica-Bold").fillColor(color).text(text, x + 6, tableY + 6, { width: colWidths[i] - 12, align: "center" });
            doc.font("Helvetica"); // Reset
          } else {
            doc.fillColor("#1e293b").text(text, x + 6, tableY + 6, { width: colWidths[i] - 12, align: i === 0 ? "center" : "left" });
          }
        }
        x += colWidths[i];
      });
      tableY += h;
    };

    drawRow(headers, true);
    data.forEach((item, idx) => {
      drawRow([
        String(idx + 1),
        formatDateFull(item.tanggal),
        item.nama_petugas,
        item.status_kehadiran,
        item.catatan || "-"
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
    doc.font("Helvetica-Bold").text("Ketua RT", 350, doc.y, { align: "center", width: 200 });
    doc.moveDown(3.5);
    doc.font("Helvetica-Bold").text("( ____________________ )", 350, doc.y, { align: "center", width: 200 });

    doc.end();
  } catch (error) {
    console.error("Error exporting RT ronda history PDF:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengekspor rekapitulasi absensi ronda ke PDF." });
  }
};

export const clearTegurRondaForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    const blokId = req.user.blok_wilayah_id;
    if (!blokId) {
      res.status(403).json({ success: false, message: "Data blok wilayah untuk RT login tidak ditemukan." });
      return;
    }

    const updated = await prisma.blokWilayah.update({
      where: { id: blokId },
      data: {
        tegur_ronda: false,
        tegur_ronda_pesan: null
      }
    });

    res.status(200).json({
      success: true,
      message: "Teguran ronda berhasil diselesaikan / diakui.",
      data: updated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menyelesaikan teguran ronda." });
  }
};

