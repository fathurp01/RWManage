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

export interface RwMonitoringRondaSummary {
  total_jadwal: number;
  presensi: {
    HADIR: number;
    IZIN: number;
    LIBUR: number;
    ALFA: number;
  };
}

export interface RwMonitoringRondaBlok {
  blok_id: string;
  nama_blok: string;
  no_rt: string;
  jadwal: any[];
  is_any_kosong_malam_ini?: boolean;
}

export interface RwMonitoringRondaData {
  summary: RwMonitoringRondaSummary;
  blok_data: RwMonitoringRondaBlok[];
}

export const performaRondaClient = {
  async getMonitoringRw(params?: { tanggal_mulai?: string; tanggal_akhir?: string }): Promise<RwMonitoringRondaData> {
    const res = await api.get<{ data: RwMonitoringRondaData }>("/rw/monitoring-ronda", { params });
    return res.data.data;
  },

  async getDetailRondaBlok(blokId: string): Promise<{ jadwals: any[]; presensi: any[] }> {
    const res = await api.get<{ data: { jadwals: any[]; presensi: any[] } }>(`/rw/monitoring-ronda/blok/${blokId}`);
    return res.data.data;
  },

  async getPresensiSummary(params?: { tanggal_mulai?: string; tanggal_akhir?: string }): Promise<Record<string, { HADIR: number; IZIN: number; LIBUR: number; ALFA: number }>> {
    const res = await api.get<{ data: Record<string, { HADIR: number; IZIN: number; LIBUR: number; ALFA: number }> }>("/rw/monitoring-ronda/presensi", { params });
    return res.data.data;
  },

  async list(params?: { blok_wilayah_id?: string; tanggal_mulai?: string; tanggal_akhir?: string }): Promise<any[]> {
    const res = await api.get<{ data: any[] }>("/rw/performa-ronda", { params });
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
