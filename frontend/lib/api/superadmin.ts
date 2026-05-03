import { api } from "@/lib/axios";

export interface DashboardOverviewData {
  total_rw: number;
  total_blok: number;
  total_warga: number;
  total_masjid: number;
  total_users: number;
  total_zis: number;
  total_kas_rw: number;
  total_kas_masjid: number;
}

export interface ApprovalQueueItem {
  id: string;
  nama: string;
  email: string;
  role: string;
  status_akun: string;
  created_at: string;
}

export interface PendingRegistrationItem {
  id: string;
  nama: string;
  email: string;
  no_hp: string;
  role: "RW" | "RT";
  status_akun: "PENDING";
  created_at: string;
}

export const superadminClient = {
  async getOverview(): Promise<DashboardOverviewData> {
    const res = await api.get<{ data: DashboardOverviewData }>("/admin/dashboard/overview");
    return res.data.data;
  },

  async getSystemHealth(): Promise<{ pending_approvals: number; active_share_links: number; open_incidents: number; timestamp: string }> {
    const res = await api.get<{ data: { pending_approvals: number; active_share_links: number; open_incidents: number; timestamp: string } }>("/admin/dashboard/health");
    return res.data.data;
  },

  async getApprovalQueue(): Promise<ApprovalQueueItem[]> {
    const res = await api.get<{ data: ApprovalQueueItem[] | { pending_users?: ApprovalQueueItem[] } }>("/admin/dashboard/approval-queue");
    const payload = res.data.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    return payload?.pending_users ?? [];
  },

  async listPendingRegistrations(params?: { search?: string; role?: "RW" | "RT" }): Promise<PendingRegistrationItem[]> {
    const res = await api.get<{ data: PendingRegistrationItem[] }>("/auth/pending-registrations", { params });
    return res.data.data ?? [];
  },

  async decideRegistration(payload: { user_id: string; status_akun: "APPROVED" | "REJECTED"; alasan_penolakan?: string }): Promise<void> {
    await api.patch("/auth/approve-registration", payload);
  },
};
