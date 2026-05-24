import { Request, Response } from "express";
import { Role, StatusAkun, AksiAudit } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../middlewares/auditLogger";

const SALT_ROUNDS = 12;

interface CreateBlokBody {
  wilayah_rw_id?: string;
  nama_blok?: string;
  no_rt?: string;
}

interface UpdateBlokBody {
  nama_blok?: string;
  no_rt?: string;
}

export const createBlokWilayah = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { wilayah_rw_id, nama_blok, no_rt } = req.body as CreateBlokBody;

    if (!wilayah_rw_id || !nama_blok || !no_rt) {
      res.status(400).json({
        success: false,
        message: "wilayah_rw_id, nama_blok, dan no_rt wajib diisi.",
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

    // Validasi ownership
    const wilayah = await prisma.wilayahRW.findUnique({
      where: { id: wilayah_rw_id },
      select: { user_id: true },
    });

    if (!wilayah) {
      res.status(404).json({
        success: false,
        message: "Wilayah RW tidak ditemukan.",
      });
      return;
    }

    if (wilayah.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    // Check for existing nama_blok or no_rt
    const existingBlok = await prisma.blokWilayah.findFirst({
      where: {
        wilayah_rw_id,
        OR: [
          { nama_blok: { equals: nama_blok, mode: 'insensitive' as any } },
          ...(no_rt ? [{ no_rt: { equals: no_rt, mode: 'insensitive' as any } }] : [])
        ]
      }
    });

    if (existingBlok) {
      res.status(409).json({
        success: false,
        message: existingBlok.nama_blok.toLowerCase() === nama_blok.toLowerCase()
          ? `Nama blok "${nama_blok}" sudah terdaftar.`
          : `Nomor RT "${no_rt}" sudah terdaftar.`,
      });
      return;
    }

    const blok = await prisma.blokWilayah.create({
      data: {
        wilayah_rw_id,
        nama_blok,
        no_rt: no_rt || null,
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "BlokWilayah",
      entitas_id: blok.id,
      data_baru: blok,
      keterangan: `Menambahkan Blok Wilayah baru ${nama_blok} (RT ${no_rt ?? "-"})`,
    });

    res.status(201).json({
      success: true,
      message: "Blok wilayah berhasil ditambahkan.",
      data: blok,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat blok wilayah.",
    });
  }
};

export const getBlokWilayahList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { wilayah_rw_id } = req.query as { wilayah_rw_id?: string };

    if (!wilayah_rw_id) {
      res.status(400).json({
        success: false,
        message: "wilayah_rw_id harus diisi.",
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

    // Validasi ownership
    const wilayah = await prisma.wilayahRW.findUnique({
      where: { id: wilayah_rw_id },
      select: { user_id: true },
    });

    if (!wilayah) {
      res.status(404).json({
        success: false,
        message: "Wilayah RW tidak ditemukan.",
      });
      return;
    }

    if (wilayah.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const bloks = await prisma.blokWilayah.findMany({
      where: { wilayah_rw_id },
      include: {
        performa_ronda: {
          select: { id: true }
        },
        users: {
          select: { id: true, nama: true, email: true, role: true, status_akun: true }
        },
        masjid: {
          include: {
            pengurus_masjid: {
              include: {
                user: {
                  select: { id: true, nama: true, email: true, role: true, status_akun: true }
                }
              }
            }
          }
        },
        warga: {
          select: {
            id: true,
            _count: {
              select: { anggota_keluarga: true }
            }
          }
        },
        _count: {
          select: {
            warga: true,
            masjid: true
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const formattedBloks = bloks.map((b) => {
      const rtUsers = b.users.filter((u) => u.role === "RT" && u.status_akun === "APPROVED");
      
      const pengurusUsers = b.masjid.flatMap((m) =>
        m.pengurus_masjid
          .map((pm) => pm.user)
          .filter((u) => u && u.role === "PENGURUS_MASJID" && u.status_akun === "APPROVED")
      );

      // Remove duplicates just in case
      const uniquePengurusUsers = Array.from(new Map(pengurusUsers.map((u) => [u.id, u])).values());

      const rtCount = rtUsers.length;
      const pengurusCount = uniquePengurusUsers.length;

      const kkCount = b.warga.length;
      const anggotaCount = b.warga.reduce((sum, w) => sum + w._count.anggota_keluarga, 0);
      const totalWarga = kkCount + anggotaCount;

      const { warga, masjid, ...rest } = b;

      return {
        ...rest,
        users: [...rtUsers, ...uniquePengurusUsers],
        _count: {
          ...b._count,
          rt_users: rtCount,
          pengurus_masjid_users: pengurusCount,
          users: rtCount + pengurusCount,
          warga: totalWarga,
        }
      };
    });

    res.status(200).json({
      success: true,
      message: "Data blok wilayah berhasil diambil.",
      data: formattedBloks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data blok wilayah.",
    });
  }
};

export const updateBlokWilayah = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.blok_id;
    const blok_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
    const { nama_blok, no_rt } = req.body as UpdateBlokBody;

    if (!blok_id) {
      res.status(400).json({
        success: false,
        message: "blok_id harus diisi.",
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

    const existingBlokRecord = await prisma.blokWilayah.findUnique({
      where: { id: blok_id },
      include: { wilayah_rw: { select: { user_id: true } } },
    });

    if (!existingBlokRecord) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    if (existingBlokRecord.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    if (nama_blok || no_rt) {
      const existingBlok = await prisma.blokWilayah.findFirst({
        where: {
          wilayah_rw_id: existingBlokRecord.wilayah_rw_id,
          id: { not: blok_id },
          OR: [
            ...(nama_blok ? [{ nama_blok: { equals: nama_blok, mode: 'insensitive' as any } }] : []),
            ...(no_rt ? [{ no_rt: { equals: no_rt, mode: 'insensitive' as any } }] : [])
          ]
        }
      });

      if (existingBlok) {
        res.status(409).json({
          success: false,
          message: existingBlok.nama_blok.toLowerCase() === (nama_blok || '').toLowerCase()
            ? `Nama blok "${nama_blok}" sudah terdaftar.`
            : `Nomor RT "${no_rt}" sudah terdaftar.`,
        });
        return;
      }
    }

    const updated = await prisma.blokWilayah.update({
      where: { id: blok_id },
      data: {
        ...(nama_blok && { nama_blok }),
        ...(no_rt && { no_rt }),
      },
    });

    const { wilayah_rw, ...cleanExistingBlok } = existingBlokRecord;
    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "BlokWilayah",
      entitas_id: updated.id,
      data_lama: cleanExistingBlok,
      data_baru: updated,
      keterangan: `Memperbarui Blok Wilayah ${updated.nama_blok}`,
    });

    res.status(200).json({
      success: true,
      message: "Blok wilayah berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate blok wilayah.",
    });
  }
};

export const deleteBlokWilayah = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw2 = (req.params as Record<string, unknown>)?.blok_id;
    const blok_id = Array.isArray(raw2) ? raw2[0] : (raw2 as string | undefined);

    if (!blok_id) {
      res.status(400).json({
        success: false,
        message: "blok_id harus diisi.",
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

    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_id },
      select: {
        id: true,
        nama_blok: true,
        no_rt: true,
        wilayah_rw_id: true,
        wilayah_rw: { select: { user_id: true } },
        users: {
          select: { id: true, role: true, status_akun: true }
        }
      },
    });

    if (!blok) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    if (blok.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    // 1. Check direct approved RT users in this block
    const approvedRT = blok.users.filter((u) => u.role === "RT" && u.status_akun === "APPROVED");

    // 2. Check approved Pengurus Masjid in this block's mosques
    const masjidInBlok = await prisma.masjid.findMany({
      where: { blok_wilayah_id: blok_id },
      include: {
        pengurus_masjid: {
          include: {
            user: { select: { id: true, status_akun: true } }
          }
        }
      }
    });

    const approvedPengurus = masjidInBlok
      .flatMap((m) => m.pengurus_masjid)
      .filter((pm) => pm.user?.status_akun === "APPROVED");

    if (approvedRT.length > 0 || approvedPengurus.length > 0) {
      res.status(409).json({
        success: false,
        message: "Blok wilayah masih memiliki akun aktif (RT / Pengurus Masjid) yang terdaftar. Harap hapus akun terdaftar tersebut terlebih dahulu.",
      });
      return;
    }

    // 3. Check for residents (warga)
    const wargaCount = await prisma.warga.count({
      where: { 
        blok_wilayah_id: blok_id,
        deleted_at: null,
      }
    });

    if (wargaCount > 0) {
      res.status(409).json({
        success: false,
        message: "Blok wilayah masih memiliki data warga terdaftar. Harap Hubungi RT untuk Menghapus/Memindahkan data warga.",
      });
      return;
    }

    // 4. Collect pending/rejected users to delete
    const rtUserIdsToDelete = blok.users
      .filter((u) => u.role === "RT" && (u.status_akun === "PENDING" || u.status_akun === "REJECTED"))
      .map((u) => u.id);

    const pmUserIdsToDelete = masjidInBlok
      .flatMap((m) => m.pengurus_masjid)
      .filter((pm) => pm.user && (pm.user.status_akun === "PENDING" || pm.user.status_akun === "REJECTED"))
      .map((pm) => pm.user!.id);

    const userIdsToDelete = [...rtUserIdsToDelete, ...pmUserIdsToDelete];

    // 5. Execute deletion in transaction
    await prisma.$transaction(async (tx) => {
      if (userIdsToDelete.length > 0) {
        // Delete pengurusMasjid relations
        if (pmUserIdsToDelete.length > 0) {
          await tx.pengurusMasjid.deleteMany({
            where: { user_id: { in: pmUserIdsToDelete } }
          });
        }

        // Delete user preferences if any
        await tx.userPreference.deleteMany({
          where: { user_id: { in: userIdsToDelete } }
        }).catch(() => { });

        // Delete user accounts
        await tx.user.deleteMany({
          where: { id: { in: userIdsToDelete } }
        });
      }

      // Delete masjid and its relations
      for (const m of masjidInBlok) {
        await tx.transaksiZis.deleteMany({ where: { masjid_id: m.id } });
        await tx.pencatatanDistribusi.deleteMany({ where: { masjid_id: m.id } });
        await tx.kasMasjid.deleteMany({ where: { masjid_id: m.id } });
        await tx.pengaturanZis.delete({ where: { masjid_id: m.id } }).catch(() => { });
        await tx.masjid.delete({ where: { id: m.id } });
      }

      // Find all warga (both active and soft-deleted) in this block
      const wargaList = await tx.warga.findMany({
        where: { blok_wilayah_id: blok_id },
        select: { id: true }
      });
      const wargaIds = wargaList.map(w => w.id);

      if (wargaIds.length > 0) {
        // Clear setoran_id in iuran_warga first
        await tx.iuranWarga.updateMany({
          where: { warga_id: { in: wargaIds }, setoran_id: { not: null } },
          data: { setoran_id: null }
        });

        // Delete pembayaran_cicilan first
        const cicilanList = await tx.cicilanIuran.findMany({
          where: { warga_id: { in: wargaIds } },
          select: { id: true }
        });
        const cicilanIds = cicilanList.map(c => c.id);
        
        if (cicilanIds.length > 0) {
          await tx.pembayaranCicilan.deleteMany({
            where: { cicilan_id: { in: cicilanIds } }
          });
        }

        await tx.cicilanIuran.deleteMany({
          where: { warga_id: { in: wargaIds } }
        });

        await tx.identitasWarga.deleteMany({
          where: { warga_id: { in: wargaIds } }
        });

        await tx.anggotaKeluarga.deleteMany({
          where: { warga_id: { in: wargaIds } }
        });

        await tx.iuranWarga.deleteMany({
          where: { warga_id: { in: wargaIds } }
        });

        await tx.warga.deleteMany({
          where: { id: { in: wargaIds } }
        });
      }

      // Clean up RT related records
      await tx.performaRonda.deleteMany({ where: { blok_wilayah_id: blok_id } });
      await tx.jadwalRonda.deleteMany({ where: { blok_wilayah_id: blok_id } });
      await tx.laporanInsiden.deleteMany({ where: { blok_wilayah_id: blok_id } });
      await tx.kasRT.deleteMany({ where: { blok_wilayah_id: blok_id } });
      await tx.setoranIuranRT.deleteMany({ where: { blok_wilayah_id: blok_id } });

      // Delete the Blok itself
      await tx.blokWilayah.delete({
        where: { id: blok_id }
      });
    });

    const { users, wilayah_rw, ...cleanBlok } = blok;
    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "BlokWilayah",
      entitas_id: blok_id,
      data_lama: cleanBlok,
      keterangan: `Menghapus Blok Wilayah ${blok.nama_blok}`,
    });

    res.status(200).json({
      success: true,
      message: "Blok wilayah berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus blok wilayah.",
    });
  }
};

// ==================== KETUA RT CRUD CONTROLLERS ====================

export const listRwRtAccounts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.RW) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const { search, blok_wilayah_id } = req.query;
    const normalizedSearch = typeof search === "string" ? search.trim() : undefined;
    const blokWilayahId = typeof blok_wilayah_id === "string" ? blok_wilayah_id : undefined;

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Data wilayah RW tidak ditemukan.",
      });
      return;
    }

    const rtAccounts = await prisma.user.findMany({
      where: {
        role: Role.RT,
        status_akun: StatusAkun.APPROVED,
        blok_wilayah: {
          wilayah_rw_id: rwWilayah.id,
          ...(blokWilayahId ? { id: blokWilayahId } : {}),
        },
        ...(normalizedSearch
          ? {
              OR: [
                { nama: { contains: normalizedSearch, mode: "insensitive" } },
                { email: { contains: normalizedSearch, mode: "insensitive" } },
                { no_hp: { contains: normalizedSearch, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        nama: true,
        email: true,
        no_hp: true,
        status_akun: true,
        created_at: true,
        blok_wilayah: {
          select: {
            id: true,
            nama_blok: true,
            no_rt: true,
          },
        },
      },
      orderBy: {
        nama: "asc",
      },
    });

    res.status(200).json({
      success: true,
      message: "Daftar akun Ketua RT berhasil diambil.",
      data: rtAccounts.map((rt) => ({
        id: rt.id,
        nama: rt.nama,
        email: rt.email,
        no_hp: rt.no_hp,
        status_akun: rt.status_akun,
        created_at: rt.created_at,
        blok_wilayah: rt.blok_wilayah
          ? {
              id: rt.blok_wilayah.id,
              nama_blok: rt.blok_wilayah.nama_blok,
              no_rt: rt.blok_wilayah.no_rt,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil daftar akun Ketua RT.",
    });
  }
};

export const createRwRtAccount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.RW) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const { nama, email, password, no_hp, blok_wilayah_id } = req.body;

    if (!nama || !email || !password || !no_hp || !blok_wilayah_id) {
      res.status(400).json({
        success: false,
        message: "Nama, email, password, nomor HP, dan blok wilayah wajib diisi.",
      });
      return;
    }

    const targetNama = nama as string;
    const targetEmail = email as string;
    const targetPassword = password as string;
    const targetNoHp = no_hp as string;
    const targetBlokId = blok_wilayah_id as string;

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Data wilayah RW tidak ditemukan.",
      });
      return;
    }

    // Verify if blok wilayah belongs to this RW
    const targetBlok = await prisma.blokWilayah.findFirst({
      where: {
        id: targetBlokId,
        wilayah_rw_id: rwWilayah.id,
      },
    });

    if (!targetBlok) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah tidak ditemukan atau berada di luar wilayah Anda.",
      });
      return;
    }

    // Verify block is vacant (no approved RT assigned)
    const existingRtInBlok = await prisma.user.findFirst({
      where: {
        role: Role.RT,
        status_akun: StatusAkun.APPROVED,
        blok_wilayah_id: targetBlokId,
      },
    });

    if (existingRtInBlok) {
      res.status(409).json({
        success: false,
        message: `Blok wilayah ini sudah memiliki Ketua RT terdaftar (${existingRtInBlok.nama}).`,
      });
      return;
    }

    // Verify email is unique
    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Email sudah terdaftar.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(targetPassword, SALT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        nama: targetNama,
        email: targetEmail,
        password: hashedPassword,
        no_hp: targetNoHp,
        role: Role.RT,
        status_akun: StatusAkun.APPROVED,
        blok_wilayah_id: targetBlokId,
      },
    });

    const { password: _, ...cleanNewUser } = newUser;
    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "User",
      entitas_id: newUser.id,
      data_baru: cleanNewUser,
      keterangan: `Menambahkan akun Ketua RT baru: ${newUser.nama} (${newUser.email})`,
    });

    res.status(201).json({
      success: true,
      message: "Akun Ketua RT berhasil ditambahkan.",
      data: {
        id: newUser.id,
        nama: newUser.nama,
        email: newUser.email,
        no_hp: newUser.no_hp,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menambahkan akun Ketua RT.",
    });
  }
};

