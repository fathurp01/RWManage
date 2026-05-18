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
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

const actionOptions: Array<"ALL" | AuditAction> = ["ALL", "CREATE", "UPDATE", "DELETE", "LOGIN", "APPROVE", "REJECT"];

const getAksiBadgeClass = (aksi: string) => {
  switch (aksi) {
    case "CREATE":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/35";
    case "UPDATE":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/35";
    case "DELETE":
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/35";
    case "LOGIN":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/35";
    case "APPROVE":
      return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/35";
    case "REJECT":
      return "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300 border border-slate-200/50 dark:border-white/10";
    default:
      return "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200/50 dark:border-violet-800/35";
  }
};

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [aksi, setAksi] = useState<"ALL" | AuditAction>("ALL");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");
  const [loading, setLoading] = useState(false);

  const isFilterActive = aksi !== "ALL" || tanggalMulai !== "" || tanggalAkhir !== "";

  const handleReset = () => {
    setAksi("ALL");
    setTanggalMulai("");
    setTanggalAkhir("");
    setOffset(0);
  };

  // Pagination States
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const loadRows = useCallback(async (customOffset?: number) => {
    setLoading(true);
    const targetOffset = customOffset !== undefined ? customOffset : offset;
    try {
      const res = await auditLogClient.list({
        aksi: aksi === "ALL" ? undefined : aksi,
        tanggal_mulai: tanggalMulai ? `${tanggalMulai}T00:00:00.000Z` : undefined,
        tanggal_akhir: tanggalAkhir ? `${tanggalAkhir}T23:59:59.999Z` : undefined,
        limit,
        offset: targetOffset,
      });
      setRows(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch (error) {
      toast.error(getApiError(error).message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [aksi, tanggalAkhir, tanggalMulai, limit, offset]);

  useEffect(() => {
    loadRows().catch(() => undefined);
  }, [loadRows]);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handlePrevPage = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };

  const handleNextPage = () => {
    setOffset((prev) => Math.min(total - limit, prev + limit));
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="rw">System Logs</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Lacak aktivitas penting pengguna untuk kebutuhan audit dan keamanan</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
          Audit Logs
        </h1>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8">
          <CardTitle className="text-lg">Filter Log</CardTitle>
        </CardHeader>
        <CardContent className="px-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Aksi</Label>
            <select
              className="h-11 w-full rounded-xl border border-input bg-white dark:bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring"
              value={aksi}
              onChange={(e) => {
                setAksi(e.target.value as "ALL" | AuditAction);
                setOffset(0);
              }}
            >
              {actionOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Tanggal Mulai</Label>
            <Input
              type="date"
              className="h-11 rounded-xl text-sm font-medium"
              value={tanggalMulai}
              onChange={(e) => {
                setTanggalMulai(e.target.value);
                setOffset(0);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Tanggal Akhir</Label>
            <Input
              type="date"
              className="h-11 rounded-xl text-sm font-medium"
              value={tanggalAkhir}
              onChange={(e) => {
                setTanggalAkhir(e.target.value);
                setOffset(0);
              }}
            />
          </div>
          <div className="flex items-end">
            {isFilterActive ? (
              <Button
                className="h-11 w-full gap-2 rounded-xl text-sm font-bold shadow-md shadow-destructive/10 hover:shadow-lg hover:shadow-destructive/20 transition-all"
                variant="destructive"
                onClick={handleReset}
                disabled={loading}
              >
                <RotateCcw className="size-4" />
                Reset Filter
              </Button>
            ) : (
              <Button
                className="h-11 w-full gap-2 rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-lg"
                variant="rw"
                onClick={() => {
                  setOffset(0);
                  loadRows(0);
                }}
                disabled={loading}
              >
                <SlidersHorizontal className="size-4" />
                {loading ? "Memuat..." : "Terapkan Filter"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Aktivitas Terbaru</CardTitle>
              <CardDescription>Menampilkan log aktivitas terbaru berdasarkan saringan filter</CardDescription>
            </div>

            {/* Pagination buttons at the top right of the table */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                onClick={handlePrevPage}
                disabled={offset === 0 || loading}
              >
                <ChevronLeft className="size-4.5" />
                <span className="sr-only">Halaman Sebelumnya</span>
              </Button>

              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 select-none min-w-[80px] text-center">
                Hal {currentPage} / {totalPages}
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                onClick={handleNextPage}
                disabled={offset + limit >= total || loading}
              >
                <ChevronRight className="size-4.5" />
                <span className="sr-only">Halaman Selanjutnya</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-white/3">
                  <TableHead className="pl-6 py-3.5 font-bold text-slate-700 dark:text-slate-300">Waktu</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300">User</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300">Role</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300">Aksi</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 pr-6">Entitas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-white/3">
                    <TableCell className="pl-6 py-4 text-sm font-medium text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{row.user?.email ?? row.user_id}</TableCell>
                    <TableCell className="py-4 text-sm font-medium text-slate-500 dark:text-muted-foreground">{row.user?.role ?? "-"}</TableCell>
                    <TableCell className="py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getAksiBadgeClass(row.aksi)}`}>
                        {row.aksi}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-sm font-medium text-slate-700 dark:text-slate-200 pr-6">{row.entitas}</TableCell>
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

          {/* Bottom of the table for limit selector */}
          {rows.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-white/8">
              <div className="text-sm text-slate-500 dark:text-muted-foreground select-none">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(total, offset + 1)}</span> - <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(total, offset + limit)}</span> dari <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> log audit
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-muted-foreground whitespace-nowrap">Baris per halaman:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setOffset(0);
                  }}
                  className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-350 outline-none transition-all duration-200 focus-visible:border-indigo-500 focus:ring-2 focus:ring-ring/25"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
