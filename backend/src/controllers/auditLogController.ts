import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getAuditLogList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user_id, aksi, role, tanggal_mulai, tanggal_akhir, search, limit = "50", offset = "0" } = req.query as {
      user_id?: string;
      aksi?: string;
      role?: string;
      tanggal_mulai?: string;
      tanggal_akhir?: string;
      search?: string;
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

    // Superadmin dapat akses semua, RW hanya akses wilayahnya
    let auditLogQuery: any = {};
    
    if (req.user.role === "SUPERADMIN") {
      if (user_id) {
        auditLogQuery.user_id = user_id;
      }
    } else if (req.user.role === "RW") {
      // RW hanya bisa lihat audit log dirinya sendiri (terikat ke user yang sedang login)
      auditLogQuery.user_id = req.user.id;
    } else {
      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk melihat audit log.",
      });
      return;
    }

    if (aksi) {
      auditLogQuery.aksi = aksi;
    }

    if (role && req.user.role === "SUPERADMIN") {
      auditLogQuery.user = { role };
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

    if (search && search.trim() !== "") {
      const normalizedSearch = search.trim();
      auditLogQuery.OR = [
        { keterangan: { contains: normalizedSearch, mode: "insensitive" } },
        { entitas: { contains: normalizedSearch, mode: "insensitive" } },
        { ip_address: { contains: normalizedSearch, mode: "insensitive" } },
        { user: { nama: { contains: normalizedSearch, mode: "insensitive" } } },
        { user: { email: { contains: normalizedSearch, mode: "insensitive" } } }
      ];
    }

    const auditLogs = await prisma.auditLog.findMany({
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
      message: "Data audit log berhasil diambil.",
      data: auditLogs,
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
      message: "Terjadi kesalahan saat mengambil data audit log.",
    });
  }
};

export const getAuditLogDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.log_id;
    const log_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!log_id) {
      res.status(400).json({
        success: false,
        message: "log_id harus diisi.",
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

    const auditLog = await prisma.auditLog.findUnique({
      where: { id: log_id },
      include: {
        user: {
          select: { id: true, email: true, nama: true, role: true }
        }
      }
    });

    if (!auditLog) {
      res.status(404).json({
        success: false,
        message: "Audit log tidak ditemukan.",
      });
      return;
    }

    // Validasi akses
    if (req.user.role === "RW") {
      const rwUsers = await prisma.user.findMany({
        where: {
          wilayah_rw: { user_id: req.user.id }
        },
        select: { id: true }
      });
      const rwUserIds = rwUsers.map(u => u.id);
      
      if (!rwUserIds.includes(auditLog.user_id)) {
        res.status(403).json({
          success: false,
          message: "Akses ditolak.",
        });
        return;
      }
    } else if (req.user.role !== "SUPERADMIN") {
      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk melihat audit log.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Detail audit log berhasil diambil.",
      data: auditLog,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil detail audit log.",
    });
  }
};

export const getAuditStatistics = async (
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
        message: "Hanya superadmin yang dapat melihat statistik audit.",
      });
      return;
    }

    // Statistik per aksi
    const statsByAction = await prisma.auditLog.groupBy({
      by: ["aksi"],
      _count: true,
      orderBy: { _count: { aksi: "desc" },
      }
    });

    // Statistik per user
    const statsByUser = await prisma.auditLog.groupBy({
      by: ["user_id"],
      _count: true,
      orderBy: { _count: { user_id: "desc" } }
    });

    // Ambil info user untuk statistik
    const userIds = statsByUser.map(s => s.user_id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, nama: true }
    });

    const statsWithUserInfo = statsByUser.map(stat => {
      const user = users.find(u => u.id === stat.user_id);
      return {
        user: user || { id: stat.user_id, email: "Unknown", nama: "Unknown" },
        count: stat._count
      };
    });

    res.status(200).json({
      success: true,
      message: "Statistik audit berhasil diambil.",
      data: {
        by_action: statsByAction,
        by_user: statsWithUserInfo,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil statistik audit.",
    });
  }
};
