import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Prisma, Role, StatusAkun, AksiAudit } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../middlewares/auditLogger";

const SALT_ROUNDS = 12;

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.RW, Role.RT, Role.PENGURUS_MASJID],
        },
      },
      select: {
        id: true,
        nama: true,
        email: true,
        no_hp: true,
        role: true,
        status_akun: true,
        created_at: true,
        blok_wilayah_id: true,
        blok_wilayah: {
          select: {
            nama_blok: true,
            no_rt: true,
          }
        },
        pengurus_masjid: {
          select: {
            masjid_id: true,
            masjid: {
              select: {
                nama_masjid: true
              }
            }
          }
        }
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("ERROR in getUsers:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar user.",
    });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nama, email, password, no_hp, role, blok_wilayah_id, masjid_id } = req.body;

    if (!nama || !email || !password || !no_hp || !role) {
      res.status(400).json({
        success: false,
        message: "Field nama, email, password, no_hp, dan role wajib diisi.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nama,
          email,
          password: hashedPassword,
          no_hp,
          role,
          blok_wilayah_id: role === Role.RT ? (blok_wilayah_id || null) : null,
          status_akun: StatusAkun.APPROVED, // Auto-approved as requested
        },
        select: {
          id: true,
          nama: true,
          email: true,
          role: true,
          status_akun: true,
        },
      });

      if (user.role === Role.RW) {
        await tx.wilayahRW.create({
          data: {
            user_id: user.id,
            nama_kompleks: user.nama, // Gunakan nama user (Desa)
            no_rw: "-", // Default no_rw
          },
        });
      }

      if (user.role === Role.PENGURUS_MASJID && masjid_id) {
        await tx.pengurusMasjid.create({
          data: {
            user_id: user.id,
            masjid_id,
          },
        });
      }

      return user;
    });

    await recordAudit(req, {
      user_id: req.user!.id,
      aksi: AksiAudit.CREATE,
      entitas: "User",
      entitas_id: newUser.id,
      data_baru: newUser,
      keterangan: `Superadmin membuat user baru: ${newUser.email} (${newUser.role})`,
    });

    res.status(201).json({
      success: true,
      message: "User berhasil dibuat dan disetujui otomatis.",
      data: newUser,
    });
  } catch (error) {
    const isPrismaError = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    res.status(isPrismaError ? 409 : 500).json({
      success: false,
      message: isPrismaError ? "Email sudah digunakan." : "Gagal membuat user.",
    });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { nama, no_hp, role, status_akun, blok_wilayah_id, masjid_id } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json({ success: false, message: "User tidak ditemukan." });
      return;
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          nama: nama ?? existingUser.nama,
          no_hp: no_hp ?? existingUser.no_hp,
          role: role ?? existingUser.role,
          status_akun: status_akun ?? existingUser.status_akun,
          blok_wilayah_id: role === "RT" ? (blok_wilayah_id || null) : null,
        },
        select: { id: true, nama: true, email: true, role: true, status_akun: true },
      });

      // Clear old masjid relation if exists
      await tx.pengurusMasjid.deleteMany({ where: { user_id: id } });

      if (user.role === Role.PENGURUS_MASJID && masjid_id) {
        await tx.pengurusMasjid.create({
          data: {
            user_id: id,
            masjid_id,
          },
        });
      }

      // If role changed to RW and didn't have WilayahRW, create it
      if (user.role === Role.RW) {
        const existingRw = await tx.wilayahRW.findUnique({ where: { user_id: id } });
        if (!existingRw) {
          await tx.wilayahRW.create({
            data: {
              user_id: id,
              nama_kompleks: user.nama,
              no_rw: "-",
            },
          });
        }
      }

      return user;
    });

    await recordAudit(req, {
      user_id: req.user!.id,
      aksi: AksiAudit.UPDATE,
      entitas: "User",
      entitas_id: updatedUser.id,
      data_lama: existingUser,
      data_baru: updatedUser,
      keterangan: `Superadmin memperbarui user: ${updatedUser.email}`,
    });

    res.status(200).json({
      success: true,
      message: "Data user berhasil diperbarui.",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui user.",
    });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        wilayah_rw: {
          include: {
            blok_wilayah: { select: { id: true } },
          }
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User tidak ditemukan." });
      return;
    }

    // Prevent deleting RW if they still have active blocks
    if (user.wilayah_rw && user.wilayah_rw.blok_wilayah.length > 0) {
      res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus user RW karena masih memiliki blok wilayah aktif. Silakan hapus blok wilayah terlebih dahulu.",
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Clean up audit logs created by this user
      await tx.auditLog.deleteMany({
        where: { user_id: id }
      });

      // Clean up preferences
      await tx.userPreference.deleteMany({
        where: { user_id: id }
      });

      // Clean up password reset requests
      await tx.passwordResetRequest.deleteMany({
        where: { user_id: id }
      });

      // Clean up pengurus masjid relations
      await tx.pengurusMasjid.deleteMany({
        where: { user_id: id }
      });

      // Clean up wilayah_rw if exists
      if (user.wilayah_rw) {
        await tx.kasRW.deleteMany({ where: { wilayah_rw_id: user.wilayah_rw.id } });
        await tx.laporanInsiden.deleteMany({ where: { wilayah_rw_id: user.wilayah_rw.id } });
        await tx.shareLink.deleteMany({ where: { scope: "RW", scope_id: user.wilayah_rw.id } });
        await tx.pengaturanIuranRW.deleteMany({ where: { wilayah_rw_id: user.wilayah_rw.id } });
        await tx.wilayahRW.delete({ where: { id: user.wilayah_rw.id } });
      }

      // Delete main user account
      await tx.user.delete({
        where: { id }
      });
    });

    await recordAudit(req, {
      user_id: req.user!.id,
      aksi: AksiAudit.DELETE,
      entitas: "User",
      entitas_id: id,
      data_lama: { id: user.id, email: user.email, role: user.role },
      keterangan: `Superadmin menghapus user: ${user.email}`,
    });

    res.status(200).json({
      success: true,
      message: "User berhasil dihapus.",
    });
  } catch (error) {
    console.error("ERROR in deleteUser:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus user. Silakan pastikan data terkait sudah dibersihkan.",
    });
  }
};

