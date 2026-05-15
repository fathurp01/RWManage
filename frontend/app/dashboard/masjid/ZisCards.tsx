"use client";

import { cn } from "@/lib/utils";

interface DashboardZisPayload {
  masjid_id: string;
  total_beras: number;
  total_uang_zakat: number;
  total_infaq: number;
  total_kk?: number;
  total_jiwa?: number;
  total_dana_distribusi?: number;
}

type Distribution = {
  fakir: number;
  amil: number;
  fisabilillah: number;
  lainnya: number;
};

interface PengaturanZis {
  persen_fakir: number;
  persen_amil: number;
  persen_fisabilillah: number;
  persen_lainnya: number;
}

const distributionLabels: {
  key: keyof Distribution;
  label: string;
  pctKey: keyof PengaturanZis;
}[] = [
    { key: "fakir", label: "Fakir Miskin", pctKey: "persen_fakir" },
    { key: "amil", label: "Amil", pctKey: "persen_amil" },
    { key: "fisabilillah", label: "Fisabilillah", pctKey: "persen_fisabilillah" },
    { key: "lainnya", label: "Lainnya", pctKey: "persen_lainnya" },
  ];

interface KasData {
  total_kas_masuk: number;
  total_kas_keluar: number;
  saldo_kas: number;
}

export default function ZisCards({
  dashboardData,
  fixedUangDistribution,
  fixedBerasDistribution,
  formatRupiah,
  pengaturanZis,
  kasData,
}: {
  dashboardData: DashboardZisPayload;
  fixedUangDistribution: Distribution;
  fixedBerasDistribution: Distribution;
  formatRupiah: (value: number) => string;
  pengaturanZis?: PengaturanZis;
  kasData?: KasData | null;
}) {
  const totalUangZakat = Number(dashboardData.total_uang_zakat || 0);
  const totalInfaq = Number(dashboardData.total_infaq || 0);
  const totalBeras = Number(dashboardData.total_beras || 0);
  const totalKk = dashboardData.total_kk ?? 0;
  const totalJiwa = dashboardData.total_jiwa ?? 0;
  const totalDanaDistribusi = dashboardData.total_dana_distribusi ?? (totalUangZakat + totalInfaq);

  const persen = pengaturanZis ?? {
    persen_fakir: 62.5,
    persen_amil: 8,
    persen_fisabilillah: 11,
    persen_lainnya: 18.5,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Card Kas Masjid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={cn(
          "rounded-2xl border shadow-sm px-5 py-4",
          !kasData || kasData.saldo_kas >= 0
            ? "border-blue-200/70 dark:border-blue-800/30 bg-blue-50/60 dark:bg-blue-950/20"
            : "border-rose-200/70 dark:border-rose-800/30 bg-rose-50/60 dark:bg-rose-950/20"
        )}>
          <p className="text-xs font-semibold text-blue-600/70 dark:text-blue-400/70 mb-1.5">Total Kas Masjid</p>
          <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground">
            {kasData != null ? formatRupiah(kasData.saldo_kas) : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/30 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-emerald-600/70 dark:text-emerald-400/70 mb-1.5">Total Pemasukan Kas</p>
          <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground">
            {kasData != null ? formatRupiah(kasData.total_kas_masuk) : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200/70 dark:border-rose-800/30 bg-rose-50/60 dark:bg-rose-950/20 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-rose-600/70 dark:text-rose-400/70 mb-1.5">Total Pengeluaran Kas</p>
          <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground">
            {kasData != null ? formatRupiah(kasData.total_kas_keluar) : "-"}
          </p>
        </div>
      </div>

      {/* ── Card 1: Penerimaan (3 kolom terpisah jelas) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-card shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-1.5">Total Beras (kg)</p>
          <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground">
            {totalBeras.toFixed(2)} kg
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/30 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-emerald-600/70 dark:text-emerald-400/70 mb-1.5">Total Uang Zakat (Rp)</p>
          <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground">
            {formatRupiah(totalUangZakat)}
          </p>
        </div>
        <div className="rounded-2xl border border-teal-200/70 dark:border-teal-800/30 bg-teal-50/60 dark:bg-teal-950/20 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-teal-600/70 dark:text-teal-400/70 mb-1.5">Total Infaq (Rp)</p>
          <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground">
            {formatRupiah(totalInfaq)}
          </p>
        </div>
      </div>



      {/* ── Card 2: Detail Distribusi ── */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-card shadow-sm overflow-hidden">
        {/* Baris 2a: KK/Jiwa | Dana Distribusi | Breakdown Dana */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/8">
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-1.5">Total KK / Jiwa</p>
            <p className="text-lg tabular-nums text-slate-900 dark:text-foreground">
              <span className="font-extrabold">{totalKk} KK</span>
              <span className="text-slate-400 dark:text-muted-foreground"> • </span>
              <span className="font-extrabold">{totalJiwa} Jiwa</span>
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-1.5">Total Dana Distribusi (Rp)</p>
            <p className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-foreground">
              {formatRupiah(totalDanaDistribusi)}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2">Breakdown Distribusi</p>
            <ul className="space-y-1.5">
              {distributionLabels.map(({ key, label, pctKey }) => (
                <li key={key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-600 dark:text-foreground/80">
                    {label} ({persen[pctKey]}%):
                  </span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-foreground">
                    {formatRupiah(fixedUangDistribution[key])}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider dalam card 2 */}
        <div className="h-px bg-slate-100 dark:bg-white/8" />

        {/* Baris 2b: Beras Distribusi | Breakdown Beras */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/8">
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-1.5">Total Beras Distribusi (kg)</p>
            <p className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-foreground">
              {totalBeras.toFixed(2)} kg
            </p>
          </div>
          <div className="px-5 py-4 sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2">Breakdown Distribusi Beras</p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {distributionLabels.map(({ key, label, pctKey }) => (
                <li key={key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-600 dark:text-foreground/80">
                    {label} ({persen[pctKey]}%):
                  </span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-foreground">
                    {fixedBerasDistribution[key].toFixed(2)} kg
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

