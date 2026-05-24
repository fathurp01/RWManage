"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, downloadApiFile, getApiError } from "@/lib/axios";
import { cicilanIuranClient, type CicilanIuranRecord } from "@/lib/api/cicilanIuran";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  CreditCard,
  HandCoins,
  Search,
  Loader2,
  Coins,
  ListChecks,
  History,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  FileDown,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface IuranItem {
  id: string | null;
  warga_id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: "BELUM" | "LUNAS";
  kode_unik: string | null;
  tanggal_bayar: string | null;
  cicilan: CicilanItem[];
}

interface PembayaranCicilanItem {
  id: string;
  nominal: string | number;
  tanggal_bayar: string;
  keterangan?: string;
}

interface CicilanItem {
  id: string;
  total_cicilan: string | number;
  nominal_per_bulan: string | number;
  jumlah_bulan: number;
  bulan_mulai: number;
  tahun_mulai: number;
  sudah_lunas: boolean;
  created_at: string;
  pembayaran?: PembayaranCicilanItem[];
}

interface WargaIuran {
  id: string;
  nama_kk: string;
  status_keluarga?: "MAMPU" | "KURANG_MAMPU" | "LANSIA";
  tarif_iuran_bulanan: number;
  iuran: IuranItem[];
}

interface RtIuranResponse {
  data: {
    blok_wilayah_id: string;
    no_rt: string;
    nama_blok: string;
    persen_rt?: number;
    persen_rw?: number;
    tahun: number;
    bulan: number | null;
    status: "BELUM" | "LUNAS" | null;
    warga: WargaIuran[];
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

const months = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Agt" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Okt" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Des" },
];

const monthsFull = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const currentYear = new Date().getFullYear();

type MonthTone = "danger" | "warning" | "success";

const toneClasses: Record<MonthTone, string> = {
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-300 dark:hover:bg-rose-950/40",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-300 dark:hover:bg-amber-950/40",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-300 dark:hover:bg-emerald-950/40",
};

const badgeToneClasses: Record<MonthTone, string> = {
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-300",
};

const selectClass =
  "h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 dark:border-white/10 px-3.5 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50";

const formatCurrency = (value: number | string | null | undefined) =>
  `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(
    new Date(value)
  );
};

const formatDateShort = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
};

const getMonthLabel = (month: number) =>
  monthsFull.find((item) => item.value === month)?.label ?? `Bulan ${month}`;

const getIuranTone = (
  iuran: IuranItem
): { tone: MonthTone; label: string; hint: string; cicilan: CicilanItem | null } => {
  const activeCicilan = iuran.cicilan.find((item) => !item.sudah_lunas) ?? null;

  if (iuran.status === "LUNAS") {
    return {
      tone: "success",
      label: "Lunas",
      hint: "Klik untuk melihat detail transaksi dan kode transparansi.",
      cicilan: activeCicilan,
    };
  }

  if (activeCicilan) {
    return {
      tone: "warning",
      label: "Cicilan",
      hint: "Klik untuk melihat sisa cicilan yang perlu diselesaikan.",
      cicilan: activeCicilan,
    };
  }

  return {
    tone: "danger",
    label: "Belum",
    hint: "Klik untuk melihat rincian nominal yang harus dibayar.",
    cicilan: null,
  };
};

export default function ManajemenIuranPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RtIuranResponse["data"] | null>(null);

  const persenRt = data?.persen_rt ?? 70;
  const persenRw = data?.persen_rw ?? 30;
  const [searchNama, setSearchNama] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<{ wargaName: string; iuran: IuranItem } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWargaIdForCreate, setSelectedWargaIdForCreate] = useState("");
  const [selectedIuranIdsForCreate, setSelectedIuranIdsForCreate] = useState<string[]>([]);
  const [jumlahBulanForCreate, setJumlahBulanForCreate] = useState("3");
  const [saving, setSaving] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payOverlayOpen, setPayOverlayOpen] = useState(false);

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [defaultData, setDefaultData] = useState<RtIuranResponse["data"] | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryItem[]>([]);

  // Pagination for history
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;

  // Pagination for tagihan iuran
  const [tagihanPage, setTagihanPage] = useState(1);
  const [tagihanPageSize, setTagihanPageSize] = useState(10);

  // Pagination for warga bebas iuran
  const [bebasPage, setBebasPage] = useState(1);
  const bebasPageSize = 10;

  const loadData = useCallback(async (yearToLoad = selectedYear) => {
    try {
      setLoading(true);
      setError(null);
      const yearNum = Number(yearToLoad);
      const res = await api.get<RtIuranResponse>("/rt/iuran", { params: { tahun: yearNum } });
      setData(res.data.data);

      if (yearNum === currentYear) {
        setDefaultData(res.data.data);
      } else {
        const resDefault = await api.get<RtIuranResponse>("/rt/iuran", { params: { tahun: currentYear } });
        setDefaultData(resDefault.data.data);
      }
    } catch (err: any) {
      const apiError = getApiError(err);
      setError(apiError.message);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  const loadHistory = useCallback(async (tahun?: string) => {
    try {
      const res = await api.get<{ data: HistoryItem[] }>("/rt/iuran/history", {
        params: { tahun: tahun ? Number(tahun) : undefined },
      });
      setHistoryRows(res.data.data ?? []);
      setHistoryPage(1);
    } catch (error) {
      toast.error(getApiError(error).message);
      setHistoryRows([]);
    }
  }, []);

  useEffect(() => {
    loadData(selectedYear);
    loadHistory(selectedYear);
    setTagihanPage(1);
    setBebasPage(1);
  }, [selectedYear, loadData, loadHistory]);

  const openDetail = (wargaName: string, iuran: IuranItem) => {
    setSelectedDetail({ wargaName, iuran });
    setDetailOpen(true);
  };

  const handlePrimaryAction = async () => {
    if (!selectedDetail?.iuran?.id) return;

    let isOpeningPayOverlay = false;
    try {
      const meta = getIuranTone(selectedDetail.iuran);
      if (meta.tone === "warning" && meta.cicilan) {
        // Intercept to show the payment input overlay
        const activeCicilan = meta.cicilan;
        const totalTerbayar = activeCicilan.pembayaran?.reduce((acc, p) => acc + Number(p.nominal), 0) ?? 0;
        const sisaCicilan = Number(activeCicilan.total_cicilan) - totalTerbayar;
        const sisaKali = activeCicilan.jumlah_bulan - (activeCicilan.pembayaran?.length ?? 0);
        const recommended = sisaCicilan / (sisaKali > 0 ? sisaKali : 1);

        setPayAmount(String(Math.round(recommended)));
        setPayOverlayOpen(true);
        setDetailOpen(false);
        isOpeningPayOverlay = true;
        return;
      }

      setIsProcessing(selectedDetail.iuran.id);
      setDetailOpen(false);
      const res = await api.post("/rt/iuran/bayar", { iuran_id: selectedDetail.iuran.id });
      if (res.data.success) {
        toast.success("Pembayaran berhasil. Saldo otomatis dibagi ke Kas RT & Setoran RW.");
      }
      await loadData(selectedYear);
      await loadHistory(selectedYear);
    } catch (err) {
      const apiError = getApiError(err);
      toast.error(apiError.message);
    } finally {
      setIsProcessing(null);
      if (!isOpeningPayOverlay) {
        setSelectedDetail(null);
      }
    }
  };

  const handlePayInstallment = async () => {
    if (!selectedDetail?.iuran) return;
    const meta = getIuranTone(selectedDetail.iuran);
    if (!meta.cicilan?.id) return;

    const nominalNum = Number(payAmount);
    if (!payAmount || isNaN(nominalNum) || nominalNum <= 0) {
      toast.error("Masukkan jumlah pembayaran yang valid.");
      return;
    }

    const activeCicilan = meta.cicilan;
    const totalTerbayar = activeCicilan.pembayaran?.reduce((acc, p) => acc + Number(p.nominal), 0) ?? 0;
    const sisaCicilan = Number(activeCicilan.total_cicilan) - totalTerbayar;

    if (nominalNum > sisaCicilan + 0.01) {
      toast.error(`Nominal pembayaran tidak boleh melebihi sisa cicilan (Sisa: Rp ${sisaCicilan.toLocaleString("id-ID")}).`);
      return;
    }

    try {
      setSaving(true);
      await cicilanIuranClient.markAsPaid(activeCicilan.id, nominalNum, "rt");
      toast.success("Pembayaran cicilan berhasil dicatat.");
      setPayOverlayOpen(false);
      setDetailOpen(false);
      setSelectedDetail(null);
      await loadData(selectedYear);
      await loadHistory(selectedYear);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const selectedWargaForCreateData = useMemo(
    () => data?.warga.find((item) => item.id === selectedWargaIdForCreate) ?? null,
    [data, selectedWargaIdForCreate]
  );

  const unpaidIuranForCreate = useMemo(() => {
    if (!selectedWargaForCreateData) return [];
    return selectedWargaForCreateData.iuran.filter(
      (item) => item.status === "BELUM" && !item.cicilan.some((c) => !c.sudah_lunas) && !!item.id
    );
  }, [selectedWargaForCreateData]);

  const handleCreateCicilan = async () => {
    if (selectedIuranIdsForCreate.length === 0) {
      toast.error("Pilih setidaknya satu bulan tagihan.");
      return;
    }
    if (!jumlahBulanForCreate || Number(jumlahBulanForCreate) <= 0) {
      toast.error("Jumlah bulan/kali pembayaran harus lebih dari 0.");
      return;
    }

    setSaving(true);
    try {
      for (const iuranId of selectedIuranIdsForCreate) {
        await cicilanIuranClient.create(
          {
            iuran_id: iuranId,
            jumlah_bulan: Number(jumlahBulanForCreate),
            bulan_mulai: new Date().getMonth() + 1,
            tahun_mulai: currentYear,
            tambahan_nominal: 0,
          },
          "rt"
        );
      }
      toast.success("Cicilan berhasil dibuat.");
      setIsCreateDialogOpen(false);
      setSelectedIuranIdsForCreate([]);
      await loadData(selectedYear);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (historyRows.length === 0) {
      toast.error("Belum ada histori untuk diekspor.");
      return;
    }

    const filename = `histori-iuran-rt-${selectedYear}.pdf`;
    try {
      toast.info("Mengunduh laporan PDF...");
      await downloadApiFile("/rt/iuran/history/export-pdf", filename, {
        tahun: Number(selectedYear),
      });
      toast.success("Histori iuran berhasil diunduh.");
    } catch (error) {
      toast.error("Gagal mengunduh laporan PDF.");
    }
  };

  const getNominalTarif = (warga: any) => {
    const firstUnpaid = warga.iuran.find((i: any) => i.status === "BELUM");
    if (firstUnpaid) {
      return Number(firstUnpaid.nominal);
    }
    if (warga.iuran.length > 0) {
      return Number(warga.iuran[warga.iuran.length - 1].nominal);
    }
    return 0;
  };

  const filteredWarga = useMemo(() => {
    if (!data) return [];
    return data.warga.filter((w) =>
      w.nama_kk.toLowerCase().includes(searchNama.toLowerCase())
    );
  }, [data, searchNama]);

  const chargeableWarga = useMemo(() => {
    return filteredWarga.filter((w) => {
      const nominalBulanan = getNominalTarif(w);
      return Number(nominalBulanan) > 0;
    });
  }, [filteredWarga]);

  const exemptWarga = useMemo(() => {
    return filteredWarga.filter((w) => {
      const nominalBulanan = getNominalTarif(w);
      return Number(nominalBulanan) === 0;
    });
  }, [filteredWarga]);

  // Tagihan pagination
  const totalTagihanPages = Math.max(1, Math.ceil(chargeableWarga.length / tagihanPageSize));
  const paginatedTagihan = useMemo(() => {
    const start = (tagihanPage - 1) * tagihanPageSize;
    return chargeableWarga.slice(start, start + tagihanPageSize);
  }, [chargeableWarga, tagihanPage, tagihanPageSize]);

  // Warga Bebas pagination
  const totalBebasPages = Math.max(1, Math.ceil(exemptWarga.length / bebasPageSize));
  const paginatedBebas = useMemo(() => {
    const start = (bebasPage - 1) * bebasPageSize;
    return exemptWarga.slice(start, start + bebasPageSize);
  }, [exemptWarga, bebasPage]);

  // History pagination
  const totalHistoryPages = Math.max(1, Math.ceil(historyRows.length / historyPageSize));
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return historyRows.slice(start, start + historyPageSize);
  }, [historyRows, historyPage]);

  // Summary stats
  const stats = useMemo(() => {
    if (!data) return { totalWarga: 0, lunas: 0, belumLunas: 0, cicilan: 0 };
    let lunas = 0, belumLunas = 0, cicilan = 0;
    for (const w of data.warga) {
      const nominal = getNominalTarif(w);
      if (Number(nominal) === 0) continue;
      for (const iuran of w.iuran) {
        const toneMeta = getIuranTone(iuran);
        if (toneMeta.tone === "success") {
          lunas++;
        } else if (toneMeta.tone === "warning") {
          cicilan++;
        } else if (toneMeta.tone === "danger") {
          belumLunas++;
        }
      }
    }
    const totalWargaCount = data.warga.length;
    return { totalWarga: totalWargaCount, lunas, belumLunas, cicilan };
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-10 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <Card className="rounded-3xl border border-rose-100 dark:border-rose-900/30">
          <CardHeader>
            <CardTitle className="text-rose-700 dark:text-rose-400">Gagal Memuat Manajemen Iuran</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => loadData(selectedYear)} variant="outline" className="gap-2 rounded-xl">
              <RefreshCw className="size-4" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/30">
            <Coins className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground mt-0.5">
              Manajemen Iuran - {selectedYear}
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Kelola tagihan, cicilan, dan histori pembayaran iuran warga
            </p>
          </div>
        </div>
      </header>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Kepala Keluarga",
            value: stats.totalWarga,
            suffix: "KK",
            gradient: "from-cyan-500 to-blue-600",
            iconBg: "bg-cyan-50 dark:bg-cyan-950/40",
            iconText: "text-cyan-600 dark:text-cyan-400",
            border: "border-cyan-200/50 dark:border-cyan-800/30",
            valueColor: "text-cyan-700 dark:text-cyan-400",
            Icon: Users,
          },
          {
            label: `Sudah Lunas - ${selectedYear}`,
            value: stats.lunas,
            suffix: "tagihan",
            gradient: "from-emerald-500 to-teal-600",
            iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
            iconText: "text-emerald-600 dark:text-emerald-400",
            border: "border-emerald-200/50 dark:border-emerald-800/30",
            valueColor: "text-emerald-700 dark:text-emerald-400",
            Icon: CheckCircle2,
          },
          {
            label: "Dalam Cicilan",
            value: stats.cicilan,
            suffix: "tagihan",
            gradient: "from-amber-500 to-orange-600",
            iconBg: "bg-amber-50 dark:bg-amber-950/40",
            iconText: "text-amber-600 dark:text-amber-400",
            border: "border-amber-200/50 dark:border-amber-800/30",
            valueColor: "text-amber-700 dark:text-amber-400",
            Icon: HandCoins,
          },
          {
            label: "Belum Bayar",
            value: stats.belumLunas,
            suffix: "tagihan",
            gradient: "from-rose-500 to-red-600",
            iconBg: "bg-rose-50 dark:bg-rose-950/40",
            iconText: "text-rose-600 dark:text-rose-400",
            border: "border-rose-200/50 dark:border-rose-800/30",
            valueColor: "text-rose-700 dark:text-rose-400",
            Icon: CreditCard,
          },
        ].map(({ label, value, suffix, gradient, iconBg, iconText, border, valueColor, Icon }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-3xl border bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${border}`}
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} rounded-t-3xl`} />
            <div className="p-5 pt-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-muted-foreground mb-1">
                  {label}
                </p>
                <p className={`text-2xl font-extrabold tabular-nums truncate ${valueColor}`}>
                  {value}
                  <span className="text-sm font-medium ml-1 opacity-70">{suffix}</span>
                </p>
              </div>
              <span className={`inline-flex size-10 items-center justify-center rounded-2xl shrink-0 ${iconBg} ${iconText}`}>
                <Icon className="size-5" />
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Search & Year Filter bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end bg-white dark:bg-card p-4 rounded-3xl border border-slate-100 dark:border-white/8 shadow-sm">
        {/* Search Input */}
        <div className="flex-1 space-y-1.5">
          <Label
            htmlFor="cari-nama"
            className="text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            Cari Warga
          </Label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <Input
              id="cari-nama"
              placeholder="Cari nama kepala keluarga..."
              value={searchNama}
              onChange={(e) => {
                setSearchNama(e.target.value);
                setTagihanPage(1);
                setBebasPage(1);
              }}
              className="pl-10 h-10 rounded-xl text-sm border-slate-200 dark:border-white/10"
              disabled={loading}
            />
          </div>
        </div>

        {/* Filter Tahun */}
        <div className="w-full lg:w-44 space-y-1.5">
          <Label
            htmlFor="top-year-filter"
            className="text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            Tahun
          </Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger
              id="top-year-filter"
              className={`!h-10 !rounded-xl text-sm w-full font-medium transition-all ${selectedYear !== String(currentYear)
                ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                : "!bg-white dark:!bg-input/20 !border-slate-200 dark:!border-white/10 !text-slate-600 dark:!text-slate-300 hover:!border-indigo-300"
                }`}
            >
              <Calendar className={`size-4 mr-1 shrink-0 ${selectedYear !== String(currentYear) ? "text-indigo-500" : "text-slate-400"}`} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100 dark:border-white/8 bg-white dark:bg-card">
              {Array.from({ length: Math.max(1, currentYear - 2026 + 1) }, (_, idx) => currentYear - idx).map((year) => (
                <SelectItem key={year} value={String(year)} className="!text-sm !py-2 !px-3 !rounded-lg font-semibold">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reset Button */}
        {(searchNama || selectedYear !== String(currentYear)) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchNama("");
              setSelectedYear(String(currentYear));
              setTagihanPage(1);
              setBebasPage(1);
            }}
            className="h-10 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-sm transition-all w-full lg:w-auto whitespace-nowrap"
            disabled={loading}
          >
            <RotateCcw className="size-4 mr-2" />
            Reset Filter
          </Button>
        )}
      </div>

      {/* Daftar Tagihan Iuran */}
      <Card className="rounded-3xl border border-slate-100 dark:border-white/8 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-white/8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4.5 text-slate-400" />
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                Daftar Tagihan Iuran - {selectedYear}
              </CardTitle>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto">
              {chargeableWarga.length} warga
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Klik tombol bulan untuk melihat detail pembayaran iuran per warga.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 px-0 pb-0">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 pb-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              Lunas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" />
              Dalam Cicilan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-500" />
              Belum Bayar
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-white/3">
                  <TableHead className="font-semibold pl-6 w-[18%]">Warga</TableHead>
                  <TableHead className="font-semibold w-[13%]">Tarif/Bulan</TableHead>
                  <TableHead className="font-semibold">Status per Bulan</TableHead>
                  <TableHead className="font-semibold text-right pr-6 w-[10%]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chargeableWarga.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-sm text-slate-500 dark:text-muted-foreground"
                    >
                      {searchNama ? "Warga tidak ditemukan." : "Belum ada data iuran."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTagihan.flatMap((warga) => {
                    if (warga.iuran.length === 0) {
                      return [
                        <TableRow key={`${warga.id}-empty`} className="hover:bg-slate-50/70 dark:hover:bg-white/3">
                          <TableCell className="pl-6 font-semibold text-sm">{warga.nama_kk}</TableCell>
                          <TableCell colSpan={3} className="text-sm text-slate-400 italic">
                            Tidak ada data iuran aktif.
                          </TableCell>
                        </TableRow>,
                      ];
                    }

                    const nominalBulanan = getNominalTarif(warga);

                    return [
                      <TableRow key={warga.id} className="hover:bg-slate-50/70 dark:hover:bg-white/3">
                        <TableCell className="align-middle pl-6 py-4">
                          <p className="font-semibold text-slate-900 dark:text-foreground text-sm">
                            {warga.nama_kk}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">
                            {data?.nama_blok}
                          </p>
                        </TableCell>
                        <TableCell className="align-middle py-4">
                          <p className="font-bold text-sm text-slate-900 dark:text-foreground">
                            {formatCurrency(nominalBulanan)}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">per bulan</p>
                        </TableCell>
                        <TableCell className="align-middle py-4">
                          <div className="space-y-1.5 min-w-[520px]">
                            {/* Month labels */}
                            <div className="grid grid-cols-12 gap-1.5 text-center text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                              {months.map((month) => (
                                <div key={`${warga.id}-${month.value}-label`} className="px-0.5">
                                  {month.label}
                                </div>
                              ))}
                            </div>
                            {/* Month buttons */}
                            <div className="grid grid-cols-12 gap-1.5">
                              {warga.iuran.map((iuran) => {
                                const meta = getIuranTone(iuran);
                                return (
                                  <button
                                    key={`${warga.id}-${iuran.id ?? iuran.bulan}`}
                                    type="button"
                                    onClick={() => openDetail(warga.nama_kk, iuran)}
                                    disabled={!!isProcessing}
                                    className={`group flex min-h-[60px] flex-col items-center justify-center rounded-xl border px-1 py-2 text-center text-[10px] font-medium shadow-sm transition-all duration-200 ${toneClasses[meta.tone]} disabled:opacity-50 disabled:pointer-events-none`}
                                    title={`${getMonthLabel(iuran.bulan)} — ${meta.label}`}
                                  >
                                    <span
                                      className={`size-2.5 rounded-full bg-current shadow-[0_0_0_3px_rgba(255,255,255,0.4)] dark:shadow-[0_0_0_3px_rgba(15,23,42,0.4)] ${meta.tone === "success" ? "shadow-emerald-200/60" : ""}`}
                                    />
                                    <span className="mt-1.5 leading-tight">{meta.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle py-4 pr-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs gap-1.5 bg-cyan-50/60 border-cyan-300/60 text-cyan-700/80 hover:bg-cyan-100 hover:border-cyan-400 hover:text-cyan-700 dark:bg-cyan-950/20 dark:border-cyan-700/40 dark:text-cyan-400/80 dark:hover:bg-cyan-950/50 dark:hover:border-cyan-600 dark:hover:text-cyan-300 transition-all duration-200"
                            onClick={() => {
                              setSelectedWargaIdForCreate(warga.id);
                              setSelectedIuranIdsForCreate([]);
                              setJumlahBulanForCreate("3");
                              setIsCreateDialogOpen(true);
                            }}
                          >
                            <HandCoins className="size-3.5" />
                            Buat Cicilan
                          </Button>
                        </TableCell>
                      </TableRow>,
                    ];
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {chargeableWarga.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-3 border-t border-slate-100 dark:border-white/8 gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-xs text-slate-500 dark:text-muted-foreground">
                  Menampilkan {(tagihanPage - 1) * tagihanPageSize + 1}–
                  {Math.min(tagihanPage * tagihanPageSize, chargeableWarga.length)} dari{" "}
                  {chargeableWarga.length} data
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Limit:</span>
                  <Select
                    value={String(tagihanPageSize)}
                    onValueChange={(val) => {
                      setTagihanPageSize(Number(val));
                      setTagihanPage(1);
                    }}
                  >
                    <SelectTrigger className="!h-7 !rounded-lg text-xs w-[64px] border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 py-1 flex items-center justify-between">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-lg !p-1 shadow-lg bg-white dark:bg-card">
                      {[10, 25, 50, 100].map((size) => (
                        <SelectItem key={size} value={String(size)} className="!text-xs !py-1 !px-2 !rounded-md">
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-1 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-xl"
                  disabled={tagihanPage <= 1}
                  onClick={() => setTagihanPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">
                  {tagihanPage} / {totalTagihanPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-xl"
                  disabled={tagihanPage >= totalTagihanPages}
                  onClick={() => setTagihanPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daftar Warga Bebas Iuran */}
      <Card className="rounded-3xl border border-slate-100 dark:border-white/8 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-white/8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4.5 text-slate-400" />
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                Daftar Warga Bebas Iuran
              </CardTitle>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              {exemptWarga.length} warga
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Daftar warga dengan tarif iuran Rp 0 berdasarkan kategori ketetapan RW yang dibebaskan dari kas.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-white/3">
                  <TableHead className="font-semibold pl-6 w-[35%]">Nama Kepala Keluarga</TableHead>
                  <TableHead className="font-semibold w-[30%]">Blok / Rumah</TableHead>
                  <TableHead className="font-semibold pr-6">Kategori Keluarga (Ketetapan RW)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exemptWarga.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-slate-500 dark:text-muted-foreground"
                    >
                      {searchNama ? "Warga bebas iuran tidak ditemukan." : "Tidak ada warga bebas iuran."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBebas.map((warga) => {
                    let textClass = "text-slate-900 dark:text-slate-100 text-sm font-bold";
                    let friendlyCategory = "Ketetapan RW / Subsidi";

                    if (warga.status_keluarga === "LANSIA") {
                      friendlyCategory = "Keluarga Lansia";
                    } else if (warga.status_keluarga === "KURANG_MAMPU") {
                      friendlyCategory = "Kurang Mampu / Subsidi";
                    }

                    return (
                      <TableRow key={warga.id} className="hover:bg-slate-50/70 dark:hover:bg-white/3">
                        <TableCell className="align-middle pl-6 py-4 font-semibold text-slate-900 dark:text-foreground text-sm">
                          {warga.nama_kk}
                        </TableCell>
                        <TableCell className="align-middle py-4 text-sm text-slate-600 dark:text-muted-foreground">
                          {data?.nama_blok}
                        </TableCell>
                        <TableCell className="align-middle py-4 pr-6">
                          <span className={textClass}>
                            {friendlyCategory}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {exemptWarga.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-3 border-t border-slate-100 dark:border-white/8 gap-4">
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                Menampilkan {(bebasPage - 1) * bebasPageSize + 1}–
                {Math.min(bebasPage * bebasPageSize, exemptWarga.length)} dari{" "}
                {exemptWarga.length} data
              </p>
              <div className="flex items-center gap-1 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-xl"
                  disabled={bebasPage <= 1}
                  onClick={() => setBebasPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">
                  {bebasPage} / {totalBebasPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-xl"
                  disabled={bebasPage >= totalBebasPages}
                  onClick={() => setBebasPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histori Pembayaran */}
      <Card className="rounded-3xl border border-slate-100 dark:border-white/8 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="size-4.5 text-slate-400" />
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                Histori Pembayaran - {selectedYear}
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl text-xs gap-1.5"
                onClick={() => loadHistory(selectedYear)}
              >
                <RefreshCw className="size-3.5" />
                Muat
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl text-xs gap-1.5"
                onClick={handleExportPdf}
                disabled={historyRows.length === 0}
              >
                <FileDown className="size-3.5" />
                Export PDF
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Pembayaran iuran yang sudah lunas pada tahun {selectedYear}.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-0 px-0">
          <div className="rounded-b-3xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-white/3">
                  <TableHead className="font-semibold pl-6">Warga</TableHead>
                  <TableHead className="font-semibold">Periode</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Tanggal Bayar</TableHead>
                  <TableHead className="font-semibold">Nominal</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Kas RT ({persenRt}%)</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Setoran RW ({persenRw}%)</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell pr-6">Kode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground"
                    >
                      Belum ada histori pembayaran untuk tahun {selectedYear}.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedHistory.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/3"
                    >
                      <TableCell className="font-semibold text-sm text-slate-900 dark:text-foreground pl-6">
                        {item.warga.nama_kk}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-muted-foreground">
                        {getMonthLabel(item.bulan)} {item.tahun}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                        {formatDateShort(item.tanggal_bayar)}
                      </TableCell>
                      <TableCell className="font-bold text-sm text-slate-900 dark:text-foreground whitespace-nowrap">
                        {formatCurrency(item.nominal)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-muted-foreground hidden md:table-cell whitespace-nowrap">
                        {formatCurrency(item.nominal_kas_rt ?? 0)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-muted-foreground hidden md:table-cell whitespace-nowrap">
                        {formatCurrency(item.nominal_kas_rw ?? 0)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500 hidden lg:table-cell pr-6">
                        {item.kode_unik ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalHistoryPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-white/8">
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                Menampilkan {(historyPage - 1) * historyPageSize + 1}–
                {Math.min(historyPage * historyPageSize, historyRows.length)} dari{" "}
                {historyRows.length} data
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-xl"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">
                  {historyPage} / {totalHistoryPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-xl"
                  disabled={historyPage >= totalHistoryPages}
                  onClick={() => setHistoryPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-foreground">
              Detail Pembayaran Iuran
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Rincian status, nominal, dan kode transparansi iuran bulanan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warga info */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Warga</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-foreground mt-0.5">
                    {selectedDetail?.wargaName}
                  </p>
                </div>
                {selectedDetail?.iuran &&
                  (() => {
                    const meta = getIuranTone(selectedDetail.iuran);
                    return (
                      <Badge className={badgeToneClasses[meta.tone]} variant="outline">
                        {meta.tone === "success" ? "LUNAS" : meta.tone === "warning" ? "CICILAN AKTIF" : "BELUM BAYAR"}
                      </Badge>
                    );
                  })()}
              </div>

              <Separator className="my-4" />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/70 bg-white/90 p-3 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Periode</p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-foreground">
                    {selectedDetail
                      ? `${getMonthLabel(selectedDetail.iuran.bulan)} ${selectedDetail.iuran.tahun}`
                      : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/90 p-3 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Nominal</p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-foreground">
                    {selectedDetail ? formatCurrency(selectedDetail.iuran.nominal) : "-"}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Conditional content by status */}
              {selectedDetail?.iuran &&
                (() => {
                  const meta = getIuranTone(selectedDetail.iuran);
                  const activeCicilan =
                    selectedDetail.iuran.cicilan.find((item) => !item.sudah_lunas) ??
                    selectedDetail.iuran.cicilan[0] ??
                    null;

                  if (meta.tone === "success") {
                    return (
                      <div className="space-y-3 text-sm">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border p-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Tanggal Bayar</p>
                            <p className="mt-1 font-semibold">{formatDate(selectedDetail.iuran.tanggal_bayar)}</p>
                          </div>
                          <div className="rounded-xl border p-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Kode Transparansi</p>
                            <p className="mt-1 font-mono text-sm font-semibold">
                              {selectedDetail.iuran.kode_unik ?? "-"}
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border p-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Kas RT ({persenRt}%)</p>
                            <p className="mt-1 font-semibold">
                              {formatCurrency(selectedDetail.iuran.nominal * (persenRt / 100))}
                            </p>
                          </div>
                          <div className="rounded-xl border p-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Setoran RW ({persenRw}%)</p>
                            <p className="mt-1 font-semibold">
                              {formatCurrency(selectedDetail.iuran.nominal * (persenRw / 100))}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200 text-xs">
                          ✓ Sudah lunas. Kode transparansi dapat digunakan untuk verifikasi transaksi.
                        </div>
                      </div>
                    );
                  }

                  if (meta.tone === "warning" && activeCicilan) {
                    const totalTerbayar = activeCicilan.pembayaran?.reduce((acc, p) => acc + Number(p.nominal), 0) ?? 0;
                    const sisaCicilan = Number(activeCicilan.total_cicilan) - totalTerbayar;
                    const sisaKali = activeCicilan.jumlah_bulan - (activeCicilan.pembayaran?.length ?? 0);
                    const pembayaranSelanjutnya = sisaCicilan / (sisaKali > 0 ? sisaKali : 1);

                    return (
                      <div className="space-y-3 text-sm">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border p-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Sisa Cicilan</p>
                            <p className="mt-1 font-bold text-slate-900 dark:text-foreground">{formatCurrency(sisaCicilan)}</p>
                          </div>
                          <div className="rounded-xl border p-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Pembayaran Selanjutnya</p>
                            <p className="mt-1 font-bold text-slate-900 dark:text-foreground">
                              {formatCurrency(pembayaranSelanjutnya)}
                            </p>
                          </div>
                          <div className="rounded-xl border p-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Jumlah Pembayaran / Bulan</p>
                            <p className="mt-1 font-bold text-slate-900 dark:text-foreground">{activeCicilan.jumlah_bulan} kali</p>
                          </div>
                          <div className="rounded-xl border p-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Periode Cicilan</p>
                            <p className="mt-1 font-bold text-slate-900 dark:text-foreground">
                              {getMonthLabel(activeCicilan.bulan_mulai)} {activeCicilan.tahun_mulai}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200 text-xs">
                          ⏳ Masih ada cicilan yang belum lunas. Klik "Lunasi Cicilan" untuk menyelesaikan pembayaran.
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border p-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-400">Kas RT ({persenRt}%)</p>
                          <p className="mt-1 font-semibold">
                            {selectedDetail ? formatCurrency(selectedDetail.iuran.nominal * (persenRt / 100)) : "-"}
                          </p>
                        </div>
                        <div className="rounded-xl border p-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-400">Setoran RW ({persenRw}%)</p>
                          <p className="mt-1 font-semibold">
                            {selectedDetail ? formatCurrency(selectedDetail.iuran.nominal * (persenRw / 100)) : "-"}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200 text-xs">
                        ⚠ Belum ada pembayaran. Klik "Bayar" untuk mencatat pembayaran iuran bulan ini.
                      </div>
                    </div>
                  );
                })()}

              {/* Riwayat cicilan / slot pembayaran */}
              {selectedDetail?.iuran?.cicilan?.length ? (
                (() => {
                  const activeCicilan = selectedDetail.iuran.cicilan.find((item) => !item.sudah_lunas) ?? selectedDetail.iuran.cicilan[0];
                  const payments = activeCicilan.pembayaran ?? [];
                  const totalSlots = Math.max(activeCicilan.jumlah_bulan, payments.length);

                  const getIndexName = (index: number) => {
                    const names = ["pertama", "kedua", "ketiga", "keempat", "kelima", "keenam", "ketujuh", "kedelapan", "kesembilan", "kesepuluh"];
                    return names[index - 1] ?? `ke-${index}`;
                  };

                  return (
                    <div className="mt-4 rounded-xl border border-slate-200 dark:border-white/10 p-4 text-sm bg-white dark:bg-slate-900/10">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">
                        Terakhir Bayar Cicilan
                      </p>

                      <div className="mb-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 p-3 border border-slate-100 dark:border-white/5">
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          {activeCicilan.jumlah_bulan}x bayar — bulan {getMonthLabel(activeCicilan.bulan_mulai)} {activeCicilan.tahun_mulai}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Dibuat pada {formatDate(activeCicilan.created_at)}
                        </p>
                      </div>

                      <div className={`space-y-2.5 ${totalSlots > 3 ? "max-h-[182px] overflow-y-auto pr-1.5" : ""}`}>
                        {Array.from({ length: totalSlots }).map((_, idx) => {
                          const paymentNumber = idx + 1;
                          const paymentRecord = payments[idx];

                          return (
                            <div
                              key={paymentNumber}
                              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 px-3.5 py-2.5 border border-slate-100/50 dark:border-white/5"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold capitalize text-slate-600 dark:text-slate-400">
                                  Pembayaran {getIndexName(paymentNumber)}
                                </span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                  {paymentRecord ? formatDate(paymentRecord.tanggal_bayar) : "Belum bayar"}
                                </span>
                              </div>
                              {paymentRecord ? (
                                <Badge variant="success" className="font-bold">
                                  {formatCurrency(paymentRecord.nominal)}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                                  Belum Bayar
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            {selectedDetail?.iuran && getIuranTone(selectedDetail.iuran).tone === "success" ? (
              <Button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-xl h-10 px-6 font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 border-0 transition-all w-full sm:w-auto"
              >
                <CheckCircle2 className="size-4" />
                Tutup Detail
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-xl h-10 px-5"
                >
                  Tutup
                </Button>
                {selectedDetail?.iuran &&
                  (() => {
                    const meta = getIuranTone(selectedDetail.iuran);
                    return (
                      <Button
                        onClick={handlePrimaryAction}
                        disabled={isProcessing === selectedDetail.iuran.id}
                        className={`rounded-xl h-10 px-5 gap-2 font-bold text-white shadow-md transition-all ${meta.tone === "warning"
                          ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                          : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-cyan-500/20"
                          }`}
                      >
                        {isProcessing === selectedDetail.iuran.id ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Memproses...
                          </>
                        ) : meta.tone === "warning" ? (
                          <>
                            <HandCoins className="size-4" />
                            Lunasi Cicilan
                          </>
                        ) : (
                          <>
                            <CreditCard className="size-4" />
                            Bayar
                          </>
                        )}
                      </Button>
                    );
                  })()}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Buat Cicilan */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
              <Plus className="size-5 text-cyan-500" />
              Buat Rencana Cicilan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Buat cicilan untuk tagihan iuran yang belum lunas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nama Warga (Locked) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nama Warga</Label>
              <div className="flex h-10 w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300">
                <Users className="size-4 mr-2 text-slate-400" />
                {selectedWargaForCreateData?.nama_kk ?? "-"}
              </div>
            </div>

            {/* Pilih Bulan Cicilan (Checkbox) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Bulan Cicilan</Label>
              {unpaidIuranForCreate.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center text-xs text-slate-500 dark:border-white/5 dark:bg-white/2">
                  Semua tagihan untuk warga ini sudah lunas atau sudah dalam status cicilan.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-100 dark:border-white/8 rounded-xl bg-slate-50/30 dark:bg-white/2">
                  {unpaidIuranForCreate.map((item) => {
                    const label = `${getMonthLabel(item.bulan)} ${item.tahun}`;
                    const nominalText = formatCurrency(item.nominal);
                    const isChecked = selectedIuranIdsForCreate.includes(item.id!);
                    return (
                      <label
                        key={item.id}
                        className={`flex flex-col gap-0.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${isChecked
                          ? "border-cyan-500 bg-cyan-50/40 text-cyan-900 dark:border-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-200 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-200 dark:border-white/5 dark:bg-slate-900 dark:hover:border-white/10"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedIuranIdsForCreate((prev) =>
                                prev.includes(item.id!)
                                  ? prev.filter((id) => id !== item.id)
                                  : [...prev, item.id!]
                              );
                            }}
                            className="accent-cyan-600 rounded size-4 border-slate-300 dark:border-white/10 dark:bg-slate-900"
                          />
                          <span className="text-xs font-bold leading-none">{label}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-6">{nominalText}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Berapa Kali Pembayaran Dalam 1 Bulan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Berapa Kali Pembayaran dalam 1 Bulan
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={jumlahBulanForCreate}
                  onChange={(e) => setJumlahBulanForCreate(e.target.value)}
                  className="h-10 rounded-xl text-sm font-semibold w-11 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="3"
                />
                <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                  kali / bulan
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="rounded-xl h-10 px-5 text-sm"
            >
              Batal
            </Button>
            <Button
              onClick={handleCreateCicilan}
              disabled={saving || selectedIuranIdsForCreate.length === 0}
              className="rounded-xl h-10 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold shadow-md shadow-cyan-500/20 gap-2 text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Buat Cicilan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Bayar Cicilan Overlay */}
      <Dialog
        open={payOverlayOpen}
        onOpenChange={(open) => {
          setPayOverlayOpen(open);
          if (!open) {
            setSelectedDetail(null);
            setPayAmount("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
              <HandCoins className="size-5 text-amber-500" />
              Bayar Cicilan Iuran
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Masukkan nominal pembayaran untuk cicilan bulan ini.
            </DialogDescription>
          </DialogHeader>

          {selectedDetail?.iuran && (() => {
            const meta = getIuranTone(selectedDetail.iuran);
            const activeCicilan = meta.cicilan;
            if (!activeCicilan) return null;

            const totalTerbayar = activeCicilan.pembayaran?.reduce((acc, p) => acc + Number(p.nominal), 0) ?? 0;
            const sisaCicilan = Number(activeCicilan.total_cicilan) - totalTerbayar;
            const sisaKali = activeCicilan.jumlah_bulan - (activeCicilan.pembayaran?.length ?? 0);
            const pembayaranSelanjutnya = sisaCicilan / (sisaKali > 0 ? sisaKali : 1);

            return (
              <div className="space-y-4 py-2">
                {/* Info Warga & Bulan */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-white/5 dark:bg-white/2 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Warga:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedDetail.wargaName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Periode:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {getMonthLabel(selectedDetail.iuran.bulan)} {selectedDetail.iuran.tahun}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total Cicilan:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(activeCicilan.total_cicilan)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Sisa Cicilan:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(sisaCicilan)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Patokan Pembayaran:</span>
                    <span className="font-medium text-slate-600 dark:text-slate-400">{formatCurrency(pembayaranSelanjutnya)}</span>
                  </div>
                </div>

                {/* Input Nominal */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Nominal Pembayaran (Maks: {formatCurrency(sisaCicilan)})
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">
                      Rp
                    </span>
                    <Input
                      type="number"
                      min={1}
                      max={sisaCicilan}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-sm font-semibold w-full"
                      placeholder="Masukkan nominal..."
                    />
                  </div>
                  {Number(payAmount) > sisaCicilan && (
                    <p className="text-[10px] text-rose-500 font-medium">
                      ⚠ Nominal tidak boleh melebihi sisa cicilan {formatCurrency(sisaCicilan)}.
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPayOverlayOpen(false)}
              className="rounded-xl h-10 px-5 text-sm"
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={handlePayInstallment}
              disabled={saving || !payAmount || Number(payAmount) <= 0 || (selectedDetail?.iuran && (() => {
                const meta = getIuranTone(selectedDetail.iuran);
                const activeCicilan = meta.cicilan;
                if (!activeCicilan) return true;
                const totalTerbayar = activeCicilan.pembayaran?.reduce((acc, p) => acc + Number(p.nominal), 0) ?? 0;
                const sisaCicilan = Number(activeCicilan.total_cicilan) - totalTerbayar;
                return Number(payAmount) > sisaCicilan + 0.01;
              })())}
              className="rounded-xl h-10 px-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-md shadow-amber-500/20 gap-2 text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <HandCoins className="size-4" />
                  Bayar Cicilan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
