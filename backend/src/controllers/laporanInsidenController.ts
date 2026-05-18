import { Request, Response } from "express";
import { StatusInsiden, AksiAudit } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../middlewares/auditLogger";

interface CreateLaporanBody {
  tipe_insiden?: string;
  tanggal_insiden?: string;
  lokasi?: string;
  deskripsi?: string;
  pelapor_nama?: string;
  pelapor_no_hp?: string;
}

interface UpdateLaporanBody {
  tipe_insiden?: string;
  tanggal_insiden?: string;
  lokasi?: string;
  deskripsi?: string;
  status?: StatusInsiden;
  tindakan_diambil?: string;
}

export const createLaporanInsiden = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      tipe_insiden,
      tanggal_insiden,
      lokasi,
      deskripsi,
      pelapor_nama,
      pelapor_no_hp,
    } = req.body as CreateLaporanBody;

    if (
      !tipe_insiden ||
      !tanggal_insiden ||
      !lokasi ||
      !deskripsi ||
      !pelapor_nama
    ) {
      res.status(400).json({
        success: false,
        message:
          "tipe_insiden, tanggal_insiden, lokasi, deskripsi, dan pelapor_nama wajib diisi.",
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

    // Get wilayah_rw_id from user
    const wilayahRW = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!wilayahRW) {
      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk membuat laporan insiden.",
      });
      return;
    }

    // Upload file jika ada
    const foto_bukti_url = (req as any).file?.filename
      ? `/uploads/${(req as any).file.filename}`
      : null;

    const laporan = await prisma.laporanInsiden.create({
      data: {
        wilayah_rw_id: wilayahRW.id,
        tipe_insiden,
        tanggal_insiden: new Date(tanggal_insiden),
        lokasi,
        deskripsi,
        pelapor_nama,
        pelapor_no_hp: pelapor_no_hp || null,
        foto_bukti_url,
        status: "LAPORAN",
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "LaporanInsiden",
      entitas_id: laporan.id,
      data_baru: laporan,
      keterangan: `Membuat Laporan Insiden Baru: ${tipe_insiden} di ${lokasi}`,
    });

    res.status(201).json({
      success: true,
      message: "Laporan insiden berhasil dibuat.",
      data: laporan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat laporan insiden.",
    });
  }
};

export const getLaporanInsidenList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, tanggal_mulai, tanggal_akhir } = req.query as {
      status?: StatusInsiden;
      tanggal_mulai?: string;
      tanggal_akhir?: string;
    };

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    // Get wilayah_rw_id from user
    const wilayahRW = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!wilayahRW) {
      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk melihat laporan insiden.",
      });
      return;
    }

    const laporan = await prisma.laporanInsiden.findMany({
      where: {
        wilayah_rw_id: wilayahRW.id,
        ...(status && { status }),
        ...(tanggal_mulai && tanggal_akhir
          ? {
              tanggal_insiden: {
                gte: new Date(tanggal_mulai),
                lte: new Date(tanggal_akhir),
              },
            }
          : {}),
      },
      include: {
        blok_wilayah: { select: { nama_blok: true, no_rt: true } }
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Data laporan insiden berhasil diambil.",
      data: laporan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data laporan insiden.",
    });
  }
};

