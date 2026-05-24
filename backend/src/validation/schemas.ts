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
    no_rw: z.string().trim().max(10).optional(),
  })
  .strict()
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
    if (value.role === "RW" && !value.no_rw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["no_rw"],
        message: "no_rw wajib diisi untuk role RW.",
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  role: z.enum(["RW", "RT", "PENGURUS_MASJID"]).optional(),
}).strict();

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
  no_kk: z.string().trim().regex(/^\d{16}$/, { message: "Harus berupa 16 digit angka" }).optional(),
  nik: z.string().trim().regex(/^\d{16}$/, { message: "Harus berupa 16 digit angka" }).optional(),
  tanggal_terbit_kk: z.string().datetime().optional(),
  tanggal_lahir: z.string().datetime().optional(),
  pendidikan: z.enum(["TK", "SD", "SMP", "SMA", "DIPLOMA", "SARJANA", "LAINNYA"]).optional(),
  pekerjaan: z.string().trim().max(100).optional(),
  status_keluarga: z.enum(["MAMPU", "KURANG_MAMPU", "LANSIA"]).optional(),
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

export const createRtWargaSchema = z.object({
  nama_kk: z.string().trim().min(2).max(150),
  no_kk: z.string().trim().regex(/^\d{16}$/, { message: "Harus berupa 16 digit angka" }).optional(),
  nik: z.string().trim().regex(/^\d{16}$/, { message: "Harus berupa 16 digit angka" }).optional(),
  tanggal_terbit_kk: z.string().datetime().optional(),
  tanggal_lahir: z.string().datetime().optional(),
  pendidikan: z.enum(["TK", "SD", "SMP", "SMA", "DIPLOMA", "SARJANA", "LAINNYA"]).optional(),
  pekerjaan: z.string().trim().max(100).optional(),
  status_keluarga: z.enum(["MAMPU", "KURANG_MAMPU", "LANSIA"]).optional(),
});

