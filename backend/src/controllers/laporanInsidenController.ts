import { Request, Response } from "express";
import { StatusInsiden } from "@prisma/client";
import { prisma } from "../lib/prisma";

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
        blok_wilayah: { select: { nama_blok: true } }
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

    const laporan = await prisma.laporanInsiden.findUnique({
      where: { id: laporan_id },
      select: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!laporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    if (laporan.wilayah_rw.user_id !== req.user.id) {
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

    const laporan = await prisma.laporanInsiden.findUnique({
      where: { id: laporan_id },
      select: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!laporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    if (laporan.wilayah_rw.user_id !== req.user.id) {
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

    const laporan = await prisma.laporanInsiden.findUnique({
      where: { id: laporan_id },
      select: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!laporan) {
      res.status(404).json({
        success: false,
        message: "Laporan insiden tidak ditemukan.",
      });
      return;
    }

    if (laporan.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
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
        blok_wilayah: { select: { nama_blok: true } }
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

