"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Coins, HandCoins, Users, Wallet, LayoutDashboard, ChevronRight, AlertTriangle, CheckCircle2, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface RtOverviewResponse {
  data: {
    nama_blok: string;
    no_rt: string;
    no_rw?: string | null;
    desa?: string | null;
    tahun: number;
    summary: {
      total_warga: number;
      total_iuran_terjadwal: number;
      total_iuran_terbayar: number;
      total_iuran_belum: number;
      total_iuran_lunas_count: number;
      total_iuran_belum_count: number;
      persentase_bayar: number;
    };
    warga: Array<{
      id: string;
      nama_kk: string;
      iuran: Array<{
        id: string | null;
        bulan: number;
        tahun: number;
        nominal: number | string;
        status: "BELUM" | "LUNAS";
        kode_unik: string | null;
        tanggal_bayar: string | null;
      }>;
    }>;
  };
}

interface KasRtResponse {
  data: {
    transaksi: Array<{
      id: string;
      jenis_transaksi: "MASUK" | "KELUAR";
      tanggal: string;
      keterangan: string;
      nominal: number | string;
      kode_unik: string;
    }>;
    saldo: number;
    pemasukan: number;
    pengeluaran: number;
  };
}

interface SetoranRtResponse {
  data: {
    history: Array<{
      id: string;
      nominal: number | string;
      status: "BELUM" | "PENDING" | "TERKONFIRMASI";
      tanggal_setor: string;
      tanggal_konfirmasi: string | null;
    }>;
    titipan_belum_setor: number | string;
  };
}

interface HistoryItem {
  id: string;
  warga_id: string;
  bulan: number;
  tahun: number;
  nominal: number | string;
  nominal_kas_rt: number | string | null;
  nominal_kas_rw: number | string | null;
  status: "BELUM" | "LUNAS";
  kode_unik: string | null;
  tanggal_bayar: string | null;
  warga: { nama_kk: string };
}

const monthLabel = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const formatCurrency = (value: number | string | null | undefined) =>
  `Rp ${(Number(value ?? 0)).toLocaleString("id-ID")}`;

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
};

