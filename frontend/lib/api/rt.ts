import { api } from "@/lib/axios";

export type RtStatusKehadiran = "HADIR" | "LIBUR" | "IZIN" | "ALFA";
export type RtStatusInsiden = "LAPORAN" | "PROSES" | "SELESAI" | "DITUTUP";

export interface RtWargaRecord {
  id: string;
  nama_kk: string;
  blok_wilayah_id?: string;
  no_kk?: string | null;
  nik?: string | null;
  tanggal_terbit_kk?: string | null;
  tanggal_lahir?: string | null;
  pendidikan?: string | null;
  pekerjaan?: string | null;
  status_keluarga?: "MAMPU" | "KURANG_MAMPU" | "LANSIA";
  blok_wilayah?: {
    nama_blok: string;
    no_rt: string | null;
  } | null;
}

export interface RtAnggotaKeluargaRecord {
  id: string;
  warga_id: string;
  nama: string;
  hubungan: string;
  nik?: string | null;
  tanggal_lahir?: string | null;
  pendidikan?: string | null;
  pekerjaan?: string | null;
}

export interface RtIdentitasWargaRecord {
  id: string;
  warga_id: string;
  tipe_dokumen: string;
  nomor_dokumen?: string | null;
  tanggal_terbit?: string | null;
  tanggal_berlaku?: string | null;
  dokumen_url?: string | null;
  verified_at?: string | null;
}

export interface RtPerformaRecord {
  id: string;
  tanggal: string;
  nama_petugas: string;
  status_kehadiran: RtStatusKehadiran;
  catatan: string | null;
  created_at: string;
}

export interface RtInsidenRecord {
  id: string;
  tipe_insiden: string;
  tanggal_insiden: string;
  lokasi: string;
  deskripsi: string;
  pelapor_nama: string;
  pelapor_no_hp: string | null;
  status: RtStatusInsiden;
  created_at: string;
  tindakan_diambil?: string | null;
  foto_bukti_url?: string | null;
  urgensi: "RENDAH" | "SEDANG" | "TINGGI";
}

export interface RtRondaPetugas {
  id: string;
  jadwal_ronda_id: string;
  nama_petugas: string;
  no_hp: string | null;
  catatan: string | null;
}

export interface RtJadwalRonda {
  id: string;
  nama_jadwal: string;
  hari_minggu: number;
  jam_mulai: string;
  jam_selesai: string;
  minggu_mulai: string;
  minggu_selesai: string | null;
  catatan: string | null;
  petugas?: RtRondaPetugas[];
}

export interface RtPresensiRonda {
  id: string;
  jadwal_ronda_id: string;
  tanggal: string;
  nama_petugas: string;
  status_hadir: RtStatusKehadiran;
  catatan: string | null;
}

