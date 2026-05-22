"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  BookOpenText,
  Plus,
  Wallet,
  Pencil,
  Trash2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  RotateCcw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface KasRTItem {
  id: string;
  jenis_transaksi: "MASUK" | "KELUAR";
  tanggal: string;
  keterangan: string;
  nominal: number | string;
  kode_unik: string;
  bukti_url: string | null;
  bukti_foto_url: string | null;
}

const selectClass =
  "h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 dark:border-white/10 px-3.5 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50";

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(parsed);
};

const formatRupiah = (value: number | string): string => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "Rp0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const toDateInputValue = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
};

const ensureAbsoluteUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const getProofUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api\/?$/, "");
  if (trimmed.startsWith("/")) {
    return `${apiBaseUrl}${trimmed}`;
  }
  return `${apiBaseUrl}/${trimmed}`;
};

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function BukuKasRTPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KasRTItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [jenis, setJenis] = useState<"MASUK" | "KELUAR">("KELUAR");
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [buktiUrl, setBuktiUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [createFileName, setCreateFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createErrors, setCreateErrors] = useState<FieldErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rt/kas");
      if (res.data.success) {
        setData(res.data.data.transaksi || []);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const getCardLabel = useCallback((baseLabel: string) => {
    if (selectedMonth !== "" && selectedYear !== "") {
      return `${baseLabel} ${monthNames[Number(selectedMonth)]} ${selectedYear}`;
    }
    if (selectedMonth !== "") {
      return `${baseLabel} Bulan ${monthNames[Number(selectedMonth)]}`;
    }
    if (selectedYear !== "") {
      return `${baseLabel} Tahun ${selectedYear}`;
    }
    // Default jika filter tidak aktif (tahun sekarang)
    const currentYear = new Date().getFullYear();
    return `${baseLabel} Tahun ${currentYear}`;
  }, [selectedMonth, selectedYear]);

  const yearOptions = useMemo(() => {
    const yearsSet = new Set<number>();
    data.forEach((item) => {
      const parsed = new Date(item.tanggal);
      if (!Number.isNaN(parsed.getTime())) {
        yearsSet.add(parsed.getFullYear());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [data]);

  // Client-side calculations
  const summary = useMemo(() => {
    const totalMasuk = data
      .filter((i) => i.jenis_transaksi === "MASUK")
      .reduce((acc, curr) => acc + Number(curr.nominal), 0);
    const totalKeluar = data
      .filter((i) => i.jenis_transaksi === "KELUAR")
      .reduce((acc, curr) => acc + Number(curr.nominal), 0);
    const saldo = totalMasuk - totalKeluar;
    return { total_masuk: totalMasuk, total_keluar: totalKeluar, saldo };
  }, [data]);

  const totalMasukFiltered = useMemo(() => {
    return data
      .filter((item) => {
        if (item.jenis_transaksi !== "MASUK") return false;
        const dateObj = new Date(item.tanggal);
        if (Number.isNaN(dateObj.getTime())) return false;
        const itemMonth = dateObj.getMonth();
        const itemYear = dateObj.getFullYear();

        const isFilterActive = selectedMonth !== "" || selectedYear !== "";

        if (isFilterActive) {
          if (selectedMonth !== "" && itemMonth !== Number(selectedMonth)) return false;
          if (selectedYear !== "" && itemYear !== Number(selectedYear)) return false;
        } else {
          // Default ke tahun sekarang jika filter tidak aktif
          const currentYear = new Date().getFullYear();
          if (itemYear !== currentYear) return false;
        }
        return true;
      })
      .reduce((acc, item) => acc + Number(item.nominal || 0), 0);
  }, [data, selectedMonth, selectedYear]);

  const totalKeluarFiltered = useMemo(() => {
    return data
      .filter((item) => {
        if (item.jenis_transaksi !== "KELUAR") return false;
        const dateObj = new Date(item.tanggal);
        if (Number.isNaN(dateObj.getTime())) return false;
        const itemMonth = dateObj.getMonth();
        const itemYear = dateObj.getFullYear();

        const isFilterActive = selectedMonth !== "" || selectedYear !== "";

        if (isFilterActive) {
          if (selectedMonth !== "" && itemMonth !== Number(selectedMonth)) return false;
          if (selectedYear !== "" && itemYear !== Number(selectedYear)) return false;
        } else {
          // Default ke tahun sekarang jika filter tidak aktif
          const currentYear = new Date().getFullYear();
          if (itemYear !== currentYear) return false;
        }
        return true;
      })
      .reduce((acc, item) => acc + Number(item.nominal || 0), 0);
  }, [data, selectedMonth, selectedYear]);

  const filteredItems = useMemo(() => {
    return data.filter((item) => {
      // Date filters
      const dateObj = new Date(item.tanggal);
      if (Number.isNaN(dateObj.getTime())) return false;
      const itemMonth = dateObj.getMonth();
      const itemYear = dateObj.getFullYear();

      if (selectedMonth !== "" && itemMonth !== Number(selectedMonth)) return false;
      if (selectedYear !== "" && itemYear !== Number(selectedYear)) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          item.keterangan.toLowerCase().includes(term) ||
          item.kode_unik.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [data, selectedMonth, selectedYear, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, searchTerm, selectedMonth, selectedYear]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredItems.slice(start, end);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredItems.length / pageSize));
  }, [filteredItems.length, pageSize]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({});
    if (!nominal || Number(nominal) <= 0) {
      toast.error("Nominal wajib diisi dan harus lebih dari 0.");
      return;
    }
    if (!keterangan.trim()) {
      toast.error("Keterangan wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("jenis_transaksi", jenis);
      formData.append("nominal", nominal);
      formData.append("keterangan", keterangan);
      if (tanggal) {
        formData.append("tanggal", new Date(`${tanggal}T00:00:00.000Z`).toISOString());
      } else {
        formData.append("tanggal", new Date().toISOString());
      }
      if (buktiUrl) {
        formData.append("bukti_url", buktiUrl);
      }
      if (file) {
        formData.append("bukti_foto", file);
      }

      const res = await api.post("/rt/kas", formData, {
        headers: { "Content-Type": undefined },
      });

      if (res.data.success) {
        toast.success("Transaksi berhasil dicatat.");
        setJenis("KELUAR");
        setNominal("");
        setKeterangan("");
        setTanggal("");
        setBuktiUrl("");
        setFile(null);
        setCreateFileName("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setCreateErrors({});
        setShowAddForm(false);
        loadData();
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setCreateErrors(apiError.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  };
  const summaryCards = useMemo(
    () => [
      {
        label: getCardLabel("Total Masuk"),
        value: formatRupiah(totalMasukFiltered),
        icon: TrendingUp,
        gradient: "from-emerald-500 to-teal-600",
        iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
        iconText: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-200/50 dark:border-emerald-800/30",
        valueColor: "text-emerald-700 dark:text-emerald-400",
      },
      {
        label: getCardLabel("Total Keluar"),
        value: formatRupiah(totalKeluarFiltered),
        icon: TrendingDown,
        gradient: "from-rose-500 to-red-600",
        iconBg: "bg-rose-50 dark:bg-rose-950/40",
        iconText: "text-rose-600 dark:text-rose-400",
        border: "border-rose-200/50 dark:border-rose-800/30",
        valueColor: "text-rose-700 dark:text-rose-400",
      },
      {
        label: "Saldo Bersih",
        value: formatRupiah(summary.saldo),
        icon: Wallet,
        gradient: "from-cyan-500 to-blue-600",
        iconBg: "bg-cyan-50 dark:bg-cyan-950/40",
        iconText: "text-cyan-600 dark:text-cyan-400",
        border: "border-cyan-200/50 dark:border-cyan-800/30",
        valueColor: "text-cyan-700 dark:text-cyan-400",
      },
    ],
    [summary, totalMasukFiltered, totalKeluarFiltered, getCardLabel]
  );

  const disabled = loading || submitting;

  if (loading && data.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-10 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/30">
            <BookOpenText className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground mt-0.5">
              Buku Kas RT
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Kelola transaksi kas masuk & keluar
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setCreateErrors({});
            }}
            className={
              showAddForm
                ? "gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white border-0 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 rounded-xl h-11 px-5 font-bold"
                : "gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0 shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 rounded-xl h-11 px-5 font-bold"
            }
            variant="default"
          >
            {showAddForm ? (
              "Tutup Form"
            ) : (
              <>
                <Plus className="size-4" />
                Tambah Transaksi
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map(
          ({
            label,
            value,
            icon: Icon,
            gradient,
            iconBg,
            iconText,
            border,
            valueColor,
          }) => (
            <div
              key={label}
              className={`relative overflow-hidden rounded-3xl border bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${border}`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} rounded-t-3xl`}
              />
              <div className="p-5 pt-6 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-muted-foreground mb-1">
                    {label}
                  </p>
                  <p
                    className={`text-xl font-extrabold tabular-nums truncate ${valueColor}`}
                  >
                    {value}
                  </p>
                </div>
                <span
                  className={`inline-flex size-10 items-center justify-center rounded-2xl shrink-0 ${iconBg} ${iconText}`}
                >
                  <Icon className="size-5" />
                </span>
              </div>
            </div>
          )
        )}
      </section>

      {/* Add transaction form */}
      {showAddForm && (
        <Card className="rounded-3xl border border-slate-100 dark:border-white/8 shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Plus className="size-4.5 text-slate-400" />
              Tambah Transaksi Kas
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Catat kas masuk dan kas keluar dengan bukti transaksi.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleAddSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="jenis_transaksi" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jenis Transaksi</Label>
                <select
                  id="jenis_transaksi"
                  value={jenis}
                  onChange={(e) => setJenis(e.target.value as "MASUK" | "KELUAR")}
                  className={selectClass}
                  disabled={disabled}
                >
                  <option value="MASUK">MASUK</option>
                  <option value="KELUAR">KELUAR</option>
                </select>
                {createErrors.jenis_transaksi && (
                  <p className="text-xs text-destructive mt-1">{createErrors.jenis_transaksi}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tanggal" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tanggal</Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  disabled={disabled}
                  aria-invalid={Boolean(createErrors.tanggal)}
                />
                {createErrors.tanggal && (
                  <p className="text-xs text-destructive mt-1">{createErrors.tanggal}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="keterangan" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keterangan</Label>
                <Input
                  id="keterangan"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Pembelian alat kebersihan"
                  disabled={disabled}
                  aria-invalid={Boolean(createErrors.keterangan)}
                  required
                />
                {createErrors.keterangan && (
                  <p className="text-xs text-destructive mt-1">{createErrors.keterangan}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nominal" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nominal (Rp)</Label>
                <Input
                  id="nominal"
                  type="number"
                  min={0}
                  step={1000}
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  placeholder="Contoh: 100000"
                  disabled={disabled}
                  aria-invalid={Boolean(createErrors.nominal)}
                  required
                />
                {createErrors.nominal && (
                  <p className="text-xs text-destructive mt-1">{createErrors.nominal}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bukti_url" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Link Bukti (opsional)</Label>
                <Input
                  id="bukti_url"
                  type="text"
                  value={buktiUrl}
                  onChange={(e) => setBuktiUrl(e.target.value)}
                  placeholder="https://... atau link lainnya"
                  disabled={disabled}
                  aria-invalid={Boolean(createErrors.bukti_url)}
                />
                {createErrors.bukti_url && (
                  <p className="text-xs text-destructive mt-1">{createErrors.bukti_url}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bukti_foto" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upload Foto Bukti (opsional)</Label>
                <div className="relative flex items-center h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 px-3.5 py-2 text-sm transition-all duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
                  <input
                    id="bukti_foto"
                    type="file"
                    accept="image/*"
                    disabled={disabled}
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setFile(file || null);
                      setCreateFileName(file ? file.name : "");
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:pointer-events-none"
                  />
                  <div className="flex items-center gap-2.5 w-full pointer-events-none select-none">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors">
                      Choose File
                    </span>
                    <span className="text-slate-300 dark:text-slate-600 font-light">|</span>
                    <span className="text-slate-400 dark:text-slate-500 truncate flex-1">
                      {createFileName || "No file chosen"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Pilih salah satu: Link atau Foto. Foto akan diprioritaskan.</p>
              </div>

              <div className="sm:col-span-2 pt-2">
                <Button
                  type="submit"
                  variant="default"
                  size="default"
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-md shadow-cyan-500/20 hover:shadow-lg transition h-11 rounded-xl"
                  disabled={disabled}
                >
                  {submitting ? "Menyimpan..." : "Simpan Transaksi"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transaction history */}
      <Card className="rounded-3xl border border-slate-100 dark:border-white/8 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Search className="size-4.5 text-slate-400" />
            Riwayat Buku Kas
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Cari dan kelola transaksi yang sudah tercatat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            {/* Search Input */}
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="search"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Cari Transaksi
              </Label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari dari keterangan atau kode unik"
                  className="pl-10 h-10 rounded-xl text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Filter Bulan */}
            <div className="w-full lg:w-48 space-y-1.5">
              <Label
                htmlFor="filter-bulan"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Bulan
              </Label>
              <Select
                value={selectedMonth === "" ? "ALL" : selectedMonth}
                onValueChange={(value) => setSelectedMonth(value === "ALL" ? "" : value)}
              >
                <SelectTrigger
                  id="filter-bulan"
                  className={`!h-10 !rounded-xl text-sm w-full font-medium transition-all ${
                    selectedMonth !== ""
                      ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                      : "!bg-white dark:!bg-input/20 !border-slate-200 dark:!border-white/10 !text-slate-600 dark:!text-slate-300 hover:!border-indigo-300"
                  }`}
                >
                  <Calendar className={`size-4 mr-1 shrink-0 ${selectedMonth !== "" ? "text-indigo-500" : "text-slate-400"}`} />
                  <SelectValue placeholder="Semua Bulan" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100 dark:border-white/8 bg-white dark:bg-card">
                  <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Bulan</SelectItem>
                  <SelectItem value="0" className="!text-sm !py-2 !px-3 !rounded-lg">Januari</SelectItem>
                  <SelectItem value="1" className="!text-sm !py-2 !px-3 !rounded-lg">Februari</SelectItem>
                  <SelectItem value="2" className="!text-sm !py-2 !px-3 !rounded-lg">Maret</SelectItem>
                  <SelectItem value="3" className="!text-sm !py-2 !px-3 !rounded-lg">April</SelectItem>
                  <SelectItem value="4" className="!text-sm !py-2 !px-3 !rounded-lg">Mei</SelectItem>
                  <SelectItem value="5" className="!text-sm !py-2 !px-3 !rounded-lg">Juni</SelectItem>
                  <SelectItem value="6" className="!text-sm !py-2 !px-3 !rounded-lg">Juli</SelectItem>
                  <SelectItem value="7" className="!text-sm !py-2 !px-3 !rounded-lg">Agustus</SelectItem>
                  <SelectItem value="8" className="!text-sm !py-2 !px-3 !rounded-lg">September</SelectItem>
                  <SelectItem value="9" className="!text-sm !py-2 !px-3 !rounded-lg">Oktober</SelectItem>
                  <SelectItem value="10" className="!text-sm !py-2 !px-3 !rounded-lg">November</SelectItem>
                  <SelectItem value="11" className="!text-sm !py-2 !px-3 !rounded-lg">Desember</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Tahun */}
            <div className="w-full lg:w-44 space-y-1.5">
              <Label
                htmlFor="filter-tahun"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Tahun
              </Label>
              <Select
                value={selectedYear === "" ? "ALL" : selectedYear}
                onValueChange={(value) => setSelectedYear(value === "ALL" ? "" : value)}
              >
                <SelectTrigger
                  id="filter-tahun"
                  className={`!h-10 !rounded-xl text-sm w-full font-medium transition-all ${
                    selectedYear !== ""
                      ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                      : "!bg-white dark:!bg-input/20 !border-slate-200 dark:!border-white/10 !text-slate-600 dark:!text-slate-300 hover:!border-indigo-300"
                  }`}
                >
                  <Calendar className={`size-4 mr-1 shrink-0 ${selectedYear !== "" ? "text-indigo-500" : "text-slate-400"}`} />
                  <SelectValue placeholder="Semua Tahun" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100 dark:border-white/8 bg-white dark:bg-card">
                  <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Tahun</SelectItem>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)} className="!text-sm !py-2 !px-3 !rounded-lg">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {(searchTerm || selectedMonth !== "" || selectedYear !== "") && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedMonth("");
                  setSelectedYear("");
                }}
                className="h-10 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-sm transition-all w-full lg:w-auto whitespace-nowrap"
                disabled={loading}
              >
                <RotateCcw className="size-4 mr-2" />
                Reset Filter
              </Button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-white/8 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-white/3">
                  <TableHead className="font-semibold w-[15%]">Tanggal</TableHead>
                  <TableHead className="font-semibold w-[12%]">Jenis</TableHead>
                  <TableHead className="font-semibold w-[38%]">Keterangan</TableHead>
                  <TableHead className="font-semibold w-[15%]">Nominal</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell w-[12%]">
                    Kode Unik
                  </TableHead>
                  <TableHead className="text-right font-semibold w-[8%]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground"
                    >
                      {loading ? "Memuat data kas..." : "Belum ada transaksi untuk filter ini."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/3"
                    >
                      <TableCell className="text-sm text-slate-600 dark:text-muted-foreground whitespace-nowrap">
                        {formatDate(item.tanggal)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.jenis_transaksi === "MASUK" ? "success" : "destructive"}
                        >
                          {item.jenis_transaksi}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-slate-900 dark:text-foreground text-sm">
                          {item.keterangan}
                        </p>
                        {(item.bukti_foto_url || item.bukti_url) ? (
                          <div className="flex flex-col gap-1 mt-1 text-left items-start">
                            {item.bukti_foto_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 text-xs text-cyan-650 dark:text-cyan-400 font-bold hover:underline underline-offset-4 cursor-pointer outline-none bg-transparent border-none p-0"
                                  >
                                    <span className="size-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                    Lihat Foto Bukti →
                                  </button>
                                </DialogTrigger>
                                <DialogContent showCloseButton={false} className="max-w-[90vw] md:max-w-4xl p-0 bg-transparent border-none ring-0 shadow-none focus:outline-none flex items-center justify-center">
                                  <DialogTitle className="sr-only">Bukti Transfer</DialogTitle>
                                  <div className="relative max-w-full max-h-[85vh] overflow-hidden rounded-2xl">
                                    <img
                                      src={getProofUrl(item.bukti_foto_url)}
                                      alt="Bukti Transfer"
                                      className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                                    />
                                    <DialogClose asChild>
                                      <button
                                        type="button"
                                        className="absolute top-4 right-4 z-50 inline-flex size-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all border border-white/10 cursor-pointer outline-none"
                                      >
                                        <X className="size-4.5" />
                                        <span className="sr-only">Close</span>
                                      </button>
                                    </DialogClose>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            {item.bukti_url && (
                              <a
                                href={ensureAbsoluteUrl(item.bukti_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-cyan-650 dark:text-cyan-400 font-bold hover:underline underline-offset-4"
                              >
                                <span className="size-1.5 rounded-full bg-cyan-500" />
                                Lihat Link Bukti →
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">
                            Tanpa bukti
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-bold tabular-nums text-slate-900 dark:text-foreground whitespace-nowrap">
                        {formatRupiah(item.nominal)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="text-xs text-slate-500 dark:text-muted-foreground bg-slate-100 dark:bg-white/8 px-2 py-0.5 rounded-md">
                          {item.kode_unik}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <EditKasDialog
                            item={item}
                            onSaved={loadData}
                            disabled={disabled}
                          />
                          <DeleteKasDialog
                            itemId={item.id}
                            onDeleted={loadData}
                            disabled={disabled}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/8">
              {/* Info text */}
              <div className="text-sm text-slate-500 dark:text-muted-foreground select-none">
                Menampilkan{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {Math.min(filteredItems.length, (currentPage - 1) * pageSize + 1)}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {Math.min(filteredItems.length, currentPage * pageSize)}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {filteredItems.length}
                </span>{" "}
                transaksi
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {/* Page limit selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                    Baris per halaman:
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 rounded-lg border border-input bg-white dark:bg-input/20 px-2 py-1 text-xs text-foreground outline-none transition-all duration-200 focus-visible:border-ring"
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
                    className="size-8 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="size-4" />
                    <span className="sr-only">Halaman Sebelumnya</span>
                  </Button>

                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 select-none min-w-[50px] text-center">
                    {currentPage} / {totalPages}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                  >
                    <ChevronRight className="size-4" />
                    <span className="sr-only">Halaman Selanjutnya</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function EditKasDialog({
  item,
  onSaved,
  disabled,
}: {
  item: KasRTItem;
  onSaved: () => Promise<void>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [jenis, setJenis] = useState<"MASUK" | "KELUAR">(item.jenis_transaksi);
  const [nominal, setNominal] = useState(String(item.nominal));
  const [keterangan, setKeterangan] = useState(item.keterangan);
  const [tanggal, setTanggal] = useState(toDateInputValue(item.tanggal));
  const [buktiUrl, setBuktiUrl] = useState(item.bukti_url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [editFileName, setEditFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setJenis(item.jenis_transaksi);
      setNominal(String(item.nominal));
      setKeterangan(item.keterangan);
      setTanggal(toDateInputValue(item.tanggal));
      setBuktiUrl(item.bukti_url ?? "");
      setFile(null);
      setEditFileName("");
      setErrors({});
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!nominal || Number(nominal) <= 0) {
      toast.error("Nominal harus lebih besar dari 0");
      return;
    }
    if (!keterangan.trim()) {
      toast.error("Keterangan wajib diisi");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("jenis_transaksi", jenis);
      formData.append("nominal", nominal);
      formData.append("keterangan", keterangan);
      if (tanggal) {
        formData.append("tanggal", new Date(`${tanggal}T00:00:00.000Z`).toISOString());
      } else if (item.tanggal) {
        formData.append("tanggal", new Date(item.tanggal).toISOString());
      }

      formData.append("bukti_url", buktiUrl);

      if (file) {
        formData.append("bukti_foto", file);
      }

      const res = await api.put(`/rt/kas/${item.id}`, formData, {
        headers: { "Content-Type": undefined },
      });

      if (res.data.success) {
        toast.success("Transaksi kas berhasil diperbarui.");
        setErrors({});
        await onSaved();
        setOpen(false);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setErrors(apiError.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon-sm" variant="outline" disabled={disabled}>
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit transaksi</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle>Edit Transaksi Kas RT</DialogTitle>
          <DialogDescription>
            Perbarui data transaksi tanpa mengubah kode unik.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor={`jenis-${item.id}`}>Jenis Transaksi</Label>
            <select
              id={`jenis-${item.id}`}
              value={jenis}
              onChange={(e) => setJenis(e.target.value as "MASUK" | "KELUAR")}
              className={selectClass}
              disabled={submitting}
            >
              <option value="MASUK">MASUK</option>
              <option value="KELUAR">KELUAR</option>
            </select>
            {errors.jenis_transaksi && (
              <p className="text-xs text-destructive mt-1">{errors.jenis_transaksi}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`tanggal-${item.id}`}>Tanggal</Label>
            <Input
              id={`tanggal-${item.id}`}
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              disabled={submitting}
              className="h-10 rounded-xl"
              aria-invalid={Boolean(errors.tanggal)}
            />
            {errors.tanggal && (
              <p className="text-xs text-destructive mt-1">{errors.tanggal}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`keterangan-${item.id}`}>Keterangan</Label>
            <Input
              id={`keterangan-${item.id}`}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(errors.keterangan)}
              required
            />
            {errors.keterangan && (
              <p className="text-xs text-destructive mt-1">{errors.keterangan}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`nominal-${item.id}`}>Nominal (Rp)</Label>
            <Input
              id={`nominal-${item.id}`}
              type="number"
              min={0}
              step={1000}
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(errors.nominal)}
              required
            />
            {errors.nominal && (
              <p className="text-xs text-destructive mt-1">{errors.nominal}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`bukti_url-${item.id}`}>Link Bukti (opsional)</Label>
            <Input
              id={`bukti_url-${item.id}`}
              type="text"
              value={buktiUrl}
              onChange={(e) => setBuktiUrl(e.target.value)}
              placeholder="https://... atau link lainnya"
              disabled={submitting}
              className="h-10 rounded-xl"
              aria-invalid={Boolean(errors.bukti_url)}
            />
            {errors.bukti_url && (
              <p className="text-xs text-destructive mt-1">{errors.bukti_url}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`bukti-${item.id}`}>Upload Foto Bukti Baru (opsional)</Label>
            <div className="relative flex items-center h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 px-3.5 py-2 text-sm transition-all duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
              <input
                id={`bukti-${item.id}`}
                type="file"
                accept="image/*"
                disabled={submitting}
                ref={editFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setFile(file || null);
                  setEditFileName(file ? file.name : "");
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:pointer-events-none"
              />
              <div className="flex items-center gap-2.5 w-full pointer-events-none select-none">
                <span className="font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Choose File
                </span>
                <span className="text-slate-300 dark:text-slate-600 font-light">|</span>
                <span className="text-slate-400 dark:text-slate-500 truncate flex-1">
                  {editFileName || "No file chosen"}
                </span>
              </div>
            </div>
            {item.bukti_foto_url && (
              <p className="text-[10px] text-cyan-600 font-medium">Sudah ada foto terunggah. Upload baru akan mengganti foto lama.</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">Link dan Foto bisa diisi bersamaan.</p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="rounded-xl h-10 px-5"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              size="default"
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-md shadow-cyan-500/20 hover:shadow-lg transition h-10 px-5"
              disabled={submitting}
            >
              {submitting ? "Menyimpan..." : "Simpan Transaksi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteKasDialog({
  itemId,
  onDeleted,
  disabled,
}: {
  itemId: string;
  onDeleted: () => Promise<void>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      const res = await api.delete(`/rt/kas/${itemId}`);
      if (res.data.success) {
        toast.success("Catatan kas berhasil dihapus.");
        await onDeleted();
        setOpen(false);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon-sm" variant="destructive" disabled={disabled}>
          <Trash2 className="size-3.5" />
          <span className="sr-only">Hapus transaksi</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-semibold text-lg text-slate-900 dark:text-foreground">
            Hapus Transaksi Kas RT
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1 block">
            Apakah Anda yakin ingin menghapus catatan kas ini? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="rounded-xl h-10 px-5"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl h-10 px-5 transition"
          >
            {submitting ? "Menghapus..." : "Hapus Permanen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
