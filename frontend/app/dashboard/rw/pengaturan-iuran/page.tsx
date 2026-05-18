"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, AlertCircle, Calculator, Download, History, ArrowRightLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { api, getApiError } from "@/lib/axios";

type PengaturanIuranHistoryRecord = {
  id: string;
  created_at: string;
  keterangan: string | null;
  data_lama: {
    nominal_iuran: number | string;
    nominal_iuran_kurang_mampu?: number | string;
    nominal_iuran_lansia?: number | string;
    persen_rt: number;
    persen_rw: number;
  } | null;
  data_baru: {
    nominal_iuran: number | string;
    nominal_iuran_kurang_mampu?: number | string;
    nominal_iuran_lansia?: number | string;
    persen_rt: number;
    persen_rw: number;
  } | null;
  perubahan: Array<{
    field: "nominal_iuran" | "nominal_iuran_kurang_mampu" | "nominal_iuran_lansia" | "persen_rt" | "persen_rw";
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
  if (numericValue === 0) return "Rp 0 (Gratis)";
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
  const [nominalKurangMampu, setNominalKurangMampu] = useState("");
  const [nominalLansia, setNominalLansia] = useState("");
  const [persenRT, setPersenRT] = useState(70);
  const [persenRW, setPersenRW] = useState(30);
  const [history, setHistory] = useState<PengaturanIuranHistoryRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  const totalHistoryPages = Math.ceil(history.length / historyItemsPerPage);
  const activeHistoryPage = historyPage > totalHistoryPages ? Math.max(1, totalHistoryPages) : historyPage;

  const indexOfLastHistoryItem = activeHistoryPage * historyItemsPerPage;
  const indexOfFirstHistoryItem = indexOfLastHistoryItem - historyItemsPerPage;
  const currentHistoryItems = history.slice(indexOfFirstHistoryItem, indexOfLastHistoryItem);

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
        setNominalKurangMampu((res.data.data.nominal_iuran_kurang_mampu ?? 0).toString());
        setNominalLansia((res.data.data.nominal_iuran_lansia ?? 0).toString());
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
        setHistoryPage(1);
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
      "Kurang Mampu Lama",
      "Kurang Mampu Baru",
      "Lansia Lama",
      "Lansia Baru",
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
      formatCurrency(item.data_lama?.nominal_iuran_kurang_mampu),
      formatCurrency(item.data_baru?.nominal_iuran_kurang_mampu),
      formatCurrency(item.data_lama?.nominal_iuran_lansia),
      formatCurrency(item.data_baru?.nominal_iuran_lansia),
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
        nominal_iuran_kurang_mampu: Number(nominalKurangMampu),
        nominal_iuran_lansia: Number(nominalLansia),
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
  const nominalKMNum = Number(nominalKurangMampu) || 0;
  const nominalLansiaNum = Number(nominalLansia) || 0;
  const totalValid = persenRT + persenRW === 100;

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Page Header ── */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/30">
            <Settings className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Pengaturan Iuran RT
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Nominal iuran berjenjang bulanan berdasarkan kategori keluarga (Mampu, Kurang Mampu, Lansia)
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-12 text-center shadow-sm">
          <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-violet-200 border-t-violet-500 mx-auto" />
          <p className="mt-4 text-base font-semibold text-slate-500">Memuat pengaturan iuran...</p>
          <p className="text-sm text-slate-400 mt-1">Mohon tunggu sebentar</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-6">

          {/* ── Panel: Nominal Iuran Keluarga ── */}
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Calculator className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-800">Nominal Iuran Bulanan Warga</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Besaran iuran wajib per bulan berdasarkan kategori ekonomi keluarga. Lansia dapat dibebaskan dengan nominal <strong>Rp 0</strong>.
                </p>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Nominal Mampu */}
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <p className="text-sm font-semibold text-slate-700">Keluarga Mampu</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 select-none pointer-events-none">Rp</span>
                    <Input
                      id="nominal"
                      type="number"
                      placeholder="Contoh: 50000"
                      value={nominal}
                      onChange={(e) => setNominal(e.target.value)}
                      required
                      min={0}
                      step={1000}
                      className="pl-8 h-11 rounded-xl text-sm font-semibold"
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-1.5">Tarif bulanan standar warga mampu.</p>
                </div>

                {/* Nominal Kurang Mampu */}
                <div className="space-y-2 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/50">
                  <p className="text-sm font-semibold text-amber-700">Keluarga Kurang Mampu</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-amber-500/80 select-none pointer-events-none">Rp</span>
                    <Input
                      id="nominalKurangMampu"
                      type="number"
                      placeholder="Contoh: 20000"
                      value={nominalKurangMampu}
                      onChange={(e) => setNominalKurangMampu(e.target.value)}
                      required
                      min={0}
                      step={1000}
                      className="pl-8 h-11 rounded-xl text-sm font-semibold border-amber-200 focus-visible:ring-amber-400"
                    />
                  </div>
                  <p className="text-sm text-amber-600/80 mt-1.5">Tarif bersubsidi untuk warga tidak mampu.</p>
                </div>

                {/* Nominal Lansia */}
                <div className="space-y-2 p-4 rounded-2xl bg-sky-50/60 border border-sky-200/50">
                  <p className="text-sm font-semibold text-sky-700">Keluarga Lansia</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-sky-500/80 select-none pointer-events-none">Rp</span>
                    <Input
                      id="nominalLansia"
                      type="number"
                      placeholder="0 = Gratis"
                      value={nominalLansia}
                      onChange={(e) => setNominalLansia(e.target.value)}
                      required
                      min={0}
                      step={1000}
                      className="pl-8 h-11 rounded-xl text-sm font-semibold border-sky-200 focus-visible:ring-sky-400"
                    />
                  </div>
                  <p className="text-sm text-sky-600/80 mt-1.5">Isi Rp 0 untuk membebaskan iuran lansia.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Panel: Alokasi Porsi Kas ── */}
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ArrowRightLeft className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-800">Pembagian Alokasi Persentase Kas</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Rasio pembagian dana iuran antara Kas RT and Kas RW. <strong>Total harus berjumlah tepat 100%.</strong>
                </p>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Porsi RT */}
                <div className="space-y-2 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/50">
                  <div className="flex items-center gap-2">
                    <div className="size-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <p className="text-sm font-semibold text-emerald-700">Porsi Kas RT (%)</p>
                  </div>
                  <p className="text-sm text-emerald-600/80 mt-1.5">Bagian nominal iuran yang masuk ke kas RT.</p>
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
                    className="text-center font-semibold text-sm h-11 rounded-xl border-emerald-200 focus-visible:ring-emerald-400"
                  />
                </div>

                {/* Porsi RW */}
                <div className="space-y-2 p-4 rounded-2xl bg-violet-50/60 border border-violet-200/50">
                  <div className="flex items-center gap-2">
                    <div className="size-2.5 rounded-full bg-violet-500 shrink-0" />
                    <p className="text-sm font-semibold text-violet-700">Porsi Kas RW (%)</p>
                  </div>
                  <p className="text-sm text-violet-600/80 mt-1.5">Bagian nominal iuran yang masuk ke kas RW.</p>
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
                    className="text-center font-semibold text-sm h-11 rounded-xl border-violet-200 focus-visible:ring-violet-400"
                  />
                </div>
              </div>

              {/* Validation warning */}
              {!totalValid && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/70">
                  <AlertCircle className="size-4 shrink-0" />
                  <span className="text-sm font-semibold">
                    Total persentase harus 100%! Saat ini: {persenRT + persenRW}%
                  </span>
                </div>
              )}

              {/* Simulasi Berjenjang */}
              {totalValid && (
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200/70">
                    <p className="text-sm font-bold text-slate-700">
                      Simulasi Alokasi Iuran Berjenjang
                    </p>
                    <span className="text-xs font-bold text-violet-600 bg-violet-50 rounded-lg px-2.5 py-1 border border-violet-100">
                      RT {persenRT}% | RW {persenRW}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white">
                      <p className="text-sm font-bold text-slate-700 mb-2">Keluarga Mampu ({formatCurrency(nominalNum)})</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-500">Kas RT:</p>
                          <p className="font-bold text-sm text-emerald-600">{formatCurrency(Math.round((nominalNum * persenRT) / 100))}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Kas RW:</p>
                          <p className="font-bold text-sm text-violet-600">{formatCurrency(Math.round((nominalNum * persenRW) / 100))}</p>
                        </div>
                      </div>
                    </div>

                    {/* Simulasi Kurang Mampu */}
                    <div className="p-3.5 rounded-xl border border-amber-100 bg-white">
                      <p className="text-sm font-bold text-amber-700 mb-2">Keluarga Kurang Mampu ({formatCurrency(nominalKMNum)})</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-500">Kas RT:</p>
                          <p className="font-bold text-sm text-emerald-600">{formatCurrency(Math.round((nominalKMNum * persenRT) / 100))}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Kas RW:</p>
                          <p className="font-bold text-sm text-violet-600">{formatCurrency(Math.round((nominalKMNum * persenRW) / 100))}</p>
                        </div>
                      </div>
                    </div>

                    {/* Simulasi Lansia */}
                    <div className="p-3.5 rounded-xl border border-sky-100 bg-white">
                      <p className="text-sm font-bold text-sky-700 mb-2">Keluarga Lansia ({formatCurrency(nominalLansiaNum)})</p>
                      {nominalLansiaNum === 0 ? (
                        <p className="text-sm font-bold text-emerald-500 italic mt-1.5">Rp 0 — Bebas Iuran Bulanan</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-slate-500">Kas RT:</p>
                            <p className="font-bold text-sm text-emerald-600">{formatCurrency(Math.round((nominalLansiaNum * persenRT) / 100))}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Kas RW:</p>
                            <p className="font-bold text-sm text-violet-600">{formatCurrency(Math.round((nominalLansiaNum * persenRW) / 100))}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Info Note ── */}
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-violet-50 text-violet-500 shrink-0 mt-0.5">
                <ArrowRightLeft className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Sistem Iuran Berjenjang</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Sistem akan mencocokkan status warga (Mampu, Kurang Mampu, atau Lansia) secara otomatis pada saat penagihan bulanan dibuat berdasarkan nominal di atas.
                </p>
              </div>
            </div>
          </div>

          {/* ── Tombol Simpan ── */}
          <Button
            type="submit"
            variant="rw"
            disabled={saving || !totalValid}
            className="w-full h-11 gap-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/25"
          >
            {saving ? (
              <>
                <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Simpan &amp; Terapkan Kebijakan Berjenjang
              </>
            )}
          </Button>
        </form>
      )}

      {/* ── Panel: Histori Perubahan ── */}
      <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <History className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-800">Histori Perubahan Iuran</h2>
              <p className="text-xs text-slate-400 mt-0.5">Audit log perubahan nominal dan porsi kas.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 shrink-0 h-9 rounded-xl border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all"
            onClick={exportHistory}
            disabled={historyLoading || history.length === 0}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>

        {/* Panel Body */}
        <div className="p-6">
          {historyLoading ? (
            <div className="py-8 text-center">
              <div className="inline-flex size-10 animate-spin items-center justify-center rounded-full border-4 border-slate-200 border-t-slate-400 mx-auto" />
              <p className="mt-3 text-sm text-slate-500">Memuat histori...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-slate-100 mx-auto">
                <History className="size-6 text-slate-400" />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-500">Belum ada histori perubahan</p>
              <p className="text-xs text-slate-400 mt-1">Histori akan muncul setelah pengaturan pertama kali disimpan.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50/70 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Waktu</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Diubah Oleh</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Detail Perubahan</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentHistoryItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors duration-150"
                      >
                        {/* Waktu */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-slate-800">
                            Perubahan #{history.length - (indexOfFirstHistoryItem + idx)}
                          </div>
                          <div className="text-xs text-slate-400 font-medium mt-1">
                            {formatDateTime(item.created_at)}
                          </div>
                        </td>

                        {/* Diubah Oleh */}
                        <td className="px-6 py-4">
                          {item.user ? (
                            <div>
                              <span className="block text-sm font-bold text-slate-700">
                                {item.user.nama || item.user.email}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 mt-1">
                                {item.user.role}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Detail Perubahan */}
                        <td className="px-6 py-4">
                          {item.perubahan.length > 0 ? (
                            <div className="flex flex-col gap-1.5 max-w-sm">
                              {item.perubahan.map((change) => {
                                const isNominal = ["nominal_iuran", "nominal_iuran_kurang_mampu", "nominal_iuran_lansia"].includes(change.field);
                                const lamaStr = isNominal ? formatCurrency(Number(change.lama)) : formatPercent(change.lama);
                                const baruStr = isNominal ? formatCurrency(Number(change.baru)) : formatPercent(change.baru);
                                return (
                                  <div
                                    key={change.field}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <span className="font-semibold text-slate-500 w-[140px] shrink-0">
                                      {change.label}:
                                    </span>
                                    <div className="flex items-center gap-1.5 font-medium">
                                      <span className="text-slate-400 line-through text-sm tabular-nums">
                                        {lamaStr}
                                      </span>
                                      <span className="text-slate-300">→</span>
                                      <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                                        {baruStr}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 italic">
                              Tidak ada perubahan nilai
                            </span>
                          )}
                        </td>

                        {/* Catatan / Keterangan */}
                        <td className="px-6 py-4 max-w-xs">
                          {item.keterangan ? (
                            <p className="text-sm text-slate-600 italic leading-relaxed break-words">
                              "{item.keterangan}"
                            </p>
                          ) : (
                            <span className="text-sm text-slate-300 italic">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {history.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-4">
                  {/* Info text */}
                  <div className="text-sm font-semibold text-slate-500 select-none">
                    Menampilkan <span className="font-bold text-slate-700">{indexOfFirstHistoryItem + 1}</span> - <span className="font-bold text-slate-700">{Math.min(history.length, activeHistoryPage * historyItemsPerPage)}</span> dari <span className="font-bold text-slate-700">{history.length}</span> histori
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4">
                    {/* Page limit selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">Baris per halaman:</span>
                      <select
                        value={historyItemsPerPage}
                        onChange={(e) => {
                          setHistoryItemsPerPage(Number(e.target.value));
                          setHistoryPage(1);
                        }}
                        className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 focus-visible:border-violet-400 focus-visible:ring-1 focus-visible:ring-violet-400"
                      >
                        {[10, 20, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Navigation arrows */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                        disabled={activeHistoryPage === 1}
                      >
                        <ChevronLeft className="size-4 text-slate-600" />
                        <span className="sr-only">Halaman Sebelumnya</span>
                      </Button>

                      <div className="text-sm font-bold text-slate-700 select-none min-w-[50px] text-center">
                        {activeHistoryPage} / {totalHistoryPages}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        onClick={() => setHistoryPage((prev) => Math.min(totalHistoryPages, prev + 1))}
                        disabled={activeHistoryPage === totalHistoryPages}
                      >
                        <ChevronRight className="size-4 text-slate-600" />
                        <span className="sr-only">Halaman Selanjutnya</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
