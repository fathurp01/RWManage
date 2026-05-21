import type { NextFunction, Request, Response } from "express";

const parseAllowedOrigins = (): string[] => {
  const raw = process.env.CORS_ORIGINS ?? "http://localhost:3001";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const isUnsafeMethod = (method: string): boolean => {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
};

const originFromReferer = (referer: string): string | null => {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

export const csrfGuard = () => {
  const allowedOrigins = parseAllowedOrigins();
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "rwmanage_token";

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip preflight and safe methods.
    if (!isUnsafeMethod(req.method) || req.method === "OPTIONS") {
      next();
      return;
    }

    // Only enforce CSRF checks for cookie-authenticated requests.
    const cookieValue = (req as any).cookies?.[cookieName];
    if (typeof cookieValue !== "string" || cookieValue.trim().length === 0) {
      next();
      return;
    }

    const originHeader = req.headers.origin;
    const refererHeader = req.headers.referer;

    const requestOrigin =
      typeof originHeader === "string" && originHeader.length > 0
        ? originHeader
        : typeof refererHeader === "string" && refererHeader.length > 0
          ? originFromReferer(refererHeader)
          : null;

    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: "Permintaan ditolak.",
    });
  };
};