export const updateRwRtAccount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.RW) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const { user_id } = req.params;
    const { nama, email, password, no_hp, blok_wilayah_id } = req.body;

    if (!nama || !email || !no_hp || !blok_wilayah_id) {
      res.status(400).json({
        success: false,
        message: "Nama, email, nomor HP, dan blok wilayah wajib diisi.",
      });
      return;
    }

    const targetUserId = user_id as string;
    const targetNama = nama as string;
    const targetEmail = email as string;
    const targetPassword = password ? (password as string) : undefined;
    const targetNoHp = no_hp as string;
    const targetBlokId = blok_wilayah_id as string;

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Data wilayah RW tidak ditemukan.",
      });
      return;
    }

    // Verify target user is an RT in RW's region
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        role: Role.RT,
        blok_wilayah: {
          wilayah_rw_id: rwWilayah.id,
        },
      },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "Akun Ketua RT tidak ditemukan atau berada di luar wilayah Anda.",
      });
      return;
    }

    // Verify new blok belongs to RW
    const newBlok = await prisma.blokWilayah.findFirst({
      where: {
        id: targetBlokId,
        wilayah_rw_id: rwWilayah.id,
      },
    });

    if (!newBlok) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah yang dipilih tidak ditemukan atau berada di luar wilayah Anda.",
      });
      return;
    }

    // Verify new blok is vacant (no OTHER approved RT assigned)
    const existingRtInBlok = await prisma.user.findFirst({
      where: {
        role: Role.RT,
        status_akun: StatusAkun.APPROVED,
        blok_wilayah_id: targetBlokId,
        id: { not: targetUserId },
      },
    });

    if (existingRtInBlok) {
      res.status(409).json({
        success: false,
        message: `Blok wilayah ini sudah memiliki Ketua RT terdaftar (${existingRtInBlok.nama}).`,
      });
      return;
    }

    // Verify email is not taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: targetEmail,
        id: { not: targetUserId },
      },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Email sudah terdaftar untuk pengguna lain.",
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        nama: targetNama,
        email: targetEmail,
        no_hp: targetNoHp,
        blok_wilayah_id: targetBlokId,
        ...(targetPassword ? { password: await bcrypt.hash(targetPassword, SALT_ROUNDS) } : {}),
      },
    });

    const { password: _p1, ...cleanTargetUser } = targetUser;
    const { password: _p2, ...cleanUpdatedUser } = updatedUser;

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "User",
      entitas_id: targetUserId,
      data_lama: cleanTargetUser,
      data_baru: cleanUpdatedUser,
      keterangan: `Memperbarui akun Ketua RT: ${updatedUser.nama}`,
    });

    res.status(200).json({
      success: true,
      message: "Akun Ketua RT berhasil diperbarui.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memperbarui akun Ketua RT.",
    });
  }
};

