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
  urgensi?: string;
}

interface UpdateLaporanBody {
  tipe_insiden?: string;
  lokasi?: string;
  deskripsi?: string;
  status?: StatusInsiden;
  tindakan_diambil?: string;
  urgensi?: string;
  pelapor_nama?: string;
  pelapor_no_hp?: string | null;
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
      urgensi,
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
        urgensi: urgensi || "RENDAH",
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
    const { tipe_insiden, lokasi, deskripsi, status, tindakan_diambil, urgensi, pelapor_nama, pelapor_no_hp } =
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
        ...(tipe_insiden && { tipe_insiden: tipe_insiden.trim() }),
        ...(lokasi && { lokasi: lokasi.trim() }),
        ...(deskripsi && { deskripsi: deskripsi.trim() }),
        ...(status && { status }),
        ...(tindakan_diambil && {
          tindakan_diambil: tindakan_diambil.trim(),
          ditindaklanjuti_tanggal: new Date(),
        }),
        ...(foto_bukti_url && { foto_bukti_url }),
        ...(urgensi && { urgensi }),
        ...(pelapor_nama && { pelapor_nama: pelapor_nama.trim() }),
        ...(pelapor_no_hp !== undefined && { pelapor_no_hp: pelapor_no_hp?.trim() || null }),
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
      urgensi,
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
        urgensi: urgensi || "RENDAH",
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
        blok_wilayah_id: blok_wilayah_id,
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
    const { tipe_insiden, lokasi, deskripsi, status, tindakan_diambil, urgensi, pelapor_nama, pelapor_no_hp } =
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
        blok_wilayah_id: blok_wilayah_id,
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
        ...(tipe_insiden && { tipe_insiden: tipe_insiden.trim() }),
        ...(lokasi && { lokasi: lokasi.trim() }),
        ...(deskripsi && { deskripsi: deskripsi.trim() }),
        ...(status && { status }),
        ...(tindakan_diambil && {
          tindakan_diambil: tindakan_diambil.trim(),
          ditindaklanjuti_tanggal: new Date(),
        }),
        ...(foto_bukti_url && { foto_bukti_url }),
        ...(urgensi && { urgensi }),
        ...(pelapor_nama && { pelapor_nama: pelapor_nama.trim() }),
        ...(pelapor_no_hp !== undefined && { pelapor_no_hp: pelapor_no_hp?.trim() || null }),
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
        blok_wilayah_id: blok_wilayah_id,
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
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text('LAPORAN KEJADIAN / INSIDEN WILAYAH', { align: 'center' });
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
    const wilayah = await prisma.wilayahRW.findUnique({ where: { id: laporan.wilayah_rw_id }, select: { user_id: true, no_rw: true, nama_kompleks: true } });
    if (!wilayah || wilayah.user_id !== req.user.id) {
      res.status(403).json({ success: false, message: 'Akses ditolak.' });
      return;
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-${laporan.id}.pdf`);

    doc.pipe(res);

    const headerData = {
      isRw: true,
      no_rw: wilayah.no_rw,
      nama_kompleks: wilayah.nama_kompleks
    };

    renderIncidentReportPage(doc, laporan, headerData);

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
    res.setHeader('Content-Disposition', `attachment; filename=laporan-insiden-rw-${rw?.no_rw || 'grouped'}.pdf`);

    doc.pipe(res);

    incidents.forEach((item, index) => {
      if (index > 0) {
        doc.addPage();
      }

      const headerData = {
        isRw: true,
        no_rw: rw?.no_rw || '-',
        nama_kompleks: rw?.nama_kompleks || '-',
        no_rt: item.blok_wilayah?.no_rt,
        nama_blok: item.blok_wilayah?.nama_blok
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

