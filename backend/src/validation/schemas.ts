import { z } from "zod";

const uuidSchema = z.string().uuid();

export const registerSchema = z
  .object({
    nama: z.string().trim().min(3).max(120),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(128),
    no_hp: z.string().trim().min(8).max(20),
    role: z.enum(["RW", "RT", "PENGURUS_MASJID"]),
    blok_wilayah_id: uuidSchema.optional(),
    masjid_id: uuidSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "PENGURUS_MASJID" && !value.masjid_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["masjid_id"],
        message: "masjid_id wajib diisi untuk role PENGURUS_MASJID.",
      });
    }
    if (value.role === "RT" && !value.blok_wilayah_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blok_wilayah_id"],
        message: "blok_wilayah_id wajib diisi untuk role RT.",
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
  role: z.enum(["RW", "RT", "PENGURUS_MASJID"]).optional(),
});

export const approveRegistrationSchema = z
  .object({
    user_id: uuidSchema,
    status_akun: z.enum(["APPROVED", "REJECTED"]),
    alasan_penolakan: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status_akun === "REJECTED" && !value.alasan_penolakan) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alasan_penolakan"],
        message: "alasan_penolakan wajib diisi saat menolak pendaftaran.",
      });
    }
  });

export const listPendingRegistrationsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  role: z.enum(["RW", "RT"]).optional(),
});

export const approvePengurusSchema = z
  .object({
    user_id: uuidSchema,
    status_akun: z.enum(["APPROVED", "REJECTED"]),
    alasan_penolakan: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status_akun === "REJECTED" && !value.alasan_penolakan) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alasan_penolakan"],
        message: "alasan_penolakan wajib diisi saat menolak pengurus.",
      });
    }
  });

export const listPendingPengurusQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
});

export const createWargaSchema = z.object({
  blok_wilayah_id: uuidSchema,
  nama_kk: z.string().trim().min(2).max(150),
  tarif_iuran_bulanan: z.coerce.number().positive(),
});

export const getIuranWargaQuerySchema = z.object({
  blok_wilayah_id: uuidSchema,
  tahun: z.coerce.number().int().min(2000).max(3000).optional(),
  bulan: z.coerce.number().int().min(1).max(12).optional(),
  status: z.enum(["BELUM", "LUNAS"]).optional(),
});

export const getIuranRtQuerySchema = z.object({
  tahun: z.coerce.number().int().min(2000).max(3000).optional(),
  bulan: z.coerce.number().int().min(1).max(12).optional(),
  status: z.enum(["BELUM", "LUNAS"]).optional(),
});

