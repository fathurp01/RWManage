import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { StatusIuran } from "@prisma/client";

export const getIuranForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tahun, bulan, status } = req.query as { tahun?: string; bulan?: string; status?: StatusIuran };

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const blokId = req.user.blok_wilayah_id;
    if (!blokId) {
      res.status(403).json({ success: false, message: "Data blok wilayah untuk RT login tidak ditemukan." });
      return;
    }

    const tahunInt = tahun ? Number(tahun) : new Date().getFullYear();
    if (!Number.isInteger(tahunInt) || tahunInt < 2000 || tahunInt > 3000) {
      res.status(400).json({ success: false, message: "Parameter tahun tidak valid." });
      return;
    }

    const bulanInt = bulan ? Number(bulan) : undefined;
    if (bulanInt !== undefined && (!Number.isInteger(bulanInt) || bulanInt < 1 || bulanInt > 12)) {
      res.status(400).json({ success: false, message: "Parameter bulan tidak valid." });
      return;
    }

    if (status !== undefined && status !== StatusIuran.BELUM && status !== StatusIuran.LUNAS) {
      res.status(400).json({ success: false, message: "Parameter status hanya boleh BELUM atau LUNAS." });
      return;
    }

    const wargaList = await prisma.warga.findMany({
      where: {
        blok_wilayah_id: blokId,
        deleted_at: null,
      },
      select: {
        id: true,
        nama_kk: true,
        tarif_iuran_bulanan: true,
        iuran_warga: {
          where: {
            tahun: tahunInt,
            ...(bulanInt ? { bulan: bulanInt } : {}),
            ...(status ? { status } : {}),
          },
          select: {
            id: true,
            bulan: true,
            tahun: true,
            nominal: true,
            status: true,
            kode_unik: true,
            tanggal_bayar: true,
          },
          orderBy: { bulan: "asc" },
        },
      },
      orderBy: { nama_kk: "asc" },
    });

    const data = wargaList.map((warga) => {
      const iuranByMonth = new Map(warga.iuran_warga.map((item) => [item.bulan, item]));

      const bulanSource = bulanInt ? [bulanInt] : Array.from({ length: 12 }, (_, idx) => idx + 1);

      const iuranBySelection = bulanSource
        .map((bulanItem) => {
          const found = iuranByMonth.get(bulanItem);

          if (found) {
            return found;
          }

          if (status === StatusIuran.LUNAS) {
            return null;
          }

          return {
            id: null,
            bulan: bulanItem,
            tahun: tahunInt,
            nominal: warga.tarif_iuran_bulanan,
            status: StatusIuran.BELUM,
            kode_unik: null,
            tanggal_bayar: null,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      return {
        id: warga.id,
        nama_kk: warga.nama_kk,
        tarif_iuran_bulanan: warga.tarif_iuran_bulanan,
        iuran: iuranBySelection,
      };
    }).filter((item) => item.iuran.length > 0 || status !== StatusIuran.LUNAS);

    res.status(200).json({
      success: true,
      message: "Data iuran RT berhasil diambil.",
      data: {
        blok_wilayah_id: blokId,
        tahun: tahunInt,
        bulan: bulanInt ?? null,
        status: status ?? null,
        warga: data,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil data iuran RT." });
  }
};
