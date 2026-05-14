import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { pengaturanIuranRWSchema } from "../validation/schemas";
import { AksiAudit } from "@prisma/client";
import { recordAudit } from "../middlewares/auditLogger";

type PengaturanIuranSnapshot = {
  nominal_iuran: string | number;
  persen_rt: number;
  persen_rw: number;
};

type PengaturanIuranHistoryItem = {
  id: string;
  created_at: string;
  keterangan: string | null;
  data_lama: PengaturanIuranSnapshot | null;
  data_baru: PengaturanIuranSnapshot | null;
  perubahan: Array<{
    field: "nominal_iuran" | "persen_rt" | "persen_rw";
    label: string;
    lama: string | number | null;
    baru: string | number | null;
  }>;
  user: {
    id: string;
    nama: string;
    email: string;
    role: string;
  } | null;
};

const parseSnapshot = (value: string | null): PengaturanIuranSnapshot | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PengaturanIuranSnapshot>;

    if (
      parsed &&
      parsed.nominal_iuran !== undefined &&
      parsed.persen_rt !== undefined &&
      parsed.persen_rw !== undefined
    ) {
      return {
        nominal_iuran: parsed.nominal_iuran,
        persen_rt: Number(parsed.persen_rt),
        persen_rw: Number(parsed.persen_rw),
      };
    }
  } catch {
    return null;
  }

  return null;
};

const buildHistoryDiff = (
  oldSnapshot: PengaturanIuranSnapshot | null,
  newSnapshot: PengaturanIuranSnapshot | null
) => {
  const fields: Array<{ field: "nominal_iuran" | "persen_rt" | "persen_rw"; label: string }> = [
    { field: "nominal_iuran", label: "Nominal Iuran Bulanan" },
    { field: "persen_rt", label: "Porsi Kas RT" },
    { field: "persen_rw", label: "Porsi Kas RW" },
  ];

  return fields
    .map((item) => ({
      field: item.field,
      label: item.label,
      lama: oldSnapshot ? oldSnapshot[item.field] : null,
      baru: newSnapshot ? newSnapshot[item.field] : null,
    }))
    .filter((item) => item.lama !== item.baru);
};

export const getPengaturanIuranRW = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Akses ditolak. Wilayah RW tidak ditemukan." });
      return;
    }

    let pengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id },
    });

    res.status(200).json({
      success: true,
      message: "Data pengaturan iuran berhasil diambil.",
      data: pengaturan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil pengaturan iuran." });
  }
};

export const upsertPengaturanIuranRW = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Akses ditolak. Wilayah RW tidak ditemukan." });
      return;
    }

    const { nominal_iuran, persen_rt, persen_rw } = req.body;

    const previousPengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id },
    });
    
    // Validasi basic
    if (!nominal_iuran) {
      res.status(400).json({ success: false, message: "nominal_iuran wajib diisi." });
      return;
    }

    const pRt = persen_rt ?? 70.0;
    const pRw = persen_rw ?? 30.0;

    if (pRt + pRw !== 100.0) {
      res.status(400).json({ success: false, message: "Total persen RT dan RW harus 100%." });
      return;
    }

    const pengaturan = await prisma.pengaturanIuranRW.upsert({
      where: { wilayah_rw_id: rwWilayah.id },
      update: {
        nominal_iuran: Number(nominal_iuran),
        persen_rt: Number(pRt),
        persen_rw: Number(pRw),
      },
      create: {
        wilayah_rw_id: rwWilayah.id,
        nominal_iuran: Number(nominal_iuran),
        persen_rt: Number(pRt),
        persen_rw: Number(pRw),
      },
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "PengaturanIuranRW",
      entitas_id: pengaturan.id,
      data_lama: previousPengaturan,
      data_baru: pengaturan,
      keterangan: "Perubahan nominal iuran bulanan dan pembagian kas RT/RW.",
    });

    res.status(200).json({
      success: true,
      message: "Pengaturan iuran berhasil disimpan.",
      data: pengaturan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat menyimpan pengaturan iuran." });
  }
};

export const getPengaturanIuranHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });

    if (!rwWilayah) {
      res.status(403).json({ success: false, message: "Akses ditolak. Wilayah RW tidak ditemukan." });
      return;
    }

    const currentPengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id },
      select: { id: true },
    });

    if (!currentPengaturan) {
      res.status(200).json({
        success: true,
        message: "Riwayat pengaturan iuran belum tersedia.",
        data: [],
      });
      return;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entitas: "PengaturanIuranRW",
        entitas_id: currentPengaturan.id,
      },
      include: {
        user: {
          select: { id: true, nama: true, email: true, role: true },
        },
      },
      orderBy: { created_at: "asc" },
    });

    const historyAscending = auditLogs.reduce<{
      items: PengaturanIuranHistoryItem[];
      lastSnapshot: PengaturanIuranSnapshot | null;
    }>((acc, log) => {
      const dataBaru = parseSnapshot(log.data_baru);
      const dataLama = parseSnapshot(log.data_lama) ?? acc.lastSnapshot;
      const perubahan = buildHistoryDiff(dataLama, dataBaru);

      acc.items.push({
        id: log.id,
        created_at: log.created_at.toISOString(),
        keterangan: log.keterangan,
        data_lama: dataLama,
        data_baru: dataBaru,
        perubahan,
        user: log.user,
      });

      acc.lastSnapshot = dataBaru ?? dataLama;
      return acc;
    }, { items: [], lastSnapshot: null });

    res.status(200).json({
      success: true,
      message: "Riwayat pengaturan iuran berhasil diambil.",
      data: historyAscending.items.reverse(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil riwayat pengaturan iuran.",
    });
  }
};
