import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { JenisTransaksi, Prisma, StatusIuran } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface CreateWargaBody {
  blok_wilayah_id?: string;
  nama_kk?: string;
  
}

interface GetIuranWargaQuery {
  blok_wilayah_id?: string;
  tahun?: string;
  bulan?: string;
  status?: StatusIuran;
}

interface GetWargaListQuery {
  blok_wilayah_id?: string;
  search?: string;
}

interface WargaIdParams {
  warga_id?: string;
}

interface UpdateWargaBody {
  nama_kk?: string;
  
}

interface BayarIuranBody {
  iuran_id?: string;
}

interface CreateKasRWBody {
  wilayah_rw_id?: string;
  jenis_transaksi?: JenisTransaksi;
  tanggal?: string;
  keterangan?: string;
  nominal?: number | string;
  bukti_url?: string;
  bukti_foto_url?: string;
}

interface GetKasRWQuery {
  wilayah_rw_id?: string;
  jenis_transaksi?: JenisTransaksi;
  search?: string;
}

interface KasIdParams {
  kas_id?: string;
}

interface UpdateKasRWBody {
  jenis_transaksi?: JenisTransaksi;
  tanggal?: string;
  keterangan?: string;
  nominal?: number | string;
  bukti_url?: string;
  bukti_foto_url?: string;
}

