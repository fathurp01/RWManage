import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma, Role, StatusAkun, User, AksiAudit } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../middlewares/auditLogger";
const SALT_ROUNDS = 10;

interface RegisterBody {
  nama?: string;
  email?: string;
  password?: string;
  no_hp?: string;
  role?: Role;
  blok_wilayah_id?: string;
  masjid_id?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
  role?: Role;
}

interface ApprovePengurusBody {
  user_id?: string;
  status_akun?: "APPROVED" | "REJECTED";
  alasan_penolakan?: string;
}

interface PendingPengurusQuery {
  search?: string;
}

interface TokenPayload extends Pick<User, "id" | "email" | "role"> {
  wilayah_rw_id?: string;
  masjid_ids?: string[];
  blok_wilayah_id?: string;
}

const createToken = (user: TokenPayload): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET belum dikonfigurasi.");
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      wilayah_rw_id: user.wilayah_rw_id,
      masjid_ids: user.masjid_ids,
      blok_wilayah_id: user.blok_wilayah_id,
    },
    jwtSecret,
    { expiresIn: "1d" }
  );
};

export const registerWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { nama, email, password, no_hp, role, blok_wilayah_id, masjid_id } =
      req.body as RegisterBody;

    if (!nama || !email || !password || !no_hp || !role) {
      res.status(400).json({
        success: false,
        message: "Field nama, email, password, no_hp, dan role wajib diisi.",
      });
      return;
    }

    if (role !== Role.RW && role !== Role.PENGURUS_MASJID && role !== Role.RT) {
      res.status(400).json({
        success: false,
        message: "Role tidak valid. Gunakan RW atau PENGURUS_MASJID.",
      });
      return;
    }

    if (role === Role.PENGURUS_MASJID && !masjid_id) {
      res.status(400).json({
        success: false,
        message: "masjid_id wajib diisi untuk role PENGURUS_MASJID.",
      });
      return;
    }

    if (role === Role.RT && !blok_wilayah_id) {
      res.status(400).json({
        success: false,
        message: "blok_wilayah_id wajib diisi untuk role RT.",
      });
      return;
    }

    if (role === Role.RT && blok_wilayah_id) {
      const existingRT = await client.user.findFirst({
        where: {
          role: Role.RT,
          blok_wilayah_id,
          status_akun: { in: [StatusAkun.PENDING, StatusAkun.APPROVED] },
        },
      });

      if (existingRT) {
        res.status(409).json({
          success: false,
          message: "Blok wilayah tersebut sudah memiliki pendaftar RT atau akun RT yang aktif.",
        });
        return;
      }
    }

    const existingUser = await client.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Email sudah terdaftar.",
      });
      return;
    }

    if (role === Role.PENGURUS_MASJID && masjid_id) {
      const masjid = await client.masjid.findUnique({
        where: { id: masjid_id },
        select: { id: true },
      });

      if (!masjid) {
        res.status(404).json({
          success: false,
          message: "Masjid tidak ditemukan.",
        });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const initialStatus = StatusAkun.PENDING;

    const createdUser = await client.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nama,
          email,
          password: hashedPassword,
          no_hp,
          role,
          blok_wilayah_id,
          status_akun: initialStatus,
        },
      });

      if (role === Role.PENGURUS_MASJID && masjid_id) {
        await tx.pengurusMasjid.create({
          data: {
            user_id: user.id,
            masjid_id,
          },
        });
      }

      return user;
    });

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil.",
      data: {
        id: createdUser.id,
        nama: createdUser.nama,
        email: createdUser.email,
        role: createdUser.role,
        status_akun: createdUser.status_akun,
      },
    });
  } catch (error) {
    const isPrismaError =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";

    res.status(isPrismaError ? 409 : 500).json({
      success: false,
      message: isPrismaError
        ? "Data unik sudah digunakan."
        : "Terjadi kesalahan saat registrasi.",
    });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  return registerWithClient(prisma, req, res);
};