export const deleteRwRtAccount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.RW) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const { user_id } = req.params;
    const targetUserId = user_id as string;

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Data wilayah RW tidak ditemukan.",
      });
      return;
    }

    // Verify user is an RT in RW's region
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        role: Role.RT,
        blok_wilayah: {
          wilayah_rw_id: rwWilayah.id,
        },
      },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "Akun Ketua RT tidak ditemukan atau berada di luar wilayah Anda.",
      });
      return;
    }

    // Check if there are active warga (residents) registered in the RT's block wilayah
    if (targetUser.blok_wilayah_id) {
      const activeWargaCount = await prisma.warga.count({
        where: {
          blok_wilayah_id: targetUser.blok_wilayah_id,
          deleted_at: null,
        },
      });

      if (activeWargaCount > 0) {
        res.status(400).json({
          success: false,
          message: `Tidak dapat menghapus akun Ketua RT karena masih terdapat ${activeWargaCount} kepala keluarga terdaftar di blok wilayah ini. Silakan hapus data warga terlebih dahulu.`,
        });
        return;
      }
    }

    // Delete dependent records first to prevent foreign key constraint violations, then delete the user account
    await prisma.$transaction(async (tx) => {
      // Clear audit log entries created by this user
      await tx.auditLog.deleteMany({
        where: { user_id: targetUserId },
      });

      // Clear user preferences
      await tx.userPreference.deleteMany({
        where: { user_id: targetUserId },
      });

      // Clear password reset requests
      await tx.passwordResetRequest.deleteMany({
        where: { user_id: targetUserId },
      });

      // Clear pengurus masjid relation if exists
      await tx.pengurusMasjid.deleteMany({
        where: { user_id: targetUserId },
      });

      // Delete user account
      await tx.user.delete({
        where: { id: targetUserId },
      });
    });

    const { password: _, ...cleanTargetUser } = targetUser;
    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "User",
      entitas_id: targetUserId,
      data_lama: cleanTargetUser,
      keterangan: `Menghapus akun Ketua RT: ${targetUser.nama}`,
    });

    res.status(200).json({
      success: true,
      message: "Akun Ketua RT berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus akun Ketua RT.",
    });
  }
};