export const updateLaporanInsiden = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    const { tipe_insiden, tanggal_insiden, lokasi, deskripsi, status, tindakan_diambil } =
      req.body as UpdateLaporanBody;

    if (!laporan_id) {
      res.status(400).json({
        success: false,
        message: "laporan_id harus diisi.",
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

    const existingLaporan = await prisma.laporanInsiden.findUnique({
      where: { id: laporan_id },
      include: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!existingLaporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    if (existingLaporan.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const foto_bukti_url = (req as any).file?.filename
      ? `/uploads/${(req as any).file.filename}`
      : undefined;

    const updated = await prisma.laporanInsiden.update({
      where: { id: laporan_id },
      data: {
        ...(tipe_insiden && { tipe_insiden }),
        ...(tanggal_insiden && { tanggal_insiden: new Date(tanggal_insiden) }),
        ...(lokasi && { lokasi }),
        ...(deskripsi && { deskripsi }),
        ...(status && { status }),
        ...(tindakan_diambil && {
          tindakan_diambil,
          ditindaklanjuti_tanggal: new Date(),
        }),
        ...(foto_bukti_url && { foto_bukti_url }),
      },
    });

    const { wilayah_rw, ...cleanExistingLaporan } = existingLaporan;
    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "LaporanInsiden",
      entitas_id: updated.id,
      data_lama: cleanExistingLaporan,
      data_baru: updated,
      keterangan: `Memperbarui Laporan Insiden: ${updated.tipe_insiden} di ${updated.lokasi}`,
    });

    res.status(200).json({
      success: true,
      message: "Laporan insiden berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate laporan insiden.",
    });
  }
};

export const closeLaporanInsiden = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!laporan_id) {
      res.status(400).json({
        success: false,
        message: "laporan_id harus diisi.",
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

    const existingLaporan = await prisma.laporanInsiden.findUnique({
      where: { id: laporan_id },
      include: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!existingLaporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    if (existingLaporan.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const updated = await prisma.laporanInsiden.update({
      where: { id: laporan_id },
      data: { status: "DITUTUP" },
    });

    const { wilayah_rw, ...cleanExistingLaporan } = existingLaporan;
    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "LaporanInsiden",
      entitas_id: updated.id,
      data_lama: cleanExistingLaporan,
      data_baru: updated,
      keterangan: `Menutup Laporan Insiden: ${updated.tipe_insiden}`,
    });

    res.status(200).json({
      success: true,
      message: "Laporan insiden berhasil ditutup.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menutup laporan insiden.",
    });
  }
};

export const deleteLaporanInsiden = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!laporan_id) {
      res.status(400).json({
        success: false,
        message: "laporan_id harus diisi.",
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

    const existingLaporan = await prisma.laporanInsiden.findUnique({
      where: { id: laporan_id },
      include: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!existingLaporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    if (existingLaporan.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    await prisma.laporanInsiden.delete({
      where: { id: laporan_id },
    });

    const { wilayah_rw, ...cleanExistingLaporan } = existingLaporan;
    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "LaporanInsiden",
      entitas_id: laporan_id,
      data_lama: cleanExistingLaporan,
      keterangan: `Menghapus Laporan Insiden: ${existingLaporan.tipe_insiden}`,
    });

    res.status(200).json({
      success: true,
      message: "Laporan insiden berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus laporan insiden.",
    });
  }
};

// ===== RT INCIDENT MANAGEMENT =====

export const createLaporanInsidenForRt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      tipe_insiden,
      tanggal_insiden,
      lokasi,
      deskripsi,
      pelapor_nama,
      pelapor_no_hp,
    } = req.body as CreateLaporanBody;

    if (
      !tipe_insiden ||
      !tanggal_insiden ||
      !lokasi ||
      !deskripsi ||
      !pelapor_nama
    ) {
      res.status(400).json({
        success: false,
        message:
          "tipe_insiden, tanggal_insiden, lokasi, deskripsi, dan pelapor_nama wajib diisi.",
      });
      return;
    }

    if (!req.user?.id || req.user?.role !== "RT") {
      res.status(401).json({
        success: false,
        message: "Unauthorized: User belum terautentikasi atau bukan RT.",
      });
      return;
    }

    const blok_wilayah_id = (req.user as any).blok_wilayah_id;
    if (!blok_wilayah_id) {
      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk membuat laporan insiden.",
      });
      return;
    }

    // Get wilayah_rw_id from blok_wilayah
    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { wilayah_rw_id: true },
    });

    if (!blok) {
      res.status(403).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    // Upload file jika ada
    const foto_bukti_url = (req as any).file?.filename
      ? `/uploads/${(req as any).file.filename}`
      : null;

    const laporan = await prisma.laporanInsiden.create({
      data: {
        blok_wilayah_id: blok_wilayah_id,
        wilayah_rw_id: blok.wilayah_rw_id,
        tipe_insiden,
        tanggal_insiden: new Date(tanggal_insiden),
        lokasi,
        deskripsi,
        pelapor_nama,
        pelapor_no_hp: pelapor_no_hp || null,
        foto_bukti_url,
        status: "LAPORAN",
      },
    });

    res.status(201).json({
      success: true,
      message: "Laporan insiden berhasil dibuat.",
      data: laporan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat laporan insiden.",
    });
  }
};

