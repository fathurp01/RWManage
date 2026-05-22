import { Role, StatusIuran, Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface CreateCicilanBody {
  iuran_id?: string;
  jumlah_bulan?: number | string;
  bulan_mulai?: number | string;
  tahun_mulai?: number | string;
  tambahan_nominal?: number | string;
}

interface UpdateCicilanBody {
  jumlah_bulan?: number | string;
  bulan_mulai?: number | string;
  tahun_mulai?: number | string;
}

const hasCicilanAccess = (
  role: Role | undefined,
  owner: { rwUserId?: string | null; blokWilayahId?: string | null },
  userId?: string,
  userBlokWilayahId?: string
): boolean => {
  if (role === Role.RW) {
    return owner.rwUserId === userId;
  }

  if (role === Role.RT) {
    return owner.blokWilayahId === userBlokWilayahId;
  }

  return false;
};

export const createCicilanIuran = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { iuran_id, jumlah_bulan, bulan_mulai, tahun_mulai, tambahan_nominal } =
      req.body as CreateCicilanBody;

    if (!iuran_id || !jumlah_bulan || !bulan_mulai || !tahun_mulai) {
      res.status(400).json({
        success: false,
        message:
          "iuran_id, jumlah_bulan, bulan_mulai, dan tahun_mulai wajib diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const jmlBulan = Number(jumlah_bulan);
    const blnMulai = Number(bulan_mulai);
    const thnMulai = Number(tahun_mulai);
    const tambahanNominal = tambahan_nominal !== undefined ? Number(tambahan_nominal) : 0;

    if (
      !Number.isInteger(jmlBulan) ||
      jmlBulan <= 0 ||
      !Number.isInteger(blnMulai) ||
      blnMulai < 1 ||
      blnMulai > 12 ||
      !Number.isInteger(thnMulai) ||
      thnMulai < 2000
    ) {
      res.status(400).json({
        success: false,
        message:
          "jumlah_bulan harus > 0, bulan_mulai 1-12, tahun_mulai >= 2000.",
      });
      return;
    }

    // Validasi iuran ownership
    const iuran = await prisma.iuranWarga.findUnique({
      where: { id: iuran_id },
      select: {
        warga: {
          select: {
            id: true,
            blok_wilayah_id: true,
            blok_wilayah: {
              select: { wilayah_rw: { select: { user_id: true } } },
            },
          },
        },
        nominal: true,
      },
    });

    if (!iuran) {
      res.status(404).json({
        success: false,
        message: "Iuran tidak ditemukan.",
      });
      return;
    }

    if (
      !hasCicilanAccess(
        req.user.role,
        {
          rwUserId: iuran.warga.blok_wilayah.wilayah_rw.user_id,
          blokWilayahId: iuran.warga.blok_wilayah_id,
        },
        req.user.id,
        req.user.blok_wilayah_id
      )
    ) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const cicilan = await prisma.$transaction(async (tx) => {
      let currentNominal = new Prisma.Decimal(iuran.nominal);

      if (tambahanNominal > 0) {
        currentNominal = currentNominal.add(tambahanNominal);
        await tx.iuranWarga.update({
          where: { id: iuran_id },
          data: { nominal: currentNominal },
        });
      }

      const nominalPerBulan = currentNominal.dividedBy(jmlBulan);

      return tx.cicilanIuran.create({
        data: {
          warga_id: iuran.warga.id,
          iuran_id,
          total_cicilan: currentNominal,
          nominal_per_bulan: nominalPerBulan,
          jumlah_bulan: jmlBulan,
          bulan_mulai: blnMulai,
          tahun_mulai: thnMulai,
        },
      });
    });

    res.status(201).json({
      success: true,
      message: "Cicilan iuran berhasil dibuat.",
      data: cicilan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat cicilan iuran.",
    });
  }
};

export const updateCicilanIuran = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.cicilan_id;
    const cicilan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!cicilan_id) {
      res.status(400).json({ success: false, message: "cicilan_id harus diisi." });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "User belum terautentikasi." });
      return;
    }

    const existing = await prisma.cicilanIuran.findUnique({
      where: { id: cicilan_id },
      select: {
        warga: {
          select: {
            blok_wilayah_id: true,
            blok_wilayah: { select: { wilayah_rw: { select: { user_id: true } } } },
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Cicilan tidak ditemukan." });
      return;
    }

    if (
      !hasCicilanAccess(
        req.user.role,
        { rwUserId: existing.warga.blok_wilayah.wilayah_rw.user_id, blokWilayahId: existing.warga.blok_wilayah_id },
        req.user.id,
        req.user.blok_wilayah_id
      )
    ) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { jumlah_bulan, bulan_mulai, tahun_mulai } = req.body as UpdateCicilanBody;
    const updateData: {
      jumlah_bulan?: number;
      bulan_mulai?: number;
      tahun_mulai?: number;
    } = {};

    if (jumlah_bulan !== undefined) updateData.jumlah_bulan = Number(jumlah_bulan);
    if (bulan_mulai !== undefined) updateData.bulan_mulai = Number(bulan_mulai);
    if (tahun_mulai !== undefined) updateData.tahun_mulai = Number(tahun_mulai);

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ success: false, message: "Minimal satu field harus diupdate." });
      return;
    }

    const updated = await prisma.cicilanIuran.update({
      where: { id: cicilan_id },
      data: updateData,
    });

    res.status(200).json({ success: true, message: "Cicilan berhasil diperbarui.", data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat memperbarui cicilan." });
  }
};

export const getCicilanIuranList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { warga_id, iuran_id } = req.query as {
      warga_id?: string;
      iuran_id?: string;
    };

    if (!warga_id && !iuran_id) {
      res.status(400).json({
        success: false,
        message: "warga_id atau iuran_id harus diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    if (warga_id) {
      // Validasi ownership
      const warga = await prisma.warga.findUnique({
        where: { id: warga_id },
        select: {
          blok_wilayah_id: true,
          blok_wilayah: {
            select: { wilayah_rw: { select: { user_id: true } } },
          },
        },
      });

      if (!warga) {
        res.status(404).json({
          success: false,
          message: "Warga tidak ditemukan.",
        });
        return;
      }

      if (
        !hasCicilanAccess(
          req.user.role,
          {
            rwUserId: warga.blok_wilayah.wilayah_rw.user_id,
            blokWilayahId: warga.blok_wilayah_id,
          },
          req.user.id,
          req.user.blok_wilayah_id
        )
      ) {
        res.status(403).json({
          success: false,
          message: "Akses ditolak.",
        });
        return;
      }
    }

    const cicilan = await prisma.cicilanIuran.findMany({
      where: {
        ...(warga_id && { warga_id }),
        ...(iuran_id && { iuran_id }),
      },
      include: {
        iuran: true,
        pembayaran: {
          orderBy: { tanggal_bayar: "asc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Data cicilan iuran berhasil diambil.",
      data: cicilan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data cicilan iuran.",
    });
  }
};

export const updateCicilanStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.cicilan_id;
    const cicilan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!cicilan_id) {
      res.status(400).json({
        success: false,
        message: "cicilan_id harus diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const { nominal } = req.body as { nominal?: number | string };
    if (nominal === undefined) {
      res.status(400).json({
        success: false,
        message: "Nominal pembayaran wajib diisi.",
      });
      return;
    }

    const nominalNum = Number(nominal);
    if (isNaN(nominalNum) || nominalNum <= 0) {
      res.status(400).json({
        success: false,
        message: "Nominal pembayaran harus berupa angka positif.",
      });
      return;
    }

    const cicilan = await prisma.cicilanIuran.findUnique({
      where: { id: cicilan_id },
      select: {
        id: true,
        total_cicilan: true,
        sudah_lunas: true,
        warga: {
          select: {
            nama_kk: true,
            blok_wilayah_id: true,
            blok_wilayah: {
              select: {
                wilayah_rw_id: true,
                wilayah_rw: { select: { user_id: true } },
              },
            },
          },
        },
        iuran: {
          select: {
            id: true,
            bulan: true,
            tahun: true,
            nominal: true,
          },
        },
        pembayaran: {
          select: {
            nominal: true,
          },
        },
      },
    });

    if (!cicilan) {
      res.status(404).json({
        success: false,
        message: "Cicilan tidak ditemukan.",
      });
      return;
    }

    if (cicilan.sudah_lunas) {
      res.status(400).json({
        success: false,
        message: "Cicilan ini sudah lunas.",
      });
      return;
    }

    if (
      !hasCicilanAccess(
        req.user.role,
        {
          rwUserId: cicilan.warga.blok_wilayah.wilayah_rw.user_id,
          blokWilayahId: cicilan.warga.blok_wilayah_id,
        },
        req.user.id,
        req.user.blok_wilayah_id
      )
    ) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    const totalTerbayar = cicilan.pembayaran.reduce(
      (acc, p) => acc + Number(p.nominal),
      0
    );
    const totalCicilan = Number(cicilan.total_cicilan);
    const sisaCicilan = totalCicilan - totalTerbayar;

    if (nominalNum > sisaCicilan + 0.01) {
      res.status(400).json({
        success: false,
        message: `Nominal pembayaran tidak boleh melebihi sisa cicilan (Sisa: Rp ${sisaCicilan.toLocaleString("id-ID")}).`,
      });
      return;
    }

    const isLunas = (totalTerbayar + nominalNum) >= totalCicilan - 0.01;
    const actualPaymentNominal = isLunas ? sisaCicilan : nominalNum;

    const paymentDate = new Date();
    const { randomBytes } = require("crypto");
    const year2 = String(paymentDate.getFullYear()).slice(-2);
    const month2 = String(paymentDate.getMonth() + 1).padStart(2, "0");

    const suffixKas = randomBytes(3).toString("hex").toUpperCase();
    const kodeKas = `KRT-${year2}${month2}-${suffixKas}`;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Catat pembayaran cicilan
      await tx.pembayaranCicilan.create({
        data: {
          cicilan_id,
          nominal: new Prisma.Decimal(actualPaymentNominal),
          tanggal_bayar: paymentDate,
          keterangan: `Pembayaran cicilan ke-${cicilan.pembayaran.length + 1}`,
        },
      });

      const pengaturan = await tx.pengaturanIuranRW.findUnique({
        where: { wilayah_rw_id: cicilan.warga.blok_wilayah.wilayah_rw_id },
      });

      const pRt = Number(pengaturan?.persen_rt ?? 70);
      const pRw = Number(pengaturan?.persen_rw ?? 30);

      // Pembagian 70% (atau persen_rt) langsung masuk ke Kas RT
      const nominalKasRtForThisPayment = new Prisma.Decimal(actualPaymentNominal).mul(pRt).div(100);

      // 2. Masukkan ke kas RT
      await tx.kasRT.create({
        data: {
          blok_wilayah_id: cicilan.warga.blok_wilayah_id,
          jenis_transaksi: "MASUK",
          tanggal: paymentDate,
          keterangan: `Cicilan parsial iuran warga ${cicilan.warga.nama_kk} bln ${cicilan.iuran.bulan}/${cicilan.iuran.tahun}`,
          nominal: nominalKasRtForThisPayment,
          kode_unik: kodeKas,
        },
      });

      let updatedCicilan;

      if (isLunas) {
        // 3. Update status cicilan menjadi lunas
        updatedCicilan = await tx.cicilanIuran.update({
          where: { id: cicilan_id },
          data: { sudah_lunas: true },
          include: {
            pembayaran: {
              orderBy: { tanggal_bayar: "asc" },
            },
          },
        });

        // 4. Update status IuranWarga menjadi LUNAS
        const suffixIur = randomBytes(3).toString("hex").toUpperCase();
        const kodeIuran = `IUR-${year2}${month2}-${suffixIur}`;

        const nominalKasRtTotal = new Prisma.Decimal(totalCicilan).mul(pRt).div(100);
        const nominalKasRwTotal = new Prisma.Decimal(totalCicilan).mul(pRw).div(100);

        await tx.iuranWarga.update({
          where: { id: cicilan.iuran.id },
          data: {
            status: StatusIuran.LUNAS,
            tanggal_bayar: paymentDate,
            kode_unik: kodeIuran,
            nominal_kas_rt: nominalKasRtTotal,
            nominal_kas_rw: nominalKasRwTotal,
            nominal: new Prisma.Decimal(totalCicilan),
          },
        });
      } else {
        updatedCicilan = await tx.cicilanIuran.findUnique({
          where: { id: cicilan_id },
          include: {
            pembayaran: {
              orderBy: { tanggal_bayar: "asc" },
            },
          },
        });
      }

      return updatedCicilan;
    });

    res.status(200).json({
      success: true,
      message: isLunas ? "Cicilan berhasil dilunasi." : "Pembayaran cicilan berhasil dicatat.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate cicilan.",
    });
  }
};

export const deleteCicilanIuran = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const raw = (req.params as Record<string, unknown>)?.cicilan_id;
    const cicilan_id = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

    if (!cicilan_id) {
      res.status(400).json({
        success: false,
        message: "cicilan_id harus diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const cicilan = await prisma.cicilanIuran.findUnique({
      where: { id: cicilan_id },
      select: {
        warga: {
          select: {
            blok_wilayah_id: true,
            blok_wilayah: {
              select: { wilayah_rw: { select: { user_id: true } } },
            },
          },
        },
      },
    });

    if (!cicilan) {
      res.status(404).json({
        success: false,
        message: "Cicilan tidak ditemukan.",
      });
      return;
    }

    if (
      !hasCicilanAccess(
        req.user.role,
        {
          rwUserId: cicilan.warga.blok_wilayah.wilayah_rw.user_id,
          blokWilayahId: cicilan.warga.blok_wilayah_id,
        },
        req.user.id,
        req.user.blok_wilayah_id
      )
    ) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
      return;
    }

    await prisma.cicilanIuran.delete({
      where: { id: cicilan_id },
    });

    res.status(200).json({
      success: true,
      message: "Cicilan berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus cicilan.",
    });
  }
};
