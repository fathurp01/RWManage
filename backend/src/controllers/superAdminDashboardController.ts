import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getDashboardOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    if (req.user.role !== "SUPERADMIN") {
      res.status(403).json({
        success: false,
        message: "Hanya superadmin yang dapat mengakses dashboard ini.",
      });
      return;
    }

    // Hitung total
    const totalRW = await prisma.wilayahRW.count();
    const totalBlok = await prisma.blokWilayah.count();
    const totalWarga = await prisma.warga.count();
    const totalMasjid = await prisma.masjid.count();
    const totalUsers = await prisma.user.count();

    // Hitung pengguna per role
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: true,
    });

    // Hitung transaksi ZIS
    const totalZis = await prisma.transaksiZis.aggregate({
      _sum: { nominal_zakat: true, nominal_infaq: true },
    });

    // Hitung kas RW
    const kasRWTotal = await prisma.kasRW.aggregate({
      _sum: { nominal: true },
    });

    // Hitung kas Masjid
    const kasMasjidTotal = await prisma.kasMasjid.aggregate({
      _sum: { nominal: true },
    });

    res.status(200).json({
      success: true,
      message: "Overview dashboard berhasil diambil.",
      data: {
        total_rw: totalRW,
        total_blok: totalBlok,
        total_warga: totalWarga,
        total_masjid: totalMasjid,
        total_users: totalUsers,
        users_by_role: usersByRole,
        total_zis: Number(totalZis._sum.nominal_zakat || 0) + Number(totalZis._sum.nominal_infaq || 0),
        total_kas_rw: kasRWTotal._sum.nominal || 0,
        total_kas_masjid: kasMasjidTotal._sum.nominal || 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data overview.",
    });
  }
};

export const getFinancialSummary = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tanggal_mulai, tanggal_akhir } = req.query as {
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

    if (req.user.role !== "SUPERADMIN") {
      res.status(403).json({
        success: false,
        message: "Hanya superadmin yang dapat mengakses laporan keuangan.",
      });
      return;
    }

    // Filter berdasarkan tanggal jika diberikan
    const dateFilter = tanggal_mulai && tanggal_akhir ? {
      gte: new Date(tanggal_mulai),
      lte: new Date(tanggal_akhir),
    } : undefined;

    // ZIS per kategori
    const zisByCategory = await prisma.transaksiZis.groupBy({
      by: ["jenis_bayar"],
      _sum: { nominal_zakat: true, nominal_infaq: true, total_beras_kg: true },
      where: {
        ...(dateFilter && { waktu_transaksi: dateFilter })
      },
    });

    // Iuran per RT
    const iuranByRT = await prisma.iuranWarga.groupBy({
      by: ["status"],
      _sum: { nominal: true },
      _count: true,
    });

    // Kas RW per wilayah
    const kasRWByWilayah = await prisma.kasRW.groupBy({
      by: ["wilayah_rw_id"],
      _sum: { nominal: true },
      where: {
        ...(dateFilter && { tanggal: dateFilter })
      },
    });

    // Laporan insiden summary
    const insidenByStatus = await prisma.laporanInsiden.groupBy({
      by: ["status"],
      _count: true,
      where: {
        ...(dateFilter && { created_at: dateFilter })
      }
    });

    res.status(200).json({
      success: true,
      message: "Ringkasan keuangan berhasil diambil.",
      data: {
        zis_by_category: zisByCategory,
        iuran_by_rt: iuranByRT,
        kas_rw_by_wilayah: kasRWByWilayah,
        insiden_by_status: insidenByStatus,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil ringkasan keuangan.",
    });
  }
};

export const getActivityLog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { limit = "20", offset = "0" } = req.query as {
      limit?: string;
      offset?: string;
    };

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    if (req.user.role !== "SUPERADMIN") {
      res.status(403).json({
        success: false,
        message: "Hanya superadmin yang dapat mengakses log aktivitas.",
      });
      return;
    }

    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: { id: true, email: true, nama: true, role: true }
        }
      },
      orderBy: { created_at: "desc" },
      take: Math.min(Number(limit), 100),
      skip: Number(offset),
    });

    const totalCount = await prisma.auditLog.count();

    res.status(200).json({
      success: true,
      message: "Log aktivitas berhasil diambil.",
      data: logs,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil log aktivitas.",
    });
  }
};

export const getSystemHealth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    if (req.user.role !== "SUPERADMIN") {
      res.status(403).json({
        success: false,
        message: "Hanya superadmin yang dapat mengakses status sistem.",
      });
      return;
    }

    // Test database connection
    const dbTest = await prisma.user.count();
    
    // Hitung data yang belum disetujui
    const pendingApprovals = await prisma.user.count({
      where: { status_akun: "PENDING" }
    });

    // Hitung share link yang aktif
    const activeShareLinks = await prisma.shareLink.count({
      where: {
        revoked_at: null,
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } },
        ],
      }
    });

    // Hitung laporan insiden yang belum selesai
    const openIncidents = await prisma.laporanInsiden.count({
      where: { 
        status: { in: ["LAPORAN", "PROSES"] }
      }
    });

    res.status(200).json({
      success: true,
      message: "Status sistem berhasil diambil.",
      data: {
        database_status: "connected",
        total_records: dbTest,
        pending_approvals: pendingApprovals,
        active_share_links: activeShareLinks,
        open_incidents: openIncidents,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil status sistem.",
      data: {
        database_status: "disconnected",
      },
    });
  }
};

export const getApprovalQueue = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    if (req.user.role !== "SUPERADMIN") {
      res.status(403).json({
        success: false,
        message: "Hanya superadmin yang dapat mengakses antrian persetujuan.",
      });
      return;
    }

    // Pengguna yang menunggu persetujuan
    const pendingUsers = await prisma.user.findMany({
      where: { status_akun: "PENDING" },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        status_akun: true,
        created_at: true,
      },
      orderBy: { created_at: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Antrian persetujuan berhasil diambil.",
      data: {
        pending_count: pendingUsers.length,
        pending_users: pendingUsers,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil antrian persetujuan.",
    });
  }
};
