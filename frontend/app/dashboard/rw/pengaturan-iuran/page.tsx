"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, AlertCircle, Calculator, Download, History, ArrowRightLeft } from "lucide-react";
import { api, getApiError } from "@/lib/axios";

type PengaturanIuranHistoryRecord = {
  id: string;
  created_at: string;
  keterangan: string | null;
  data_lama: {
    nominal_iuran: number | string;
    persen_rt: number;
    persen_rw: number;
  } | null;
  data_baru: {
    nominal_iuran: number | string;
    persen_rt: number;
    persen_rw: number;
  } | null;
  perubahan: Array<{
    field: "nominal_iuran" | "persen_rt" | "persen_rw";
    label: string;
    lama: number | string | null;
    baru: number | string | null;
  }>;
  user: {
    id: string;
    nama: string;
    email: string;
    role: string;
  } | null;
};

const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return "-";
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const formatPercent = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return "-";
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  return `${numericValue}%`;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function PengaturanIuranPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [nominal, setNominal] = useState("");
  const [persenRT, setPersenRT] = useState(70);
  const [persenRW, setPersenRW] = useState(30);
  const [history, setHistory] = useState<PengaturanIuranHistoryRecord[]>([]);

  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rw/pengaturan-iuran");
      if (res.data.success && res.data.data) {
        setNominal(res.data.data.nominal_iuran.toString());
        setPersenRT(res.data.data.persen_rt);
        setPersenRW(res.data.data.persen_rw);
      }
    } catch (error) {
      const apiError = getApiError(error);
      if (apiError.status !== 404) {
        toast.error("Gagal mengambil data pengaturan.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get<{ success: boolean; data: PengaturanIuranHistoryRecord[] }>("/rw/pengaturan-iuran/history");
      if (res.data.success) {
        setHistory(res.data.data ?? []);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || "Gagal mengambil histori pengaturan.");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportHistory = () => {
    if (history.length === 0) {
      toast.error("Belum ada histori untuk diekspor.");
      return;
    }
    const escapeCsv = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);
      return `"${text.replaceAll('"', '""')}"`;
    };
    const headers = ["Waktu", "Diubah Oleh", "Keterangan", "Nominal Lama", "Nominal Baru", "Kas RT Lama", "Kas RT Baru", "Kas RW Lama", "Kas RW Baru", "Perubahan"];
    const rows = history.map((item) => [
      formatDateTime(item.created_at),
      item.user?.nama || item.user?.email || "-",
      item.keterangan || "-",
      formatCurrency(item.data_lama?.nominal_iuran),
      formatCurrency(item.data_baru?.nominal_iuran),
      formatPercent(item.data_lama?.persen_rt),
      formatPercent(item.data_baru?.persen_rt),
      formatPercent(item.data_lama?.persen_rw),
      formatPercent(item.data_baru?.persen_rw),
      item.perubahan.map((c) => `${c.label}: ${c.lama ?? "-"} → ${c.baru ?? "-"}`).join("; "),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `histori-pengaturan-iuran-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (persenRT + persenRW !== 100) {
      toast.error("Total persentase harus 100%");
      return;
    }
    try {
      setSaving(true);
      const res = await api.post("/rw/pengaturan-iuran", {
        nominal_iuran: Number(nominal),
        persen_rt: Number(persenRT),
        persen_rw: Number(persenRW),
      });
      if (res.data.success) {
        toast.success("Pengaturan berhasil disimpan.");
        await loadHistory();
      } else {
        toast.error(res.data.message || "Gagal menyimpan pengaturan.");
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const nominalNum = Number(nominal) || 0;
  const totalValid = persenRT + persenRW === 100;

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/30">
            <Settings className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Pengaturan Iuran
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Nominal iuran bulanan dan pembagian otomatis ke Kas RT dan Kas RW
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
            Memuat pengaturan iuran...
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Settings Form */}
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="size-4 text-violet-500" />
                Form Pengaturan Iuran
              </CardTitle>
              <CardDescription>
                Standarisasi iuran per kepala keluarga untuk seluruh RT di wilayah RW
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">

              {/* Nominal */}
              <div className="space-y-1.5">
                <Label htmlFor="nominal" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                  Nominal Iuran Bulanan (Rp)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 select-none">Rp</span>
                  <Input
                    id="nominal"
                    type="number"
                    placeholder="Contoh: 100000"
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                    required
                    min={1000}
                    step={1000}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-slate-400 italic">
                  * Nominal ini dibebankan sama rata ke setiap kepala keluarga di semua RT.
                </p>
              </div>

              {/* Porsi RT & RW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <Label htmlFor="persenRT" className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    Porsi Kas RT (%)
                  </Label>
                  <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
                    Bagian nominal iuran yang masuk ke kas RT.
                  </p>
                  <Input
                    id="persenRT"
                    type="number"
                    min={0}
                    max={100}
                    value={persenRT}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value)));
                      setPersenRT(val);
                      setPersenRW(100 - val);
                    }}
                    required
                    className="text-center font-bold text-lg bg-white dark:bg-card"
                  />
                </div>

                <div className="space-y-1.5 p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30">
                  <Label htmlFor="persenRW" className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-violet-500" />
                    Porsi Kas RW (%)
                  </Label>
                  <p className="text-xs text-violet-700/70 dark:text-violet-300/70">
                    Bagian nominal iuran yang masuk ke kas RW.
                  </p>
                  <Input
                    id="persenRW"
                    type="number"
                    min={0}
                    max={100}
                    value={persenRW}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value)));
                      setPersenRW(val);
                      setPersenRT(100 - val);
                    }}
                    required
                    className="text-center font-bold text-lg bg-white dark:bg-card"
                  />
                </div>
              </div>

              {/* Validation warning */}
              {!totalValid && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                  <AlertCircle className="size-4 shrink-0" />
                  <span className="text-sm font-semibold">
                    Total persentase harus 100%! Saat ini: {persenRT + persenRW}%
                  </span>
                </div>
              )}

              {/* Simulasi Pembagian */}
              {nominalNum > 0 && totalValid && (
                <div className="rounded-2xl border border-slate-100 dark:border-white/8 bg-slate-50/60 dark:bg-white/3 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Simulasi Pembagian Per Warga
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-white/8 rounded px-2 py-0.5">
                      AUTO SPLIT
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-muted-foreground mb-0.5">RT akan menerima:</p>
                      <p className="text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Math.round((nominalNum * persenRT) / 100))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-muted-foreground mb-0.5">RW akan menerima:</p>
                      <p className="text-lg font-extrabold tabular-nums text-violet-600 dark:text-violet-400">
                        {formatCurrency(Math.round((nominalNum * persenRW) / 100))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <ArrowRightLeft className="mt-0.5 size-4 text-violet-500 shrink-0" />
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-foreground">Catatan pembagian</h3>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground">
                      Kolom Kas RT dan Kas RW dipisahkan agar pembagian dana mudah dibaca dan tidak tercampur.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="rw"
                disabled={saving || !totalValid}
                className="w-full gap-2"
              >
                {saving ? (
                  <>
                    <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Simpan &amp; Terapkan Kebijakan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {/* History */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4 text-slate-400" />
                Histori Perubahan Iuran
              </CardTitle>
              <CardDescription>
                Menampilkan kapan perubahan dilakukan, siapa yang mengubah, dan nilai sebelum-sesudahnya.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={exportHistory}
              disabled={historyLoading || history.length === 0}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {historyLoading ? (
            <div className="text-sm text-slate-500 dark:text-muted-foreground">Memuat histori...</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">
              Belum ada histori perubahan pengaturan iuran.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-100 dark:border-white/8 bg-slate-50/40 dark:bg-white/3 p-4 space-y-3"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                      Perubahan #{history.length - idx}
                      {item.user ? (
                        <span className="font-normal">
                          {" "}— oleh <span className="font-semibold text-slate-700 dark:text-slate-300">{item.user.nama || item.user.email}</span>
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                  </div>

                  {/* Changed values */}
                  {item.perubahan.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {item.perubahan.map((change) => {
                        const isNominal = change.field === "nominal_iuran";
                        const lamaStr = isNominal ? formatCurrency(Number(change.lama)) : formatPercent(change.lama);
                        const baruStr = isNominal ? formatCurrency(Number(change.baru)) : formatPercent(change.baru);
                        return (
                          <div key={change.field} className="rounded-xl bg-white dark:bg-card border border-slate-100 dark:border-white/8 p-3">
                            <p className="text-xs text-slate-400 mb-1">{change.label}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-slate-400 line-through tabular-nums">{lamaStr}</span>
                              <span className="text-slate-300 dark:text-slate-600">→</span>
                              <span className="text-sm font-bold text-slate-800 dark:text-foreground tabular-nums">{baruStr}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Tidak ada perubahan nilai yang terdeteksi.</p>
                  )}

                  {item.keterangan && (
                    <p className="text-xs italic text-slate-400 border-t border-slate-100 dark:border-white/8 pt-2">
                      Catatan: {item.keterangan}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