export const rtClient = {
  async listWarga(): Promise<RtWargaRecord[]> {
    const res = await api.get<{ data: RtWargaRecord[] }>("/rt/warga");
    return res.data.data ?? [];
  },

  async createWarga(payload: { nama_kk: string; no_kk?: string; nik?: string; tanggal_terbit_kk?: string; tanggal_lahir?: string; pendidikan?: string; pekerjaan?: string; status_keluarga?: "MAMPU" | "KURANG_MAMPU" | "LANSIA" }): Promise<RtWargaRecord> {
    const res = await api.post<{ data: RtWargaRecord }>("/rt/warga", payload);
    return res.data.data;
  },

  async listPerforma(params?: { tanggal_mulai?: string; tanggal_akhir?: string }): Promise<RtPerformaRecord[]> {
    const res = await api.get<{ data: RtPerformaRecord[] }>("/rt/performa-ronda", { params });
    return res.data.data ?? [];
  },

  async createPerforma(payload: {
    tanggal: string;
    nama_petugas: string;
    status_kehadiran: RtStatusKehadiran;
    catatan?: string;
  }): Promise<RtPerformaRecord> {
    const res = await api.post<{ data: RtPerformaRecord }>("/rt/performa-ronda", payload);
    return res.data.data;
  },

  async updatePerforma(performa_id: string, payload: Partial<{ nama_petugas: string; status_kehadiran: RtStatusKehadiran; catatan: string }>): Promise<RtPerformaRecord> {
    const res = await api.patch<{ data: RtPerformaRecord }>(`/rt/performa-ronda/${performa_id}`, payload);
    return res.data.data;
  },

  async removePerforma(performa_id: string): Promise<void> {
    await api.delete(`/rt/performa-ronda/${performa_id}`);
  },

  async listInsiden(params?: { status?: RtStatusInsiden }): Promise<RtInsidenRecord[]> {
    const res = await api.get<{ data: RtInsidenRecord[] }>("/rt/laporan-insiden", { params });
    return res.data.data ?? [];
  },

  async createInsiden(payload: {
    tipe_insiden: string;
    tanggal_insiden: string;
    lokasi: string;
    deskripsi: string;
    pelapor_nama: string;
    pelapor_no_hp?: string;
    foto_bukti?: File | null;
    urgensi: "RENDAH" | "SEDANG" | "TINGGI";
  }): Promise<RtInsidenRecord> {
    const formData = new FormData();
    formData.append("tipe_insiden", payload.tipe_insiden);
    formData.append("tanggal_insiden", payload.tanggal_insiden);
    formData.append("lokasi", payload.lokasi);
    formData.append("deskripsi", payload.deskripsi);
    formData.append("pelapor_nama", payload.pelapor_nama);
    if (payload.pelapor_no_hp) formData.append("pelapor_no_hp", payload.pelapor_no_hp);
    if (payload.foto_bukti) formData.append("foto_bukti", payload.foto_bukti);
    formData.append("urgensi", payload.urgensi);

    const res = await api.post<{ data: RtInsidenRecord }>("/rt/laporan-insiden", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  async closeInsiden(laporan_id: string): Promise<RtInsidenRecord> {
    const res = await api.patch<{ data: RtInsidenRecord }>(`/rt/laporan-insiden/${laporan_id}/close`);
    return res.data.data;
  },

  async updateInsiden(
    laporan_id: string,
    payload: Partial<RtInsidenRecord> & { foto_bukti?: File | null }
  ): Promise<RtInsidenRecord> {
    const hasFile = payload.foto_bukti !== undefined;
    const hasFields =
      payload.pelapor_nama !== undefined ||
      payload.pelapor_no_hp !== undefined ||
      payload.tipe_insiden !== undefined ||
      payload.lokasi !== undefined ||
      payload.deskripsi !== undefined ||
      payload.urgensi !== undefined ||
      payload.status !== undefined ||
      payload.tindakan_diambil !== undefined;

    if (hasFile || hasFields) {
      const formData = new FormData();
      if (payload.tipe_insiden !== undefined) formData.append("tipe_insiden", payload.tipe_insiden);
      if (payload.lokasi !== undefined) formData.append("lokasi", payload.lokasi);
      if (payload.deskripsi !== undefined) formData.append("deskripsi", payload.deskripsi);
      if (payload.status !== undefined) formData.append("status", payload.status);
      if (payload.tindakan_diambil !== undefined && payload.tindakan_diambil !== null) {
        formData.append("tindakan_diambil", payload.tindakan_diambil);
      }
      if (payload.urgensi !== undefined) formData.append("urgensi", payload.urgensi);
      if (payload.pelapor_nama !== undefined && payload.pelapor_nama !== null) {
        formData.append("pelapor_nama", payload.pelapor_nama);
      }
      if (payload.pelapor_no_hp !== undefined) {
        formData.append("pelapor_no_hp", payload.pelapor_no_hp || "");
      }
      if (payload.foto_bukti) {
        formData.append("foto_bukti", payload.foto_bukti);
      }

      const res = await api.patch<{ data: RtInsidenRecord }>(`/rt/laporan-insiden/${laporan_id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data;
    }

    const res = await api.patch<{ data: RtInsidenRecord }>(`/rt/laporan-insiden/${laporan_id}`, payload);
    return res.data.data;
  },

  async removeInsiden(laporan_id: string): Promise<void> {
    await api.delete(`/rt/laporan-insiden/${laporan_id}`);
  },

  async deleteWarga(warga_id: string): Promise<void> {
    await api.delete(`/rt/warga/${warga_id}`);
  },

  async updateWarga(warga_id: string, payload: Partial<{ nama_kk: string; no_kk: string; nik: string; tanggal_terbit_kk: string; tanggal_lahir: string; pendidikan: string; pekerjaan: string; status_keluarga: "MAMPU" | "KURANG_MAMPU" | "LANSIA" }>): Promise<RtWargaRecord> {
    const res = await api.patch<{ data: RtWargaRecord }>(`/rt/warga/${warga_id}`, payload);
    return res.data.data;
  },

  async listAnggota(warga_id: string): Promise<RtAnggotaKeluargaRecord[]> {
    const res = await api.get<{ data: RtAnggotaKeluargaRecord[] }>("/rt/anggota-keluarga", {
      params: { warga_id },
    });
    return res.data.data ?? [];
  },

  async createAnggota(payload: {
    warga_id: string;
    nama: string;
    hubungan: string;
    nik?: string;
    tanggal_lahir?: string;
    pendidikan?: string;
    pekerjaan?: string;
  }): Promise<RtAnggotaKeluargaRecord> {
    const res = await api.post<{ data: RtAnggotaKeluargaRecord }>("/rt/anggota-keluarga", payload);
    return res.data.data;
  },

  async updateAnggota(anggota_id: string, payload: Partial<{ nama: string; hubungan: string; nik: string; tanggal_lahir: string; pendidikan: string; pekerjaan: string }>): Promise<RtAnggotaKeluargaRecord> {
    const res = await api.patch<{ data: RtAnggotaKeluargaRecord }>(`/rt/anggota-keluarga/${anggota_id}`, payload);
    return res.data.data;
  },

  async removeAnggota(anggota_id: string): Promise<void> {
    await api.delete(`/rt/anggota-keluarga/${anggota_id}`);
  },

  async listIdentitas(warga_id: string): Promise<RtIdentitasWargaRecord[]> {
    const res = await api.get<{ data: RtIdentitasWargaRecord[] }>("/rt/identitas-warga", {
      params: { warga_id },
    });
    return res.data.data ?? [];
  },

  async removeIdentitas(identitas_id: string): Promise<void> {
    await api.delete(`/rt/identitas-warga/${identitas_id}`);
  },

  async listJadwalRonda(): Promise<RtJadwalRonda[]> {
    const res = await api.get<{ data: RtJadwalRonda[] }>("/rt/jadwal-ronda");
    return res.data.data ?? [];
  },

  async createJadwalRonda(payload: Partial<RtJadwalRonda>): Promise<RtJadwalRonda> {
    const res = await api.post<{ data: RtJadwalRonda }>("/rt/jadwal-ronda", payload);
    return res.data.data;
  },

  async updateJadwalRonda(jadwal_id: string, payload: Partial<RtJadwalRonda>): Promise<RtJadwalRonda> {
    const res = await api.patch<{ data: RtJadwalRonda }>(`/rt/jadwal-ronda/${jadwal_id}`, payload);
    return res.data.data;
  },

  async deleteJadwalRonda(jadwal_id: string): Promise<void> {
    await api.delete(`/rt/jadwal-ronda/${jadwal_id}`);
  },

  async addPetugas(jadwal_id: string, payload: { nama_petugas: string; no_hp?: string; catatan?: string }): Promise<RtRondaPetugas> {
    const res = await api.post<{ data: RtRondaPetugas }>(`/rt/jadwal-ronda/${jadwal_id}/petugas`, payload);
    return res.data.data;
  },

  async removePetugas(petugas_id: string): Promise<void> {
    await api.delete(`/rt/ronda-petugas/${petugas_id}`);
  },

  async listPresensi(jadwal_id: string, params?: { tanggal_mulai?: string; tanggal_akhir?: string }): Promise<RtPresensiRonda[]> {
    const res = await api.get<{ data: RtPresensiRonda[] }>(`/rt/jadwal-ronda/${jadwal_id}/presensi`, { params });
    return res.data.data ?? [];
  },

  async markPresensi(jadwal_id: string, payload: { tanggal: string; nama_petugas: string; status_hadir: RtStatusKehadiran; catatan?: string }): Promise<RtPresensiRonda> {
    const res = await api.post<{ data: RtPresensiRonda }>(`/rt/jadwal-ronda/${jadwal_id}/presensi`, payload);
    return res.data.data;
  },
};