export const updateRtWargaSchema = z
  .object({
    nama_kk: z.string().trim().min(2).max(150).optional(),
    no_kk: z.string().trim().regex(/^\d{16}$/, { message: "Harus berupa 16 digit angka" }).optional(),
    nik: z.string().trim().regex(/^\d{16}$/, { message: "Harus berupa 16 digit angka" }).optional(),
    tanggal_terbit_kk: z.string().datetime().optional(),
    tanggal_lahir: z.string().datetime().optional(),
    pendidikan: z.enum(["TK", "SD", "SMP", "SMA", "DIPLOMA", "SARJANA", "LAINNYA"]).optional(),
    pekerjaan: z.string().trim().max(100).optional(),
    status_keluarga: z.enum(["MAMPU", "KURANG_MAMPU", "LANSIA"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

export const rtWargaParamsSchema = z.object({
  warga_id: uuidSchema,
});

export const createRtPerformaRondaSchema = z.object({
  tanggal: z.string().datetime(),
  nama_petugas: z.string().trim().min(2).max(150),
  status_kehadiran: z.enum(["HADIR", "LIBUR", "IZIN", "ALFA"]),
  catatan: z.string().trim().max(500).optional(),
});

export const getRtPerformaRondaQuerySchema = z.object({
  tanggal_mulai: z.string().datetime().optional(),
  tanggal_akhir: z.string().datetime().optional(),
});

export const updateRtPerformaRondaSchema = z
  .object({
    nama_petugas: z.string().trim().min(2).max(150).optional(),
    status_kehadiran: z.enum(["HADIR", "LIBUR", "IZIN", "ALFA"]).optional(),
    catatan: z.string().trim().max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

export const rtPerformaRondaParamsSchema = z.object({
  performa_id: uuidSchema,
});

export const createRtLaporanInsidenSchema = z.object({
  tipe_insiden: z.string().trim().min(2).max(100),
  tanggal_insiden: z.string().datetime(),
  lokasi: z.string().trim().min(3).max(500),
  deskripsi: z.string().trim().min(5).max(5000),
  pelapor_nama: z.string().trim().min(2).max(150),
  pelapor_no_hp: z.string().trim().min(8).max(20).optional(),
  urgensi: z.enum(["RENDAH", "SEDANG", "TINGGI"]).default("RENDAH"),
});

export const getRtLaporanInsidenQuerySchema = z.object({
  status: z.enum(["LAPORAN", "PROSES", "SELESAI", "DITUTUP"]).optional(),
  tanggal_mulai: z.string().datetime().optional(),
  tanggal_akhir: z.string().datetime().optional(),
});

export const updateRtLaporanInsidenSchema = z
  .object({
    tipe_insiden: z.string().trim().min(2).max(100).optional(),
    tanggal_insiden: z.string().datetime().optional(),
    lokasi: z.string().trim().min(3).max(500).optional(),
    deskripsi: z.string().trim().min(5).max(5000).optional(),
    status: z.enum(["LAPORAN", "PROSES", "SELESAI", "DITUTUP"]).optional(),
    tindakan_diambil: z.string().trim().max(1000).optional(),
    urgensi: z.enum(["RENDAH", "SEDANG", "TINGGI"]).optional(),
    pelapor_nama: z.string().trim().min(2).max(150).optional(),
    pelapor_no_hp: z.string().trim().min(8).max(20).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

export const rtLaporanInsidenParamsSchema = z.object({
  laporan_id: uuidSchema,
});

export const getRtAuditLogQuerySchema = z.object({
  aksi: z.enum(["CREATE", "UPDATE", "DELETE", "LOGIN", "APPROVE", "REJECT"]).optional(),
  tanggal_mulai: z.string().datetime().optional(),
  tanggal_akhir: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
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

export const updateWargaSchema = z.object({
  nama_kk: z.string().min(1, "Nama KK tidak boleh kosong").optional(),
  no_kk: z.string().trim().regex(/^\d{16}$/, { message: "Harus berupa 16 digit angka" }).optional(),
  nik: z.string().trim().regex(/^\d{16}$/, { message: "Harus berupa 16 digit angka" }).optional(),
  tanggal_terbit_kk: z.string().datetime().optional(),
  tanggal_lahir: z.string().datetime().optional(),
  pendidikan: z.enum(["TK", "SD", "SMP", "SMA", "DIPLOMA", "SARJANA", "LAINNYA"]).optional(),
  pekerjaan: z.string().trim().max(100).optional(),
  status_keluarga: z.enum(["MAMPU", "KURANG_MAMPU", "LANSIA"]).optional(),
}).refine((value) => Object.keys(value).length > 0, {
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
  bukti_url: z.string().trim().max(2048).nullable().optional(),
  bukti_foto_url: z.string().trim().optional(),
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
    bukti_url: z.string().trim().max(2048).nullable().optional(),
    bukti_foto_url: z.string().trim().optional(),
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
  bukti_url: z.string().trim().max(2048).nullable().optional(),
  bukti_foto_url: z.string().trim().optional(),
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
    bukti_url: z.string().trim().max(2048).nullable().optional(),
    bukti_foto_url: z.string().trim().optional(),
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
  jenis_zakat: z.enum(["FITRAH", "MAAL"]).optional(),
  // For MAAL: nilai_harta (total asset value) and optional nominal_zakat (if admin calculates externally)
  nilai_harta: z.coerce.number().min(0).optional(),
  nominal_zakat: z.coerce.number().min(0).optional(),
  total_beras_kg: z.coerce.number().min(0).optional(),
  nominal_infaq: z.coerce.number().min(0).optional(),
  waktu_transaksi: z.string().datetime({ offset: true }).optional(),
});

export const getDashboardZisQuerySchema = z.object({
  masjid_id: uuidSchema.optional(),
  tahun: z.coerce.number().int().min(2000).max(3000).optional(),
});

export const getRecentTransaksiZisQuerySchema = z.object({
  masjid_id: uuidSchema.optional(),
});

export const getTransaksiZisListQuerySchema = z.object({
  masjid_id: uuidSchema.optional(),
  search: z.string().trim().optional(),
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
  jenis_zakat: z.enum(["FITRAH", "MAAL"]).optional(),
  nilai_harta: z.coerce.number().min(0).optional(),
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

  // ==================== ANGGOTA KELUARGA ====================
  export const createAnggotaKeluargaSchema = z.object({
    warga_id: uuidSchema,
    nama: z.string().trim().min(2).max(150),
    hubungan: z.enum(["SUAMI", "ISTRI", "ANAK", "ORANG_TUA", "SAUDARA", "LAINNYA"]),
    nik: z.string().trim().regex(/^\d{16}$/).optional(),
    tanggal_lahir: z.string().datetime().optional(),
    pendidikan: z.enum(["TK", "SD", "SMP", "SMA", "DIPLOMA", "SARJANA", "LAINNYA"]).optional(),
    pekerjaan: z.string().trim().max(100).optional(),
  });

  export const updateAnggotaKeluargaSchema = z.object({
    nama: z.string().trim().min(2).max(150).optional(),
    hubungan: z.enum(["SUAMI", "ISTRI", "ANAK", "ORANG_TUA", "SAUDARA", "LAINNYA"]).optional(),
    nik: z.string().trim().regex(/^\d{16}$/).optional(),
    tanggal_lahir: z.string().datetime().optional(),
    pendidikan: z.enum(["TK", "SD", "SMP", "SMA", "DIPLOMA", "SARJANA", "LAINNYA"]).optional(),
    pekerjaan: z.string().trim().max(100).optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

  export const anggotaKeluargaParamsSchema = z.object({
    anggota_id: uuidSchema,
  });

  // ==================== IDENTITAS WARGA ====================
  export const createIdentitasWargaSchema = z.object({
    warga_id: uuidSchema,
    tipe_dokumen: z.enum(["KTP", "PASPORT", "SIM"]),
    nomor_dokumen: z.string().trim().min(1).max(50),
    tanggal_terbit: z.string().datetime().optional(),
    tanggal_berlaku: z.string().datetime().optional(),
  });

  export const updateIdentitasWargaSchema = z.object({
    tipe_dokumen: z.enum(["KTP", "PASPORT", "SIM"]).optional(),
    nomor_dokumen: z.string().trim().min(1).max(50).optional(),
    tanggal_terbit: z.string().datetime().optional(),
    tanggal_berlaku: z.string().datetime().optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

  export const identitasWargaParamsSchema = z.object({
    identitas_id: uuidSchema,
  });

  // ==================== CICILAN IURAN ====================
  export const createCicilanIuranSchema = z.object({
    iuran_id: uuidSchema,
    jumlah_bulan: z.coerce.number().int().positive(),
    bulan_mulai: z.coerce.number().int().min(1).max(12),
    tahun_mulai: z.coerce.number().int().min(2000).max(3000),
    tambahan_nominal: z.coerce.number().min(0).optional(),
  });

  export const updateCicilanIuranSchema = z
    .object({
      jumlah_bulan: z.coerce.number().int().positive().optional(),
      bulan_mulai: z.coerce.number().int().min(1).max(12).optional(),
      tahun_mulai: z.coerce.number().int().min(2000).max(3000).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "Minimal satu field harus dikirim untuk update cicilan.",
    });

  export const getCicilanIuranQuerySchema = z.object({
    warga_id: uuidSchema.optional(),
    iuran_id: uuidSchema.optional(),
  });

  export const cicilanIuranParamsSchema = z.object({
    cicilan_id: uuidSchema,
  });

  // ==================== PERFORMA RONDA ====================
  export const createPerformaRondaSchema = z.object({
    blok_wilayah_id: uuidSchema,
    tanggal: z.string().datetime(),
    nama_petugas: z.string().trim().min(2).max(150),
    status_kehadiran: z.enum(["HADIR", "LIBUR", "IZIN", "ALFA"]),
    catatan: z.string().trim().max(500).optional(),
  });

  export const getPerformaRondaQuerySchema = z.object({
    blok_wilayah_id: uuidSchema,
    tanggal_mulai: z.string().datetime().optional(),
    tanggal_akhir: z.string().datetime().optional(),
  });

  export const updatePerformaRondaSchema = z.object({
    nama_petugas: z.string().trim().min(2).max(150).optional(),
    status_kehadiran: z.enum(["HADIR", "LIBUR", "IZIN", "ALFA"]).optional(),
    catatan: z.string().trim().max(500).optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

  export const performaRondaParamsSchema = z.object({
    performa_id: uuidSchema,
  });

  // ==================== LAPORAN INSIDEN ====================
  export const createLaporanInsidenSchema = z.object({
    tipe_insiden: z.string().trim().min(2).max(100),
    tanggal_insiden: z.string().datetime(),
    lokasi: z.string().trim().min(3).max(500),
    deskripsi: z.string().trim().min(5).max(5000),
    pelapor_nama: z.string().trim().min(2).max(150),
    pelapor_no_hp: z.string().trim().min(8).max(20).optional(),
    urgensi: z.enum(["RENDAH", "SEDANG", "TINGGI"]).default("RENDAH"),
  });

  export const getLaporanInsidenQuerySchema = z.object({
    status: z.enum(["LAPORAN", "PROSES", "SELESAI", "DITUTUP"]).optional(),
    tanggal_mulai: z.string().datetime().optional(),
    tanggal_akhir: z.string().datetime().optional(),
  });

  export const updateLaporanInsidenSchema = z.object({
    tipe_insiden: z.string().trim().min(2).max(100).optional(),
    tanggal_insiden: z.string().datetime().optional(),
    lokasi: z.string().trim().min(3).max(500).optional(),
    deskripsi: z.string().trim().min(5).max(5000).optional(),
    status: z.enum(["LAPORAN", "PROSES", "SELESAI", "DITUTUP"]).optional(),
    tindakan_diambil: z.string().trim().max(1000).optional(),
    urgensi: z.enum(["RENDAH", "SEDANG", "TINGGI"]).optional(),
    pelapor_nama: z.string().trim().min(2).max(150).optional(),
    pelapor_no_hp: z.string().trim().min(8).max(20).optional().nullable(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

  export const laporanInsidenParamsSchema = z.object({
    laporan_id: uuidSchema,
  });

  // ==================== AUDIT LOG ====================
  export const getAuditLogQuerySchema = z.object({
    user_id: uuidSchema.optional(),
    aksi: z.enum(["CREATE", "UPDATE", "DELETE", "LOGIN", "APPROVE", "REJECT"]).optional(),
    tanggal_mulai: z.string().datetime().optional(),
    tanggal_akhir: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  });

  export const auditLogParamsSchema = z.object({
    log_id: uuidSchema,
  });

  // ==================== USER PREFERENCE ====================
  export const updateUserPreferenceSchema = z.object({
    dark_mode: z.boolean().optional(),
    tema_warna: z.enum(["blue", "red", "green", "purple", "orange"]).optional(),
    bahasa: z.enum(["id", "en"]).optional(),
    notifikasi_email: z.boolean().optional(),
    notifikasi_sms: z.boolean().optional(),
    notifikasi_push: z.boolean().optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

  // ==================== BLOK WILAYAH ====================
  export const createBlokWilayahSchema = z.object({
    wilayah_rw_id: uuidSchema,
    nama_blok: z.string().trim().min(2).max(100),
    no_rt: z.string().trim().min(1).max(10).optional(),
  });

  export const updateBlokWilayahSchema = z.object({
    nama_blok: z.string().trim().min(2).max(100).optional(),
    no_rt: z.string().trim().min(1).max(10).optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

  export const blokWilayahParamsSchema = z.object({
    blok_id: uuidSchema,
  });

  export const getBlokWilayahQuerySchema = z.object({
    wilayah_rw_id: uuidSchema,
  });

  // ==================== MASJID (EXTENDED CRUD) ====================
  export const createMasjidSchema = z.object({
    wilayah_rw_id: uuidSchema,
    nama_masjid: z.string().trim().min(2).max(200),
    alamat: z.string().trim().min(3).max(1000),
    no_telepon: z.string().trim().min(8).max(20).optional(),
    ketua_masjid: z.string().trim().min(2).max(150),
    tahun_berdiri: z.coerce.number().int().min(1900).max(3000).optional(),
  });

  export const updateMasjidSchema = z.object({
    nama_masjid: z.string().trim().min(2).max(200).optional(),
    alamat: z.string().trim().min(3).max(1000).optional(),
    no_telepon: z.string().trim().min(8).max(20).optional(),
    ketua_masjid: z.string().trim().min(2).max(150).optional(),
    tahun_berdiri: z.coerce.number().int().min(1900).max(3000).optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus dikirim untuk update.",
  });

  export const masjidParamsSchema = z.object({
    masjid_id: uuidSchema,
  });

  export const getMasjidListQuerySchema = z.object({
    wilayah_rw_id: uuidSchema,
  });

// ==================== PENGATURAN IURAN RW ====================
export const pengaturanIuranRWSchema = z.object({
  nominal_iuran: z.coerce.number().positive(),
  nominal_iuran_kurang_mampu: z.coerce.number().min(0),
  nominal_iuran_lansia: z.coerce.number().min(0),
  persen_rt: z.coerce.number().min(0).max(100).optional(),
  persen_rw: z.coerce.number().min(0).max(100).optional(),
}).refine((data) => {
  const rt = data.persen_rt ?? 70.0;
  const rw = data.persen_rw ?? 30.0;
  return rt + rw === 100;
}, {
  message: "Total persen RT dan RW harus 100%",
});

// ==================== KAS RT ====================
export const createKasRTSchema = z.object({
  jenis_transaksi: z.enum(["MASUK", "KELUAR"]),
  keterangan: z.string().trim().min(1).max(5000),
  nominal: z.coerce.number().positive(),
  tanggal: z.string().datetime().optional(),
  bukti_url: z.string().trim().max(2048).nullable().optional(),
  bukti_foto_url: z.string().trim().optional(),
});

export const updateKasRTSchema = z.object({
  jenis_transaksi: z.enum(["MASUK", "KELUAR"]).optional(),
  keterangan: z.string().trim().min(1).max(5000).optional(),
  nominal: z.coerce.number().positive().optional(),
  tanggal: z.string().datetime().optional(),
  bukti_url: z.string().trim().max(2048).nullable().optional(),
  bukti_foto_url: z.string().trim().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "Minimal satu field harus dikirim untuk update.",
});

// ==================== SETORAN IURAN RT ====================
export const approveSetoranSchema = z.object({
  status: z.enum(["TERKONFIRMASI", "REJECTED"]),
  keterangan_rw: z.string().trim().max(1000).optional(),
});

