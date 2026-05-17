import rateLimit from "express-rate-limit";

export const createLimiter = (
  windowMs: number,
  limit: number,
  message: string
) => {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });
};

export const authRateLimit = createLimiter(
  15 * 60 * 1000,
  30,
  "Terlalu banyak percobaan autentikasi. Coba lagi nanti."
);

export const publicRateLimit = createLimiter(
  15 * 60 * 1000,
  60,
  "Terlalu banyak permintaan publik. Coba lagi nanti."
);

export const rwActionRateLimit = createLimiter(
  15 * 60 * 1000,
  120,
  "Terlalu banyak aksi RW. Coba lagi nanti."
);

export const zisActionRateLimit = createLimiter(
  15 * 60 * 1000,
  120,
  "Terlalu banyak aksi ZIS. Coba lagi nanti."
);
