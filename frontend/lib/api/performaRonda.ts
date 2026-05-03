import { api } from "@/lib/axios";

export type StatusKehadiran = "HADIR" | "LIBUR" | "IZIN" | "ALFA";

export interface PerformaRondaRecord {
  id: string;
  blok_wilayah_id: string;
  tanggal: string;
  nama_petugas: string;
  status_kehadiran: StatusKehadiran;
  catatan: string | null;
  created_at: string;
}

export interface CreatePerformaPayload {
  blok_wilayah_id: string;
  tanggal: string;
  nama_petugas: string;
  status_kehadiran: StatusKehadiran;
  catatan?: string;
}

export const performaRondaClient = {
  async list(params: { blok_wilayah_id: string; tanggal_mulai?: string; tanggal_akhir?: string }): Promise<PerformaRondaRecord[]> {
    const res = await api.get<{ data: PerformaRondaRecord[] }>("/rw/performa-ronda", { params });
    return res.data.data ?? [];
  },

  async create(payload: CreatePerformaPayload): Promise<PerformaRondaRecord> {
    const res = await api.post<{ data: PerformaRondaRecord }>("/rw/performa-ronda", payload);
    return res.data.data;
  },

  async update(performa_id: string, payload: Partial<Omit<CreatePerformaPayload, "blok_wilayah_id" | "tanggal">>): Promise<PerformaRondaRecord> {
    const res = await api.patch<{ data: PerformaRondaRecord }>(`/rw/performa-ronda/${performa_id}`, payload);
    return res.data.data;
  },

  async remove(performa_id: string): Promise<void> {
    await api.delete(`/rw/performa-ronda/${performa_id}`);
  },
};
