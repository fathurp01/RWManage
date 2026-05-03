import { api } from "@/lib/axios";

export type StatusInsiden = "LAPORAN" | "PROSES" | "SELESAI" | "DITUTUP";

export interface LaporanInsidenRecord {
  id: string;
  wilayah_rw_id: string;
  tipe_insiden: string;
  tanggal_insiden: string;
  lokasi: string;
  deskripsi: string;
  pelapor_nama: string;
  pelapor_no_hp: string | null;
  foto_bukti_url: string | null;
  status: StatusInsiden;
  tindakan_diambil: string | null;
  created_at: string;
}

export interface CreateLaporanPayload {
  tipe_insiden: string;
  tanggal_insiden: string;
  lokasi: string;
  deskripsi: string;
  pelapor_nama: string;
  pelapor_no_hp?: string;
  foto_bukti?: File | null;
}

const toFormData = (payload: CreateLaporanPayload): FormData => {
  const formData = new FormData();
  formData.append("tipe_insiden", payload.tipe_insiden);
  formData.append("tanggal_insiden", payload.tanggal_insiden);
  formData.append("lokasi", payload.lokasi);
  formData.append("deskripsi", payload.deskripsi);
  formData.append("pelapor_nama", payload.pelapor_nama);
  if (payload.pelapor_no_hp) {
    formData.append("pelapor_no_hp", payload.pelapor_no_hp);
  }
  if (payload.foto_bukti) {
    formData.append("foto_bukti", payload.foto_bukti);
  }
  return formData;
};

export const laporanInsidenClient = {
  async list(params?: { status?: StatusInsiden }): Promise<LaporanInsidenRecord[]> {
    const res = await api.get<{ data: LaporanInsidenRecord[] }>("/rw/laporan-insiden", { params });
    return res.data.data ?? [];
  },

  async create(payload: CreateLaporanPayload): Promise<LaporanInsidenRecord> {
    const res = await api.post<{ data: LaporanInsidenRecord }>("/rw/laporan-insiden", toFormData(payload), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  async close(laporan_id: string): Promise<LaporanInsidenRecord> {
    const res = await api.patch<{ data: LaporanInsidenRecord }>(`/rw/laporan-insiden/${laporan_id}/close`);
    return res.data.data;
  },

  async remove(laporan_id: string): Promise<void> {
    await api.delete(`/rw/laporan-insiden/${laporan_id}`);
  },
};
