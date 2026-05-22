import { api } from "@/lib/axios";

export type CicilanIuranScope = "rw" | "rt";

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
  tambahan_nominal?: number;
}

export interface UpdateCicilanPayload {
  jumlah_bulan?: number;
  bulan_mulai?: number;
  tahun_mulai?: number;
}

const getBasePath = (scope: CicilanIuranScope = "rw"): string => `/${scope}/cicilan-iuran`;

export const cicilanIuranClient = {
  async listByWarga(warga_id: string, scope: CicilanIuranScope = "rw"): Promise<CicilanIuranRecord[]> {
    const res = await api.get<{ data: CicilanIuranRecord[] }>(getBasePath(scope), {
      params: { warga_id },
    });
    return res.data.data ?? [];
  },

  async create(payload: CreateCicilanPayload, scope: CicilanIuranScope = "rw"): Promise<CicilanIuranRecord> {
    const res = await api.post<{ data: CicilanIuranRecord }>(getBasePath(scope), payload);
    return res.data.data;
  },

  async update(cicilan_id: string, payload: UpdateCicilanPayload, scope: CicilanIuranScope = "rw"): Promise<CicilanIuranRecord> {
    const res = await api.patch<{ data: CicilanIuranRecord }>(`${getBasePath(scope)}/${cicilan_id}`, payload);
    return res.data.data;
  },

  async markAsPaid(cicilan_id: string, nominal: number, scope: CicilanIuranScope = "rw"): Promise<CicilanIuranRecord> {
    const res = await api.patch<{ data: CicilanIuranRecord }>(`${getBasePath(scope)}/${cicilan_id}/bayar`, { nominal });
    return res.data.data;
  },

  async remove(cicilan_id: string, scope: CicilanIuranScope = "rw"): Promise<void> {
    await api.delete(`${getBasePath(scope)}/${cicilan_id}`);
  },

  async history(params?: { tahun?: number }, scope: CicilanIuranScope = "rt"): Promise<Array<{
    id: string;
    warga_id: string;
    bulan: number;
    tahun: number;
    nominal: string | number;
    nominal_kas_rt: string | number | null;
    nominal_kas_rw: string | number | null;
    status: "BELUM" | "LUNAS";
    kode_unik: string | null;
    tanggal_bayar: string | null;
    warga: { nama_kk: string };
  }>> {
    const res = await api.get<{ data: Array<any> }>(`${scope === "rt" ? "/rt/iuran/history" : "/rw/iuran/history"}`, { params });
    return res.data.data ?? [];
  },
};
