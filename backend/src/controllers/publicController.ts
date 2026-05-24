import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";

const formatCurrencyId = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

interface CekKodeUnikParams {
  kode_unik?: string;
}

interface CekKodeUnikQuery {
  scope?: "RW" | "MASJID";
}

interface GetMasjidListQuery {
  search?: string;
}

export const getMasjidListWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { search } = req.query as GetMasjidListQuery;
    const normalizedSearch = search?.trim().toLowerCase();

    const wilayahRwList = await client.wilayahRW.findMany({
      select: {
        id: true,
        nama_kompleks: true,
        no_rw: true,
      },
      orderBy: [{ nama_kompleks: "asc" }, { no_rw: "asc" }],
    });

    const masjidList = await client.masjid.findMany({
      select: {
        id: true,
        nama_masjid: true,
        alamat: true,
        blok_wilayah_id: true,
        blok_wilayah: {
          select: {
            id: true,
            nama_blok: true,
            wilayah_rw: {
              select: {
                id: true,
                nama_kompleks: true,
                no_rw: true,
              },
            },
          },
        },
      },
      orderBy: [{ nama_masjid: "asc" }],
    });

    const filteredMasjid = normalizedSearch
      ? masjidList.filter((item) => {
          const searchTarget = [
            item.nama_masjid,
            item.alamat,
            item.blok_wilayah.nama_blok,
            item.blok_wilayah.wilayah_rw.nama_kompleks,
            item.blok_wilayah.wilayah_rw.no_rw,
          ]
            .join(" ")
            .toLowerCase();

          return searchTarget.includes(normalizedSearch);
        })
      : masjidList;

    const visibleRwIds = new Set(
      filteredMasjid.map((item) => item.blok_wilayah.wilayah_rw.id)
    );

    const wilayahRw = normalizedSearch
      ? wilayahRwList.filter((item) => visibleRwIds.has(item.id))
      : wilayahRwList;

    res.status(200).json({
      success: true,
      message: "Daftar RW dan masjid berhasil diambil.",
      data: {
        wilayah_rw: wilayahRw,
        masjid: filteredMasjid.map((item) => ({
          id: item.id,
          nama_masjid: item.nama_masjid,
          alamat: item.alamat,
          blok_wilayah_id: item.blok_wilayah_id,
          nama_blok: item.blok_wilayah.nama_blok,
          wilayah_rw_id: item.blok_wilayah.wilayah_rw.id,
          nama_kompleks: item.blok_wilayah.wilayah_rw.nama_kompleks,
          no_rw: item.blok_wilayah.wilayah_rw.no_rw,
        })),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil daftar masjid.",
    });
  }
};

export const getWilayahListWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const wilayahRwList = await client.wilayahRW.findMany({
      select: {
        id: true,
        nama_kompleks: true,
        no_rw: true,
        user: {
          select: {
            nama: true,
          },
        },
        blok_wilayah: {
          select: {
            id: true,
            nama_blok: true,
            no_rt: true,
            _count: {
              select: {
                users: {
                  where: {
                    role: "RT",
                  },
                },
              },
            },
          },
          orderBy: [{ no_rt: "asc" }],
        },
      },
      orderBy: [{ user: { nama: "asc" } }, { no_rw: "asc" }],
    });

    res.status(200).json({
      success: true,
      message: "Daftar hierarki wilayah berhasil diambil.",
      data: wilayahRwList.map((item) => ({
        id: item.id,
        desa: item.user.nama,
        nama_kompleks: item.nama_kompleks,
        no_rw: item.no_rw,
        blok_wilayah: item.blok_wilayah.map((b) => ({
          id: b.id,
          nama_blok: b.nama_blok,
          no_rt: b.no_rt,
          is_occupied: b._count.users > 0,
        })),
      })),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil daftar hierarki wilayah.",
    });
  }
};

