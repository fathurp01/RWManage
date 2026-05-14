"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
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

const formatDateTime = (value: string) => new Date(value).toLocaleString("id-ID");

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

    const headers = [
      "Waktu",
      "Diubah Oleh",
      "Keterangan",
      "Nominal Lama",
      "Nominal Baru",
      "Kas RT Lama",
      "Kas RT Baru",
      "Kas RW Lama",
      "Kas RW Baru",
      "Perubahan",
    ];

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
      item.perubahan
        .map((change) => `${change.label}: ${change.lama ?? "-"} → ${change.baru ?? "-"}`)
        .join("; "),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-lg font-medium text-slate-500">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/20">
          <Settings className="size-7" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-foreground mt-2">
          Pengaturan Iuran
        </h1>
        <p className="text-lg text-slate-500 dark:text-muted-foreground max-w-2xl">
          Tentukan nominal iuran bulanan per kepala keluarga yang dibebankan merata ke seluruh RT, lalu atur pembagian otomatis ke Kas RT dan Kas RW.
        </p>
      </div>

      <Card className="border-none shadow-lg shadow-slate-200/40 dark:shadow-none bg-white/90 dark:bg-card/50 backdrop-blur-xl">
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Pengaturan Iuran Per Kepala Keluarga</CardTitle>
          <CardDescription>
            Nominal ini berlaku sama untuk setiap kepala keluarga di seluruh RT dalam wilayah RW ini. Detail per warga tetap dilihat di menu Data Penduduk.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 grid gap-4 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
          <div className="space-y-2">
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Pengaturan ini adalah kebijakan wilayah, bukan per blok. RT menggunakan nominal yang sama saat menagih iuran ke warga.
            </p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Pembagian kas dipisahkan jelas menjadi dua kolom: bagian Kas RT dan bagian Kas RW.
            </p>
          </div>
          <Link href="/dashboard/rw/data-penduduk" className="lg:justify-self-end">
            <Button variant="outline" className="gap-2 w-full lg:w-auto">
              Buka Data Penduduk
            </Button>
          </Link>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="max-w-3xl">
        <div className="grid gap-8 md:grid-cols-1">
          <Card className="overflow-hidden border-none shadow-2xl shadow-slate-200/60 dark:shadow-none bg-white/90 dark:bg-card/50 backdrop-blur-xl">
            <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white dark:bg-white/10 shadow-sm">
                  <Calculator className="size-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Kebijakan Iuran Wilayah</CardTitle>
                  <CardDescription>Standarisasi iuran per kepala keluarga untuk seluruh RT di wilayah RW</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <Label htmlFor="nominal" className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  Nominal Iuran Bulanan
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">Rp</span>
                  <Input
                    id="nominal"
                    type="number"
                    placeholder="Contoh: 100000"
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                    required
                    className="pl-16 text-3xl font-black h-20 bg-slate-50/50 border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-2xl"
                  />
                </div>
                <p className="text-sm text-slate-400 font-medium italic">
                  * Nominal ini dibebankan sama rata ke setiap kepala keluarga di semua RT.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <Label htmlFor="persenRT" className="text-base font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    Porsi untuk Kas RT
                  </Label>
                  <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80">
                    Bagian nominal iuran yang masuk ke kas RT.
                  </p>
                  <div className="relative">
                    <Input
                      id="persenRT"
                      type="number"
                      max="100"
                      value={persenRT}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                        setPersenRT(val);
                        setPersenRW(100 - val);
                      }}
                      required
                      className="text-4xl font-black h-16 bg-white dark:bg-card border-none text-center rounded-xl"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-400">%</span>
                  </div>
                </div>

                <div className="space-y-3 p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                  <Label htmlFor="persenRW" className="text-base font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-2">
                    <div className="size-2 rounded-full bg-indigo-500" />
                    Porsi untuk Kas RW
                  </Label>
                  <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80">
                    Bagian nominal iuran yang masuk ke kas RW.
                  </p>
                  <div className="relative">
                    <Input
                      id="persenRW"
                      type="number"
                      max="100"
                      value={persenRW}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                        setPersenRW(val);
                        setPersenRT(100 - val);
                      }}
                      required
                      className="text-4xl font-black h-16 bg-white dark:bg-card border-none text-center rounded-xl"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-indigo-400">%</span>
                  </div>
                </div>
              </div>

              {(persenRT + persenRW !== 100) && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 animate-pulse">
                  <AlertCircle className="size-6" />
                  <span className="font-bold">Total persentase harus 100%! Saat ini: {persenRT + persenRW}%</span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="bg-slate-900 dark:bg-white/5 rounded-3xl p-8 text-white space-y-6 shadow-2xl shadow-slate-900/20">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Simulasi Pembagian Per Warga:</p>
                  <div className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold">AUTOMATIC SPLIT</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400">RT akan menerima:</p>
                    <p className="text-4xl font-black text-emerald-400">
                      Rp {((Number(nominal) * persenRT) / 100).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400">RW akan menerima:</p>
                    <p className="text-4xl font-black text-indigo-400">
                      Rp {((Number(nominal) * persenRW) / 100).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start gap-3">
                  <ArrowRightLeft className="mt-1 size-5 text-indigo-500" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">Catatan pembagian</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Kolom Kas RT dan Kas RW dipisahkan agar pembagian dana mudah dibaca dan tidak tercampur.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={saving || (persenRT + persenRW !== 100)}
                className="w-full h-20 bg-linear-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white text-xl font-black rounded-2xl shadow-xl shadow-indigo-500/40 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving ? (
                  <span className="flex items-center gap-3">
                    <div className="size-6 animate-spin rounded-full border-4 border-white border-t-transparent" />
                    Menyimpan...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <Save className="size-6" />
                    Simpan & Terapkan Kebijakan
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>

      <Card className="border-none shadow-lg shadow-slate-200/40 dark:shadow-none bg-white/90 dark:bg-card/50 backdrop-blur-xl">
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4 flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-indigo-500" />
              Histori Perubahan Iuran
            </CardTitle>
            <CardDescription>
              Menampilkan kapan perubahan dilakukan, siapa yang mengubah, dan nilai sebelum-sesudahnya.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={exportHistory} disabled={historyLoading || history.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="pt-5">
          {historyLoading ? (
            <div className="text-sm text-slate-500">Memuat histori...</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Diubah Oleh</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Kas RT</TableHead>
                    <TableHead>Kas RW</TableHead>
                    <TableHead>Detail Perubahan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="align-top whitespace-nowrap">{formatDateTime(item.created_at)}</TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{item.user?.nama || "-"}</div>
                        <div className="text-xs text-slate-500">{item.user?.email || "-"}</div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-xs text-slate-500">{formatCurrency(item.data_lama?.nominal_iuran)}</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">→ {formatCurrency(item.data_baru?.nominal_iuran)}</div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-xs text-slate-500">{formatPercent(item.data_lama?.persen_rt)}</div>
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400">→ {formatPercent(item.data_baru?.persen_rt)}</div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-xs text-slate-500">{formatPercent(item.data_lama?.persen_rw)}</div>
                        <div className="font-semibold text-indigo-600 dark:text-indigo-400">→ {formatPercent(item.data_baru?.persen_rw)}</div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          {item.keterangan ? <p className="text-sm text-slate-700 dark:text-slate-300">{item.keterangan}</p> : null}
                          {item.perubahan.length > 0 ? (
                            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                              {item.perubahan.map((change) => (
                                <li key={change.field}>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">{change.label}:</span>{" "}
                                  {String(change.lama ?? "-")} → {String(change.baru ?? "-")}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-slate-500">Tidak ada perubahan nilai terdeteksi.</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        Belum ada histori perubahan pengaturan iuran.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
