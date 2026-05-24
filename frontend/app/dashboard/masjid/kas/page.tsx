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
import {
  Banknote,
  CalendarRange,
  Pencil,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  RotateCcw,
} from "lucide-react";

interface KasMasjidItem {
  id: string;
  masjid_id: string;
  jenis_transaksi: "MASUK" | "KELUAR";
  tanggal: string;
  keterangan: string;
  nominal: number | string;
  bukti_url: string | null;
  bukti_foto_url: string | null;
  kode_unik: string;
}

interface KasMasjidResponse {
  data: {
    masjid_id: string;
    items: KasMasjidItem[];
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

const formatDateForLabel = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const toDateInputValue = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
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

const isImageFile = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const cleanUrl = url.trim().toLowerCase();
  const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
  const hasImageExtension = extensions.some(ext => cleanUrl.endsWith(ext) || cleanUrl.includes(ext + "?") || cleanUrl.includes(ext + "#"));
  const isUploadPath = cleanUrl.startsWith("/uploads/") || cleanUrl.includes("/uploads/");
  return hasImageExtension || isUploadPath;
};

export default function KasMasjidDashboardPage() {
  const { user } = useAuth();
  const masjidId = user?.masjid_ids?.[0] ?? "";

  const [kasItems, setKasItems] = useState<KasMasjidItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [createFileName, setCreateFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [startDateTerm, setStartDateTerm] = useState("");
  const [endDateTerm, setEndDateTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [summary, setSummary] = useState({
    total_masuk: 0,
    total_keluar: 0,
    saldo: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(kasItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedKasItems = useMemo(() => {
    return kasItems.slice(startIndex, startIndex + itemsPerPage);
  }, [kasItems, currentPage, itemsPerPage, startIndex]);

  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [kasItems.length, itemsPerPage, totalPages, currentPage]);

  const loadAvailableYears = useCallback(async () => {
    if (!masjidId) return;
    try {
      const response = await api.get<KasMasjidResponse>("/masjid/kas", {
        params: { masjid_id: masjidId },
      });
      const items = response.data.data.items ?? [];
      const yearsSet = new Set<number>();
      yearsSet.add(new Date().getFullYear());
      items.forEach((item) => {
        const yr = new Date(item.tanggal).getFullYear();
        if (!Number.isNaN(yr)) {
          yearsSet.add(yr);
        }
      });
      setAvailableYears(Array.from(yearsSet).sort((a, b) => b - a));
    } catch (e) {
      console.error("Failed to load available years", e);
    }
  }, [masjidId]);

  useEffect(() => {
    loadAvailableYears();
  }, [loadAvailableYears]);

  const fetchKasMasjid = useCallback(
    async (search: string, startDate: string, endDate: string, year: string) => {
      if (!masjidId) {
        return;
      }

      setIsLoading(true);
      try {
        let finalStartDate = startDate;
        let finalEndDate = endDate;

        if (!startDate && !endDate && year) {
          finalStartDate = `${year}-01-01`;
          finalEndDate = `${year}-12-31`;
        }

        const response = await api.get<KasMasjidResponse>("/masjid/kas", {
          params: {
            masjid_id: masjidId,
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(finalStartDate ? { start_date: new Date(`${finalStartDate}T00:00:00.000Z`).toISOString() } : {}),
            ...(finalEndDate ? { end_date: new Date(`${finalEndDate}T23:59:59.999Z`).toISOString() } : {}),
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
    [masjidId]
  );

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, startDateTerm, endDateTerm, selectedYear]);

  // Fetch data on filter change (realtime)
  useEffect(() => {
    if (!masjidId) {
      return;
    }

    fetchKasMasjid(debouncedSearchTerm, startDateTerm, endDateTerm, selectedYear).catch(() => {
      toast.error("Gagal memuat buku kas masjid.");
    });
  }, [debouncedSearchTerm, startDateTerm, endDateTerm, selectedYear, fetchKasMasjid, masjidId]);

  const [createState, createAction, isCreating] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const jenisTransaksi = String(formData.get("jenis_transaksi") ?? "").trim();
      const tanggal = String(formData.get("tanggal") ?? "").trim();
      const keterangan = String(formData.get("keterangan") ?? "").trim();
      const nominal = String(formData.get("nominal") ?? "").trim();
      const buktiUrl = String(formData.get("bukti_url") ?? "").trim();

      const fieldErrors: FieldErrors = {};

      if (!masjidId) {
        fieldErrors.masjid_id = "masjid_id tidak tersedia di sesi login.";
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
        return { message: "Periksa kembali form kas masjid.", fieldErrors };
      }

      try {
        const payload = new FormData();
        payload.append("masjid_id", masjidId);
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

        await api.post("/masjid/kas", payload, {
          headers: {
            "Content-Type": undefined,
          },
        });

        toast.success("Transaksi kas masjid berhasil ditambahkan.");
        setShowAddForm(false);
        await fetchKasMasjid(searchTerm, startDateTerm, endDateTerm, selectedYear);
        await loadAvailableYears();
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setCreateFileName("");
        setCurrentPage(1);

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

  const labelSuffix = useMemo(() => {
    if (startDateTerm || endDateTerm) {
      const startFormatted = formatDateForLabel(startDateTerm);
      const endFormatted = formatDateForLabel(endDateTerm);
      if (startFormatted && endFormatted) {
        return ` (${startFormatted} - ${endFormatted})`;
      } else if (startFormatted) {
        return ` (>= ${startFormatted})`;
      } else if (endFormatted) {
        return ` (<= ${endFormatted})`;
      }
    }
    if (selectedYear) {
      return ` ${selectedYear}`;
    }
    return "";
  }, [selectedYear, startDateTerm, endDateTerm]);

  const summaryCards = useMemo(
    () => [
      {
        label: `Total Masuk${labelSuffix}`,
        value: formatRupiah(summary.total_masuk),
        icon: TrendingUp,
        gradient: "from-emerald-500 to-teal-600",
        iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
        iconText: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-200/50 dark:border-emerald-800/30",
        valueColor: "text-emerald-700 dark:text-emerald-400",
      },
      {
        label: `Total Keluar${labelSuffix}`,
        value: formatRupiah(summary.total_keluar),
        icon: TrendingDown,
        gradient: "from-rose-500 to-red-600",
        iconBg: "bg-rose-50 dark:bg-rose-950/40",
        iconText: "text-rose-600 dark:text-rose-400",
        border: "border-rose-200/50 dark:border-rose-800/30",
        valueColor: "text-rose-700 dark:text-rose-400",
      },
      {
        label: `Saldo Bersih${labelSuffix}`,
        value: formatRupiah(summary.saldo),
        icon: Wallet,
        gradient: "from-indigo-500 to-violet-600",
        iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
        iconText: "text-indigo-600 dark:text-indigo-400",
        border: "border-indigo-200/50 dark:border-indigo-800/30",
        valueColor: "text-indigo-700 dark:text-indigo-400",
      },
    ],
    [summary, labelSuffix]
  );

  if (!masjidId) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Buku Kas Masjid</CardTitle>
            <CardDescription>
              masjid_id tidak tersedia. Login ulang sebagai Pengurus Masjid untuk mengelola buku kas.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
            <Banknote className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground mt-0.5">
              Buku Kas Masjid
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Kelola transaksi operasional masuk dan keluar
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className={
              showAddForm
                ? "gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white border-0 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 rounded-xl h-11 px-5 font-bold"
                : "gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 rounded-xl h-11 px-5 font-bold"
            }
            variant="default"
          >
            {showAddForm ? (
              <>
                <X className="size-4" />
                Tutup Form
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Tambah Kas Masjid
              </>
            )}
          </Button>
        </div>
      </header>

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
              <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-2xl ${iconBg} ${iconText}`}>
                <Icon className="size-5" />
              </span>
            </div>
          </div>
        ))}
      </section>

      {showAddForm && (
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4 text-slate-400" />
              Tambah Transaksi Kas Masjid
            </CardTitle>
            <CardDescription>Catat pemasukan dan pengeluaran operasional masjid.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form action={createAction} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="jenis_transaksi" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Jenis Transaksi</Label>
                <select id="jenis_transaksi" name="jenis_transaksi" defaultValue="MASUK" className={selectClass} disabled={disabled}>
                  <option value="MASUK">MASUK</option>
                  <option value="KELUAR">KELUAR</option>
                </select>
                {createState.fieldErrors.jenis_transaksi ? (
                  <p className="text-xs text-destructive">{createState.fieldErrors.jenis_transaksi}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tanggal" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Tanggal</Label>
                <Input id="tanggal" name="tanggal" type="date" disabled={disabled} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="keterangan" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Keterangan</Label>
                <Input
                  id="keterangan"
                  name="keterangan"
                  placeholder="Contoh: Pembelian alat kebersihan masjid"
                  aria-invalid={Boolean(createState.fieldErrors.keterangan)}
                  disabled={disabled}
                />
                {createState.fieldErrors.keterangan ? (
                  <p className="text-xs text-destructive">{createState.fieldErrors.keterangan}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nominal" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Nominal (Rp)</Label>
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
                <Label htmlFor="bukti_url" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Link Bukti (opsional)</Label>
                <Input
                  id="bukti_url"
                  name="bukti_url"
                  type="text"
                  placeholder="https://..."
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bukti_foto" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Upload Foto Bukti (opsional)</Label>
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
                <p className="text-[10px] text-slate-400 mt-1">Bisa mengisi keduanya sekaligus — Link dan Foto akan ditampilkan bersama.</p>
              </div>

              {createState.message ? (
                <p className="sm:col-span-2 text-sm text-destructive">{createState.message}</p>
              ) : null}

              <Button type="submit" variant="masjid" size="default" className="sm:col-span-2 w-full sm:w-auto" disabled={disabled}>
                {isCreating ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4 flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="size-4 text-slate-400" />
              Riwayat Buku Kas Masjid{labelSuffix}
            </CardTitle>
            <CardDescription>Filter berdasarkan keyword dan rentang tanggal.</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Tahun:</span>
            <select
              className="h-9 w-32 rounded-lg border border-emerald-500 dark:border-emerald-400 bg-emerald-50/10 dark:bg-emerald-950/10 px-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer shadow-xs hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
              }}
            >
              <option value="">Semua Tahun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Cari Transaksi</Label>
              <Input
                id="search"
                name="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Keterangan atau kode unik"
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
                value={startDateTerm}
                onChange={(event) => setStartDateTerm(event.target.value)}
                className={`transition-all duration-200 ${startDateTerm
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
                value={endDateTerm}
                onChange={(event) => setEndDateTerm(event.target.value)}
                className={`transition-all duration-200 ${endDateTerm
                    ? "border-emerald-500 dark:border-emerald-400 focus-visible:ring-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10"
                    : ""
                  }`}
              />
            </div>
            {(searchTerm || startDateTerm || endDateTerm) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStartDateTerm("");
                  setEndDateTerm("");
                }}
                className="h-10 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-950/30 shrink-0 font-semibold shadow-sm transition-all w-full lg:w-auto whitespace-nowrap"
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
                  <TableHead className="font-semibold">Tanggal</TableHead>
                  <TableHead className="font-semibold">Jenis</TableHead>
                  <TableHead className="font-semibold">Keterangan</TableHead>
                  <TableHead className="font-semibold">Nominal</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Kode Unik</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kasItems.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
                      {isLoading ? "Memuat data kas masjid..." : "Belum ada transaksi untuk filter ini."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedKasItems.map((item) => (
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
                          <div className="flex flex-col gap-1 text-left items-start mt-1">
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
                                  <DialogTitle className="sr-only">Bukti Foto</DialogTitle>
                                  <div className="relative max-w-full max-h-[85vh] overflow-hidden rounded-2xl">
                                    <img
                                      src={getProofUrl(item.bukti_foto_url)}
                                      alt="Bukti Foto"
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
                              isImageFile(item.bukti_url) ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline underline-offset-4 cursor-pointer outline-none bg-transparent border-none p-0"
                                    >
                                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      Lihat Link Bukti (Foto) →
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent showCloseButton={false} className="max-w-[90vw] md:max-w-4xl p-0 bg-transparent border-none ring-0 shadow-none focus:outline-none flex items-center justify-center">
                                    <DialogTitle className="sr-only">Bukti Link</DialogTitle>
                                    <div className="relative max-w-full max-h-[85vh] overflow-hidden rounded-2xl">
                                      <img
                                        src={getProofUrl(item.bukti_url)}
                                        alt="Bukti Link"
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
                                <a
                                  href={ensureAbsoluteUrl(item.bukti_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline underline-offset-4"
                                >
                                  <span className="size-1.5 rounded-full bg-emerald-500" />
                                  Lihat Link Bukti →
                                </a>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">Tanpa bukti</p>
                        )}
                      </TableCell>
                      <TableCell className="font-bold tabular-nums text-slate-900 dark:text-foreground whitespace-nowrap">
                        {formatRupiah(item.nominal)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <code className="text-xs text-slate-500 dark:text-muted-foreground bg-slate-100 dark:bg-white/8 px-2 py-0.5 rounded-md">
                          {item.kode_unik}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <EditKasMasjidDialog
                            item={item}
                            onSaved={async () => {
                              await fetchKasMasjid(searchTerm, startDateTerm, endDateTerm, selectedYear);
                              await loadAvailableYears();
                            }}
                            disabled={disabled}
                          />
                          <DeleteKasMasjidDialog
                            itemId={item.id}
                            onDeleted={async () => {
                              await fetchKasMasjid(searchTerm, startDateTerm, endDateTerm, selectedYear);
                              await loadAvailableYears();
                            }}
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
        </CardContent>

        {/* Pagination / Footer */}
        {kasItems.length > 0 && (
          <div className="border-t border-slate-100 dark:border-white/8 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                Menampilkan
              </span>
              <select
                className="h-8 rounded-lg border border-input bg-white dark:bg-card px-2 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[10, 20, 50, 100].map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
              <span className="text-sm text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                dari {kasItems.length} data
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 pl-2.5"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>
              <div className="px-2 text-sm font-medium text-slate-600 dark:text-foreground/80">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 pr-2.5"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}

function EditKasMasjidDialog({
  item,
  onSaved,
  disabled,
}: {
  item: KasMasjidItem;
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
        return { message: "Periksa kembali data update kas masjid.", fieldErrors };
      }

      try {
        const payload = new FormData();
        payload.append("jenis_transaksi", jenisTransaksi);
        if (tanggal) {
          payload.append("tanggal", new Date(`${tanggal}T00:00:00.000Z`).toISOString());
        }
        payload.append("keterangan", keterangan);
        payload.append("nominal", nominal);
        payload.append("bukti_url", buktiUrl);

        const buktiFoto = formData.get("bukti_foto") as File;
        if (buktiFoto && buktiFoto.size > 0) {
          payload.append("bukti_foto", buktiFoto);
        }

        await api.patch(`/masjid/kas/${itemId}`, payload, {
          headers: {
            "Content-Type": undefined,
          },
        });

        toast.success("Transaksi kas masjid berhasil diperbarui.");
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
          <DialogTitle>Edit Transaksi Kas Masjid</DialogTitle>
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
            <Input id={`bukti-${item.id}`} name="bukti_url" type="text" defaultValue={item.bukti_url ?? ""} placeholder="https://..." disabled={isEditing} />
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
            <Button type="submit" variant="masjid" disabled={isEditing}>
              {isEditing ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteKasMasjidDialog({
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
        await api.delete(`/masjid/kas/${id}`);
        toast.success("Transaksi kas masjid berhasil dihapus.");
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
          <DialogTitle>Hapus Transaksi Kas Masjid</DialogTitle>
          <DialogDescription>Aksi ini tidak dapat dibatalkan. Data kas masjid akan dihapus permanen.</DialogDescription>
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
