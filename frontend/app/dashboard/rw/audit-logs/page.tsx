"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { auditLogClient, type AuditAction, type AuditLogRecord } from "@/lib/api/auditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Audit Logs</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Lacak aktivitas penting pengguna untuk kebutuhan audit dan keamanan.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Aksi</Label>
            <select className="h-10 rounded-md border bg-background px-3" value={aksi} onChange={(e) => setAksi(e.target.value as "ALL" | AuditAction)}>
              {actionOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Tanggal Mulai (ISO)</Label>
            <Input value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} placeholder="2026-01-01T00:00:00.000Z" />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Akhir (ISO)</Label>
            <Input value={tanggalAkhir} onChange={(e) => setTanggalAkhir(e.target.value)} placeholder="2026-12-31T23:59:59.999Z" />
          </div>
          <div className="flex items-end">
            <Button className="w-full" variant="rw" onClick={() => loadRows()} disabled={loading}>{loading ? "Memuat..." : "Terapkan Filter"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Entitas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.created_at).toLocaleString("id-ID")}</TableCell>
                  <TableCell>{row.user?.email ?? row.user_id}</TableCell>
                  <TableCell>{row.user?.role ?? "-"}</TableCell>
                  <TableCell>{row.aksi}</TableCell>
                  <TableCell>{row.entitas}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada data audit log.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