export default function RtOverviewPage() {
  const [overview, setOverview] = useState<RtOverviewResponse["data"] | null>(null);
  const [kas, setKas] = useState<KasRtResponse["data"] | null>(null);
  const [setoran, setSetoran] = useState<SetoranRtResponse["data"] | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewRes, kasRes, setoranRes, historyRes] = await Promise.all([
        api.get<RtOverviewResponse>("/rt/iuran"),
        api.get<KasRtResponse>("/rt/kas"),
        api.get<SetoranRtResponse>("/rt/setoran"),
        api.get<{ data: HistoryItem[] }>("/rt/iuran/history"),
      ]);

      setOverview(overviewRes.data.data);
      setKas(kasRes.data.data);
      setSetoran(setoranRes.data.data);
      setHistory(historyRes.data.data ?? []);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const pendingSetoran = useMemo(() => setoran?.history.filter((item) => item.status !== "TERKONFIRMASI").length ?? 0, [setoran]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-4 border-cyan-600 border-t-transparent animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Memuat pusat komando overview...</span>
        </div>
      </div>
    );
  }

  const summary = overview?.summary;
  const lunasPercentage = summary?.persentase_bayar ?? 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (lunasPercentage / 100) * circumference;

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* 1. Header & Identitas */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <LayoutDashboard className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Overview - {overview?.desa || ""} | RW {overview?.no_rw ? `${overview.no_rw}` : ""}/RT {overview?.no_rt ? `${overview.no_rt}` : ""}
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground font-medium">
              Ringkasan warga, target iuran, pembayaran yang terkumpul, status lunas/belum, dan riwayat transaksi kas.
            </p>
          </div>
        </div>
      </header>

      {/* 2. Area Peringatan & Tindakan (To-Do List / Notification Bar) */}
      {pendingSetoran > 0 ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:border-amber-950/30 dark:bg-amber-950/10 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4.5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-amber-300">Setoran Tertunda</p>
              <p className="text-xs text-slate-500 dark:text-amber-400/80 font-semibold mt-0.5">
                Terdapat {pendingSetoran} setoran dana kas dari RT Anda yang menunggu verifikasi dan persetujuan Ketua RW.
              </p>
            </div>
          </div>
          <Link href="/dashboard/rt/setoran" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto font-bold border-amber-300 text-amber-700 bg-white hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-950/30">
              Tinjau Setoran
              <ChevronRight className="size-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4.5 rounded-2xl border border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/30 dark:bg-emerald-950/5 shadow-xs">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-emerald-300">Semua Terkendali!</p>
            <p className="text-xs text-slate-500 dark:text-emerald-400/80 font-semibold mt-0.5">
              Hebat! Tidak ada setoran yang tertunda atau tugas administratif mendesak hari ini.
            </p>
          </div>
        </div>
      )}

      {/* 3. 4 Kartu Metrik Utama (The Vitals) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metrik Warga */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30">
            <Users className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
              Total Warga
            </p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">
              {summary?.total_warga ?? 0} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">KK</span>
            </p>
          </div>
        </div>

        {/* Metrik Target Iuran */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/30">
            <Coins className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
              Target Iuran
            </p>
            <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground truncate mt-0.5">
              {formatCurrency(summary?.total_iuran_terjadwal)}
            </p>
          </div>
        </div>

        {/* Metrik Iuran Terkumpul */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30">
            <Wallet className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
              Iuran Terkumpul
            </p>
            <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground truncate mt-0.5">
              {formatCurrency(summary?.total_iuran_terbayar)}
            </p>
          </div>
        </div>

        {/* Metrik Saldo Kas RT */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
              Saldo Kas RT
            </p>
            <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground truncate mt-0.5">
              {formatCurrency(kas?.saldo)}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Split View Layout (2 Kolom) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ==================== KOLOM KIRI ==================== */}
        <div className="space-y-6">
          {/* Card Donut Chart Iuran */}
          <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
              <CardTitle className="text-base font-extrabold">
                Status Penerimaan Iuran {overview?.tahun ?? new Date().getFullYear()}
              </CardTitle>
              <CardDescription>Rasio kepatuhan iuran warga aktif periode berjalan</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                {/* Donut Chart */}
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="size-28 -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      className="stroke-slate-100 dark:stroke-slate-800"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      className="stroke-blue-600 dark:stroke-blue-500 transition-all duration-500"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold text-slate-800 dark:text-foreground">
                      {lunasPercentage}%
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Lunas
                    </span>
                  </div>
                </div>

                {/* Legend & Nominal */}
                <div className="flex-1 w-full space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-md bg-blue-600 dark:bg-blue-500" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Iuran Lunas</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-foreground">
                        {summary?.total_iuran_lunas_count ?? 0} KK
                      </span>
                      <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatCurrency(summary?.total_iuran_terbayar)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-md bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Belum Bayar</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-foreground">
                        {summary?.total_iuran_belum_count ?? 0} KK
                      </span>
                      <span className="block text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {formatCurrency(summary?.total_iuran_belum)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Transaksi Kas Terakhir */}
          <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="size-4 text-blue-600" />
                  <CardTitle className="text-base font-extrabold">Transaksi Kas Terakhir</CardTitle>
                </div>
                <Link
                  href="/dashboard/rt/kas"
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  Buku Kas
                  <ChevronRight className="size-3" />
                </Link>
              </div>
              <CardDescription>10 transaksi kas RT terbaru</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(kas?.transaksi ?? []).length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 dark:text-muted-foreground">
                  Belum ada transaksi kas yang tercatat.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[440px] overflow-y-auto">
                  {(kas?.transaksi ?? []).slice(0, 10).map((item) => {
                    const isMasuk = item.jenis_transaksi === "MASUK";
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-white/1 transition-colors"
                      >
                        <span
                          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${isMasuk
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30"
                              : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100/30"
                            }`}
                        >
                          {isMasuk ? (
                            <ArrowDownLeft className="size-4.5" />
                          ) : (
                            <ArrowUpRight className="size-4.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800 dark:text-foreground">
                            {item.keterangan}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-muted-foreground font-semibold mt-0.5">
                            {formatDate(item.tanggal)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-extrabold tabular-nums ${isMasuk
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-rose-700 dark:text-rose-400"
                              }`}
                          >
                            {isMasuk ? "+" : "-"} {formatCurrency(Number(item.nominal))}
                          </p>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${isMasuk
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                              }`}
                          >
                            {item.jenis_transaksi}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ==================== KOLOM KANAN ==================== */}
        <div className="space-y-6">
          {/* Card Titipan & Status Setoran */}
          <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HandCoins className="size-4 text-indigo-500" />
                  <CardTitle className="text-base font-extrabold">Titipan & Status Setoran</CardTitle>
                </div>
                <Link
                  href="/dashboard/rt/setoran"
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                >
                  Setoran RW
                  <ChevronRight className="size-3" />
                </Link>
              </div>
              <CardDescription>Status penyerahan dana iuran RT ke RW</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/1">
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Titipan Belum Setor
                    </p>
                    <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                      {formatCurrency(setoran?.titipan_belum_setor)}
                    </p>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50">
                    Pegang Kas RT
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/1">
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Setoran Menunggu Konfirmasi
                    </p>
                    <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                      {pendingSetoran} Transaksi
                    </p>
                  </div>
                  <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50">
                    Pending RW
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Riwayat Pembayaran Iuran */}
          <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <CardTitle className="text-base font-extrabold">Riwayat Pembayaran Iuran</CardTitle>
                </div>
                <Link
                  href="/dashboard/rt/manajemen-iuran"
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                >
                  Kelola Iuran
                  <ChevronRight className="size-3" />
                </Link>
              </div>
              <CardDescription>10 riwayat pembayaran iuran warga terbaru yang sudah lunas</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 dark:text-muted-foreground">
                  Belum ada pembayaran iuran.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[440px] overflow-y-auto">
                  {history.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-white/1 transition-colors"
                    >
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30">
                        <Coins className="size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800 dark:text-foreground">
                          {item.warga.nama_kk}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-muted-foreground font-semibold mt-0.5">
                          Bulan {monthLabel[item.bulan - 1]} {item.tahun} • {formatDate(item.tanggal_bayar)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(Number(item.nominal))}
                        </p>
                        {item.kode_unik && (
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {item.kode_unik}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
