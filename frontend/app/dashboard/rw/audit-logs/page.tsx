"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { auditLogClient, type AuditAction, type AuditLogRecord } from "@/lib/api/auditLog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

const actionOptions: Array<"ALL" | AuditAction> = ["ALL", "CREATE", "UPDATE", "DELETE", "LOGIN", "APPROVE", "REJECT"];

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [aksi, setAksi] = useState<"ALL" | AuditAction>("ALL");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");
  const [loading, setLoading] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditLogClient.list({
        aksi: aksi === "ALL" ? undefined : aksi,
        tanggal_mulai: tanggalMulai || undefined,
        tanggal_akhir: tanggalAkhir || undefined,
        limit: 100,
        offset: 0,
      });
      setRows(res.data ?? []);
    } catch (error) {
      toast.error(getApiError(error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [aksi, tanggalAkhir, tanggalMulai]);

  useEffect(() => {
    loadRows().catch(() => undefined);
  }, [loadRows]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/30">
            <ClipboardList className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Audit Logs
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Lacak aktivitas penting pengguna untuk kebutuhan audit dan keamanan
            </p>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Aksi</Label>
            <select
              className="h-10 w-full rounded-xl border border-input bg-white dark:bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring"
              value={aksi}
              onChange={(e) => setAksi(e.target.value as "ALL" | AuditAction)}
            >
              {actionOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Tanggal Mulai (ISO)</Label>
            <Input value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} placeholder="2026-01-01T00:00:00.000Z" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Tanggal Akhir (ISO)</Label>
            <Input value={tanggalAkhir} onChange={(e) => setTanggalAkhir(e.target.value)} placeholder="2026-12-31T23:59:59.999Z" />
          </div>
          <div className="flex items-end">
            <Button className="w-full" variant="rw" onClick={() => loadRows()} disabled={loading}>
              {loading ? "Memuat..." : "Terapkan Filter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Aktivitas Terbaru</CardTitle>
          <CardDescription>Menampilkan hingga 100 entri terakhir berdasarkan filter</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-white/3">
                  <TableHead className="pl-5 font-semibold">Waktu</TableHead>
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Aksi</TableHead>
                  <TableHead className="font-semibold pr-5">Entitas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-white/3">
                    <TableCell className="pl-5 text-sm text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-sm">{row.user?.email ?? row.user_id}</TableCell>
                    <TableCell className="text-sm">{row.user?.role ?? "-"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-950/30 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                        {row.aksi}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm pr-5">{row.entitas}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
                      Belum ada data audit log.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