export const resetPasswordDirect = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { new_password } = req.body;

    if (!new_password) {
      res.status(400).json({ success: false, message: "Password baru wajib diisi." });
      return;
    }

    const hashedPassword = await bcrypt.hash(new_password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await recordAudit(req, {
      user_id: req.user!.id,
      aksi: AksiAudit.UPDATE,
      entitas: "User",
      entitas_id: id,
      keterangan: `Superadmin me-reset password untuk user ID: ${id}`,
    });

    res.status(200).json({
      success: true,
      message: "Password user berhasil di-reset.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal me-reset password user.",
    });
  }
};

export const getPasswordResets = async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await prisma.passwordResetRequest.findMany({
      where: { status: StatusAkun.PENDING },
      include: {
        user: {
          select: { email: true, nama: true, role: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar permintaan reset password.",
    });
  }
};

export const approvePasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const request = await prisma.passwordResetRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request || request.status !== StatusAkun.PENDING) {
      res.status(404).json({ success: false, message: "Permintaan tidak ditemukan atau sudah diproses." });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Update user's password
      await tx.user.update({
        where: { id: request.user_id },
        data: { password: request.new_password_hash },
      });

      // Mark request as APPROVED
      await tx.passwordResetRequest.update({
        where: { id },
        data: { status: StatusAkun.APPROVED },
      });
    });

    await recordAudit(req, {
      user_id: req.user!.id,
      aksi: AksiAudit.APPROVE,
      entitas: "PasswordResetRequest",
      entitas_id: id,
      keterangan: `Superadmin menyetujui reset password untuk: ${request.user.email}`,
    });

    res.status(200).json({
      success: true,
      message: "Permintaan reset password berhasil disetujui.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menyetujui permintaan reset password.",
    });
  }
};

export const rejectPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const request = await prisma.passwordResetRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request || request.status !== StatusAkun.PENDING) {
      res.status(404).json({ success: false, message: "Permintaan tidak ditemukan atau sudah diproses." });
      return;
    }

    await prisma.passwordResetRequest.update({
      where: { id },
      data: { status: StatusAkun.REJECTED },
    });

    await recordAudit(req, {
      user_id: req.user!.id,
      aksi: AksiAudit.REJECT,
      entitas: "PasswordResetRequest",
      entitas_id: id,
      keterangan: `Superadmin menolak reset password untuk: ${request.user.email}`,
    });

    res.status(200).json({
      success: true,
      message: "Permintaan reset password berhasil ditolak.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menolak permintaan reset password.",
    });
  }
};

// Trigger restart for prisma client update
