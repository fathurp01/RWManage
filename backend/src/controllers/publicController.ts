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
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="Kwitansi-${data.sumber}-${Date.now()}.pdf"`
  );

  doc.pipe(res);

  // Header Title
  doc.fontSize(24).font("Helvetica-Bold").fillColor(data.color).text(data.title, { align: "center" });
  doc.moveDown(0.5);

  // Subtitle
  doc.fontSize(12).font("Helvetica").fillColor("#64748b").text("Sistem Informasi RWManage", { align: "center" });
  doc.moveDown(2);

  // Content
  doc.fillColor("#334155");
  data.items.forEach(([label, value]) => {
    doc.fontSize(12).font("Helvetica-Bold").text(`${label}:`, { continued: true });
    doc.font("Helvetica").text(` ${value}`);
    doc.moveDown(0.5);
  });

  doc.moveDown(2);

  // Footer stamp
  // Draw a border/stamp
  doc.rect(400, doc.y, 130, 40)
    .lineWidth(2)
    .strokeColor(data.color)
    .stroke();
  doc.fontSize(14).font("Helvetica-Bold").fillColor(data.color).text("VERIFIED", 425, doc.y - 30);

  doc.moveDown(3);
  doc.fontSize(10).fillColor("#94a3b8").text("Dokumen ini dicetak secara otomatis dan sah tanpa tanda tangan basah.", 50, doc.y, { align: "center" });

  // Add generation date
  doc.text(`Waktu Cetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });

  doc.end();
};