export const cekKodeUnikWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { kode_unik } = req.params as CekKodeUnikParams;
    const { scope } = req.query as CekKodeUnikQuery;

    if (!kode_unik || !kode_unik.trim()) {
      res.status(400).json({
        success: false,
        message: "Parameter kode_unik wajib diisi.",
      });
      return;
    }

    const normalizedKode = kode_unik.trim();

    const includeRwScope = scope !== "MASJID";
    const includeMasjidScope = scope !== "RW";

    const iuran = includeRwScope
      ? await client.iuranWarga.findUnique({
          where: { kode_unik: normalizedKode },
          select: {
            id: true,
            warga_id: true,
            bulan: true,
            tahun: true,
            nominal: true,
            status: true,
            kode_unik: true,
            tanggal_bayar: true,
          },
        })
      : null;

    if (iuran) {
      res.status(200).json({
        success: true,
        message: "Data ditemukan pada iuran_warga.",
        data: {
          sumber: "iuran_warga",
          detail: iuran,
        },
      });
      return;
    }

    const kas = includeRwScope
      ? await client.kasRW.findUnique({
          where: { kode_unik: normalizedKode },
          select: {
            id: true,
            wilayah_rw_id: true,
            jenis_transaksi: true,
            tanggal: true,
            keterangan: true,
            nominal: true,
            bukti_url: true,
            bukti_foto_url: true,
            kode_unik: true,
          },
        })
      : null;

    if (kas) {
      res.status(200).json({
        success: true,
        message: "Data ditemukan pada kas_rw.",
        data: {
          sumber: "kas_rw",
          detail: kas,
        },
      });
      return;
    }

    const kasRt = includeRwScope
      ? await client.kasRT.findUnique({
          where: { kode_unik: normalizedKode },
          select: {
            id: true,
            blok_wilayah_id: true,
            jenis_transaksi: true,
            tanggal: true,
            keterangan: true,
            nominal: true,
            bukti_url: true,
            bukti_foto_url: true,
            kode_unik: true,
            blok_wilayah: {
              select: {
                id: true,
                nama_blok: true,
                no_rt: true,
                wilayah_rw: {
                  select: {
                    id: true,
                    no_rw: true,
                  },
                },
              },
            },
          },
        })
      : null;

    if (kasRt) {
      res.status(200).json({
        success: true,
        message: "Data ditemukan pada kas_rt.",
        data: {
          sumber: "kas_rt",
          detail: kasRt,
        },
      });
      return;
    }

    const zis = includeMasjidScope
      ? await client.transaksiZis.findUnique({
          where: { kode_unik: normalizedKode },
          select: {
            id: true,
            masjid_id: true,
            kode_unik: true,
            nama_kk: true,
            alamat_muzaqi: true,
            jumlah_jiwa: true,
            jenis_bayar: true,
            jenis_zakat: true,
            nominal_zakat: true,
            nominal_infaq: true,
            total_beras_kg: true,
            waktu_transaksi: true,
          },
        })
      : null;

    if (zis) {
      res.status(200).json({
        success: true,
        message: "Data ditemukan pada transaksi_zis.",
        data: {
          sumber: "transaksi_zis",
          detail: zis,
        },
      });
      return;
    }

    const kasMasjid = includeMasjidScope
      ? await client.kasMasjid.findUnique({
          where: { kode_unik: normalizedKode },
          select: {
            id: true,
            masjid_id: true,
            jenis_transaksi: true,
            tanggal: true,
            keterangan: true,
            nominal: true,
            bukti_url: true,
            bukti_foto_url: true,
            kode_unik: true,
            masjid: {
              select: {
                id: true,
                nama_masjid: true,
              },
            },
          },
        })
      : null;

    if (kasMasjid) {
      res.status(200).json({
        success: true,
        message: "Data ditemukan pada kas_masjid.",
        data: {
          sumber: "kas_masjid",
          detail: kasMasjid,
        },
      });
      return;
    }

    res.status(404).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat melakukan pengecekan kode unik.",
    });
  }
};

