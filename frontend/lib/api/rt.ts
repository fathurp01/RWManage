import { api } from "@/lib/axios";

export type RtStatusKehadiran = "HADIR" | "LIBUR" | "IZIN" | "ALFA";
export type RtStatusInsiden = "LAPORAN" | "PROSES" | "SELESAI" | "DITUTUP";

export interface RtWargaRecord {
  id: string;
  nama_kk: string;
  blok_wilayah_id?: string;
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
}

export const rtClient = {
  async listWarga(): Promise<RtWargaRecord[]> {
    const res = await api.get<{ data: RtWargaRecord[] }>("/rt/warga");
    return res.data.data ?? [];
  },

  async createWarga(payload: { nama_kk: string }): Promise<RtWargaRecord> {
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
  }): Promise<RtInsidenRecord> {
    const formData = new FormData();
    formData.append("tipe_insiden", payload.tipe_insiden);
    formData.append("tanggal_insiden", payload.tanggal_insiden);
    formData.append("lokasi", payload.lokasi);
    formData.append("deskripsi", payload.deskripsi);
    formData.append("pelapor_nama", payload.pelapor_nama);
    if (payload.pelapor_no_hp) formData.append("pelapor_no_hp", payload.pelapor_no_hp);
    if (payload.foto_bukti) formData.append("foto_bukti", payload.foto_bukti);

    const res = await api.post<{ data: RtInsidenRecord }>("/rt/laporan-insiden", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  async closeInsiden(laporan_id: string): Promise<RtInsidenRecord> {
    const res = await api.patch<{ data: RtInsidenRecord }>(`/rt/laporan-insiden/${laporan_id}/close`);
    return res.data.data;
  },

  async removeInsiden(laporan_id: string): Promise<void> {
    await api.delete(`/rt/laporan-insiden/${laporan_id}`);
  },

  async deleteWarga(warga_id: string): Promise<void> {
    await api.delete(`/rt/warga/${warga_id}`);
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
};
