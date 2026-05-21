import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import express, { NextFunction, Request, Response } from "express";
import apiRouter from "./routes/api";
import { csrfGuard } from "./middlewares/csrfGuard";

const parseAllowedOrigins = (): string[] => {
  const raw = process.env.CORS_ORIGINS ?? "http://localhost:3001";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  const allowedOrigins = parseAllowedOrigins();
  app.use(
    cors({
      origin: (origin, callback) => {
        // Non-browser clients (curl, server-to-server) may not send Origin.
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );
  app.use(cookieParser());
  app.use(csrfGuard());
  app.use(express.json({ limit: "1mb" }));

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use("/api", apiRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: "Endpoint tidak ditemukan.",
    });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan internal server.",
    });
  });

  return app;
};

export const app = createApp();
