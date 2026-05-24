import { api } from "@/lib/axios";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "APPROVE" | "REJECT";

export interface AuditLogRecord {
  id: string;
  user_id: string;
  aksi: AuditAction;
  entitas: string;
  entitas_id: string | null;
  metadata: unknown;
  created_at: string;
  user?: {
    id: string;
    email: string;
    nama: string;
    role: string;
  };
}

export interface AuditLogListResponse {
  data: AuditLogRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export const auditLogClient = {
  async list(params?: {
    aksi?: AuditAction;
    user_id?: string;
    tanggal_mulai?: string;
    tanggal_akhir?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogListResponse> {
    const res = await api.get<AuditLogListResponse>("/admin/audit-logs", { params });
    return res.data;
  },
  async listForRt(params?: {
    aksi?: AuditAction;
    tanggal_mulai?: string;
    tanggal_akhir?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogListResponse> {
    const res = await api.get<AuditLogListResponse>("/rt/audit-logs", { params });
    return res.data;
  },
};

