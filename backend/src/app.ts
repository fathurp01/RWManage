import path from "path";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import apiRouter from "./routes/api";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
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
