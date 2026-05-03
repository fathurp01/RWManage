"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuditItem {
  id: string;
  user_id: string | null;
  aksi: string;
  entitas: string;
  entitas_id: string | null;
  created_at: string;
}

export default function RtAuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditItem[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // try RT-scoped endpoint first, fallback to RW audit logs
      try {
        const res = await api.get<{ data: AuditItem[] }>("/rt/audit-logs");
        setLogs(res.data.data ?? []);
        return;
      } catch (err) {
        // fallback
      }

      const res = await api.get<{ data: AuditItem[] }>("/rw/audit-logs");
      setLogs(res.data.data ?? []);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RT</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Jejak aktivitas sistem</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Audit Logs</h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">Riwayat perubahan yang relevan untuk RT Anda.</p>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Riwayat Audit</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="text-sm text-slate-500">Memuat...</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-slate-500">Tidak ada entri audit</div>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="font-medium">{l.aksi} - {l.entitas}</div>
                    <div className="text-sm text-slate-500">{new Date(l.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">by {l.user_id ?? "-"}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
