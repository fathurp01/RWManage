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
    const { nama, email, password, no_hp, role, blok_wilayah_id } = req.body;

    if (!nama || !email || !password || !no_hp || !role) {
      res.status(400).json({
        success: false,
        message: "Field nama, email, password, no_hp, dan role wajib diisi.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        nama,
        email,
        password: hashedPassword,
        no_hp,
        role,
        blok_wilayah_id: blok_wilayah_id || null,
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
    const { id } = req.params;
    const { nama, no_hp, role, status_akun, blok_wilayah_id } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json({ success: false, message: "User tidak ditemukan." });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        nama: nama ?? existingUser.nama,
        no_hp: no_hp ?? existingUser.no_hp,
        role: role ?? existingUser.role,
        status_akun: status_akun ?? existingUser.status_akun,
        blok_wilayah_id: blok_wilayah_id !== undefined ? blok_wilayah_id : existingUser.blok_wilayah_id,
      },
      select: { id: true, nama: true, email: true, role: true, status_akun: true },
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
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        wilayah_rw: true,
        pengurus_masjid: true,
        audit_logs: { take: 1 },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User tidak ditemukan." });
      return;
    }

    // Check for related records to prevent deletion
    if (user.wilayah_rw || user.pengurus_masjid.length > 0 || user.audit_logs.length > 0) {
      res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus user karena masih memiliki data yang terhubung.",
      });
      return;
    }

    await prisma.user.delete({ where: { id } });

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
    res.status(500).json({
      success: false,
      message: "Gagal menghapus user.",
    });
  }
};

export const resetPasswordDirect = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
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
    const { id } = req.params;

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
    const { id } = req.params;

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