export const getLaporanInsidenListForRt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, tanggal_mulai, tanggal_akhir } = req.query as {
      status?: StatusInsiden;
      tanggal_mulai?: string;
      tanggal_akhir?: string;
    };

    if (!req.user?.id || req.user?.role !== "RT") {
      res.status(401).json({
        success: false,
        message: "Unauthorized: User belum terautentikasi atau bukan RT.",
      });
      return;
    }

    const blok_wilayah_id = (req.user as any).blok_wilayah_id;
    if (!blok_wilayah_id) {
      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk melihat laporan insiden.",
      });
      return;
    }

    // Get wilayah_rw_id from blok_wilayah
    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { wilayah_rw_id: true },
    });

    if (!blok) {
      res.status(403).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    const laporan = await prisma.laporanInsiden.findMany({
      where: {
        wilayah_rw_id: blok.wilayah_rw_id,
        ...(status && { status }),
        ...(tanggal_mulai && tanggal_akhir
          ? {
              tanggal_insiden: {
                gte: new Date(tanggal_mulai),
                lte: new Date(tanggal_akhir),
              },
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Data laporan insiden berhasil diambil.",
      data: laporan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data laporan insiden.",
    });
  }
};

export const updateLaporanInsidenForRt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    const { tipe_insiden, tanggal_insiden, lokasi, deskripsi, status, tindakan_diambil } =
      req.body as UpdateLaporanBody;

    if (!laporan_id) {
      res.status(400).json({
        success: false,
        message: "laporan_id harus diisi.",
      });
      return;
    }

    if (!req.user?.id || req.user?.role !== "RT") {
      res.status(401).json({
        success: false,
        message: "Unauthorized: User belum terautentikasi atau bukan RT.",
      });
      return;
    }

    const blok_wilayah_id = (req.user as any).blok_wilayah_id;

    // Get wilayah_rw_id from blok_wilayah
    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { wilayah_rw_id: true },
    });

    if (!blok) {
      res.status(403).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    const laporan = await prisma.laporanInsiden.findFirst({
      where: {
        id: laporan_id,
        wilayah_rw_id: blok.wilayah_rw_id,
      },
    });

    if (!laporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    const foto_bukti_url = (req as any).file?.filename
      ? `/uploads/${(req as any).file.filename}`
      : undefined;

    const updated = await prisma.laporanInsiden.update({
      where: { id: laporan_id },
      data: {
        ...(tipe_insiden && { tipe_insiden }),
        ...(tanggal_insiden && { tanggal_insiden: new Date(tanggal_insiden) }),
        ...(lokasi && { lokasi }),
        ...(deskripsi && { deskripsi }),
        ...(status && { status }),
        ...(tindakan_diambil && {
          tindakan_diambil,
          ditindaklanjuti_tanggal: new Date(),
        }),
        ...(foto_bukti_url && { foto_bukti_url }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Laporan insiden berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate laporan insiden.",
    });
  }
};

export const deleteLaporanInsidenForRt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!laporan_id) {
      res.status(400).json({
        success: false,
        message: "laporan_id harus diisi.",
      });
      return;
    }

    if (!req.user?.id || req.user?.role !== "RT") {
      res.status(401).json({
        success: false,
        message: "Unauthorized: User belum terautentikasi atau bukan RT.",
      });
      return;
    }

    const blok_wilayah_id = (req.user as any).blok_wilayah_id;

    // Get wilayah_rw_id from blok_wilayah
    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { wilayah_rw_id: true },
    });

    if (!blok) {
      res.status(403).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    const laporan = await prisma.laporanInsiden.findFirst({
      where: {
        id: laporan_id,
        wilayah_rw_id: blok.wilayah_rw_id,
      },
    });

    if (!laporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    await prisma.laporanInsiden.delete({
      where: { id: laporan_id },
    });

    res.status(200).json({
      success: true,
      message: "Laporan insiden berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus laporan insiden.",
    });
  }
};