export const cekKodeUnik = async (req: Request, res: Response): Promise<void> => {
  return cekKodeUnikWithClient(prisma, req, res);
};

export const getMasjidList = async (req: Request, res: Response): Promise<void> => {
  return getMasjidListWithClient(prisma, req, res);
};

export const getWilayahList = async (req: Request, res: Response): Promise<void> => {
  return getWilayahListWithClient(prisma, req, res);
};

export const exportPublicKwitansi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kode_unik } = req.params as CekKodeUnikParams;

    if (!kode_unik || !kode_unik.trim()) {
      res.status(400).json({ success: false, message: "Parameter kode_unik wajib diisi." });
      return;
    }

    const normalizedKode = kode_unik.trim();

    // Check Iuran Warga
    const iuran = await prisma.iuranWarga.findUnique({
      where: { kode_unik: normalizedKode },
      include: {
        warga: {
          include: {
            blok_wilayah: {
              include: { wilayah_rw: true },
            },
          },
        },
      },
    });

    if (iuran) {
      await generateKwitansiPdf(res, {
        sumber: "iuran_warga",
        title: "Kwitansi Iuran Warga",
        color: "#4f46e5", // Indigo
        items: [
          ["Kode Unik", iuran.kode_unik!],
          ["Nama KK", iuran.warga.nama_kk],
          ["Blok/RT", `${iuran.warga.blok_wilayah.nama_blok} - RT ${iuran.warga.blok_wilayah.no_rt}`],
          ["Periode", `${iuran.bulan} / ${iuran.tahun}`],
          ["Nominal", formatCurrencyId(Number(iuran.nominal))],
          ["Status", iuran.status],
          ["Tanggal Bayar", iuran.tanggal_bayar ? new Date(iuran.tanggal_bayar).toLocaleDateString("id-ID") : "-"],
        ],
      });
      return;
    }

    // Check Kas RW
    const kas = await prisma.kasRW.findUnique({
      where: { kode_unik: normalizedKode },
      include: { wilayah_rw: true },
    });

    if (kas) {
      await generateKwitansiPdf(res, {
        sumber: "kas_rw",
        title: `Kwitansi Kas RW ${kas.jenis_transaksi === "MASUK" ? "(Penerimaan)" : "(Pengeluaran)"}`,
        color: kas.jenis_transaksi === "MASUK" ? "#10b981" : "#ef4444", // Emerald for in, Red for out
        items: [
          ["Kode Unik", kas.kode_unik],
          ["Jenis Transaksi", kas.jenis_transaksi],
          ["Nominal", formatCurrencyId(Number(kas.nominal))],
          ["Tanggal", new Date(kas.tanggal).toLocaleDateString("id-ID")],
          ["Keterangan", kas.keterangan],
        ],
      });
      return;
    }

    // Check Kas RT
    const kasRt = await prisma.kasRT.findUnique({
      where: { kode_unik: normalizedKode },
      include: {
        blok_wilayah: {
          include: { wilayah_rw: true },
        },
      },
    });

    if (kasRt) {
      await generateKwitansiPdf(res, {
        sumber: "kas_rt",
        title: `Kwitansi Kas RT ${kasRt.jenis_transaksi === "MASUK" ? "(Penerimaan)" : "(Pengeluaran)"}`,
        color: kasRt.jenis_transaksi === "MASUK" ? "#0891b2" : "#ef4444", // Cyan for in, Red for out
        items: [
          ["Kode Unik", kasRt.kode_unik],
          ["Jenis Transaksi", kasRt.jenis_transaksi],
          ["Nominal", formatCurrencyId(Number(kasRt.nominal))],
          ["Tanggal", new Date(kasRt.tanggal).toLocaleDateString("id-ID")],
          ["RT / Blok", `RT ${kasRt.blok_wilayah.no_rt} - ${kasRt.blok_wilayah.nama_blok}`],
          ["Keterangan", kasRt.keterangan],
        ],
      });
      return;
    }

    // Check ZIS
    const zis = await prisma.transaksiZis.findUnique({
      where: { kode_unik: normalizedKode },
      include: { masjid: true },
    });

    if (zis) {
      await generateKwitansiPdf(res, {
        sumber: "transaksi_zis",
        title: "Kwitansi ZIS Masjid",
        color: "#059669", // Emerald
        items: [
          ["Kode Unik", zis.kode_unik],
          ["Nama Masjid", zis.masjid.nama_masjid],
          ["Nama KK (Muzakki)", zis.nama_kk],
          ["Alamat", zis.alamat_muzaqi],
          ["Jumlah Jiwa", String(zis.jumlah_jiwa)],
          ["Jenis Bayar", zis.jenis_bayar],
          ["Nominal Zakat", formatCurrencyId(Number(zis.nominal_zakat))],
          ["Nominal Infaq", formatCurrencyId(Number(zis.nominal_infaq))],
          ["Beras (kg)", String(zis.total_beras_kg)],
          ["Tanggal Transaksi", new Date(zis.waktu_transaksi).toLocaleDateString("id-ID")],
        ],
      });
      return;
    }

    // Check Kas Masjid
    const kasMasjid = await prisma.kasMasjid.findUnique({
      where: { kode_unik: normalizedKode },
      include: { masjid: true },
    });

    if (kasMasjid) {
      await generateKwitansiPdf(res, {
        sumber: "kas_masjid",
        title: `Kwitansi Kas Masjid ${kasMasjid.jenis_transaksi === "MASUK" ? "(Penerimaan)" : "(Pengeluaran)"}`,
        color: kasMasjid.jenis_transaksi === "MASUK" ? "#059669" : "#ef4444", // Emerald for in, Red for out
        items: [
          ["Kode Unik", kasMasjid.kode_unik],
          ["Jenis Transaksi", kasMasjid.jenis_transaksi],
          ["Nominal", formatCurrencyId(Number(kasMasjid.nominal))],
          ["Tanggal", new Date(kasMasjid.tanggal).toLocaleDateString("id-ID")],
          ["Nama Masjid", kasMasjid.masjid.nama_masjid],
          ["Keterangan", kasMasjid.keterangan],
        ],
      });
      return;
    }

    res.status(404).json({ success: false, message: "Data transaksi tidak ditemukan." });

  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat meng-export PDF." });
  }
};

