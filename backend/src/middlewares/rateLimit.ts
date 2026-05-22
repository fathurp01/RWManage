import rateLimit from "express-rate-limit";

const createStrictLimiter = (
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

export const createLimiter = (
  windowMs: number,
  limit: number,
  message: string
) => {
  // Increase rate limiting limits dynamically in development mode to prevent local dev blocks
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  const actualLimit = isDev ? limit * 30 : limit;

  return rateLimit({
    windowMs,
    limit: actualLimit,
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

export const loginRateLimit = createLimiter(
  15 * 60 * 1000,
  5,
  "Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit."
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
