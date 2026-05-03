import { api, getApiError } from "../axios";

export interface AnggotaKeluargaPayload {
  warga_id: string;
  nama: string;
  hubungan: string;
  nik?: string;
  tanggal_lahir?: string;
}

export interface AnggotaKeluargaRecord extends AnggotaKeluargaPayload {
  id: string;
}

export const anggotaKeluargaClient = {
  list: async (warga_id: string) => {
    try {
      const res = await api.get<{ data: AnggotaKeluargaRecord[] }>(`/rw/anggota-keluarga`, {
        params: { warga_id },
      });
      return res.data.data;
    } catch (err) {
      throw getApiError(err);
    }
  },

  create: async (payload: AnggotaKeluargaPayload) => {
    try {
      const res = await api.post<{ data: AnggotaKeluargaRecord }>(`/rw/anggota-keluarga`, payload);
      return res.data.data;
    } catch (err) {
      throw getApiError(err);
    }
  },

  update: async (id: string, payload: Partial<AnggotaKeluargaPayload>) => {
    try {
      const res = await api.patch<{ data: AnggotaKeluargaRecord }>(`/rw/anggota-keluarga/${id}`, payload);
      return res.data.data;
    } catch (err) {
      throw getApiError(err);
    }
  },

  remove: async (id: string) => {
    try {
      await api.delete(`/rw/anggota-keluarga/${id}`);
      return true;
    } catch (err) {
      throw getApiError(err);
    }
  },
};