export const loginWithClient = async (client: typeof prisma, req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body as LoginBody;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi.",
      });
      return;
    }

    if (role && role !== Role.RW && role !== Role.PENGURUS_MASJID && role !== Role.RT) {
      res.status(400).json({
        success: false,
        message: "Role login tidak valid.",
      });
      return;
    }

    const user = await client.user.findUnique({
      where: { email },
      select: {
        id: true,
        nama: true,
        email: true,
        password: true,
        role: true,
        status_akun: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Email atau password salah.",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Email atau password salah.",
      });
      return;
    }

    if (role && user.role !== role) {
      res.status(403).json({
        success: false,
        message: "Akun tidak terdaftar untuk jenis login yang dipilih.",
      });
      return;
    }

    if (
      user.role === Role.PENGURUS_MASJID &&
      user.status_akun === StatusAkun.PENDING
    ) {
      res.status(403).json({
        success: false,
        message: "Akun pengurus masjid masih menunggu persetujuan RW.",
      });
      return;
    }

    if (user.role === Role.RT && user.status_akun === StatusAkun.PENDING) {
      res.status(403).json({
        success: false,
        message: "Akun RT masih menunggu persetujuan Superadmin.",
      });
      return;
    }

    if (user.role === Role.RT && user.status_akun === StatusAkun.REJECTED) {
      res.status(403).json({
        success: false,
        message: "Akun RT ditolak.",
      });
      return;
    }

    if (
      user.role === Role.PENGURUS_MASJID &&
      user.status_akun === StatusAkun.REJECTED
    ) {
      res.status(403).json({
        success: false,
        message: "Akun pengurus masjid ditolak.",
      });
      return;
    }

    let wilayahRwId: string | undefined;
    let masjidIds: string[] | undefined;

    if (user.role === Role.RW) {
      const wilayah = await client.wilayahRW.findUnique({
        where: { user_id: user.id },
        select: { id: true },
      });

      wilayahRwId = wilayah?.id;
    }

    let blokWilayahId: string | undefined;

    if (user.role === Role.RT) {
      const u = await client.user.findUnique({
        where: { id: user.id },
        select: { blok_wilayah_id: true },
      });

      blokWilayahId = u?.blok_wilayah_id ?? undefined;
    }

    if (user.role === Role.PENGURUS_MASJID) {
      const pengurusMasjid = await client.pengurusMasjid.findMany({
        where: { user_id: user.id },
        select: { masjid_id: true },
      });

      masjidIds = pengurusMasjid.map((item) => item.masjid_id);
    }

    const tokenWithTenantContext = createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      wilayah_rw_id: wilayahRwId,
      masjid_ids: masjidIds,
      blok_wilayah_id: blokWilayahId,
    });

    await recordAudit(req, {
      user_id: user.id,
      aksi: AksiAudit.LOGIN,
      entitas: "User",
      entitas_id: user.id,
      data_baru: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        status_akun: user.status_akun,
      },
      keterangan: `User ${user.nama} berhasil masuk (LOGIN) sebagai ${user.role}`,
    });

    res.status(200).json({
      success: true,
      message: "Login berhasil.",
      data: {
        token: tokenWithTenantContext,
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          role: user.role,
          status_akun: user.status_akun,
          wilayah_rw_id: wilayahRwId,
          masjid_ids: masjidIds ?? [],
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat login.",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  return loginWithClient(prisma, req, res);
};

export const approvePengurusWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.RW) {
      res.status(403).json({
        success: false,
        message: "Hanya role RW yang boleh melakukan approval pengurus.",
      });
      return;
    }

    const { user_id, status_akun, alasan_penolakan } =
      req.body as ApprovePengurusBody;

    const rwWilayah = await client.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Data wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    if (!user_id || !status_akun) {
      res.status(400).json({
        success: false,
        message: "user_id dan status_akun wajib diisi.",
      });
      return;
    }

    if (status_akun !== "APPROVED" && status_akun !== "REJECTED") {
      res.status(400).json({
        success: false,
        message: "status_akun hanya boleh APPROVED atau REJECTED.",
      });
      return;
    }

    if (status_akun === "REJECTED" && !alasan_penolakan?.trim()) {
      res.status(400).json({
        success: false,
        message: "alasan_penolakan wajib diisi saat menolak pengurus.",
      });
      return;
    }

    const targetUser = await client.user.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        status_akun: true,
      },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "User pengurus tidak ditemukan.",
      });
      return;
    }

    if (targetUser.role !== Role.PENGURUS_MASJID) {
      res.status(400).json({
        success: false,
        message: "User yang diproses harus role PENGURUS_MASJID.",
      });
      return;
    }

    if (targetUser.status_akun !== StatusAkun.PENDING) {
      res.status(400).json({
        success: false,
        message: "Approval hanya bisa dilakukan untuk user dengan status PENDING.",
      });
      return;
    }

    const targetPengurus = await client.pengurusMasjid.findFirst({
      where: { user_id },
      select: {
        masjid: {
          select: {
            blok_wilayah: {
              select: {
                wilayah_rw_id: true,
              },
            },
          },
        },
      },
    });

    if (!targetPengurus) {
      res.status(404).json({
        success: false,
        message: "Relasi pengurus masjid tidak ditemukan.",
      });
      return;
    }

    if (targetPengurus.masjid.blok_wilayah.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message:
          "Akses ditolak. Anda hanya dapat memproses pengurus masjid di wilayah RW Anda.",
      });
      return;
    }

    const updatedUser = await client.user.update({
      where: { id: user_id },
      data: {
        status_akun,
        alasan_penolakan:
          status_akun === "REJECTED" ? alasan_penolakan?.trim() : null,
      },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        status_akun: true,
        alasan_penolakan: true,
      },
    });

    await recordAudit(req, {
      aksi: status_akun === "APPROVED" ? AksiAudit.APPROVE : AksiAudit.REJECT,
      entitas: "User",
      entitas_id: user_id,
      data_lama: targetUser,
      data_baru: updatedUser,
      keterangan: `${status_akun === "APPROVED" ? "Menyetujui" : "Menolak"} pendaftaran Pengurus Masjid: ${updatedUser.nama}`,
    });

    res.status(200).json({
      success: true,
      message:
        status_akun === "APPROVED"
          ? "Pengurus masjid berhasil di-approve."
          : "Pengurus masjid berhasil di-reject.",
      data: updatedUser,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memproses approval pengurus.",
    });
  }
};

