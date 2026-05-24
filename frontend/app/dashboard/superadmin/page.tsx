"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { superadminClient, type ApprovalQueueItem, type DashboardOverviewData } from "@/lib/api/superadmin";
import { auditLogClient, type AuditLogRecord } from "@/lib/api/auditLog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LayoutDashboard,
  Users,
  Building,
  Home,
  Shield,
  Activity,
  UserCheck,
  Link as LinkIcon,
  AlertTriangle,
  KeyRound,
  FileText
} from "lucide-react";

interface HealthData {
  pending_approvals: number;
  active_share_links: number;
  open_incidents: number;
  timestamp: string;
}

interface PasswordReset {
  id: string;
  user_id: string;
  alasan: string;
  status: string;
  created_at: string;
  user: {
    nama: string;
    email: string;
    role: string;
  };
}

const formatNumber = (value: number | string) => Number(value).toLocaleString("id-ID");

export default function SuperadminDashboardPage() {
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [queue, setQueue] = useState<ApprovalQueueItem[]>([]);
  const [resets, setResets] = useState<PasswordReset[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, healthData, queueData, resetsRes] = await Promise.all([
        superadminClient.getOverview(),
        superadminClient.getSystemHealth(),
        superadminClient.getApprovalQueue(),
        api.get("/superadmin/password-resets"),
      ]);
      const auditData = await auditLogClient.list({ limit: 5 });
      setOverview(overviewData);
      setHealth(healthData);
      setQueue(queueData.filter(q => q.role === 'RW'));
      setResets(resetsRes.data.data ?? []);
      setAuditLogs(auditData.data ?? []);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  if (loading) {
    return <main className="p-6 text-sm text-muted-foreground">Memuat dashboard superadmin...</main>;
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-slate-800 to-black text-white shadow-md shadow-slate-900/20 dark:from-slate-700 dark:to-slate-900">
            <LayoutDashboard className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Overview Superadmin
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground font-medium">
              Statistik sistem global, status kesehatan, dan antrian approval.
            </p>
          </div>
        </div>
      </header>

      {/* 4 Kartu Metrik Utama */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30">
            <Building className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">Total RW</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">{formatNumber(overview?.total_rw ?? 0)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/30">
            <Home className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">Total Masjid</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">{formatNumber(overview?.total_masjid ?? 0)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30">
            <Users className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">Total Warga</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">{formatNumber(overview?.total_warga ?? 0)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
            <UserCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">Total Akun</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">{formatNumber(overview?.total_users ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* 3 Kartu Kesehatan Sistem */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${(health?.pending_approvals ?? 0) > 0 ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30" : "bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200/40"}`}>
            <UserCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">Pending Approvals</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">{formatNumber(health?.pending_approvals ?? 0)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30">
            <LinkIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">Active Share Links</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">{formatNumber(health?.active_share_links ?? 0)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${(health?.open_incidents ?? 0) > 0 ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30 animate-pulse" : "bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200/40"}`}>
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">Open Incidents</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">{formatNumber(health?.open_incidents ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Antrian Approval RW Terkini */}
          <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="size-4 text-blue-600" />
                <CardTitle className="text-base font-extrabold">Antrian Approval RW Terkini</CardTitle>
              </div>
              <CardDescription>Pendaftaran RW baru yang butuh verifikasi</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-white/5">
                    <TableHead className="pl-4">Nama & Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4">
                        <div className="font-semibold text-slate-900 dark:text-foreground">{item.nama}</div>
                        <div className="text-xs text-slate-500">{item.email}</div>
                      </TableCell>
                      <TableCell>{item.role}</TableCell>
                      <TableCell>
                        <Badge variant={item.status_akun === "PENDING" ? "pending" : "secondary"}>{item.status_akun}</Badge>
                      </TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleDateString("id-ID")}</TableCell>
                    </TableRow>
                  ))}
                  {queue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Tidak ada antrean approval RW saat ini.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Antrian Approval Penggantian Password */}
          <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-amber-600" />
                <CardTitle className="text-base font-extrabold">Antrian Penggantian Password</CardTitle>
              </div>
              <CardDescription>Permintaan reset password user yang tertunda</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-white/5">
                    <TableHead className="pl-4">User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resets.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4">
                        <div className="font-semibold text-slate-900 dark:text-foreground">{item.user?.nama}</div>
                        <div className="text-xs text-slate-500">{item.user?.email}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{item.user?.role}</Badge></TableCell>
                      <TableCell className="max-w-[150px] truncate" title={item.alasan}>{item.alasan}</TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleDateString("id-ID")}</TableCell>
                    </TableRow>
                  ))}
                  {resets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Tidak ada antrean approval password saat ini.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* KOLOM KANAN: Audit Log Sampling */}
        <div className="space-y-6">
          <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-emerald-600" />
                <CardTitle className="text-base font-extrabold">Audit Sampling Terbaru</CardTitle>
              </div>
              <CardDescription>Log aktivitas sistem terkini (Max 5)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-white/5">
                    <TableHead className="pl-4">User</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4">
                        <div className="font-semibold text-slate-900 dark:text-foreground">{item.user?.nama ?? item.user?.email ?? item.user_id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{item.aksi}</div>
                        <div className="text-xs text-slate-500">{item.entitas}</div>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(item.created_at).toLocaleString("id-ID")}</TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">Tidak ada data audit terbaru.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
