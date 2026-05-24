"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pencil, Trash2, BookOpenText, TrendingUp, TrendingDown, Wallet, Search, Plus, ChevronLeft, ChevronRight, Calendar, RotateCcw, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface KasItem {
  id: string;
  wilayah_rw_id: string;
  jenis_transaksi: "MASUK" | "KELUAR";
  tanggal: string;
  keterangan: string;
  nominal: number | string;
  bukti_url: string | null;
  bukti_foto_url: string | null;
  kode_unik: string;
}

interface KasResponse {
  data: {
    wilayah_rw_id: string;
    items: KasItem[];
    summary: {
      total_masuk: number;
      total_keluar: number;
      saldo: number;
    };
  };
}

interface ActionState {
  message: string;
  fieldErrors: FieldErrors;
}

const initialState: ActionState = {
  message: "",
  fieldErrors: {},
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
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/api\/?$/, "");
  if (trimmed.startsWith("/")) {
    return `${apiBaseUrl}${trimmed}`;
  }
  return `${apiBaseUrl}/${trimmed}`;
};

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

const selectClass = "h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 dark:border-white/10 px-3.5 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50";

export default function KasRwDashboardPage() {
  const { user } = useAuth();
  const wilayahRwId = user?.wilayah_rw_id ?? "";

  const [kasItems, setKasItems] = useState<KasItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [summary, setSummary] = useState({
    total_masuk: 0,
    total_keluar: 0,
    saldo: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [createFileName, setCreateFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddForm, setShowAddForm] = useState(false);

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
    const currentYear = new Date().getFullYear();
    return `${baseLabel} Tahun ${currentYear}`;
  }, [selectedMonth, selectedYear]);

  const yearOptions = useMemo(() => {
    const yearsSet = new Set<number>();
    kasItems.forEach((item) => {
      const parsed = new Date(item.tanggal);
      if (!Number.isNaN(parsed.getTime())) {
        yearsSet.add(parsed.getFullYear());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [kasItems]);

  const totalMasukFiltered = useMemo(() => {
    return kasItems
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
  }, [kasItems, selectedMonth, selectedYear]);

  const totalKeluarFiltered = useMemo(() => {
    return kasItems
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
  }, [kasItems, selectedMonth, selectedYear]);

  const filteredItems = useMemo(() => {
    return kasItems.filter((item) => {
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
  }, [kasItems, selectedMonth, selectedYear, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredItems.length]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredItems.slice(start, end);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredItems.length / pageSize));
  }, [filteredItems.length, pageSize]);

  const fetchKas = useCallback(
    async () => {
      if (!wilayahRwId) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get<KasResponse>("/rw/kas", {
          params: {
            wilayah_rw_id: wilayahRwId,
          },
        });

        setKasItems(response.data.data.items ?? []);
        setSummary(response.data.data.summary);
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        setKasItems([]);
        setSummary({ total_masuk: 0, total_keluar: 0, saldo: 0 });
      } finally {
        setIsLoading(false);
      }
    },
    [wilayahRwId]
  );

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/api\/?$/, "");

  useEffect(() => {
    if (!wilayahRwId) {
      return;
    }

    fetchKas().catch(() => {
      toast.error("Gagal memuat buku kas RW.");
      setIsLoading(false);
    });
  }, [fetchKas, wilayahRwId]);

  const [createState, createAction, isCreating] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const jenisTransaksi = String(formData.get("jenis_transaksi") ?? "").trim();
      const tanggal = String(formData.get("tanggal") ?? "").trim();
      const keterangan = String(formData.get("keterangan") ?? "").trim();
      const nominal = String(formData.get("nominal") ?? "").trim();
      const buktiUrl = String(formData.get("bukti_url") ?? "").trim();

      const fieldErrors: FieldErrors = {};

      if (!wilayahRwId) {
        fieldErrors.wilayah_rw_id = "wilayah_rw_id tidak ditemukan di sesi login.";
      }

      if (jenisTransaksi !== "MASUK" && jenisTransaksi !== "KELUAR") {
        fieldErrors.jenis_transaksi = "Jenis transaksi wajib dipilih.";
      }

      if (!keterangan) {
        fieldErrors.keterangan = "Keterangan wajib diisi.";
      }

      if (!nominal || Number(nominal) <= 0) {
        fieldErrors.nominal = "Nominal wajib diisi dan harus lebih dari 0.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Periksa kembali form kas RW.", fieldErrors };
      }

      try {
        const payload = new FormData();
        payload.append("wilayah_rw_id", wilayahRwId);
        payload.append("jenis_transaksi", jenisTransaksi);
        if (tanggal) {
          payload.append("tanggal", new Date(`${tanggal}T00:00:00.000Z`).toISOString());
        }
        payload.append("keterangan", keterangan);
        payload.append("nominal", nominal);

        if (buktiUrl) {
          payload.append("bukti_url", buktiUrl);
        }

        const buktiFoto = formData.get("bukti_foto") as File;
        if (buktiFoto && buktiFoto.size > 0) {
          payload.append("bukti_foto", buktiFoto);
        }

        await api.post("/rw/kas", payload, {
          headers: {
            "Content-Type": undefined,
          },
        });

        toast.success("Transaksi kas berhasil ditambahkan.");
        await fetchKas();
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setCreateFileName("");
        setShowAddForm(false);

        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  const disabled = isLoading || isCreating;

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
        gradient: "from-indigo-500 to-violet-600",
        iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
        iconText: "text-indigo-600 dark:text-indigo-400",
        border: "border-indigo-200/50 dark:border-indigo-800/30",
        valueColor: "text-indigo-700 dark:text-indigo-400",
      },
    ],
    [summary, totalMasukFiltered, totalKeluarFiltered, getCardLabel]
  );

  if (!wilayahRwId) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Buku Kas RW</CardTitle>
            <CardDescription>
              wilayah_rw_id tidak tersedia. Login ulang sebagai RW untuk mengelola buku kas.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30">
            <BookOpenText className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Buku Kas RW
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Kelola transaksi kas masuk & keluar
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className={showAddForm
              ? "gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white border-0 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 rounded-xl h-11 px-5 font-bold"
              : "gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-0 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 rounded-xl h-11 px-5 font-bold"
            }
            variant="default"
          >
            {showAddForm ? "Tutup Form" : (
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
        {summaryCards.map(({ label, value, icon: Icon, gradient, iconBg, iconText, border, valueColor }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-3xl border bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${border}`}
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${gradient} rounded-t-3xl`} />
            <div className="p-5 pt-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-muted-foreground mb-1">
                  {label}
                </p>
                <p className={`text-xl font-extrabold tabular-nums truncate ${valueColor}`}>
                  {value}
                </p>
              </div>
              <span className={`inline-flex size-10 items-center justify-center rounded-2xl shrink-0 ${iconBg} ${iconText}`}>
                <Icon className="size-5" />
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Add transaction form */}
      {showAddForm && (
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Plus className="size-4.5 text-slate-400" />
              Tambah Transaksi Kas
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Catat kas masuk dan kas keluar dengan bukti transaksi.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="jenis_transaksi" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jenis Transaksi</Label>
                <select id="jenis_transaksi" name="jenis_transaksi" defaultValue="MASUK" className={selectClass} disabled={disabled}>
                  <option value="MASUK">MASUK</option>
                  <option value="KELUAR">KELUAR</option>
                </select>
                {createState.fieldErrors.jenis_transaksi ? (
                  <p className="text-xs text-destructive">{createState.fieldErrors.jenis_transaksi}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tanggal" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tanggal</Label>
                <Input id="tanggal" name="tanggal" type="date" disabled={disabled} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="keterangan" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keterangan</Label>
                <Input
                  id="keterangan"
                  name="keterangan"
                  placeholder="Contoh: Pembelian alat kebersihan"
                  aria-invalid={Boolean(createState.fieldErrors.keterangan)}
                  disabled={disabled}
                />
                {createState.fieldErrors.keterangan ? (
                  <p className="text-xs text-destructive">{createState.fieldErrors.keterangan}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nominal" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nominal (Rp)</Label>
                <Input
                  id="nominal"
                  name="nominal"
                  type="number"
                  min={0}
                  step={1000}
                  aria-invalid={Boolean(createState.fieldErrors.nominal)}
                  disabled={disabled}
                />
                {createState.fieldErrors.nominal ? (
                  <p className="text-xs text-destructive">{createState.fieldErrors.nominal}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bukti_url" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Link Bukti (opsional)</Label>
                <Input
                  id="bukti_url"
                  name="bukti_url"
                  type="text"
                  placeholder="https://... atau link lainnya"
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bukti_foto" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upload Foto Bukti (opsional)</Label>
                <div className="relative flex items-center h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 px-3.5 py-2 text-sm transition-all duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
                  <input
                    id="bukti_foto"
                    name="bukti_foto"
                    type="file"
                    accept="image/*"
                    disabled={disabled}
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
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
                <p className="text-xs text-slate-400 mt-1">Bisa mengisi keduanya sekaligus — Link dan Foto akan ditampilkan bersama.</p>
              </div>

              {createState.message ? (
                <p className="sm:col-span-2 text-sm text-destructive">{createState.message}</p>
              ) : null}

              <Button type="submit" variant="rw" size="default" className="sm:col-span-2 w-full sm:w-auto" disabled={disabled}>
                {isCreating ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transaction history */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Search className="size-4.5 text-slate-400" />
            Riwayat Buku Kas
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Cari dan kelola transaksi yang sudah tercatat.</CardDescription>
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
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cari dari keterangan atau kode unik"
                  className="pl-10 h-10 rounded-xl text-sm"
                  disabled={isLoading}
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
                disabled={isLoading}
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
                  <TableHead className="font-semibold hidden md:table-cell w-[12%]">Kode Unik</TableHead>
                  <TableHead className="text-right font-semibold w-[8%]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
                      {isLoading ? "Memuat data kas..." : "Belum ada transaksi untuk filter ini."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-white/3">
                      <TableCell className="text-sm text-slate-600 dark:text-muted-foreground whitespace-nowrap">
                        {formatDate(item.tanggal)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.jenis_transaksi === "MASUK" ? "success" : "destructive"}>
                          {item.jenis_transaksi}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-slate-900 dark:text-foreground text-sm">{item.keterangan}</p>
                        {(item.bukti_foto_url || item.bukti_url) ? (
                          <div className="flex flex-col gap-1 mt-1 text-left items-start">
                            {item.bukti_foto_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline underline-offset-4 cursor-pointer outline-none bg-transparent border-none p-0"
                                  >
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline underline-offset-4"
                              >
                                <span className="size-1.5 rounded-full bg-indigo-500" />
                                Lihat Link Bukti →
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-muted-foreground">Tanpa bukti</p>
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
                          <EditKasDialog item={item} onSaved={fetchKas} disabled={disabled} />
                          <DeleteKasDialog itemId={item.id} onDeleted={fetchKas} disabled={disabled} />
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
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(filteredItems.length, (currentPage - 1) * pageSize + 1)}</span> - <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(filteredItems.length, currentPage * pageSize)}</span> dari <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredItems.length}</span> transaksi
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {/* Page limit selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-muted-foreground whitespace-nowrap">Baris per halaman:</span>
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
                    disabled={currentPage === 1 || isLoading}
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
                    disabled={currentPage === totalPages || isLoading}
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
  item: KasItem;
  onSaved: () => Promise<void>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editFileName, setEditFileName] = useState<string>("");
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setEditFileName("");
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
    }
  }, [open]);

  const [editState, editAction, isEditing] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const itemId = String(formData.get("id") ?? "").trim();
      const jenisTransaksi = String(formData.get("jenis_transaksi") ?? "").trim();
      const tanggal = String(formData.get("tanggal") ?? "").trim();
      const keterangan = String(formData.get("keterangan") ?? "").trim();
      const nominal = String(formData.get("nominal") ?? "").trim();
      const buktiUrl = String(formData.get("bukti_url") ?? "").trim();

      const fieldErrors: FieldErrors = {};
      if (!itemId) fieldErrors.id = "id transaksi tidak valid.";
      if (!keterangan) fieldErrors.keterangan = "Keterangan wajib diisi.";
      if (!nominal || Number(nominal) <= 0) fieldErrors.nominal = "Nominal harus lebih dari 0.";

      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Periksa kembali data update kas.", fieldErrors };
      }

      try {
        const payload = new FormData();
        payload.append("jenis_transaksi", jenisTransaksi);
        if (tanggal) {
          payload.append("tanggal", new Date(`${tanggal}T00:00:00.000Z`).toISOString());
        }
        payload.append("keterangan", keterangan);
        payload.append("nominal", nominal);

        // Always send bukti_url so user can add or clear it independently of foto
        payload.append("bukti_url", buktiUrl);

        const buktiFoto = formData.get("bukti_foto") as File;
        if (buktiFoto && buktiFoto.size > 0) {
          payload.append("bukti_foto", buktiFoto);
        }

        await api.patch(`/rw/kas/${itemId}`, payload, {
          headers: {
            "Content-Type": undefined,
          },
        });

        toast.success("Transaksi kas berhasil diperbarui.");
        await onSaved();
        setOpen(false);

        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

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
          <DialogTitle>Edit Transaksi Kas</DialogTitle>
          <DialogDescription>Perbarui data transaksi tanpa mengubah kode unik.</DialogDescription>
        </DialogHeader>

        <form action={editAction} className="space-y-4 mt-2">
          <input type="hidden" name="id" value={item.id} />

          <div className="space-y-1.5">
            <Label htmlFor={`jenis-${item.id}`}>Jenis Transaksi</Label>
            <select id={`jenis-${item.id}`} name="jenis_transaksi" defaultValue={item.jenis_transaksi} className={selectClass} disabled={isEditing}>
              <option value="MASUK">MASUK</option>
              <option value="KELUAR">KELUAR</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`tanggal-${item.id}`}>Tanggal</Label>
            <Input id={`tanggal-${item.id}`} name="tanggal" type="date" defaultValue={toDateInputValue(item.tanggal)} disabled={isEditing} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`keterangan-${item.id}`}>Keterangan</Label>
            <Input
              id={`keterangan-${item.id}`}
              name="keterangan"
              defaultValue={item.keterangan}
              aria-invalid={Boolean(editState.fieldErrors.keterangan)}
              disabled={isEditing}
            />
            {editState.fieldErrors.keterangan ? <p className="text-xs text-destructive">{editState.fieldErrors.keterangan}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`nominal-${item.id}`}>Nominal (Rp)</Label>
            <Input
              id={`nominal-${item.id}`}
              name="nominal"
              type="number"
              min={0}
              step={1000}
              defaultValue={String(Number(item.nominal))}
              aria-invalid={Boolean(editState.fieldErrors.nominal)}
              disabled={isEditing}
            />
            {editState.fieldErrors.nominal ? <p className="text-xs text-destructive">{editState.fieldErrors.nominal}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`bukti-${item.id}`}>Link Bukti</Label>
            <Input id={`bukti-${item.id}`} name="bukti_url" type="text" defaultValue={item.bukti_url ?? ""} placeholder="https://... atau link lainnya" disabled={isEditing} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`foto-${item.id}`}>Ganti Foto Bukti (opsional)</Label>
            <div className="relative flex items-center h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 px-3.5 py-2 text-sm transition-all duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
              <input
                id={`foto-${item.id}`}
                name="bukti_foto"
                type="file"
                accept="image/*"
                disabled={isEditing}
                ref={editFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
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
              <p className="text-[10px] text-emerald-600 font-medium">Sudah ada foto terunggah. Upload baru akan mengganti foto lama.</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">Link dan Foto bisa diisi bersamaan.</p>
          </div>

          {editState.message ? <p className="text-sm text-destructive">{editState.message}</p> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={isEditing} onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" variant="rw" disabled={isEditing}>
              {isEditing ? "Menyimpan..." : "Simpan Perubahan"}
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

  const [deleteState, deleteAction, isDeleting] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const id = String(formData.get("id") ?? "").trim();

      if (!id) {
        return { message: "id transaksi tidak valid.", fieldErrors: { id: "id transaksi tidak valid." } };
      }

      try {
        await api.delete(`/rw/kas/${id}`);
        toast.success("Transaksi kas berhasil dihapus.");
        await onDeleted();
        setOpen(false);
        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

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
          <DialogTitle>Hapus Transaksi Kas</DialogTitle>
          <DialogDescription>Aksi ini tidak dapat dibatalkan. Data kas akan dihapus permanen.</DialogDescription>
        </DialogHeader>

        <form action={deleteAction} className="space-y-4">
          <input type="hidden" name="id" value={itemId} />

          {deleteState.message ? <p className="text-sm text-destructive">{deleteState.message}</p> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" variant="destructive" disabled={isDeleting}>
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