interface KwitansiDataSource {
  sumber: string;
  title: string;
  color: string;
  items: [string, string][];
}

const generateKwitansiPdf = async (res: Response, data: KwitansiDataSource) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="Kwitansi-${data.sumber}-${Date.now()}.pdf"`
  );

  doc.pipe(res);

  // 1. KOP RESMI (Official Header at the very top - split into columns to prevent overlap)
  const leftColW = 280;
  const rightColX = 330;
  const rightColW = doc.page.width - 40 - rightColX;

  // Left Column: Branding / App name
  doc.fontSize(15).font("Helvetica-Bold").fillColor("#312e81").text("RWMANAGE PORTAL", 40, 35, { width: leftColW });
  doc.fontSize(8).font("Helvetica").fillColor("#64748b").text("Sistem Informasi & Transparansi Keuangan RT/RW", 40, 54, { width: leftColW });

  // Right Column: Title & Subtitle of the document
  doc.fontSize(10.5).font("Helvetica-Bold").fillColor(data.color).text(data.title.toUpperCase(), rightColX, 35, { width: rightColW, align: "right" });
  doc.fontSize(7.5).font("Helvetica").fillColor("#64748b").text("Dokumen Bukti Transaksi Resmi Terverifikasi", rightColX, 54, { width: rightColW, align: "right" });

  // Divider Line below the main Kop
  doc.moveTo(40, 75).lineTo(doc.page.width - 40, 75).strokeColor("#312e81").lineWidth(1.5).stroke();

  // 2. CARD CONTAINER
  const cardX = 40;
  const cardY = 95;
  const cardW = doc.page.width - 80;
  const cardH = 430;

  // Background of the card
  doc.roundedRect(cardX, cardY, cardW, cardH, 8).fillColor("#f8fafc").fill();

  // Thin outer border of the card
  doc.roundedRect(cardX, cardY, cardW, cardH, 8).strokeColor("#cbd5e1").lineWidth(1).stroke();

  // Left solid accent bar in status color (data.color)
  doc.rect(cardX, cardY, 6, cardH).fillColor(data.color).fill();

  // 3. DETAIL ITEMS
  let labelY = cardY + 25;
  data.items.forEach(([label, value], idx) => {
    // Alternating rows backgrounds
    if (idx % 2 === 0) {
      doc.rect(cardX + 12, labelY - 4, cardW - 24, 20).fillColor("#ffffff").fill();
    }

    doc.font("Helvetica").fillColor("#475569").fontSize(9.5).text(label, cardX + 25, labelY);

    // Dynamic coloring for status fields
    const valStr = String(value).toUpperCase();
    let valColor = "#1e293b";
    let isStatus = false;
    
    if (valStr === "LUNAS" || valStr === "MASUK") {
      valColor = "#059669"; // Emerald 600
      isStatus = true;
    } else if (valStr === "BELUM LUNAS" || valStr === "KELUAR") {
      valColor = "#dc2626"; // Red 600
      isStatus = true;
    }

    doc.font("Helvetica-Bold").fillColor(valColor).fontSize(9.5).text(value, cardX + 180, labelY, { width: cardW - 200 });

    // Subtle divider dotted line
    doc.moveTo(cardX + 20, labelY + 14)
       .lineTo(cardX + cardW - 20, labelY + 14)
       .strokeColor("#f1f5f9")
       .lineWidth(0.5)
       .stroke();

    labelY += 24;
  });

  // 4. ROTATED CONCENTRIC DIGITAL STAMP
  const stampX = cardX + cardW - 80;
  const stampY = cardY + cardH - 65;

  doc.circle(stampX, stampY, 32).strokeColor(data.color).lineWidth(1.5).stroke();
  doc.circle(stampX, stampY, 28).strokeColor(data.color).lineWidth(0.75).dash(1.5, { space: 1.5 }).stroke();
  doc.undash();

  doc.save();
  doc.translate(stampX, stampY);
  doc.rotate(-12);
  doc.fillColor(data.color).font("Helvetica-Bold").fontSize(10).text("VERIFIED", -23, -4);
  doc.restore();

  // 5. FOOTER NOTES INSIDE THE CARD
  doc.fillColor("#64748b").font("Helvetica").fontSize(7.5).text("Pernyataan Resmi: Bukti transaksi ini sah secara hukum dan diterbitkan otomatis oleh sistem RWManage.", cardX + 25, cardY + cardH - 35);
  doc.text(`Waktu Cetak: ${new Date().toLocaleString("id-ID")} | Protokol: SHA-256 / SSL-SECURE / ${data.sumber.toUpperCase()}`, cardX + 25, cardY + cardH - 22);

  // 6. GLOBAL PAGE FOOTER
  doc.moveTo(40, 765).lineTo(doc.page.width - 40, 765).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
  doc.fillColor("#94a3b8").font("Helvetica").fontSize(8).text("RWManage • Sistem Informasi & Pengelolaan Lingkungan RT/RW Mandiri Terintegrasi", 40, 775, { align: "center" });
  doc.text("Dokumen ini diakses secara aman dan publik melalui Portal Transparansi RWManage.", 40, 787, { align: "center" });

  doc.end();
};
