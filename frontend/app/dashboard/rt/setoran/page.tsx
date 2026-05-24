"use client";

import { useState, useEffect, useMemo } from "react";
import { api, getApiError } from "@/lib/axios";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HandCoins,
  Clock,
  AlertCircle,
  ImageIcon,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
  Loader2,
  TrendingUp,
  Wallet,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
interface SetoranRTItem {
  id: string;
  nominal: number | string;
  status: "PENDING" | "TERKONFIRMASI";
  tanggal_setor: string;
  tanggal_konfirmasi: string | null;
  bukti_url: string | null;
}

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

export default function SetoranKeRWPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SetoranRTItem[]>([]);
  const [titipanNominal, setTitipanNominal] = useState(0);
  const [totalPemasukanIuran, setTotalPemasukanIuran] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Edit & Delete states
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SetoranRTItem | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = async (month?: string, year?: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (month !== undefined && month !== "") {
        params.bulan = Number(month) + 1;
      }
      if (year !== undefined && year !== "") {
        params.tahun = Number(year);
      }
      const res = await api.get("/rt/setoran", { params });
      if (res.data.success) {
        setData(res.data.data.history || []);
        setTitipanNominal(Number(res.data.data.titipan_belum_setor || 0));
        setTotalPemasukanIuran(Number(res.data.data.total_pemasukan_iuran || 0));
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmitSetoran = async () => {
    if (titipanNominal <= 0) {
      toast.error("Tidak ada dana titipan untuk disetorkan.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      if (file) {
        formData.append("bukti_foto", file);
      }

      const res = await api.post("/rt/setoran/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("Setoran berhasil diajukan! Menunggu konfirmasi RW.");
        setOpen(false);
        setFile(null);
        setPreviewUrl(null);
        loadData(selectedMonth, selectedYear);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (item: SetoranRTItem) => {
    setSelectedItem(item);
    setEditFile(null);
    setEditPreviewUrl(item.bukti_url ? getProofUrl(item.bukti_url) : null);
    setEditOpen(true);
  };

  const handleOpenDelete = (item: SetoranRTItem) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setEditFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpdateSetoran = async () => {
    if (!selectedItem) return;

    try {
      setUpdating(true);
      const formData = new FormData();
      if (editFile) {
        formData.append("bukti_foto", editFile);
      } else if (!editPreviewUrl) {
        formData.append("hapus_bukti", "true");
      }

      const res = await api.put(`/rt/setoran/${selectedItem.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("Bukti transfer berhasil diperbarui!");
        setEditOpen(false);
        setSelectedItem(null);
        setEditFile(null);
        setEditPreviewUrl(null);
        loadData(selectedMonth, selectedYear);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSetoran = async () => {
    if (!selectedItem) return;

    try {
      setDeleting(true);
      const res = await api.delete(`/rt/setoran/${selectedItem.id}`);

      if (res.data.success) {
        toast.success("Pengajuan setoran berhasil dibatalkan dan dihapus.");
        setDeleteOpen(false);
        setSelectedItem(null);
        loadData(selectedMonth, selectedYear);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setDeleting(false);
    }
  };

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/api\/?$/, "");

  const getProofUrl = (url: string | null | undefined) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith("/")) {
      return `${baseUrl}${trimmed}`;
    }
    return `${baseUrl}/${trimmed}`;
  };

  // Client-side calculations
  const totalTerkonfirmasi = useMemo(() => {
    return data
      .filter((item) => {
        if (item.status !== "TERKONFIRMASI") return false;

        const dateObj = new Date(item.tanggal_setor);
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

  const yearOptions = useMemo(() => {
    const yearsSet = new Set<number>();
    data.forEach((item) => {
      const parsed = new Date(item.tanggal_setor);
      if (!Number.isNaN(parsed.getTime())) {
        yearsSet.add(parsed.getFullYear());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [data]);

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

  const cardLabels = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const hasMonth = selectedMonth !== "";
    const hasYear = selectedYear !== "";

    let suffix = "";
    if (hasMonth && hasYear) {
      suffix = `${monthNames[Number(selectedMonth)]} ${selectedYear}`;
    } else if (hasMonth) {
      suffix = monthNames[Number(selectedMonth)];
    } else if (hasYear) {
      suffix = selectedYear;
    } else {
      suffix = String(currentYear);
    }

    return {
      pemasukan: `Pemasukan Iuran ${suffix}`,
      setoran: `Total Setoran Terkonfirmasi ${suffix}`
    };
  }, [selectedMonth, selectedYear]);

  const summaryCards = useMemo(() => {
    const hasTitipan = titipanNominal > 0;
    return [
      {
        label: "Dana Belum Disetor (Porsi RW)",
        value: formatRupiah(titipanNominal),
        icon: Clock,
        gradient: hasTitipan ? "from-amber-550 to-orange-600" : "from-emerald-500 to-teal-650",
        iconBg: hasTitipan ? "bg-amber-50 dark:bg-amber-950/40" : "bg-emerald-50 dark:bg-emerald-950/40",
        iconText: hasTitipan ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
        border: hasTitipan ? "border-amber-200/50 dark:border-amber-800/30" : "border-emerald-200/50 dark:border-emerald-800/30",
        valueColor: hasTitipan ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400",
      },
      {
        label: cardLabels.pemasukan,
        value: formatRupiah(totalPemasukanIuran),
        icon: TrendingUp,
        gradient: "from-emerald-500 to-teal-600",
        iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
        iconText: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-200/50 dark:border-emerald-800/30",
        valueColor: "text-emerald-700 dark:text-emerald-400",
      },
      {
        label: cardLabels.setoran,
        value: formatRupiah(totalTerkonfirmasi),
        icon: Wallet,
        gradient: "from-cyan-500 to-blue-600",
        iconBg: "bg-cyan-50 dark:bg-cyan-950/40",
        iconText: "text-cyan-600 dark:text-cyan-400",
        border: "border-cyan-200/50 dark:border-cyan-800/30",
        valueColor: "text-cyan-700 dark:text-cyan-400",
      },
    ];
  }, [titipanNominal, totalPemasukanIuran, totalTerkonfirmasi, cardLabels]);

  // Client-side filtering
  const filteredItems = useMemo(() => {
    return data.filter((item) => {
      // Status filter
      if (statusFilter !== "" && item.status !== statusFilter) return false;

      // Date filters
      const dateObj = new Date(item.tanggal_setor);
      if (Number.isNaN(dateObj.getTime())) return false;
      const itemMonth = dateObj.getMonth();
      const itemYear = dateObj.getFullYear();

      if (selectedMonth !== "" && itemMonth !== Number(selectedMonth)) return false;
      if (selectedYear !== "" && itemYear !== Number(selectedYear)) return false;

      // Search filter (searches nominal or status)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          item.nominal.toString().includes(term) ||
          item.status.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [data, statusFilter, selectedMonth, selectedYear, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, searchTerm, statusFilter, selectedMonth, selectedYear]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredItems.slice(start, end);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredItems.length / pageSize));
  }, [filteredItems.length, pageSize]);

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
            <HandCoins className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground mt-0.5">
              Setoran Iuran ke RW
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Titipan porsi RW dari pembayaran iuran warga
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
              setFile(null);
              setPreviewUrl(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button
                type="button"
                disabled={titipanNominal <= 0}
                className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0 shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 rounded-xl h-11 px-5 font-bold disabled:opacity-50 disabled:pointer-events-none"
                variant="default"
              >
                <Plus className="size-4" />
                Ajukan Setoran
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-foreground">Konfirmasi Pengajuan Setoran</DialogTitle>
                <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Ajukan setoran akumulasi porsi RW ke Kas RW.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="rounded-2xl border border-slate-100 dark:border-white/8 bg-slate-50/50 dark:bg-white/3 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-muted-foreground mb-0.5">Nominal Setoran</p>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground">{formatRupiah(titipanNominal)}</p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400">
                    <HandCoins className="size-5" />
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upload Foto Bukti Transfer (Opsional)</Label>
                  {previewUrl ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-3 right-3 size-8 rounded-full bg-white/80 dark:bg-card/85 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white transition"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 p-8 text-center cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-400 transition-all duration-300 bg-white/50 dark:bg-white/1 select-none">
                      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/3 text-slate-400 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-950/40 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-all duration-300">
                        <ImageIcon className="size-6" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Pilih file foto bukti
                        </p>
                        <p className="text-xs text-slate-400">
                          Mendukung PNG, JPG, JPEG (Maks. 5MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={submitting}
                      />
                    </label>
                  )}
                </div>

                <div className="rounded-2xl border border-amber-100 dark:border-amber-800/20 bg-amber-50/50 dark:bg-amber-950/20 p-4 inline-flex gap-3 text-sm text-amber-800 dark:text-amber-400">
                  <AlertCircle className="size-5 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Konfirmasi Transfer</p>
                    <p className="text-xs text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                      Pastikan Anda telah mentransfer dana ke rekening resmi RW. RW akan memverifikasi dan mengonfirmasi pengajuan ini.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
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
                  onClick={handleSubmitSetoran}
                  disabled={submitting}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-md shadow-cyan-500/20 hover:shadow-lg transition-all h-10 px-5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Memproses...
                    </>
                  ) : (
                    "Kirim Setoran"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

      {/* Setoran history list */}
      <Card className="rounded-3xl border border-slate-100 dark:border-white/8 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Search className="size-4.5 text-slate-400" />
            Riwayat Setoran Ke RW
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Daftar pengajuan setoran porsi iuran RW yang telah dikirimkan.
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
                Cari Setoran
              </Label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nominal atau status..."
                  className="pl-10 h-10 rounded-xl text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Filter Status */}
            <div className="w-full lg:w-44 space-y-1.5">
              <Label
                htmlFor="filter-status"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Status
              </Label>
              <Select
                value={statusFilter === "" ? "ALL" : statusFilter}
                onValueChange={(value) => setStatusFilter(value === "ALL" ? "" : value)}
              >
                <SelectTrigger
                  id="filter-status"
                  className={`!h-10 !rounded-xl text-sm w-full font-medium transition-all ${
                    statusFilter !== ""
                      ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                      : "!bg-white dark:!bg-input/20 !border-slate-200 dark:!border-white/10 !text-slate-600 dark:!text-slate-300 hover:!border-indigo-300"
                  }`}
                >
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100 dark:border-white/8 bg-white dark:bg-card">
                  <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Status</SelectItem>
                  <SelectItem value="PENDING" className="!text-sm !py-2 !px-3 !rounded-lg">PENDING</SelectItem>
                  <SelectItem value="TERKONFIRMASI" className="!text-sm !py-2 !px-3 !rounded-lg">TERKONFIRMASI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Bulan */}
            <div className="w-full lg:w-44 space-y-1.5">
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
                  {monthNames.map((month, idx) => (
                    <SelectItem key={idx} value={String(idx)} className="!text-sm !py-2 !px-3 !rounded-lg">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Tahun */}
            <div className="w-full lg:w-40 space-y-1.5">
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
            {(searchTerm || statusFilter || selectedMonth !== "" || selectedYear !== "") && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
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
                  <TableHead className="font-semibold w-[18%]">Tanggal Setor</TableHead>
                  <TableHead className="font-semibold w-[18%]">Nominal</TableHead>
                  <TableHead className="font-semibold w-[14%]">Status</TableHead>
                  <TableHead className="font-semibold w-[20%]">Bukti Setoran</TableHead>
                  <TableHead className="text-right font-semibold w-[18%]">Tanggal Konfirmasi</TableHead>
                  <TableHead className="text-right font-semibold w-[12%]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground"
                    >
                      {loading ? "Memuat data setoran..." : "Belum ada riwayat setoran."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/3"
                    >
                      <TableCell className="text-sm text-slate-650 dark:text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5 text-slate-400" />
                          {formatDate(item.tanggal_setor)}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-foreground whitespace-nowrap">
                        {formatRupiah(item.nominal)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === "TERKONFIRMASI" ? "success" : "pending"}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.bukti_url ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 text-xs text-cyan-650 dark:text-cyan-400 font-bold hover:underline underline-offset-4 cursor-pointer outline-none"
                              >
                                <span className="size-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                Lihat Bukti Transfer
                              </button>
                            </DialogTrigger>
                            <DialogContent showCloseButton={false} className="max-w-[90vw] md:max-w-4xl p-0 bg-transparent border-none ring-0 shadow-none focus:outline-none flex items-center justify-center">
                              <DialogTitle className="sr-only">Bukti Transfer</DialogTitle>
                              <div className="relative max-w-full max-h-[85vh] overflow-hidden rounded-2xl">
                                <img
                                  src={getProofUrl(item.bukti_url)}
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
                        ) : (
                          <span className="text-xs text-slate-400 select-none">
                            Tanpa bukti
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-600 dark:text-muted-foreground whitespace-nowrap">
                        {item.status === "TERKONFIRMASI" && item.tanggal_konfirmasi ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatDate(item.tanggal_konfirmasi)}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400/90 font-medium">
                            Menunggu RW
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {item.status === "PENDING" ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                              className="size-8 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors"
                              title="Edit Bukti Setoran"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(item)}
                              className="size-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Batalkan & Hapus Setoran"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-400 select-none text-xs">-</span>
                        )}
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
                riwayat
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
      {/* Dialog Edit Bukti Setoran */}
      <Dialog open={editOpen} onOpenChange={(val) => {
        setEditOpen(val);
        if (!val) {
          setSelectedItem(null);
          setEditFile(null);
          setEditPreviewUrl(null);
        }
      }}>
        <DialogContent className="rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-foreground">Edit Bukti Pengajuan Setoran</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Perbarui bukti transfer pengajuan setoran ke Kas RW.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-slate-100 dark:border-white/8 bg-slate-50/50 dark:bg-white/3 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-muted-foreground mb-0.5">Nominal Setoran</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground">
                  {selectedItem ? formatRupiah(selectedItem.nominal) : "Rp0"}
                </p>
              </div>
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400">
                <HandCoins className="size-5" />
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upload Foto Bukti Transfer Baru</Label>
              {editPreviewUrl ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editPreviewUrl} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setEditFile(null);
                      setEditPreviewUrl(null);
                    }}
                    className="absolute top-3 right-3 size-8 rounded-full bg-white/80 dark:bg-card/85 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white transition"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 p-8 text-center cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-400 transition-all duration-300 bg-white/50 dark:bg-white/1 select-none">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/3 text-slate-400 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-950/40 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-all duration-300">
                    <ImageIcon className="size-6" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Pilih file foto bukti baru
                    </p>
                    <p className="text-xs text-slate-400">
                      Mendukung PNG, JPG, JPEG (Maks. 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleEditFileChange}
                    disabled={updating}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={updating}
              className="rounded-xl h-10 px-5"
            >
              Batal
            </Button>
            <Button
              onClick={handleUpdateSetoran}
              disabled={updating}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-md shadow-cyan-500/20 hover:shadow-lg transition-all h-10 px-5"
            >
              {updating ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Memproses...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Setoran */}
      <Dialog open={deleteOpen} onOpenChange={(val) => {
        setDeleteOpen(val);
        if (!val) {
          setSelectedItem(null);
        }
      }}>
        <DialogContent className="rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-foreground flex items-center gap-2 text-rose-600">
              <AlertCircle className="size-5 shrink-0" />
              Batalkan & Hapus Setoran?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Tindakan ini tidak dapat dibatalkan. Setoran yang dihapus akan dibatalkan pengajuannya.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus pengajuan setoran sebesar <strong className="text-slate-800 dark:text-white">{selectedItem ? formatRupiah(selectedItem.nominal) : "Rp0"}</strong>?
            </p>
            <div className="rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
              <p className="font-semibold mb-0.5">Catatan Penting:</p>
              Semua data iuran warga yang termasuk dalam setoran ini akan dibebaskan kembali dan nominalnya akan kembali terakumulasi ke dalam dana kas iuran warga yang belum disetorkan.
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="rounded-xl h-10 px-5"
            >
              Batal
            </Button>
            <Button
              onClick={handleDeleteSetoran}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-500/20 hover:shadow-lg transition-all h-10 px-5 border-0"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Menghapus...
                </>
              ) : (
                "Ya, Batalkan & Hapus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