export const getWargaListQuerySchema = z.object({
  blok_wilayah_id: uuidSchema.optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export const getRwMasjidListQuerySchema = z.object({
  blok_wilayah_id: uuidSchema.optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export const createRwMasjidSchema = z.object({
  blok_wilayah_id: uuidSchema,
  nama_masjid: z.string().trim().min(2).max(200),
  alamat: z.string().trim().min(3).max(1000),
});

export const rwMasjidParamsSchema = z.object({
  masjid_id: uuidSchema,
});

export const updateRwMasjidSchema = z
  .object({
    blok_wilayah_id: uuidSchema.optional(),
    nama_masjid: z.string().trim().min(2).max(200).optional(),
    alamat: z.string().trim().min(3).max(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update masjid.",
  });

export const wargaParamsSchema = z.object({
  warga_id: uuidSchema,
});

export const updateWargaSchema = z
  .object({
    nama_kk: z.string().trim().min(2).max(150).optional(),
    tarif_iuran_bulanan: z.coerce.number().positive().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update warga.",
  });

export const bayarIuranSchema = z.object({
  iuran_id: uuidSchema,
});

export const createKasRWSchema = z.object({
  wilayah_rw_id: uuidSchema,
  jenis_transaksi: z.enum(["MASUK", "KELUAR"]),
  tanggal: z.string().datetime().optional(),
  keterangan: z.string().trim().min(1).max(5000),
  nominal: z.coerce.number().positive(),
  bukti_url: z.string().trim().url().optional(),
});

export const getKasRWQuerySchema = z.object({
  wilayah_rw_id: uuidSchema,
  jenis_transaksi: z.enum(["MASUK", "KELUAR"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export const kasRWParamsSchema = z.object({
  kas_id: uuidSchema,
});

export const updateKasRWSchema = z
  .object({
    jenis_transaksi: z.enum(["MASUK", "KELUAR"]).optional(),
    tanggal: z.string().datetime().optional(),
    keterangan: z.string().trim().min(1).max(5000).optional(),
    nominal: z.coerce.number().positive().optional(),
    bukti_url: z.string().trim().url().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

export const createKasMasjidSchema = z.object({
  masjid_id: uuidSchema,
  jenis_transaksi: z.enum(["MASUK", "KELUAR"]),
  tanggal: z.string().datetime().optional(),
  keterangan: z.string().trim().min(1).max(5000),
  nominal: z.coerce.number().positive(),
  bukti_url: z.string().trim().url().optional(),
});

export const getKasMasjidQuerySchema = z.object({
  masjid_id: uuidSchema.optional(),
  jenis_transaksi: z.enum(["MASUK", "KELUAR"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const kasMasjidParamsSchema = z.object({
  kas_id: uuidSchema,
});

export const updateKasMasjidSchema = z
  .object({
    jenis_transaksi: z.enum(["MASUK", "KELUAR"]).optional(),
    tanggal: z.string().datetime().optional(),
    keterangan: z.string().trim().min(1).max(5000).optional(),
    nominal: z.coerce.number().positive().optional(),
    bukti_url: z.string().trim().url().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

export const reportRwQuerySchema = z.object({
  wilayah_rw_id: uuidSchema.optional(),
  tahun: z.coerce.number().int().min(2000).max(3000).optional(),
  bulan: z.coerce.number().int().min(1).max(12).optional(),
});

export const reportMasjidQuerySchema = z.object({
  masjid_id: uuidSchema.optional(),
  tahun: z.coerce.number().int().min(2000).max(3000).optional(),
  bulan: z.coerce.number().int().min(1).max(12).optional(),
});

export const exportReportQuerySchema = z.object({
  wilayah_rw_id: uuidSchema.optional(),
  masjid_id: uuidSchema.optional(),
  tahun: z.coerce.number().int().min(2000).max(3000).optional(),
  bulan: z.coerce.number().int().min(1).max(12).optional(),
  format: z.enum(["PDF", "XLSX"]).optional(),
});

export const createShareLinkSchema = z.object({
  expires_in_days: z.coerce.number().int().min(1).max(365).optional(),
});

export const shareLinkTokenParamsSchema = z.object({
  token: z.string().trim().min(8).max(200),
});

export const createTransaksiZisSchema = z.object({
  masjid_id: uuidSchema,
  nama_kk: z.string().trim().min(2).max(150),
  alamat_muzaqi: z.string().trim().min(3).max(1000),
  jumlah_jiwa: z.coerce.number().int().positive(),
  jenis_bayar: z.enum(["UANG", "BERAS"]),
  nominal_infaq: z.coerce.number().min(0).optional(),
  waktu_transaksi: z.string().datetime({ offset: true }).optional(),
});

export const getDashboardZisQuerySchema = z.object({
  masjid_id: uuidSchema.optional(),
});

export const getRecentTransaksiZisQuerySchema = z.object({
  masjid_id: uuidSchema.optional(),
});

export const getTransaksiZisListQuerySchema = z.object({
  masjid_id: uuidSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const transaksiZisParamsSchema = z.object({
  transaksi_id: uuidSchema,
});

export const updateTransaksiZisSchema = z.object({
  nama_kk: z.string().trim().min(2).max(150).optional(),
  alamat_muzaqi: z.string().trim().min(3).max(1000).optional(),
  jumlah_jiwa: z.coerce.number().int().positive().optional(),
  jenis_bayar: z.enum(["UANG", "BERAS"]).optional(),
  nominal_zakat: z.coerce.number().min(0).optional(),
  nominal_infaq: z.coerce.number().min(0).optional(),
  total_beras_kg: z.coerce.number().min(0).optional(),
});

export const exportZisQuerySchema = z.object({
  masjid_id: uuidSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  format: z.enum(["PDF", "XLSX"]).optional(),
});

export const masjidListQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
});

export const cekKodeUnikParamsSchema = z.object({
  kode_unik: z.string().trim().min(1).max(100),
});

export const cekKodeUnikQuerySchema = z.object({
  scope: z.enum(["RW", "MASJID"]).optional(),
});
