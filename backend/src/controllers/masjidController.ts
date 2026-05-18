import { Request, Response } from "express";
import { Role, StatusAkun, AksiAudit } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../middlewares/auditLogger";

const SALT_ROUNDS = 10;

interface CreateMasjidBody {
  wilayah_rw_id?: string;
  nama_masjid?: string;
  alamat?: string;
}

interface UpdateMasjidBody {
  nama_masjid?: string;
  alamat?: string;
}

export const createMasjid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { wilayah_rw_id, nama_masjid, alamat } = req.body as CreateMasjidBody;

    if (!wilayah_rw_id || !nama_masjid || !alamat) {
      res.status(400).json({
        success: false,
        message:
          "wilayah_rw_id, nama_masjid, dan alamat wajib diisi.",
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

    const masjid = await prisma.masjid.create({
      data: {
        blok_wilayah_id: wilayah_rw_id,
        nama_masjid,
        alamat,
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "Masjid",
      entitas_id: masjid.id,
      data_baru: masjid,
      keterangan: `Menambahkan Masjid Baru: ${masjid.nama_masjid}`,
    });

    res.status(201).json({
      success: true,
      message: "Data masjid berhasil ditambahkan.",
      data: masjid,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat data masjid.",
    });
  }
};

export const getMasjidList = async (
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

    const masjids = await prisma.masjid.findMany({
      where: {
        blok_wilayah_id: wilayah_rw_id,
      },
      include: {
        kas_masjid: {
          select: { id: true }
        },
        pengurus_masjid: {
          include: {
            user: {
              select: { nama: true }
            }
          }
        }
      },
      orderBy: { nama_masjid: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Data masjid berhasil diambil.",
      data: masjids,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data masjid.",
    });
  }
};

export const getMasjidDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.masjid_id;
    const masjid_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!masjid_id) {
      res.status(400).json({
        success: false,
        message: "masjid_id harus diisi.",
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

    const masjid = await prisma.masjid.findUnique({
      where: { id: masjid_id },
      include: {
        kas_masjid: true,
        pengurus_masjid: true,
        blok_wilayah: { include: { wilayah_rw: { select: { user_id: true } } } },
      },
    });

    if (!masjid) {
      res.status(404).json({
        success: false,
        message: "Data masjid tidak ditemukan.",
      });
      return;
    }

    // Validasi ownership
    if (masjid.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Detail masjid berhasil diambil.",
      data: masjid,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil detail masjid.",
    });
  }
};

export const updateMasjid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw2 = (req.params as Record<string, unknown>)?.masjid_id;
    const masjid_id = Array.isArray(raw2) ? raw2[0] : (raw2 as string | undefined);
    const { nama_masjid, alamat } = req.body as UpdateMasjidBody;

    if (!masjid_id) {
      res.status(400).json({
        success: false,
        message: "masjid_id harus diisi.",
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

    const existingMasjid = await prisma.masjid.findUnique({
      where: { id: masjid_id },
      include: { blok_wilayah: { select: { wilayah_rw: { select: { user_id: true } } } } },
    });

    if (!existingMasjid) {
      res.status(404).json({
        success: false,
        message: "Data masjid tidak ditemukan.",
      });
      return;
    }

    if (existingMasjid.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const updated = await prisma.masjid.update({
      where: { id: masjid_id },
      data: {
        ...(nama_masjid && { nama_masjid }),
        ...(alamat && { alamat }),
      },
    });

    const { blok_wilayah, ...cleanExistingMasjid } = existingMasjid;
    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "Masjid",
      entitas_id: updated.id,
      data_lama: cleanExistingMasjid,
      data_baru: updated,
      keterangan: `Memperbarui Masjid: ${updated.nama_masjid}`,
    });

    res.status(200).json({
      success: true,
      message: "Data masjid berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate data masjid.",
    });
  }
};

export const deleteMasjid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw3 = (req.params as Record<string, unknown>)?.masjid_id;
    const masjid_id = Array.isArray(raw3) ? raw3[0] : (raw3 as string | undefined);

    if (!masjid_id) {
      res.status(400).json({
        success: false,
        message: "masjid_id harus diisi.",
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

    const existingMasjid = await prisma.masjid.findUnique({
      where: { id: masjid_id },
      include: {
        blok_wilayah: {
          select: {
            wilayah_rw: { select: { user_id: true } },
          },
        },
      },
    });

    if (!existingMasjid) {
      res.status(404).json({
        success: false,
        message: "Data masjid tidak ditemukan.",
      });
      return;
    }

    if (existingMasjid.blok_wilayah.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    // Find all pengurus linked to this masjid along with their user accounts
    const allPengurus = await prisma.pengurusMasjid.findMany({
      where: { masjid_id: masjid_id },
      select: {
        id: true,
        user_id: true,
        user: {
          select: {
            id: true,
            status_akun: true,
          },
        },
      },
    });

    const approvedPengurus = allPengurus.filter(
      (p) => p.user?.status_akun === "APPROVED"
    );
    const nonApprovedPengurus = allPengurus.filter(
      (p) => p.user?.status_akun === "PENDING" || p.user?.status_akun === "REJECTED"
    );

    if (approvedPengurus.length > 0) {
      res.status(409).json({
        success: false,
        message: "Masjid masih memiliki pengurus aktif yang terdaftar. Harap hapus akun pengurus terlebih dahulu.",
      });
      return;
    }

    // Execute deletion of masjid and pending/rejected pengurus in a transaction
    await prisma.$transaction(async (tx) => {
      if (nonApprovedPengurus.length > 0) {
        const userIdsToDelete = nonApprovedPengurus.map((p) => p.user_id);
        
        // Delete relations in pengurusMasjid first
        await tx.pengurusMasjid.deleteMany({
          where: { user_id: { in: userIdsToDelete } },
        });

        // Delete the User accounts
        await tx.user.deleteMany({
          where: { id: { in: userIdsToDelete } },
        });
      }

      // Clean up related models
      await tx.transaksiZis.deleteMany({ where: { masjid_id: masjid_id } });
      await tx.pencatatanDistribusi.deleteMany({ where: { masjid_id: masjid_id } });
      await tx.kasMasjid.deleteMany({ where: { masjid_id: masjid_id } });
      await tx.pengaturanZis.delete({ where: { masjid_id: masjid_id } }).catch(() => {});

      // Finally, delete the masjid itself
      await tx.masjid.delete({
        where: { id: masjid_id },
      });
    });

    const { blok_wilayah, ...cleanExistingMasjid } = existingMasjid;
    await recordAudit(req, {
      aksi: AksiAudit.DELETE,
      entitas: "Masjid",
      entitas_id: masjid_id,
      data_lama: cleanExistingMasjid,
      keterangan: `Menghapus Masjid: ${existingMasjid.nama_masjid}`,
    });

    res.status(200).json({
      success: true,
      message: "Data masjid berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus data masjid.",
    });
  }
};

export const listRwPengurusMasjid = async (
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

    const { search, masjid_id, blok_wilayah_id, no_rt } = req.query;
    const normalizedSearch = typeof search === "string" ? search.trim() : undefined;
    const masjidId = typeof masjid_id === "string" ? masjid_id : undefined;
    const blokWilayahId = typeof blok_wilayah_id === "string" ? blok_wilayah_id : undefined;
    const noRtStr = typeof no_rt === "string" ? no_rt : undefined;

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

    const pengurus = await prisma.pengurusMasjid.findMany({
      where: {
        masjid: {
          blok_wilayah: {
            wilayah_rw_id: rwWilayah.id,
            ...(blokWilayahId ? { id: blokWilayahId } : {}),
            ...(noRtStr ? { no_rt: noRtStr } : {}),
          },
          ...(masjidId ? { id: masjidId } : {}),
        },
        user: {
          status_akun: StatusAkun.APPROVED,
          role: Role.PENGURUS_MASJID,
          ...(normalizedSearch
            ? {
                OR: [
                  { nama: { contains: normalizedSearch, mode: "insensitive" as any } },
                  { email: { contains: normalizedSearch, mode: "insensitive" as any } },
                  { no_hp: { contains: normalizedSearch, mode: "insensitive" as any } },
                ],
              }
            : {}),
        },
      },
      select: {
        id: true,
        user_id: true,
        masjid_id: true,
        user: {
          select: {
            id: true,
            nama: true,
            email: true,
            no_hp: true,
            status_akun: true,
            created_at: true,
          },
        },
        masjid: {
          select: {
            id: true,
            nama_masjid: true,
            alamat: true,
            blok_wilayah: {
              select: {
                id: true,
                nama_blok: true,
                no_rt: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          nama: "asc",
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Daftar pengurus masjid berhasil diambil.",
      data: pengurus.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        masjid_id: p.masjid_id,
        nama: p.user.nama,
        email: p.user.email,
        no_hp: p.user.no_hp,
        status_akun: p.user.status_akun,
        created_at: p.user.created_at,
        masjid: {
          id: p.masjid.id,
          nama_masjid: p.masjid.nama_masjid,
          alamat: p.masjid.alamat,
          nama_blok: p.masjid.blok_wilayah.nama_blok,
          no_rt: p.masjid.blok_wilayah.no_rt,
        },
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil daftar pengurus masjid.",
    });
  }
};

export const createRwPengurusMasjid = async (
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

    const { nama, email, password, no_hp, masjid_id } = req.body;

    if (!nama || !email || !password || !no_hp || !masjid_id) {
      res.status(400).json({
        success: false,
        message: "Nama, email, password, nomor HP, dan masjid wajib diisi.",
      });
      return;
    }

    const targetNama = nama as string;
    const targetEmail = email as string;
    const targetPassword = password as string;
    const targetNoHp = no_hp as string;
    const targetMasjidId = masjid_id as string;

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

    // Verify if masjid belongs to this RW
    const targetMasjid = await prisma.masjid.findFirst({
      where: {
        id: targetMasjidId,
        blok_wilayah: {
          wilayah_rw_id: rwWilayah.id,
        },
      },
    });

    if (!targetMasjid) {
      res.status(404).json({
        success: false,
        message: "Masjid tidak ditemukan atau berada di luar wilayah Anda.",
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

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nama: targetNama,
          email: targetEmail,
          password: hashedPassword,
          no_hp: targetNoHp,
          role: Role.PENGURUS_MASJID,
          status_akun: StatusAkun.APPROVED,
        },
      });

      await tx.pengurusMasjid.create({
        data: {
          user_id: user.id,
          masjid_id: targetMasjidId,
        },
      });

      return user;
    });

    const { password: _, ...cleanNewUser } = newUser;
    await recordAudit(req, {
      aksi: AksiAudit.CREATE,
      entitas: "User",
      entitas_id: newUser.id,
      data_baru: cleanNewUser,
      keterangan: `Menambahkan Pengurus Masjid: ${newUser.nama}`,
    });

    res.status(201).json({
      success: true,
      message: "Pengurus masjid berhasil ditambahkan.",
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
      message: "Terjadi kesalahan saat menambahkan pengurus masjid.",
    });
  }
};

export const updateRwPengurusMasjid = async (
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
    const { nama, email, password, no_hp, masjid_id } = req.body;

    if (!nama || !email || !no_hp || !masjid_id) {
      res.status(400).json({
        success: false,
        message: "Nama, email, nomor HP, dan masjid wajib diisi.",
      });
      return;
    }

    const targetUserId = user_id as string;
    const targetNama = nama as string;
    const targetEmail = email as string;
    const targetPassword = password ? (password as string) : undefined;
    const targetNoHp = no_hp as string;
    const targetMasjidId = masjid_id as string;

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

    // Verify target user is a PENGURUS_MASJID in RW's region
    const targetPengurus = await prisma.pengurusMasjid.findFirst({
      where: {
        user_id: targetUserId,
        masjid: {
          blok_wilayah: {
            wilayah_rw_id: rwWilayah.id,
          },
        },
      },
    });

    if (!targetPengurus) {
      res.status(404).json({
        success: false,
        message: "Pengurus masjid tidak ditemukan atau berada di luar wilayah Anda.",
      });
      return;
    }

    // Verify new masjid belongs to RW
    const newMasjid = await prisma.masjid.findFirst({
      where: {
        id: targetMasjidId,
        blok_wilayah: {
          wilayah_rw_id: rwWilayah.id,
        },
      },
    });

    if (!newMasjid) {
      res.status(404).json({
        success: false,
        message: "Masjid yang dipilih tidak ditemukan atau berada di luar wilayah Anda.",
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

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "Pengurus masjid tidak ditemukan.",
      });
      return;
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user details
      const u = await tx.user.update({
        where: { id: targetUserId },
        data: {
          nama: targetNama,
          email: targetEmail,
          no_hp: targetNoHp,
          ...(targetPassword ? { password: await bcrypt.hash(targetPassword, SALT_ROUNDS) } : {}),
        },
      });

      // Update pengurusMasjid connection
      await tx.pengurusMasjid.updateMany({
        where: { user_id: targetUserId },
        data: {
          masjid_id: targetMasjidId,
        },
      });

      return u;
    });

    const { password: _p1, ...cleanTargetUser } = targetUser;
    const { password: _p2, ...cleanUpdatedUser } = updatedUser;

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "User",
      entitas_id: targetUserId,
      data_lama: cleanTargetUser,
      data_baru: cleanUpdatedUser,
      keterangan: `Memperbarui pengurus masjid: ${updatedUser.nama}`,
    });

    res.status(200).json({
      success: true,
      message: "Pengurus masjid berhasil diperbarui.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memperbarui pengurus masjid.",
    });
  }
};

export const deleteRwPengurusMasjid = async (
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

    // Verify pengurus belongs to RW
    const targetPengurus = await prisma.pengurusMasjid.findFirst({
      where: {
        user_id: targetUserId,
        masjid: {
          blok_wilayah: {
            wilayah_rw_id: rwWilayah.id,
          },
        },
      },
    });

    if (!targetPengurus) {
      res.status(404).json({
        success: false,
        message: "Pengurus masjid tidak ditemukan atau berada di luar wilayah Anda.",
      });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    await prisma.$transaction(async (tx) => {
      // Delete relation
      await tx.pengurusMasjid.deleteMany({
        where: { user_id: targetUserId },
      });

      // Delete user account
      await tx.user.delete({
        where: { id: targetUserId },
      });
    });

    if (targetUser) {
      const { password: _, ...cleanTargetUser } = targetUser;
      await recordAudit(req, {
        aksi: AksiAudit.DELETE,
        entitas: "User",
        entitas_id: targetUserId,
        data_lama: cleanTargetUser,
        keterangan: `Menghapus pengurus masjid: ${targetUser.nama}`,
      });
    }

    res.status(200).json({
      success: true,
      message: "Pengurus masjid berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus pengurus masjid.",
    });
  }
};
