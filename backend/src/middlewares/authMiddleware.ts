import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Role, StatusAkun } from "@prisma/client";
import { prisma } from "../lib/prisma";

type AppRole = Role;

interface AuthUserPayload {
  id: string;
  email?: string;
  role: AppRole;
  wilayah_rw_id?: string;
  masjid_ids?: string[];
  blok_wilayah_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

const getTokenFromHeader = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const getTokenFromCookie = (req: Request): string | null => {
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "rwmanage_token";
  const value = (req as any).cookies?.[cookieName];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const parseJwtUser = (decoded: string | JwtPayload): AuthUserPayload | null => {
  if (typeof decoded === "string") {
    return null;
  }

  const id = decoded.id;
  const role = decoded.role;

  if (typeof id !== "string") {
    return null;
  }

  if (
    role !== Role.RW &&
    role !== Role.PENGURUS_MASJID &&
    role !== Role.RT &&
    role !== Role.SUPERADMIN
  ) {
    return null;
  }

  const wilayahRwId =
    typeof decoded.wilayah_rw_id === "string" ? decoded.wilayah_rw_id : undefined;
  const masjidIds = Array.isArray(decoded.masjid_ids)
    ? decoded.masjid_ids.filter((value): value is string => typeof value === "string")
    : undefined;

  const blokWilayahId =
    typeof decoded.blok_wilayah_id === "string" ? decoded.blok_wilayah_id : undefined;

  return {
    id,
    email: typeof decoded.email === "string" ? decoded.email : undefined,
    role,
    wilayah_rw_id: wilayahRwId,
    masjid_ids: masjidIds,
    blok_wilayah_id: blokWilayahId,
  };
};

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = getTokenFromCookie(req) ?? getTokenFromHeader(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      message: "Token tidak ditemukan atau format Authorization tidak valid.",
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({
      message: "Server belum dikonfigurasi dengan JWT_SECRET.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = parseJwtUser(decoded);

    if (!user) {
      res.status(401).json({
        message: "Payload token tidak valid.",
      });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({
      message: "Token tidak valid atau sudah kedaluwarsa.",
    });
  }
};

export const checkRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        message: "Akses ditolak. User belum terautentikasi.",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: "Akses ditolak. Role tidak memiliki izin.",
      });
      return;
    }

    next();
  };
};

export const checkApproval = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      message: "Akses ditolak. User belum terautentikasi.",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status_akun: true },
    });

    if (!user) {
      res.status(401).json({
        message: "User tidak ditemukan.",
      });
      return;
    }

    if (user.status_akun === StatusAkun.PENDING) {
      res.status(403).json({
        message: "Akun Anda masih menunggu persetujuan.",
      });
      return;
    }

    if (user.status_akun === StatusAkun.REJECTED) {
      res.status(403).json({
        message: "Akun Anda ditolak.",
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({
      message: "Terjadi kesalahan saat memeriksa status akun.",
    });
  }
};

export type { AuthUserPayload };
