import { api } from "@/lib/axios";

export interface CicilanIuranRecord {
  id: string;
  warga_id: string;
  iuran_id: string;
  total_cicilan: string | number;
  nominal_per_bulan: string | number;
  jumlah_bulan: number;
  bulan_mulai: number;
  tahun_mulai: number;
  sudah_lunas: boolean;
  created_at: string;
}

export interface CreateCicilanPayload {
  iuran_id: string;
  jumlah_bulan: number;
  bulan_mulai: number;
  tahun_mulai: number;
}

export const cicilanIuranClient = {
  async listByWarga(warga_id: string): Promise<CicilanIuranRecord[]> {
    const res = await api.get<{ data: CicilanIuranRecord[] }>("/rw/cicilan-iuran", {
      params: { warga_id },
    });
    return res.data.data ?? [];
  },

  async create(payload: CreateCicilanPayload): Promise<CicilanIuranRecord> {
    const res = await api.post<{ data: CicilanIuranRecord }>("/rw/cicilan-iuran", payload);
    return res.data.data;
  },

  async markAsPaid(cicilan_id: string): Promise<CicilanIuranRecord> {
    const res = await api.patch<{ data: CicilanIuranRecord }>(`/rw/cicilan-iuran/${cicilan_id}/bayar`);
    return res.data.data;
  },

  async remove(cicilan_id: string): Promise<void> {
    await api.delete(`/rw/cicilan-iuran/${cicilan_id}`);
  },
};
