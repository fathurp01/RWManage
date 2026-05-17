"use client";

import { useState, useEffect } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Wallet, TrendingUp } from "lucide-react";

interface KasRTSummary {
  blok_wilayah_id: string;
  nama_blok: string;
  no_rt: string | null;
  total_masuk: number;
  total_keluar: number;
  saldo: number;
  persentase_bayar: number;
}

export default function MonitoringKasRTPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KasRTSummary[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rw/kas-rt-summary");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const totalSaldoSemuaRT = data.reduce((acc, curr) => acc + curr.saldo, 0);

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/30">
            <Building2 className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Monitoring Kas RT
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Pantau serapan iuran dan penggunaan dana kas di masing-masing RT secara real-time
            </p>
          </div>
        </div>
      </header>

      {/* Summary Card */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-violet-200/60 dark:border-violet-800/30 bg-violet-50/60 dark:bg-violet-950/20 px-4 py-3.5 col-span-full sm:col-span-1">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
            <Wallet className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600/70 dark:text-violet-400/70">
              Total Dana Seluruh RT
            </p>
            <p className="text-base font-extrabold tabular-nums text-slate-900 dark:text-foreground truncate">
              Rp {totalSaldoSemuaRT.toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-slate-500 dark:text-muted-foreground flex items-center gap-1 mt-0.5">
              <TrendingUp className="size-3" />
              Dari {data.length} unit RT
            </p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Saldo Kas RT</CardTitle>
              <CardDescription>Berdasarkan data transaksi yang tercatat di sistem</CardDescription>
            </div>
            <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
              {data.length} RT Terdata
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
              Memuat data kas RT...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-white/3">
                    <TableHead className="pl-5 font-semibold">Unit RT / Blok</TableHead>
                    <TableHead className="text-center font-semibold">Kepatuhan</TableHead>
                    <TableHead className="text-right font-semibold">Total Masuk</TableHead>
                    <TableHead className="text-right font-semibold">Total Keluar</TableHead>
                    <TableHead className="text-right pr-5 font-semibold">Saldo Akhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-sm text-slate-500 dark:text-muted-foreground">
                        Belum ada data kas RT yang tercatat di wilayah Anda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((item) => (
                      <TableRow key={item.blok_wilayah_id} className="hover:bg-slate-50/70 dark:hover:bg-white/3">
                        <TableCell className="pl-5">
                          <p className="font-semibold text-sm text-slate-900 dark:text-foreground">{item.nama_blok}</p>
                          <p className="text-xs text-slate-500 dark:text-muted-foreground">Unit RT {item.no_rt ?? "-"}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <p className={`text-base font-bold tabular-nums ${item.persentase_bayar > 80 ? "text-emerald-600 dark:text-emerald-400" : item.persentase_bayar > 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                              {item.persentase_bayar.toFixed(1)}%
                            </p>
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.persentase_bayar > 80 ? "bg-emerald-500" : item.persentase_bayar > 50 ? "bg-amber-500" : "bg-rose-500"}`}
                                style={{ width: `${item.persentase_bayar}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            + Rp {item.total_masuk.toLocaleString("id-ID")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                            - Rp {item.total_keluar.toLocaleString("id-ID")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          <p className="text-sm font-bold tabular-nums text-violet-700 dark:text-violet-400">
                            Rp {item.saldo.toLocaleString("id-ID")}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