export const approvePengurus = async (
  req: Request,
  res: Response
): Promise<void> => {
  return approvePengurusWithClient(prisma, req, res);
};

export const listPendingPengurusWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.RW) {
      res.status(403).json({
        success: false,
        message: "Hanya role RW yang boleh melihat daftar pending pengurus.",
      });
      return;
    }

    const { search } = req.query as PendingPengurusQuery;
    const normalizedSearch = search?.trim();

    const rwWilayah = await client.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Data wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const pendingPengurus = await client.pengurusMasjid.findMany({
      where: {
        masjid: {
          blok_wilayah: {
            wilayah_rw_id: rwWilayah.id,
          },
        },
        user: {
          status_akun: StatusAkun.PENDING,
          ...(normalizedSearch
            ? {
                OR: [
                  {
                    nama: {
                      contains: normalizedSearch,
                      mode: "insensitive",
                    },
                  },
                  {
                    email: {
                      contains: normalizedSearch,
                      mode: "insensitive",
                    },
                  },
                  {
                    no_hp: {
                      contains: normalizedSearch,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        },
      },
      select: {
        user: {
          select: {
            id: true,
            nama: true,
            email: true,
            no_hp: true,
            role: true,
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
        },
      },
      orderBy: {
        user: {
          created_at: "asc",
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Daftar pengurus masjid pending berhasil diambil.",
      data: pendingPengurus.map((item) => ({
        user_id: item.user.id,
        nama: item.user.nama,
        email: item.user.email,
        no_hp: item.user.no_hp,
        role: item.user.role,
        status_akun: item.user.status_akun,
        created_at: item.user.created_at,
        masjid: {
          id: item.masjid.id,
          nama_masjid: item.masjid.nama_masjid,
          alamat: item.masjid.alamat,
          nama_blok: item.masjid.blok_wilayah.nama_blok,
          wilayah_rw_id: item.masjid.blok_wilayah.wilayah_rw.id,
          nama_kompleks: item.masjid.blok_wilayah.wilayah_rw.nama_kompleks,
          no_rw: item.masjid.blok_wilayah.wilayah_rw.no_rw,
        },
      })),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil daftar pending pengurus.",
    });
  }
};

export const listPendingRegistrationsWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.SUPERADMIN) {
      res.status(403).json({
        success: false,
        message: "Hanya Superadmin yang boleh melihat daftar pendaftar.",
      });
      return;
    }

    const { search, role } = req.query as { search?: string; role?: string };
    const normalizedSearch = search?.trim();

    const whereClause: any = {
      status_akun: StatusAkun.PENDING,
      ...(role ? { role } : { role: "RW" }),
      ...(normalizedSearch
        ? {
            OR: [
              { nama: { contains: normalizedSearch, mode: "insensitive" } },
              { email: { contains: normalizedSearch, mode: "insensitive" } },
              { no_hp: { contains: normalizedSearch, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const users = await client.user.findMany({
      where: whereClause,
      select: {
        id: true,
        nama: true,
        email: true,
        no_hp: true,
        role: true,
        status_akun: true,
        blok_wilayah_id: true,
        created_at: true,
      },
      orderBy: { created_at: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Daftar pendaftaran pending berhasil diambil.",
      data: users,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil daftar pending pendaftaran.",
    });
  }
};

export const approveRegistrationWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.SUPERADMIN) {
      res.status(403).json({
        success: false,
        message: "Hanya Superadmin yang boleh melakukan approval pendaftaran.",
      });
      return;
    }

    const { user_id, status_akun, alasan_penolakan } = req.body as ApprovePengurusBody;

    if (!user_id || !status_akun) {
      res.status(400).json({
        success: false,
        message: "user_id dan status_akun wajib diisi.",
      });
      return;
    }

    if (status_akun !== "APPROVED" && status_akun !== "REJECTED") {
      res.status(400).json({
        success: false,
        message: "status_akun hanya boleh APPROVED atau REJECTED.",
      });
      return;
    }

    if (status_akun === "REJECTED" && !alasan_penolakan?.trim()) {
      res.status(400).json({
        success: false,
        message: "alasan_penolakan wajib diisi saat menolak pendaftaran.",
      });
      return;
    }

    const targetUser = await client.user.findUnique({
      where: { id: user_id },
      select: { id: true, role: true, status_akun: true },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "User tidak ditemukan.",
      });
      return;
    }

    if (targetUser.role !== Role.RW) {
      res.status(400).json({
        success: false,
        message: "Hanya pendaftaran RW yang dapat diproses oleh Superadmin.",
      });
      return;
    }

    if (targetUser.status_akun !== StatusAkun.PENDING) {
      res.status(400).json({
        success: false,
        message: "Approval hanya bisa dilakukan untuk user dengan status PENDING.",
      });
      return;
    }

    const updatedUser = await client.user.update({
      where: { id: user_id },
      data: {
        status_akun: status_akun,
        alasan_penolakan: status_akun === "REJECTED" ? alasan_penolakan?.trim() : null,
      },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        status_akun: true,
        alasan_penolakan: true,
      },
    });

    res.status(200).json({
      success: true,
      message:
        status_akun === "APPROVED"
          ? "Pendaftaran berhasil di-approve."
          : "Pendaftaran berhasil di-reject.",
      data: updatedUser,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memproses approval pendaftaran.",
    });
  }
};

export const listPendingPengurus = async (
  req: Request,
  res: Response
): Promise<void> => {
  return listPendingPengurusWithClient(prisma, req, res);
};

export const listPendingRegistrations = async (
  req: Request,
  res: Response
): Promise<void> => {
  return listPendingRegistrationsWithClient(prisma, req, res);
};

export const approveRegistration = async (
  req: Request,
  res: Response
): Promise<void> => {
  return approveRegistrationWithClient(prisma, req, res);
};

export const listPendingRTWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.RW) {
      res.status(403).json({
        success: false,
        message: "Hanya role RW yang boleh melihat daftar pendaftaran RT.",
      });
      return;
    }

    const { search } = req.query as { search?: string };
    const normalizedSearch = search?.trim();

    const rwWilayah = await client.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Data wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const users = await client.user.findMany({
      where: {
        role: Role.RT,
        status_akun: StatusAkun.PENDING,
        blok_wilayah: {
          wilayah_rw_id: rwWilayah.id,
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
        role: true,
        status_akun: true,
        created_at: true,
        blok_wilayah: {
          select: {
            id: true,
            nama_blok: true,
            no_rt: true,
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
      orderBy: { created_at: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Daftar pendaftaran RT pending berhasil diambil.",
      data: users,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil daftar pending pendaftaran RT.",
    });
  }
};

export const listPendingRT = async (
  req: Request,
  res: Response
): Promise<void> => {
  return listPendingRTWithClient(prisma, req, res);
};

export const approveRTWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.RW) {
      res.status(403).json({
        success: false,
        message: "Hanya role RW yang boleh melakukan approval RT.",
      });
      return;
    }

    const { user_id, status_akun, alasan_penolakan } = req.body as ApprovePengurusBody;

    if (!user_id || !status_akun) {
      res.status(400).json({
        success: false,
        message: "user_id dan status_akun wajib diisi.",
      });
      return;
    }

    if (status_akun !== "APPROVED" && status_akun !== "REJECTED") {
      res.status(400).json({
        success: false,
        message: "status_akun hanya boleh APPROVED atau REJECTED.",
      });
      return;
    }

    if (status_akun === "REJECTED" && !alasan_penolakan?.trim()) {
      res.status(400).json({
        success: false,
        message: "alasan_penolakan wajib diisi saat menolak pendaftaran.",
      });
      return;
    }

    const rwWilayah = await client.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Data wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const targetUser = await client.user.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        status_akun: true,
        blok_wilayah: {
          select: { wilayah_rw_id: true }
        }
      },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "User tidak ditemukan.",
      });
      return;
    }

    if (targetUser.role !== Role.RT) {
      res.status(400).json({
        success: false,
        message: "Hanya akun dengan role RT yang dapat diproses di sini.",
      });
      return;
    }

    if (targetUser.status_akun !== StatusAkun.PENDING) {
      res.status(400).json({
        success: false,
        message: "Approval hanya bisa dilakukan untuk user dengan status PENDING.",
      });
      return;
    }
    
    if (targetUser.blok_wilayah?.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. RT ini mendaftar untuk blok wilayah di luar RW Anda.",
      });
      return;
    }

    const updatedUser = await client.user.update({
      where: { id: user_id },
      data: {
        status_akun: status_akun,
        alasan_penolakan: status_akun === "REJECTED" ? alasan_penolakan?.trim() : null,
      },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        status_akun: true,
        alasan_penolakan: true,
      },
    });

    const { blok_wilayah, ...cleanTargetUser } = targetUser;
    await recordAudit(req, {
      aksi: status_akun === "APPROVED" ? AksiAudit.APPROVE : AksiAudit.REJECT,
      entitas: "User",
      entitas_id: user_id,
      data_lama: cleanTargetUser,
      data_baru: updatedUser,
      keterangan: `${status_akun === "APPROVED" ? "Menyetujui" : "Menolak"} pendaftaran RT: ${updatedUser.nama}`,
    });

    res.status(200).json({
      success: true,
      message:
        status_akun === "APPROVED"
          ? "Pendaftaran RT berhasil di-approve."
          : "Pendaftaran RT berhasil di-reject.",
      data: updatedUser,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memproses approval RT.",
    });
  }
};

export const approveRT = async (
  req: Request,
  res: Response
): Promise<void> => {
  return approveRTWithClient(prisma, req, res);
};