const createKodeUnikCandidate = (prefix: "IUR" | "KAS", date: Date): string => {
  const year2 = String(date.getFullYear()).slice(-2);
  const month2 = String(date.getMonth() + 1).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${year2}${month2}-${suffix}`;
};

const generateKodeUnik = async (
  client: typeof prisma | Prisma.TransactionClient,
  prefix: "IUR" | "KAS"
): Promise<string> => {
  const now = new Date();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = createKodeUnikCandidate(prefix, now);

    if (prefix === "IUR") {
      const exists = await (client as any).iuranWarga.findUnique({
        where: { kode_unik: candidate },
        select: { id: true },
      });

      if (!exists) {
        return candidate;
      }
      continue;
    }

    const exists = await (client as any).kasRW.findUnique({
      where: { kode_unik: candidate },
      select: { id: true },
    });

    if (!exists) {
      return candidate;
    }
  }

  throw new Error(`Gagal membuat kode unik ${prefix}.`);
};

const parsePositiveNumber = (
  value: number | string | undefined
): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const getRwWilayahByUserId = async (userId: string) => {
  return prisma.wilayahRW.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
};

export const createWargaWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { blok_wilayah_id, nama_kk } = req.body as CreateWargaBody;

    if (!blok_wilayah_id || !nama_kk) {
      res.status(400).json({
        success: false,
        message: "blok_wilayah_id dan nama_kk wajib diisi.",
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

    const rwWilayah = await client.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const blok = await client.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { id: true, wilayah_rw_id: true },
    });

    if (!blok) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    if (blok.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Blok wilayah ini tidak berada di RW Anda.",
      });
      return;
    }

    const pengaturan = await client.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id }
    });
    if (!pengaturan) {
      res.status(400).json({ success: false, message: "Pengaturan Iuran RW belum dikonfigurasi." });
      return;
    }
    const currentYear = new Date().getFullYear();

    const result = await client.$transaction(async (tx) => {
      const warga = await tx.warga.create({
        data: {
          blok_wilayah_id,
          nama_kk,
          
        },
      });

      await tx.iuranWarga.createMany({
        data: Array.from({ length: 12 }, (_, idx) => ({
          warga_id: warga.id,
          bulan: idx + 1,
          tahun: currentYear,
          nominal: pengaturan.nominal_iuran,
          status: StatusIuran.BELUM,
        })),
      });

      return warga;
    });

    res.status(201).json({
      success: true,
      message:
        "Warga berhasil ditambahkan dan 12 data iuran tahun berjalan berhasil dibuat.",
      data: {
        id: result.id,
        nama_kk: result.nama_kk,
        blok_wilayah_id: result.blok_wilayah_id,
        
        tahun_iuran_awal: currentYear,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menambahkan warga.",
    });
  }
};

export const createWarga = async (req: Request, res: Response): Promise<void> => {
  return createWargaWithClient(prisma, req, res);
};

export const getWargaList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { blok_wilayah_id, search } = req.query as GetWargaListQuery;

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    if (blok_wilayah_id) {
      const blok = await prisma.blokWilayah.findUnique({
        where: { id: blok_wilayah_id },
        select: { id: true, wilayah_rw_id: true },
      });

      if (!blok) {
        res.status(404).json({
          success: false,
          message: "Blok wilayah tidak ditemukan.",
        });
        return;
      }

      if (blok.wilayah_rw_id !== rwWilayah.id) {
        res.status(403).json({
          success: false,
          message: "Akses ditolak. Blok wilayah ini tidak berada di RW Anda.",
        });
        return;
      }
    }

    const normalizedSearch = search?.trim();

    const wargaList = await prisma.warga.findMany({
      where: {
        deleted_at: null,
        ...(blok_wilayah_id
          ? {
              blok_wilayah_id,
            }
          : {
              blok_wilayah: {
                wilayah_rw_id: rwWilayah.id,
              },
            }),
        ...(normalizedSearch
          ? {
              nama_kk: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            }
          : {}),
      },
      select: {
        id: true,
        nama_kk: true,
        
        blok_wilayah_id: true,
        blok_wilayah: {
          select: {
            nama_blok: true,
            no_rt: true,
          },
        },
      },
      orderBy: { nama_kk: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Data warga berhasil diambil.",
      data: wargaList,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data warga.",
    });
  }
};

export const getWargaDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warga_id } = req.params as WargaIdParams;

    if (!warga_id) {
      res.status(400).json({
        success: false,
        message: "warga_id wajib diisi.",
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

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const warga = await prisma.warga.findUnique({
      where: { id: warga_id },
      select: {
        id: true,
        nama_kk: true,
        
        blok_wilayah_id: true,
        deleted_at: true,
        blok_wilayah: {
          select: {
            wilayah_rw_id: true,
            nama_blok: true,
            no_rt: true,
          },
        },
      },
    });

    if (!warga || warga.deleted_at) {
      res.status(404).json({
        success: false,
        message: "Data warga tidak ditemukan.",
      });
      return;
    }

    if (warga.blok_wilayah.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Data warga ini tidak berada di RW Anda.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Detail warga berhasil diambil.",
      data: {
        id: warga.id,
        nama_kk: warga.nama_kk,
        
        blok_wilayah_id: warga.blok_wilayah_id,
        blok_wilayah: {
          nama_blok: warga.blok_wilayah.nama_blok,
          no_rt: warga.blok_wilayah.no_rt,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil detail warga.",
    });
  }
};

export const updateWarga = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warga_id } = req.params as WargaIdParams;
    const { nama_kk } = req.body as UpdateWargaBody; const tarif_iuran_bulanan = undefined;

    if (!warga_id) {
      res.status(400).json({
        success: false,
        message: "warga_id wajib diisi.",
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

    if (nama_kk === undefined && tarif_iuran_bulanan === undefined) {
      res.status(400).json({
        success: false,
        message: "Minimal satu field harus dikirim untuk update warga.",
      });
      return;
    }

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const existingWarga = await prisma.warga.findUnique({
      where: { id: warga_id },
      select: {
        id: true,
        deleted_at: true,
        blok_wilayah: {
          select: {
            wilayah_rw_id: true,
          },
        },
      },
    });

    if (!existingWarga || existingWarga.deleted_at) {
      res.status(404).json({
        success: false,
        message: "Data warga tidak ditemukan.",
      });
      return;
    }

    if (existingWarga.blok_wilayah.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Data warga ini tidak berada di RW Anda.",
      });
      return;
    }

    const dataToUpdate: {
      nama_kk?: string;
      
      iuran_warga?: {
        updateMany: {
          where: {
            status: StatusIuran;
          };
          data: {
            nominal: Prisma.Decimal;
          };
        };
      };
    } = {};

    if (nama_kk !== undefined) {
      dataToUpdate.nama_kk = nama_kk.trim();
    }

    if (tarif_iuran_bulanan !== undefined) {
      const parsedTarif = parsePositiveNumber(tarif_iuran_bulanan);
      if (parsedTarif === null) {
        res.status(400).json({
          success: false,
          message: "tarif_iuran_bulanan harus berupa angka lebih dari 0.",
        });
        return;
      }

      const decimalTarif = new Prisma.Decimal(parsedTarif);
      
      dataToUpdate.iuran_warga = {
        updateMany: {
          where: {
            status: StatusIuran.BELUM,
          },
          data: {
            nominal: decimalTarif,
          },
        },
      };
    }

    const updatedWarga = await prisma.warga.update({
      where: { id: warga_id },
      data: dataToUpdate,
      select: {
        id: true,
        nama_kk: true,
        
        blok_wilayah_id: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Data warga berhasil diperbarui.",
      data: updatedWarga,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memperbarui warga.",
    });
  }
};

export const deleteWarga = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warga_id } = req.params as WargaIdParams;

    if (!warga_id) {
      res.status(400).json({
        success: false,
        message: "warga_id wajib diisi.",
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

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const existingWarga = await prisma.warga.findUnique({
      where: { id: warga_id },
      select: {
        id: true,
        deleted_at: true,
        blok_wilayah: {
          select: {
            wilayah_rw_id: true,
          },
        },
      },
    });

    if (!existingWarga || existingWarga.deleted_at) {
      res.status(404).json({
        success: false,
        message: "Data warga tidak ditemukan.",
      });
      return;
    }

    if (existingWarga.blok_wilayah.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Data warga ini tidak berada di RW Anda.",
      });
      return;
    }

    const deletedWarga = await prisma.warga.update({
      where: { id: warga_id },
      data: {
        deleted_at: new Date(),
      },
      select: {
        id: true,
        nama_kk: true,
        deleted_at: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Data warga berhasil dinonaktifkan.",
      data: deletedWarga,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus warga.",
    });
  }
};

export const getIuranWarga = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { blok_wilayah_id, tahun, bulan, status } = req.query as GetIuranWargaQuery;

    if (!blok_wilayah_id) {
      res.status(400).json({
        success: false,
        message: "blok_wilayah_id wajib diisi pada query parameter.",
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

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { id: true, wilayah_rw_id: true },
    });

    if (!blok) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    if (blok.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Blok wilayah ini tidak berada di RW Anda.",
      });
      return;
    }

    const tahunInt = tahun ? Number(tahun) : new Date().getFullYear();
    if (!Number.isInteger(tahunInt) || tahunInt < 2000 || tahunInt > 3000) {
      res.status(400).json({
        success: false,
        message: "Parameter tahun tidak valid.",
      });
      return;
    }

    const bulanInt = bulan ? Number(bulan) : undefined;
    if (
      bulanInt !== undefined &&
      (!Number.isInteger(bulanInt) || bulanInt < 1 || bulanInt > 12)
    ) {
      res.status(400).json({
        success: false,
        message: "Parameter bulan tidak valid.",
      });
      return;
    }

    if (
      status !== undefined &&
      status !== StatusIuran.BELUM &&
      status !== StatusIuran.LUNAS
    ) {
      res.status(400).json({
        success: false,
        message: "Parameter status hanya boleh BELUM atau LUNAS.",
      });
      return;
    }

    const wargaList = await prisma.warga.findMany({
      where: {
        blok_wilayah_id,
        deleted_at: null,
      },
      select: {
        id: true,
        nama_kk: true,
        
        iuran_warga: {
          where: {
            tahun: tahunInt,
            ...(bulanInt
              ? {
                  bulan: bulanInt,
                }
              : {}),
            ...(status
              ? {
                  status,
                }
              : {}),
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
      const iuranByMonth = new Map(
        warga.iuran_warga.map((item) => [item.bulan, item])
      );

      const bulanSource = bulanInt ? [bulanInt] : Array.from({ length: 12 }, (_, idx) => idx + 1);

      const iuranBySelection = bulanSource.map((bulanItem) => {
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
          nominal: new Prisma.Decimal(0),
          status: StatusIuran.BELUM,
          kode_unik: null,
          tanggal_bayar: null,
        };
      }).filter((item): item is NonNullable<typeof item> => Boolean(item));

      return {
        id: warga.id,
        nama_kk: warga.nama_kk,
        
        iuran: iuranBySelection,
      };
    }).filter((item) => item.iuran.length > 0 || status !== StatusIuran.LUNAS);

    res.status(200).json({
      success: true,
      message: "Data iuran warga berhasil diambil.",
      data: {
        blok_wilayah_id,
        tahun: tahunInt,
        bulan: bulanInt ?? null,
        status: status ?? null,
        warga: data,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data iuran warga.",
    });
  }
};

export const bayarIuran = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iuran_id } = req.body as BayarIuranBody;

    if (!iuran_id) {
      res.status(400).json({
        success: false,
        message: "iuran_id wajib diisi.",
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

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const existingIuran = await prisma.iuranWarga.findUnique({
      where: { id: iuran_id },
      select: {
        id: true,
        bulan: true,
        tahun: true,
        nominal: true,
        status: true,
        warga: {
          select: {
            nama_kk: true,
            blok_wilayah: {
              select: {
                wilayah_rw_id: true,
              },
            },
          },
        },
      },
    });

    if (!existingIuran) {
      res.status(404).json({
        success: false,
        message: "Data iuran tidak ditemukan.",
      });
      return;
    }

    if (existingIuran.warga.blok_wilayah.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Iuran ini tidak berada di RW Anda.",
      });
      return;
    }

    if (existingIuran.status === StatusIuran.LUNAS) {
      res.status(400).json({
        success: false,
        message: "Iuran sudah berstatus LUNAS.",
      });
      return;
    }

    const paymentDate = new Date();
    
    // Ambil pengaturan iuran untuk split dana
    const pengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id }
    });

    const updatedIuran = await prisma.$transaction(async (tx) => {
      const kodeIuran = await generateKodeUnik(tx, "IUR");
      
      let nominal_kas_rt = new Prisma.Decimal(0);
      let nominal_kas_rw = existingIuran.nominal;

      if (pengaturan) {
        const nRt = (Number(existingIuran.nominal) * pengaturan.persen_rt) / 100;
        const nRw = (Number(existingIuran.nominal) * pengaturan.persen_rw) / 100;
        nominal_kas_rt = new Prisma.Decimal(nRt);
        nominal_kas_rw = new Prisma.Decimal(nRw);

        // Cari blok untuk mendapatkan KasRT ID
        const iuranData = await tx.iuranWarga.findUnique({
          where: { id: iuran_id },
          include: { warga: { include: { blok_wilayah: true } } }
        });

        if (iuranData) {
          // Catat ke Kas RT (70%)
          await tx.kasRT.create({
            data: {
              blok_wilayah_id: iuranData.warga.blok_wilayah_id,
              jenis_transaksi: JenisTransaksi.MASUK,
              tanggal: paymentDate,
              keterangan: `Iuran Warga: ${iuranData.warga.nama_kk} (${iuranData.bulan}/${iuranData.tahun})`,
              nominal: nominal_kas_rt,
              kode_unik: await generateKodeUnik(tx, "KAS")
            }
          });
        }
      }

      const updated = await tx.iuranWarga.update({
        where: { id: iuran_id },
        data: {
          status: StatusIuran.LUNAS,
          tanggal_bayar: paymentDate,
          kode_unik: kodeIuran,
          nominal_kas_rt,
          nominal_kas_rw,
        },
        select: {
          id: true,
          warga_id: true,
          bulan: true,
          tahun: true,
          nominal: true,
          status: true,
          kode_unik: true,
          tanggal_bayar: true,
        },
      });

      // Jika tidak ada pengaturan (legacy), semua masuk ke Kas RW
      // Jika ada pengaturan, yang dicatat ke Kas RW adalah yang SUDAH DISETORKAN nantinya.
      // Untuk pembayaran langsung, kita anggap RW menerima uang, tapi porsi RT harus tetap tercatat.
      // Namun biasanya RW bayar iuran warga itu jarang, biasanya RT.
      // Jika RW yang input, maka uang fisik ada di RW.
      
      // Sesuai requirement: "RW bertindak sebagai pengatur pusat".
      // Jika RW input bayar, kita tetap masukkan nominal_kas_rw ke Kas RW? 
      // Tidak, karena Kas RW di sini adalah kas internal operasional RW.
      // Uang iuran masuk ke Kas RW HANYA setelah RT SETOR dan RW APPROVE.
      // Jadi jika RW input bayar, nominal_kas_rw masuk ke "Titipan RW" di level Blok (implisit via IuranWarga.nominal_kas_rw).
      
      return updated;
    });

    res.status(200).json({
      success: true,
      message: "Pembayaran iuran berhasil diproses.",
      data: updatedIuran,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memproses pembayaran iuran.",
    });
  }
};

export const createKasRW = async (req: Request, res: Response): Promise<void> => {
  try {
    const { wilayah_rw_id, jenis_transaksi, tanggal, keterangan, nominal, bukti_url } =
      req.body as CreateKasRWBody;

    const nominalKas = parsePositiveNumber(nominal);

    if (!wilayah_rw_id || !jenis_transaksi || !keterangan || nominalKas === null) {
      res.status(400).json({
        success: false,
        message:
          "wilayah_rw_id, jenis_transaksi, keterangan, dan nominal (angka > 0) wajib diisi.",
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

    if (
      jenis_transaksi !== JenisTransaksi.MASUK &&
      jenis_transaksi !== JenisTransaksi.KELUAR
    ) {
      res.status(400).json({
        success: false,
        message: "jenis_transaksi hanya boleh MASUK atau KELUAR.",
      });
      return;
    }

    const wilayah = await prisma.wilayahRW.findUnique({
      where: { id: wilayah_rw_id },
      select: { id: true, user_id: true },
    });

    if (!wilayah) {
      res.status(404).json({
        success: false,
        message: "Wilayah RW tidak ditemukan.",
      });
      return;
    }

    if (wilayah.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda hanya dapat menambah kas untuk wilayah RW Anda.",
      });
      return;
    }

    let tanggalParsed = new Date();
    if (tanggal) {
      const testDate = new Date(tanggal);
      if (Number.isNaN(testDate.getTime())) {
        res.status(400).json({
          success: false,
          message: "Format tanggal tidak valid.",
        });
        return;
      }
      tanggalParsed = testDate;
    }

    const bukti_foto_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    const kas = await prisma.kasRW.create({
      data: {
        wilayah_rw_id,
        jenis_transaksi,
        tanggal: tanggalParsed,
        keterangan,
        nominal: new Prisma.Decimal(nominalKas),
        bukti_url,
        bukti_foto_url,
        kode_unik: await generateKodeUnik(prisma, "KAS"),
      },
      select: {
        id: true,
        wilayah_rw_id: true,
        jenis_transaksi: true,
        tanggal: true,
        keterangan: true,
        nominal: true,
        bukti_url: true,
        bukti_foto_url: true,
        kode_unik: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Data kas RW berhasil ditambahkan.",
      data: kas,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menambahkan kas RW.",
    });
  }
};

export const getKasRW = async (req: Request, res: Response): Promise<void> => {
  try {
    const { wilayah_rw_id, jenis_transaksi, search } = req.query as GetKasRWQuery;

    if (!wilayah_rw_id) {
      res.status(400).json({
        success: false,
        message: "wilayah_rw_id wajib diisi pada query parameter.",
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

    const wilayah = await prisma.wilayahRW.findUnique({
      where: { id: wilayah_rw_id },
      select: { id: true, user_id: true },
    });

    if (!wilayah) {
      res.status(404).json({
        success: false,
        message: "Wilayah RW tidak ditemukan.",
      });
      return;
    }

    if (wilayah.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda hanya dapat melihat kas di wilayah RW Anda.",
      });
      return;
    }

    const normalizedSearch = search?.trim();

    const kasList = await prisma.kasRW.findMany({
      where: {
        wilayah_rw_id,
        ...(jenis_transaksi
          ? {
              jenis_transaksi,
            }
          : {}),
        ...(normalizedSearch
          ? {
              OR: [
                {
                  keterangan: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
                {
                  kode_unik: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        wilayah_rw_id: true,
        jenis_transaksi: true,
        tanggal: true,
        keterangan: true,
        nominal: true,
        bukti_url: true,
        bukti_foto_url: true,
        kode_unik: true,
      },
      orderBy: [{ tanggal: "desc" }, { id: "desc" }],
    });

    const summary = kasList.reduce(
      (acc, item) => {
        const nominal = Number(item.nominal);
        if (item.jenis_transaksi === JenisTransaksi.MASUK) {
          acc.total_masuk += nominal;
        } else {
          acc.total_keluar += nominal;
        }

        return acc;
      },
      {
        total_masuk: 0,
        total_keluar: 0,
      }
    );

    res.status(200).json({
      success: true,
      message: "Data kas RW berhasil diambil.",
      data: {
        wilayah_rw_id,
        items: kasList,
        summary: {
          total_masuk: summary.total_masuk,
          total_keluar: summary.total_keluar,
          saldo: summary.total_masuk - summary.total_keluar,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data kas RW.",
    });
  }
};

export const updateKasRW = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kas_id } = req.params as KasIdParams;
    const { jenis_transaksi, tanggal, keterangan, nominal, bukti_url } =
      req.body as UpdateKasRWBody;

    if (!kas_id) {
      res.status(400).json({
        success: false,
        message: "kas_id wajib diisi.",
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

    const existingKas = await prisma.kasRW.findUnique({
      where: { id: kas_id },
      select: {
        id: true,
        wilayah_rw: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!existingKas) {
      res.status(404).json({
        success: false,
        message: "Data kas RW tidak ditemukan.",
      });
      return;
    }

    if (existingKas.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda hanya dapat mengubah kas di wilayah RW Anda.",
      });
      return;
    }

    if (
      jenis_transaksi === undefined &&
      tanggal === undefined &&
      keterangan === undefined &&
      nominal === undefined &&
      bukti_url === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "Minimal satu field harus dikirim untuk update.",
      });
      return;
    }

    const dataToUpdate: {
      jenis_transaksi?: JenisTransaksi;
      tanggal?: Date;
      keterangan?: string;
      nominal?: Prisma.Decimal;
      bukti_url?: string | null;
      bukti_foto_url?: string | null;
    } = {};

    if (jenis_transaksi !== undefined) {
      if (
        jenis_transaksi !== JenisTransaksi.MASUK &&
        jenis_transaksi !== JenisTransaksi.KELUAR
      ) {
        res.status(400).json({
          success: false,
          message: "jenis_transaksi hanya boleh MASUK atau KELUAR.",
        });
        return;
      }
      dataToUpdate.jenis_transaksi = jenis_transaksi;
    }

    if (tanggal !== undefined) {
      const testDate = new Date(tanggal);
      if (Number.isNaN(testDate.getTime())) {
        res.status(400).json({
          success: false,
          message: "Format tanggal tidak valid.",
        });
        return;
      }
      dataToUpdate.tanggal = testDate;
    }

    if (keterangan !== undefined) {
      dataToUpdate.keterangan = keterangan.trim();
    }

    if (nominal !== undefined) {
      const parsedNominal = parsePositiveNumber(nominal);
      if (parsedNominal === null) {
        res.status(400).json({
          success: false,
          message: "nominal harus berupa angka lebih dari 0.",
        });
        return;
      }
      dataToUpdate.nominal = new Prisma.Decimal(parsedNominal);
    }

    // Evidence logic: photo overrides link
    if (req.file) {
      dataToUpdate.bukti_foto_url = `/uploads/${req.file.filename}`;
      dataToUpdate.bukti_url = null; // Clear link if photo is uploaded
    } else if (bukti_url !== undefined) {
      dataToUpdate.bukti_url = bukti_url.trim() || null;
      if (dataToUpdate.bukti_url) {
        dataToUpdate.bukti_foto_url = null; // Clear photo path if link is provided
      }
    }

    const updatedKas = await prisma.kasRW.update({
      where: { id: kas_id },
      data: dataToUpdate,
      select: {
        id: true,
        wilayah_rw_id: true,
        jenis_transaksi: true,
        tanggal: true,
        keterangan: true,
        nominal: true,
        bukti_url: true,
        bukti_foto_url: true,
        kode_unik: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Data kas RW berhasil diperbarui.",
      data: updatedKas,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memperbarui kas RW.",
    });
  }
};

export const deleteKasRW = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kas_id } = req.params as KasIdParams;

    if (!kas_id) {
      res.status(400).json({
        success: false,
        message: "kas_id wajib diisi.",
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

    const existingKas = await prisma.kasRW.findUnique({
      where: { id: kas_id },
      select: {
        id: true,
        wilayah_rw: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!existingKas) {
      res.status(404).json({
        success: false,
        message: "Data kas RW tidak ditemukan.",
      });
      return;
    }

    if (existingKas.wilayah_rw.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda hanya dapat menghapus kas di wilayah RW Anda.",
      });
      return;
    }

    const deletedKas = await prisma.kasRW.delete({
      where: { id: kas_id },
      select: {
        id: true,
        kode_unik: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Data kas RW berhasil dihapus.",
      data: deletedKas,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus kas RW.",
    });
  }
};

export const getBlokWilayah = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const rwWilayah = await prisma.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: {
        id: true,
        nama_kompleks: true,
        no_rw: true,
        blok_wilayah: {
          select: {
            id: true,
            nama_blok: true,
            no_rt: true,
          },
          orderBy: { nama_blok: "asc" },
        },
      },
    });

    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Data blok wilayah berhasil diambil.",
      data: {
        wilayah_rw: {
          id: rwWilayah.id,
          nama_kompleks: rwWilayah.nama_kompleks,
          no_rw: rwWilayah.no_rw,
        },
        blok_list: rwWilayah.blok_wilayah,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data blok wilayah.",
    });
  }
};
