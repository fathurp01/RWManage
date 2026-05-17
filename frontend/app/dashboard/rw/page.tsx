"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { api, getApiError } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  ChevronRight,
  Wallet,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  FileText,
} from "lucide-react";

interface RwDashboardReportResponse {
  data: {
    scope: "RW";
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
    periode: {
      tahun: number;
      bulan: number | null;
      label: string;
    };
    summary: {
      total_warga: number;
      total_iuran_lunas_count: number;
      total_iuran_belum_count: number;
      total_iuran_lunas_nominal: number;
      total_iuran_belum_nominal: number;
      total_kas_masuk: number;
      total_kas_keluar: number;
      saldo_kas: number;
    };
    series: Array<{
      bulan: number;
      label: string;
      iuran_lunas_count: number;
      iuran_belum_count: number;
      kas_masuk: number;
      kas_keluar: number;
      kas_saldo: number;
    }>;
  };
}

interface KasRwItem {
  id: string;
  kode_unik: string;
  jenis_transaksi: "MASUK" | "KELUAR";
  tanggal: string;
  keterangan: string;
  nominal: string | number;
  bukti_url?: string | null;
}

interface KasRwResponse {
  data: {
    items: KasRwItem[];
  };
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - index);

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatTanggal = (iso: string): string => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
};

export default function DashboardRwIndexPage() {
  const { user } = useAuth();
  const wilayahRwId = useMemo(() => user?.wilayah_rw_id ?? "", [user]);

  const [tahun, setTahun] = useState(String(currentYear));
  const [report, setReport] = useState<RwDashboardReportResponse["data"] | null>(null);
  const [recentKas, setRecentKas] = useState<KasRwItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!wilayahRwId) {
      return;
    }

    setIsLoading(true);
    try {
      const [reportResponse, kasResponse] = await Promise.all([
        api.get<RwDashboardReportResponse>("/rw/report", {
          params: {
            wilayah_rw_id: wilayahRwId,
            tahun: Number(tahun),
          },
        }),
        api.get<KasRwResponse>("/rw/kas", {
          params: {
            wilayah_rw_id: wilayahRwId,
          },
        }),
      ]);

      setReport(reportResponse.data.data);
      // Ambil 10 terbaru
      setRecentKas((kasResponse.data.data?.items ?? []).slice(0, 10));
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setReport(null);
      setRecentKas([]);
    } finally {
      setIsLoading(false);
    }
  }, [tahun, wilayahRwId]);

  useEffect(() => {
    if (wilayahRwId) {
      loadOverview().catch(() => undefined);
    }
  }, [loadOverview, wilayahRwId]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/30">
            <BarChart3 className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Overview RW
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Ringkasan iuran warga dan saldo kas berjalan
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard/rw/iuran-khusus">
            <Button variant="outline" className="gap-2">
              <FileText className="size-4" />
              Iuran Khusus
            </Button>
          </Link>
          <Link href="/dashboard/rw/kas">
            <Button variant="rw" className="gap-2">
              <Wallet className="size-4" />
              Buku Kas
            </Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Filter Tahun</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="tahun">Tahun</Label>
              <select
                id="tahun"
                value={tahun}
                onChange={(event) => setTahun(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-white dark:bg-card px-3 text-sm"
                disabled={isLoading}
              >
                {yearOptions.map((item) => (
                  <option key={item} value={String(item)}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="rw" className="w-full gap-2" onClick={() => loadOverview()} disabled={isLoading}>
                <BarChart3 className="size-4" />
                Tampilkan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {report ? (
        <>
          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-card px-4 py-3.5 shadow-sm">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300">
                <Users className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                  Total Warga
                </p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-foreground">
                  {report.summary.total_warga}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/30 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">
                  Iuran Lunas
                </p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-foreground">
                  {report.summary.total_iuran_lunas_count}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <Clock className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">
                  Belum Bayar
                </p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-foreground">
                  {report.summary.total_iuran_belum_count}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-violet-200/60 dark:border-violet-800/30 bg-violet-50/60 dark:bg-violet-950/20 px-4 py-3.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
                <Wallet className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600/70 dark:text-violet-400/70">
                  Saldo Kas
                </p>
                <p className="text-base font-extrabold tabular-nums text-slate-900 dark:text-foreground truncate">
                  {formatCurrency(report.summary.saldo_kas)}
                </p>
              </div>
            </div>
          </div>

          {/* Riwayat Kas RW */}
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-violet-500" />
                  <CardTitle className="text-base">Riwayat Transaksi Kas</CardTitle>
                </div>
                <Link
                  href="/dashboard/rw/kas"
                  className="inline-flex items-center gap-1 rounded-xl bg-violet-50 dark:bg-violet-950/30 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                >
                  Lihat Semua
                  <ChevronRight className="size-3" />
                </Link>
              </div>
              <CardDescription>10 transaksi kas terakhir</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {recentKas.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
                  Belum ada transaksi kas yang tercatat.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/6">
                  {recentKas.map((kas) => {
                    const isMasuk = kas.jenis_transaksi === "MASUK";
                    return (
                      <div
                        key={kas.id}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 dark:hover:bg-white/3 transition-colors"
                      >
                        <span
                          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-xl ${
                            isMasuk
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isMasuk ? (
                            <ArrowDownLeft className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-foreground">
                            {kas.keterangan}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-muted-foreground">
                            {formatTanggal(kas.tanggal)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-bold tabular-nums ${
                              isMasuk
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-rose-700 dark:text-rose-300"
                            }`}
                          >
                            {isMasuk ? "+" : "-"} {formatCurrency(Number(kas.nominal))}
                          </p>
                          <span
                            className={`text-[10px] font-semibold uppercase ${
                              isMasuk
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "text-rose-500 dark:text-rose-400"
                            }`}
                          >
                            {kas.jenis_transaksi}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-violet-200 dark:border-violet-800/35 bg-violet-50 dark:bg-violet-950/20 px-4 py-3 text-sm text-violet-800 dark:text-violet-200">
            <div className="flex items-center gap-1 font-semibold">
              Lanjutkan ke halaman detail laporan untuk ekspor PDF/XLSX
              <ChevronRight className="size-4" />
              <Link href="/dashboard/rw/reports" className="underline underline-offset-4">Buka Laporan RW</Link>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-slate-500 dark:text-muted-foreground">
            {isLoading ? "Memuat overview..." : "Data overview belum tersedia."}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