// ===== RW INCIDENT MONITORING (READ-ONLY) =====

export const getMonitoringInsidenRw = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id || req.user?.role !== "RW") {
      res.status(401).json({
        success: false,
        message: "Unauthorized: User belum terautentikasi atau bukan RW.",
      });
      return;
    }

    const wilayah_rw_id = (req.user as any).wilayah_rw_id;

    // Get all incidents for this RW
    const incidents = await prisma.laporanInsiden.findMany({
      where: {
        wilayah_rw_id,
      },
      include: {
        blok_wilayah: { select: { nama_blok: true, no_rt: true } }
      },
      orderBy: { created_at: "desc" },
    });

    // Calculate status counts
    let statusCounts = { LAPORAN: 0, PROSES: 0, SELESAI: 0, DITUTUP: 0 };
    incidents.forEach((incident) => {
      statusCounts[incident.status as keyof typeof statusCounts]++;
    });

    res.json({
      success: true,
      data: {
        summary: {
          total: incidents.length,
          ...statusCounts,
        },
        incidents,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data monitoring insiden.",
    });
  }
};

export const exportLaporanPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.laporan_id;
    const laporan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!laporan_id) {
      res.status(400).json({ success: false, message: 'laporan_id harus diisi.' });
      return;
    }

    if (!req.user?.id || req.user?.role !== 'RW') {
      res.status(401).json({ success: false, message: 'Unauthorized: User belum terautentikasi atau bukan RW.' });
      return;
    }

    const laporan = await prisma.laporanInsiden.findUnique({ where: { id: laporan_id } });
    if (!laporan) {
      res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
      return;
    }

    // verify ownership
    const wilayah = await prisma.wilayahRW.findUnique({ where: { id: laporan.wilayah_rw_id }, select: { user_id: true } });
    if (!wilayah || wilayah.user_id !== req.user.id) {
      res.status(403).json({ success: false, message: 'Akses ditolak.' });
      return;
    }

    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-${laporan.id}.pdf`);

    doc.pipe(res);

    doc.fontSize(18).text('Laporan Insiden', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`ID: ${laporan.id}`);
    doc.text(`Tipe Insiden: ${laporan.tipe_insiden}`);
    doc.text(`Tanggal Insiden: ${laporan.tanggal_insiden?.toISOString().split('T')[0] || ''}`);
    doc.text(`Lokasi: ${laporan.lokasi}`);
    doc.moveDown();

    doc.text('Deskripsi:');
    doc.fontSize(11).text(laporan.deskripsi || '', { align: 'left' });
    doc.moveDown();

    doc.fontSize(12).text(`Pelapor: ${laporan.pelapor_nama} ${laporan.pelapor_no_hp ? `(${laporan.pelapor_no_hp})` : ''}`);
    doc.text(`Status: ${laporan.status}`);
    if (laporan.tindakan_diambil) {
      doc.moveDown();
      doc.text('Tindakan yang diambil:');
      doc.fontSize(11).text(laporan.tindakan_diambil || '', { align: 'left' });
    }

    // attach foto if exists
    if (laporan.foto_bukti_url) {
      try {
        const filename = laporan.foto_bukti_url.replace('/uploads/', '');
        const imgPath = path.join(process.cwd(), 'backend', 'uploads', filename);
        if (fs.existsSync(imgPath)) {
          doc.addPage();
          doc.fontSize(14).text('Foto Bukti', { align: 'center' });
          doc.image(imgPath, { fit: [480, 600], align: 'center' });
        }
      } catch (err) {
        console.error('Gagal melampirkan foto bukti:', err);
      }
    }

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengekspor laporan ke PDF.' });
  }
};

export const exportGroupedLaporanPdf = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id || req.user?.role !== "RW") {
      res.status(401).json({
        success: false,
        message: "Unauthorized: User belum terautentikasi atau bukan RW.",
      });
      return;
    }

    const wilayah_rw_id = (req.user as any).wilayah_rw_id;

    // Get filter ids from query parameters
    let whereClause: any = {
      wilayah_rw_id,
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
      where: { id: wilayah_rw_id },
      select: { no_rw: true, nama_kompleks: true }
    });

    // Grouping
    const groupedByRt: Record<string, typeof incidents> = {};
    incidents.forEach(item => {
      const rtKey = item.blok_wilayah?.no_rt 
        ? `RT ${item.blok_wilayah.no_rt.padStart(3, '0')} (${item.blok_wilayah.nama_blok})` 
        : "Tingkat RW / Blok Umum";
      if (!groupedByRt[rtKey]) {
        groupedByRt[rtKey] = [];
      }
      groupedByRt[rtKey].push(item);
    });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-insiden-rw-${rw?.no_rw || 'grouped'}.pdf`);

    doc.pipe(res);

    // Drawing Kop Surat (Official Letterhead)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16).text('PENGURUS RUKUN WARGA (RW)', { align: 'center' });
    doc.moveDown(0.15);
    doc.fontSize(11).font('Helvetica-Bold').text(`WILAYAH RW ${rw?.no_rw || '-'} - KOMPLEKS ${rw?.nama_kompleks?.toUpperCase() || '-'}`, { align: 'center' });
    doc.moveDown(0.15);
    doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text('Sistem Informasi Manajemen Lingkungan Terintegrasi - RWManage', { align: 'center' });
    doc.moveDown(0.15);
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94a3b8').text('Layanan Pengaduan, Keamanan, Ronda, dan Monitoring Insiden Wilayah Resmi', { align: 'center' });
    
    // Draw thick professional double lines under Kop Surat
    doc.lineWidth(1.8).strokeColor('#0f172a').moveTo(40, 105).lineTo(555, 105).stroke();
    doc.lineWidth(0.5).strokeColor('#475569').moveTo(40, 109).lineTo(555, 109).stroke();

    // Title of the document
    doc.moveDown(2);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e293b').text('LAPORAN MONITORING INSIDEN & KEJADIAN WILAYAH', { align: 'center' });
    doc.moveDown(0.15);
    doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`, { align: 'center' });
    doc.moveDown(1.5);

    // Summary Box
    let totalLaporan = incidents.length;
    let baru = incidents.filter(i => i.status === 'LAPORAN').length;
    let proses = incidents.filter(i => i.status === 'PROSES').length;
    let selesai = incidents.filter(i => i.status === 'SELESAI').length;
    let ditutup = incidents.filter(i => i.status === 'DITUTUP').length;

    doc.lineWidth(0.8).strokeColor('#cbd5e1').rect(40, doc.y, 515, 42).stroke();
    const summaryY = doc.y + 8;
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5);
    doc.text('RINGKASAN STATUS LAPORAN AKTIF:', 50, summaryY);
    
    doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
    doc.text(`Total Kejadian: ${totalLaporan}   |   Baru: ${baru}   |   Sedang Ditangani: ${proses}   |   Selesai: ${selesai}   |   Ditutup: ${ditutup}`, 50, summaryY + 15);
    doc.moveDown(2.8);

    // Grouped list rendering
    const rtKeys = Object.keys(groupedByRt).sort();

    rtKeys.forEach((rtKey) => {
      // Check page overflow
      if (doc.y + 60 > 750) {
        doc.addPage();
      }

      const currentY = doc.y;
      // Draw RT Section header
      doc.fillColor('#e0f2fe').rect(40, currentY, 515, 22).fill();
      doc.fillColor('#0369a1').font('Helvetica-Bold').fontSize(10).text(rtKey.toUpperCase(), 50, currentY + 6);
      doc.moveDown(1.2);

      const rtIncidents = groupedByRt[rtKey];

      // Group by status
      const statusGroups: Record<string, typeof incidents> = {
        'LAPORAN': [],
        'PROSES': [],
        'SELESAI': [],
        'DITUTUP': []
      };

      rtIncidents.forEach(item => {
        statusGroups[item.status] = statusGroups[item.status] || [];
        statusGroups[item.status].push(item);
      });

      const statuses = ['LAPORAN', 'PROSES', 'SELESAI', 'DITUTUP'];

      statuses.forEach(status => {
        const items = statusGroups[status];
        if (!items || items.length === 0) return;

        if (doc.y + 40 > 750) {
          doc.addPage();
        }

        // Draw Status subheading
        let statusLabel = status === 'LAPORAN' ? 'BARU' : status === 'PROSES' ? 'DITANGANI' : status;
        let statusColor = status === 'LAPORAN' ? '#be123c' : status === 'PROSES' ? '#d97706' : status === 'SELESAI' ? '#059669' : '#4b5563';

        doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(9).text(`• Status: ${statusLabel} (${items.length} Laporan)`, 48, doc.y);
        doc.moveDown(0.4);

        items.forEach((item, itemIdx) => {
          if (doc.y + 110 > 750) {
            doc.addPage();
          }

          const boxY = doc.y;
          // Outer box
          doc.lineWidth(0.5).strokeColor('#e2e8f0').rect(46, boxY, 503, 85).stroke();
          
          // Row Header inside box
          doc.fillColor('#f8fafc').rect(47, boxY + 1, 501, 16).fill();
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text(`${itemIdx + 1}. ${item.tipe_insiden}`, 52, boxY + 4);
          
          // Urgency Dynamic Level
          const urgency = getUrgencyHelper(item.tipe_insiden, item.deskripsi);
          let urgencyColor = urgency === 'TINGGI' ? '#be123c' : urgency === 'SEDANG' ? '#b45309' : '#1d4ed8';
          doc.fillColor(urgencyColor).font('Helvetica-Bold').fontSize(8).text(`URGENSI: ${urgency}`, 440, boxY + 4);

          // Incident details
          const elapsed = getElapsedHelper(item.tanggal_insiden);
          const dateStr = new Date(item.tanggal_insiden).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          
          doc.fillColor('#334155').font('Helvetica').fontSize(8);
          doc.text(`Waktu Kejadian : ${dateStr} (${elapsed})`, 52, boxY + 22);
          doc.text(`Lokasi Kejadian : ${item.lokasi}`, 52, boxY + 32);
          doc.text(`Identitas Pelapor : ${item.pelapor_nama} ${item.pelapor_no_hp ? `(${item.pelapor_no_hp})` : ''}`, 52, boxY + 42);
          doc.fillColor('#475569').text(`Deskripsi Kejadian : ${item.deskripsi.substring(0, 120)}${item.deskripsi.length > 120 ? '...' : ''}`, 52, boxY + 52, { width: 490 });

          // Warnings / Resolution actions
          if (item.tindakan_diambil) {
            doc.fillColor('#059669').font('Helvetica-Bold').text(`Tindakan Diambil : ${item.tindakan_diambil.substring(0, 110)}${item.tindakan_diambil.length > 110 ? '...' : ''}`, 52, boxY + 68, { width: 490 });
          } else if (item.status === 'LAPORAN') {
            const isOverdue = checkOverdueHelper(item.tanggal_insiden);
            if (isOverdue) {
              doc.fillColor('#be123c').font('Helvetica-Bold').text('⚠️ PERINGATAN: Belum ditindaklanjuti > 3 Hari (Segera evaluasi tingkat RT terkait!)', 52, boxY + 68, { width: 490 });
            }
          }

          doc.moveDown(9.8);
        });
      });

      doc.moveDown(0.8);
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

// --- PDF Exporter Helpers ---
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

