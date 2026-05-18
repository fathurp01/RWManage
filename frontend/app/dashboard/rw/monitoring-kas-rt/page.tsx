"use client";

import { useState, useEffect } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Building2, Wallet, TrendingUp, ArrowRightLeft } from "lucide-react";

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
  const totalMasukSemuaRT = data.reduce((acc, curr) => acc + curr.total_masuk, 0);
  const totalKeluarSemuaRT = data.reduce((acc, curr) => acc + curr.total_keluar, 0);
  const rataRataKepatuhan = data.length > 0 ? data.reduce((acc, curr) => acc + curr.persentase_bayar, 0) / data.length : 0;

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Page Header ── */}
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

      {loading ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-12 text-center shadow-sm">
          <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-violet-200 border-t-violet-500 mx-auto" />
          <p className="mt-4 text-base font-semibold text-slate-500">Memuat data monitoring kas RT...</p>
          <p className="text-sm text-slate-400 mt-1">Mohon tunggu sebentar</p>
        </div>
      ) : (
        <>
          {/* ── Panel Ringkasan Kas (3 Card Grid) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Total Saldo */}
            <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-violet-500 to-purple-600 rounded-t-3xl" />
              <div className="p-5 pt-6 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-violet-600">Total Saldo Gabungan RT</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                    Rp {totalSaldoSemuaRT.toLocaleString("id-ID")}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Akumulasi kas aktif dari {data.length} unit RT.
                  </p>
                </div>
                <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 shrink-0">
                  <Wallet className="size-5" />
                </span>
              </div>
            </div>

            {/* Card 2: Cash Flow (Arus Kas) */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-slate-400 to-slate-500 rounded-t-3xl" />
              <div className="p-5 pt-6 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Akumulasi Arus Kas RT</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kas Masuk</span>
                      <span className="text-sm font-extrabold text-emerald-600 tabular-nums mt-0.5 block">
                        +Rp {totalMasukSemuaRT.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kas Keluar</span>
                      <span className="text-sm font-extrabold text-rose-500 tabular-nums mt-0.5 block">
                        -Rp {totalKeluarSemuaRT.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 dark:bg-slate-950/40 dark:text-slate-400 shrink-0">
                  <TrendingUp className="size-5" />
                </span>
              </div>
            </div>

            {/* Card 3: Rata-rata Kepatuhan */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500 to-amber-600 rounded-t-3xl" />
              <div className="p-5 pt-6 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Rata-Rata Kepatuhan Warga</p>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {rataRataKepatuhan.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Pembayaran Iuran</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${rataRataKepatuhan}%` }}
                    />
                  </div>
                </div>
                <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 shrink-0">
                  <ArrowRightLeft className="size-5" />
                </span>
              </div>
            </div>
          </div>

          {/* ── Panel: Daftar Saldo Kas RT ── */}
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Building2 className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Daftar Saldo &amp; Kepatuhan Kas RT</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Berdasarkan data rincian transaksi real-time yang diinput oleh masing-masing RT.</p>
                </div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-100">
                {data.length} RT Terdata
              </span>
            </div>

            {/* Panel Body */}
            <div className="p-6">
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/70 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Unit RT / Blok</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Kepatuhan Warga</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total Masuk</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total Keluar</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Saldo Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-sm font-medium text-slate-400">
                          Belum ada data kas RT yang tercatat di wilayah Anda.
                        </td>
                      </tr>
                    ) : (
                      data.map((item) => (
                        <tr
                          key={item.blok_wilayah_id}
                          className="hover:bg-slate-50/50 transition-colors duration-150"
                        >
                          {/* Unit RT / Blok */}
                          <td className="px-6 py-4">
                            <p className="font-bold text-sm text-slate-800">{item.nama_blok}</p>
                            <p className="text-xs text-slate-500 font-medium mt-1">Unit RT {item.no_rt ?? "-"}</p>
                          </td>

                          {/* Kepatuhan */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`text-sm font-extrabold tabular-nums ${item.persentase_bayar > 80
                                  ? "text-emerald-600"
                                  : item.persentase_bayar > 50
                                    ? "text-amber-600"
                                    : "text-rose-600"
                                }`}>
                                {item.persentase_bayar.toFixed(1)}%
                              </span>
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${item.persentase_bayar > 80
                                      ? "bg-emerald-500"
                                      : item.persentase_bayar > 50
                                        ? "bg-amber-500"
                                        : "bg-rose-500"
                                    }`}
                                  style={{ width: `${item.persentase_bayar}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Total Masuk */}
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold tabular-nums text-emerald-600">
                              +Rp {item.total_masuk.toLocaleString("id-ID")}
                            </span>
                          </td>

                          {/* Total Keluar */}
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold tabular-nums text-rose-500">
                              -Rp {item.total_keluar.toLocaleString("id-ID")}
                            </span>
                          </td>

                          {/* Saldo Akhir */}
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-extrabold tabular-nums text-violet-700">
                              Rp {item.saldo.toLocaleString("id-ID")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
