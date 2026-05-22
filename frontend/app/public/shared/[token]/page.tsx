"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  HandCoins,
  Users,
  Wheat,
  Banknote,
  Search,
  BellRing,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MuzaqiItem {
  id: string;
  kode_unik: string;
  nama_kk: string;
  alamat_muzaqi: string;
  jumlah_jiwa: number;
  jenis_bayar: "UANG" | "BERAS";
  nominal_zakat: string | number;
  nominal_infaq: string | number;
  total_beras_kg: string | number;
  waktu_transaksi: string;
}

interface SharedDashboardResponse {
  data: {
    link: {
      scope: "RW" | "MASJID";
      created_at: string;
      expires_at: string | null;
    };
    payload: {
      scope: "RW" | "MASJID";
      year: number;
      entity: {
        id: string;
        nama_masjid?: string;
        alamat?: string;
        nama_kompleks?: string;
        no_rw?: string;
      };
      summary: Record<string, number>;
      series: Array<{
        month: number;
        kas_masuk: number;
        kas_keluar: number;
        kas_saldo: number;
        zis_uang_zakat: number;
        zis_uang_infaq: number;
      }>;
    };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const fmtTgl = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color?: "slate" | "emerald" | "amber" | "teal";
}) {
  const palettes = {
    slate: "border-slate-200/70 dark:border-white/10 bg-white dark:bg-card",
    emerald:
      "border-emerald-200/70 dark:border-emerald-800/30 bg-emerald-50/60 dark:bg-emerald-950/20",
    amber:
      "border-amber-200/70 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-950/20",
    teal: "border-teal-200/70 dark:border-teal-800/30 bg-teal-50/60 dark:bg-teal-950/20",
  };
  const iconPalettes = {
    slate: "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300",
    emerald:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300",
    amber: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300",
    teal: "bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300",
  };

  return (
    <div
      className={`rounded-2xl border shadow-sm px-5 py-4 flex flex-col gap-3 ${palettes[color]}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
          {label}
        </p>
        <span
          className={`inline-flex size-7 items-center justify-center rounded-lg ${iconPalettes[color]}`}
        >
          {icon}
        </span>
      </div>
      <div className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground leading-tight">
        {value}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PublicSharedDashboardPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [data, setData] = useState<SharedDashboardResponse["data"] | null>(null);
  const [muzaqiList, setMuzaqiList] = useState<MuzaqiItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const baseUrl = (
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"
        ).replace(/\/$/, "");
        const res = await fetch(
          `${baseUrl}/public/shared/${encodeURIComponent(token)}`
        );
        if (!res.ok) {
          const p = (await res.json()) as { message?: string };
          throw new Error(p.message || "Gagal memuat data.");
        }
        const p = (await res.json()) as SharedDashboardResponse;
        setData(p.data);

        // Coba ambil daftar muzaqi (endpoint opsional)
        try {
          const mRes = await fetch(
            `${baseUrl}/public/shared/${encodeURIComponent(token)}/muzaqi`
          );
          if (mRes.ok) {
            const mData = (await mRes.json()) as { data: MuzaqiItem[] };
            setMuzaqiList(mData.data ?? []);
          }
        } catch {
          setMuzaqiList([]);
        }
      } catch (err) {
        setData(null);
        setErrorMessage(
          err instanceof Error ? err.message : "Gagal memuat data."
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchData().catch(() => undefined);
  }, [token]);

  const filteredMuzaqi = useMemo(() => {
    if (!muzaqiList.length) return [];
    return muzaqiList.filter((item) => {
      // Date filters
      const t = new Date(item.waktu_transaksi).getTime();
      if (startDate && t < new Date(startDate).getTime()) return false;
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        if (t > e.getTime()) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          item.nama_kk.toLowerCase().includes(term) ||
          item.alamat_muzaqi.toLowerCase().includes(term) ||
          item.kode_unik.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [muzaqiList, startDate, endDate, searchTerm]);

  const summary = useMemo(() => {
    if (!data?.payload?.summary) return null;
    const s = data.payload.summary;
    return {
      totalKk: Number(s.total_kk ?? s.total_transaksi_zis ?? 0),
      totalJiwa: Number(s.total_jiwa ?? 0),
      zakatUang: Number(s.zis_zakat ?? s.total_zis_uang_zakat ?? 0),
      zakatBeras: Number(s.total_beras ?? s.total_zis_beras ?? 0),
    };
  }, [data]);

  const isFiltered = !!searchTerm || !!startDate || !!endDate;

  const computeHijriYear = (date: Date) => {
    // Algorithm from the astronomical/julian conversion to Islamic calendar
    const gy = date.getFullYear();
    const gm = date.getMonth() + 1;
    const gd = date.getDate();

    const jd = Math.floor((1461 * (gy + 4800 + Math.floor((gm - 14) / 12))) / 4)
      + Math.floor((367 * (gm - 2 - 12 * Math.floor((gm - 14) / 12))) / 12)
      - Math.floor((3 * Math.floor((gy + 4900 + Math.floor((gm - 14) / 12)) / 100)) / 4)
      + gd - 32075;

    let l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    const j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
    l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    const m = Math.floor((24 * l) / 709);
    const d = l - Math.floor((709 * m) / 24);
    const y = 30 * n + j - 30;
    return y;
  };

  const hijriYear = useMemo(() => computeHijriYear(new Date()), []);

  const isMasjidShared = Boolean(data?.payload?.entity?.nama_masjid);
  const headerTitle = data?.payload?.entity?.nama_masjid
    ? `Monitor Zakat ${data.payload.entity.nama_masjid}`
    : data?.payload?.entity?.nama_kompleks
      ? `Monitor Zakat RW ${data.payload.entity.nama_kompleks}`
      : "Monitor Zakat Warga";

  const headerDescription = data?.payload?.entity?.nama_masjid
    ? "Halaman ini bersifat read-only untuk pengunjung masjid."
    : "Halaman ini bersifat read-only untuk warga.";

  const headerClass = `text-2xl font-extrabold tracking-tight ${isMasjidShared ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-foreground"}`;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top bar dekoratif */}
      <div className="h-1 w-full bg-linear-to-r from-emerald-400 via-teal-500 to-emerald-600" />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
              <HandCoins className="size-5" />
            </span>
            <div>
              <h1 className={headerClass}>
                {headerTitle}
              </h1>
              <p className="text-sm text-slate-500 dark:text-muted-foreground">
                {headerDescription}
              </p>
            </div>
          </div>
        </header>

        {/* ── Loading / Error ─────────────────────────────────────────────── */}
        {isLoading ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3 text-slate-400 dark:text-muted-foreground">
              <div className="size-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
              <span className="text-sm">Memuat data transparansi...</span>
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <Card className="border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/20">
            <CardContent className="py-12 text-center">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                {errorMessage}
              </p>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* ── Pengingat Warga ─────────────────────────────────────────── */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/25 p-5 flex gap-4 items-start">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 mt-0.5">
                <BellRing className="size-5" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                  Pengingat Warga
                </p>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Segera Tunaikan Zakat Fitrah {hijriYear}H sebagai penyempurna puasa Ramadhan kita!
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Jika nama Anda belum terupdate, mohon segera konfirmasi kembali kepada panitia masjid.
                </p>
              </div>
            </div>

            {/* ── Ringkasan Stat Cards ─────────────────────────────────────── */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground mb-3 px-0.5">
                Ringkasan Warga Sudah Tunaikan
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  color="slate"
                  icon={<Users className="size-4" />}
                  label="Total KK"
                  value={
                    <span>
                      {summary?.totalKk ?? 0}{" "}
                      <span className="text-sm font-semibold text-slate-400">KK</span>
                    </span>
                  }
                />
                <StatCard
                  color="slate"
                  icon={<Users className="size-4" />}
                  label="Total Jiwa"
                  value={
                    <span>
                      {summary?.totalJiwa ?? 0}{" "}
                      <span className="text-sm font-semibold text-slate-400">jiwa</span>
                    </span>
                  }
                />
                <StatCard
                  color="emerald"
                  icon={<Banknote className="size-4" />}
                  label="Zakat Uang"
                  value={fmt(summary?.zakatUang ?? 0)}
                />
                <StatCard
                  color="amber"
                  icon={<Wheat className="size-4" />}
                  label="Zakat Beras"
                  value={
                    <span>
                      {(summary?.zakatBeras ?? 0).toFixed(1)}{" "}
                      <span className="text-sm font-semibold ">kg</span>
                    </span>
                  }
                />
              </div>
            </div>

            {/* ── Filter Periode ──────────────────────────────────────────── */}
            <Card>
              <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="size-4 text-slate-400" />
                  Filter Periode
                </CardTitle>
                <CardDescription>Cari nama muzaqi dan batasi berdasarkan tanggal transaksi.</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Cari Nama / Alamat</Label>
                    <Input
                      id="search"
                      name="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Cari nama muzaqi, alamat, atau kode..."
                      className={`transition-all duration-200 ${searchTerm
                        ? "border-emerald-500 dark:border-emerald-400 focus-visible:ring-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10"
                        : ""
                        }`}
                    />
                  </div>
                  <div className="w-full lg:w-48 space-y-1.5">
                    <Label htmlFor="start_date" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Dari Tanggal</Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className={`transition-all duration-200 ${startDate
                        ? "border-emerald-500 dark:border-emerald-400 focus-visible:ring-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10"
                        : ""
                        }`}
                    />
                  </div>
                  <div className="w-full lg:w-48 space-y-1.5">
                    <Label htmlFor="end_date" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Sampai Tanggal</Label>
                    <Input
                      id="end_date"
                      name="end_date"
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className={`transition-all duration-200 ${endDate
                        ? "border-emerald-500 dark:border-emerald-400 focus-visible:ring-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10"
                        : ""
                        }`}
                    />
                  </div>
                  {(searchTerm || startDate || endDate) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="h-10 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-950/30 shrink-0 font-semibold shadow-sm transition-all w-full lg:w-auto whitespace-nowrap"
                    >
                      <RotateCcw className="size-4 mr-2" />
                      Reset Filter
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>



            {/* ── Daftar Muzaqi ────────────────────────────────────────────── */}
            <Card>
              <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      Daftar Muzaqi Sudah Tunaikan
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      {filteredMuzaqi.length > 0
                        ? `${filteredMuzaqi.length} muzaqi${isFiltered ? " · terfilter" : ""}`
                        : "Data akan tampil di sini"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {filteredMuzaqi.length === 0 ? (
                  <div className="py-14 flex flex-col items-center gap-3 text-center">
                    <span className="text-4xl opacity-30">📋</span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-600 dark:text-foreground/70">
                        Data daftar muzaqi belum tersedia
                      </p>
                      <p className="text-xs text-slate-400 dark:text-muted-foreground">
                        Ringkasan total sudah ditampilkan di atas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-white/8 bg-slate-50/60 dark:bg-white/3">
                          {[
                            ["Nama KK", "text-left"],
                            ["Alamat", "text-left"],
                            ["Jiwa", "text-center"],
                            ["Jenis", "text-center"],
                            ["Nominal Zakat", "text-right"],
                            ["Infaq", "text-right"],
                            ["Status", "text-center"],
                            ["Waktu", "text-left"],
                          ].map(([label, align]) => (
                            <th
                              key={label}
                              className={`px-4 py-3 ${align} text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap`}
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/6">
                        {filteredMuzaqi.map((trx, idx) => {
                          const isUang = trx.jenis_bayar === "UANG";
                          const nominalZakat = Number(trx.nominal_zakat || 0);
                          const nominalInfaq = Number(trx.nominal_infaq || 0);
                          const totalBeras = Number(trx.total_beras_kg || 0);
                          return (
                            <tr
                              key={trx.id}
                              className={`hover:bg-slate-50/70 dark:hover:bg-white/3 transition-colors ${idx % 2 === 0 ? "" : "bg-slate-50/30 dark:bg-white/1"
                                }`}
                            >
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-foreground whitespace-nowrap">
                                {trx.nama_kk}
                              </td>
                              <td className="px-4 py-3 text-slate-500 dark:text-foreground/70 whitespace-nowrap">
                                {trx.alamat_muzaqi}
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-slate-700 dark:text-foreground/80">
                                {trx.jumlah_jiwa}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isUang
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    }`}
                                >
                                  {isUang ? "Uang" : "Beras"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800 dark:text-foreground whitespace-nowrap">
                                {isUang
                                  ? fmt(nominalZakat)
                                  : `${totalBeras.toFixed(2)} kg`}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-foreground/80 whitespace-nowrap">
                                {fmt(nominalInfaq)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  ✓ Tunaikan
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 dark:text-muted-foreground whitespace-nowrap text-xs">
                                {fmtTgl(trx.waktu_transaksi)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center pt-2 pb-6">
          <Link
            href="/transparansi"
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg shadow-sm transition-colors"
          >
            ← Kembali ke halaman transparansi
          </Link>
        </div>
      </div>
    </div>
  );
}
