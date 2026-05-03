"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { superadminClient, type ApprovalQueueItem, type DashboardOverviewData } from "@/lib/api/superadmin";
import { auditLogClient, type AuditLogRecord } from "@/lib/api/auditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface HealthData {
  pending_approvals: number;
  active_share_links: number;
  open_incidents: number;
  timestamp: string;
}

const formatNumber = (value: number | string) => Number(value).toLocaleString("id-ID");

export default function SuperadminDashboardPage() {
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [queue, setQueue] = useState<ApprovalQueueItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, healthData, queueData] = await Promise.all([
        superadminClient.getOverview(),
        superadminClient.getSystemHealth(),
        superadminClient.getApprovalQueue(),
      ]);
      const auditData = await auditLogClient.list({ limit: 5 });
      setOverview(overviewData);
      setHealth(healthData);
      setQueue(queueData);
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
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Overview Superadmin</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Statistik sistem global, status kesehatan, dan antrian approval.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Sampling</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Entitas</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.created_at).toLocaleString("id-ID")}</TableCell>
                    <TableCell>{item.aksi}</TableCell>
                    <TableCell>{item.entitas}</TableCell>
                    <TableCell>{item.user?.nama ?? item.user?.email ?? item.user_id}</TableCell>
                  </TableRow>
                ))}
                {auditLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Tidak ada data audit terbaru.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          <CardHeader><CardTitle>Total RW</CardTitle></CardHeader>
          <CardContent className="text-3xl font-extrabold">{formatNumber(overview?.total_rw ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Warga</CardTitle></CardHeader>
          <CardContent className="text-3xl font-extrabold">{formatNumber(overview?.total_warga ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total User</CardTitle></CardHeader>
          <CardContent className="text-3xl font-extrabold">{formatNumber(overview?.total_users ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Masjid</CardTitle></CardHeader>
          <CardContent className="text-3xl font-extrabold">{formatNumber(overview?.total_masjid ?? 0)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Pending Approvals</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{formatNumber(health?.pending_approvals ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active Share Links</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{formatNumber(health?.active_share_links ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Open Incidents</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{formatNumber(health?.open_incidents ?? 0)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Antrian Approval Terkini</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal Daftar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.nama}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{item.role}</TableCell>
                  <TableCell>
                    <Badge variant={item.status_akun === "PENDING" ? "pending" : "secondary"}>{item.status_akun}</Badge>
                  </TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleString("id-ID")}</TableCell>
                </TableRow>
              ))}
              {queue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Tidak ada antrean approval saat ini.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
