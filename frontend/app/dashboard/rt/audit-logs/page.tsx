"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs (RT)</h1>
        <p className="text-sm text-gray-600">Riwayat perubahan yang relevan untuk RT Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Audit</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Memuat...</div>
          ) : logs.length === 0 ? (
            <div className="text-gray-500">Tidak ada entri audit</div>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{l.aksi} — {l.entitas}</div>
                    <div className="text-sm text-gray-500">{new Date(l.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-gray-700">by {l.user_id ?? "-"}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
