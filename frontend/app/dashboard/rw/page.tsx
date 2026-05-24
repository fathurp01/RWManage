"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { api, getApiError } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  ChevronRight,
  Wallet,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Activity,
  PlusCircle,
  CheckSquare,
  LayoutDashboard,
  ShieldCheck,
  ShieldBan,
  ShieldAlertIcon,
} from "lucide-react";
import { ShieldAlert } from "@hugeicons/core-free-icons";

interface RwDashboardReportResponse {
  data: {
    scope: "RW";
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
      desa?: string;
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
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "-";
  }
};

export default function DashboardRwIndexPage() {
  const { user } = useAuth();
  const wilayahRwId = useMemo(() => user?.wilayah_rw_id ?? "", [user]);

  const [tahun] = useState(String(currentYear));
  const [report, setReport] = useState<RwDashboardReportResponse["data"] | null>(null);
  const [recentKas, setRecentKas] = useState<KasRwItem[]>([]);
  const [pendingSetoranCount, setPendingSetoranCount] = useState(0);
  const [pendingIncidentsCount, setPendingIncidentsCount] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [activeRondaList, setActiveRondaList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!wilayahRwId) {
      return;
    }

    setIsLoading(true);
    try {
      // Fetch report & kas with standard await parameters
      const reportResponse = await api.get<RwDashboardReportResponse>("/rw/report", {
        params: {
          wilayah_rw_id: wilayahRwId,
          tahun: Number(tahun),
        },
      }).catch(err => {
        console.error("Report API error:", err);
        return null;
      });

      const kasResponse = await api.get<KasRwResponse>("/rw/kas", {
        params: {
          wilayah_rw_id: wilayahRwId,
        },
      }).catch(err => {
        console.error("Kas API error:", err);
        return null;
      });

      // Other endpoints with graceful error handling to preserve command center operation
      const setoranResponse = await api.get("/rw/setoran-rt").catch(err => {
        console.error("Setoran API error:", err);
        return null;
      });

      const insidenResponse = await api.get("/rw/monitoring-laporan").catch(err => {
        console.error("Insiden API error:", err);
        return null;
      });

      const rondaResponse = await api.get("/rw/monitoring-ronda").catch(err => {
        console.error("Ronda API error:", err);
        return null;
      });

      // Populate states with graceful fallback checks
      if (reportResponse) {
        setReport(reportResponse.data.data);
      }
      if (kasResponse) {
        setRecentKas((kasResponse.data.data?.items ?? []).slice(0, 10));
      }
      if (setoranResponse) {
        const setorans = setoranResponse.data.data ?? [];
        const pendSetorans = setorans.filter((s: any) => s.status === "PENDING");
        setPendingSetoranCount(pendSetorans.length);
      }
      if (insidenResponse) {
        const incidents = insidenResponse.data.data?.incidents ?? [];
        const pendIncidents = incidents.filter((i: any) => i.status === "LAPORAN");
        setPendingIncidentsCount(pendIncidents.length);
        setRecentIncidents(incidents.slice(0, 10));
      }
      if (rondaResponse) {
        const rondaBloks = (rondaResponse.data.data?.blok_data ?? []).map((item: any) => {
          let totalHadir = 0;
          let totalIzin = 0;
          let totalAlfa = 0;
          let latestDate = 0;

          (item.jadwal ?? []).forEach((j: any) => {
            totalHadir += j.stats?.HADIR ?? 0;
            totalIzin += j.stats?.IZIN ?? 0;
            totalAlfa += j.stats?.ALFA ?? 0;

            const jDate = j.created_at ? new Date(j.created_at).getTime() : 0;
            if (jDate > latestDate) {
              latestDate = jDate;
            }
          });

          const totalPresensi = totalHadir + totalIzin + totalAlfa;
          const persentase_kehadiran = totalPresensi > 0
            ? Math.round((totalHadir / totalPresensi) * 100)
            : 0;

          let status_keaktifan = "pasif";
          if (totalPresensi > 0) {
            if (persentase_kehadiran > 75) {
              status_keaktifan = "aktif";
            } else if (persentase_kehadiran >= 40) {
              status_keaktifan = "kurang_aktif";
            } else {
              status_keaktifan = "tidak_aktif";
            }
          }

          return {
            ...item,
            persentase_kehadiran,
            status_keaktifan,
            latestDate,
          };
        });

        // Sort by latest update and limit to top 10
        const sortedRonda = rondaBloks
          .sort((a: any, b: any) => b.latestDate - a.latestDate)
          .slice(0, 10);

        setActiveRondaList(sortedRonda);
      }

    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setReport(null);
      setRecentKas([]);
      setPendingSetoranCount(0);
      setPendingIncidentsCount(0);
      setRecentIncidents([]);
      setActiveRondaList([]);
    } finally {
      setIsLoading(false);
    }
  }, [tahun, wilayahRwId]);

  useEffect(() => {
    if (wilayahRwId) {
      loadOverview().catch(() => undefined);
    }
  }, [loadOverview, wilayahRwId]);

  // Compute lunas percentage for the donut chart
  const totalIuran = report ? (report.summary.total_iuran_lunas_count + report.summary.total_iuran_belum_count) : 0;
  const lunasPercentage = totalIuran > 0 ? Math.round((report!.summary.total_iuran_lunas_count / totalIuran) * 100) : 0;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (lunasPercentage / 100) * circumference;

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* 1. Baris Atas: Header & Filter Tahun */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
            <LayoutDashboard className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Overview - {report?.wilayah_rw?.desa || user?.nama || ""} | RW {report?.wilayah_rw?.no_rw || ""}
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground font-medium">
              Pusat Komando Keuangan, Kependudukan, dan Keamanan Wilayah RW
            </p>
          </div>
        </div>
      </header>

      {report ? (
        <>
          {/* 3. Baris Ketiga: Area Peringatan & Tindakan (To-Do List) */}
          {(pendingSetoranCount > 0 || pendingIncidentsCount > 0) ? (
            <div className="flex flex-col gap-3">
              {pendingSetoranCount > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:border-amber-950/30 dark:bg-amber-950/10 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-amber-300">Konfirmasi Setoran Tertunda</p>
                      <p className="text-xs text-slate-500 dark:text-amber-400/80 font-semibold mt-0.5">
                        Terdapat {pendingSetoranCount} setoran dana kas dari Ketua RT yang menunggu verifikasi dan persetujuan Anda.
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard/rw/monitoring-kas-rt" className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto font-bold border-amber-300 text-amber-700 bg-white hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-950/30">
                      Tinjau Sekarang
                      <ChevronRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              )}

              {pendingIncidentsCount > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 rounded-2xl border border-rose-200/60 bg-rose-50/50 dark:border-rose-950/30 dark:bg-rose-950/10 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                      <Shield className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-rose-300">Peringatan Laporan Kejadian Baru</p>
                      <p className="text-xs text-slate-500 dark:text-rose-400/80 font-semibold mt-0.5">
                        Ada {pendingIncidentsCount} laporan insiden keamanan/lingkungan baru yang butuh tindak lanjut segera.
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard/rw/insiden" className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto font-bold border-rose-300 text-rose-700 bg-white hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30">
                      Tinjau Laporan
                      <ChevronRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4.5 rounded-2xl border border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/30 dark:bg-emerald-950/5 shadow-xs">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-emerald-300">Semua Terkendali!</p>
                <p className="text-xs text-slate-500 dark:text-emerald-400/80 font-semibold mt-0.5">
                  Hebat! Tidak ada tugas administratif mendesak atau laporan insiden keamanan yang terabaikan hari ini.
                </p>
              </div>
            </div>
          )}

          {/* 2. Baris Kedua: 4 Kartu Metrik Utama (The Vitals) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Metrik Warga */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30">
                <Users className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
                  Total Penduduk
                </p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">
                  {report.summary.total_warga} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">KK</span>
                </p>
              </div>
            </div>

            {/* Metrik Saldo Kas */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/30">
                <Wallet className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
                  Saldo Kas RW
                </p>
                <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground truncate mt-0.5">
                  {formatCurrency(report.summary.saldo_kas)}
                </p>
              </div>
            </div>

            {/* Metrik Menunggu Konfirmasi */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
              <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${pendingSetoranCount > 0
                ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30"
                : "bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200/40"
                }`}>
                <CheckSquare className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
                  Antrean Setoran
                </p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">
                  {pendingSetoranCount} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">RT</span>
                </p>
              </div>
            </div>

            {/* Metrik Laporan Insiden */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-card p-4.5 shadow-xs transition-all hover:shadow-md">
              <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${pendingIncidentsCount > 0
                ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30 animate-pulse"
                : "bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200/40"
                }`}>
                <Shield className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
                  Insiden Aktif
                </p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground mt-0.5">
                  {pendingIncidentsCount} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Kasus</span>
                </p>
              </div>
            </div>
          </div>

          {/* 4. Baris Keempat: Konten Terbagi 2 Kolom (Grid / Split View) */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* ==================== KOLOM KIRI (KEUANGAN & WARGA) ==================== */}
            <div className="space-y-6">

              {/* Card Ringkasan & Donut Chart Iuran */}
              <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
                  <CardTitle className="text-base font-extrabold">Status Penerimaan Iuran {tahun}</CardTitle>
                  <CardDescription>Rasio kepatuhan iuran warga aktif periode berjalan</CardDescription>
                </CardHeader>
                <CardContent>
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
                        <span className="text-xl font-extrabold text-slate-800 dark:text-foreground">{lunasPercentage}%</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Lunas</span>
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
                          <span className="text-sm font-extrabold text-slate-800 dark:text-foreground">{report.summary.total_iuran_lunas_count} KK</span>
                          <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(report.summary.total_iuran_lunas_nominal)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-md bg-slate-200 dark:bg-slate-700" />
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Belum Bayar</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-slate-800 dark:text-foreground">{report.summary.total_iuran_belum_count} KK</span>
                          <span className="block text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(report.summary.total_iuran_belum_nominal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Riwayat Transaksi Kas */}
              <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="size-4 text-blue-600" />
                      <CardTitle className="text-base font-extrabold">Transaksi Kas Terakhir</CardTitle>
                    </div>
                    <Link
                      href="/dashboard/rw/kas"
                      className="inline-flex items-center gap-1 rounded-xl bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      Buku Kas
                      <ChevronRight className="size-3" />
                    </Link>
                  </div>
                  <CardDescription>10 transaksi kas RW terbaru</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {recentKas.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500 dark:text-muted-foreground">
                      Belum ada transaksi kas yang tercatat.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[440px] overflow-y-auto">
                      {recentKas.map((kas) => {
                        const isMasuk = kas.jenis_transaksi === "MASUK";
                        return (
                          <div
                            key={kas.id}
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
                                {kas.keterangan}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-muted-foreground font-semibold mt-0.5">
                                {formatTanggal(kas.tanggal)}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p
                                className={`text-sm font-extrabold tabular-nums ${isMasuk
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-rose-700 dark:text-rose-400"
                                  }`}
                              >
                                {isMasuk ? "+" : "-"} {formatCurrency(Number(kas.nominal))}
                              </p>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${isMasuk
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
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

            </div>

            {/* ==================== KOLOM KANAN (KEAMANAN & PENGAWASAN) ==================== */}
            <div className="space-y-6">

              {/* Status Ronda Malam Ini */}
              <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-indigo-500" />
                      <CardTitle className="text-base font-extrabold">Status Ronda Malam Ini</CardTitle>
                    </div>
                    <Link
                      href="/dashboard/rw/ronda"
                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                      Rincian Ronda
                      <ChevronRight className="size-3" />
                    </Link>
                  </div>
                  <CardDescription>Partisipasi keamanan ronda malam di setiap RT</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeRondaList.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500 dark:text-muted-foreground">
                      Belum ada data monitoring jadwal ronda aktif malam ini.
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                      {activeRondaList.map((item) => {
                        const persentase = Math.round(Number(item.persentase_kehadiran ?? 0));
                        return (
                          <div
                            key={item.blok_id}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/1"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                                RT {item.no_rt ?? "-"} / {item.nama_blok}
                              </p>
                              <div className="mt-1 flex items-center gap-3">
                                <div className="h-1.5 w-28 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                  <div
                                    className="h-full bg-indigo-500 dark:bg-indigo-600 rounded-full"
                                    style={{ width: `${persentase}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                  {persentase}% Kehadiran
                                </span>
                              </div>
                            </div>
                            <div>
                              {item.status_keaktifan === "aktif" ? (
                                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50">
                                  Aktif
                                </Badge>
                              ) : item.status_keaktifan === "kurang_aktif" ? (
                                <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50">
                                  Kurang Aktif
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50">
                                  Pasif
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Laporan Kejadian Terkini */}
              <Card className="border-slate-200/80 dark:border-white/5 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlertIcon className="size-4 text-rose-500" />
                      <CardTitle className="text-base font-extrabold">Laporan Kejadian Terkini</CardTitle>
                    </div>
                    <Link
                      href="/dashboard/rw/insiden"
                      className="inline-flex items-center gap-1 rounded-xl bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                    >
                      Daftar Laporan
                      <ChevronRight className="size-3" />
                    </Link>
                  </div>
                  <CardDescription>Kejadian keamanan atau gangguan lingkungan terkini</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentIncidents.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500 dark:text-muted-foreground">
                      Tidak ada laporan kejadian lingkungan yang tercatat.
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                      {recentIncidents.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/1"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 truncate">
                                {item.tipe_insiden}
                              </p>
                              <Badge className={
                                item.status === "LAPORAN" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50" :
                                  item.status === "PROSES" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50" :
                                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50"
                              }>
                                {item.status === "LAPORAN" ? "Baru" : item.status === "PROSES" ? "Proses" : "Selesai"}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {item.deskripsi}
                            </p>
                            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider border-t border-slate-100/60 dark:border-white/5 pt-2">
                              <span>Pelapor: {item.pelapor_nama}</span>
                              <span>{formatTanggal(item.tanggal_insiden)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>

          {/* 5. Baris Bawah: Footer Action */}
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/35 bg-blue-50/40 dark:bg-blue-950/15 p-4.5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <FileText className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-blue-300">Ekspor Laporan Periodik Wilayah</p>
                  <p className="text-xs text-slate-500 dark:text-blue-400/80 font-semibold mt-0.5">
                    Lanjutkan ke halaman ekspor laporan untuk mencetak buku kas atau rekapitulasi iuran warga ke berkas PDF / Excel.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/rw/reports" className="w-full sm:w-auto">
                <Button variant="rw" size="sm" className="w-full sm:w-auto font-bold gap-2">
                  Buka Laporan RW
                  <ChevronRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </>
      ) : (
        <Card className="border-slate-200/80 dark:border-white/5">
          <CardContent className="py-20 text-center text-slate-500 dark:text-muted-foreground font-semibold">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="size-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <span>Memuat pusat komando overview...</span>
              </div>
            ) : (
              "Data overview belum tersedia. Cek sambungan database atau pilih tahun yang sesuai."
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
