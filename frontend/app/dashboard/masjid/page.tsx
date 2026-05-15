"use client";

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZisCardsSkeleton } from "./ZisCardsSkeleton";
import {
  Building2,
  HandCoins,
  MapPinHouse,
  UserRound,
  Download,
  FilterX,
  Pencil,
  Printer,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const ZisCards = lazy(() => import("./ZisCards"));

// ─── Types ────────────────────────────────────────────────────────────────────

interface PengaturanZis {
  persen_fakir: number;
  persen_amil: number;
  persen_fisabilillah: number;
  persen_lainnya: number;
  harga_beras_per_kg: number | string;
}

interface DashboardZisPayload {
  masjid_id: string;
  pengaturan_zis: PengaturanZis;
  total_beras: number;
  total_uang_zakat: number;
  total_infaq: number;
  total_kk: number;
  total_jiwa: number;
  total_dana_distribusi: number;
  distribusi_uang_zakat: {
    nominal: { fakir: number; amil: number; fisabilillah: number; lainnya: number };
  };
  distribusi_beras_kg: {
    nominal_kg: { fakir: number; amil: number; fisabilillah: number; lainnya: number };
  };
}

interface MasjidReportResponse {
  data: {
    masjid: {
      id: string;
      nama_masjid: string;
      alamat: string;
      blok_wilayah: {
        nama_blok: string;
        no_rt: string | null;
        nama_kompleks: string;
        no_rw: string;
      };
    };
    summary: {
      total_kas_masuk: number;
      total_kas_keluar: number;
      saldo_kas: number;
      total_zis_uang_zakat: number;
      total_zis_uang_infaq: number;
    };
    series: Array<unknown>;
  };
}

interface TransaksiZisItem {
  id: string;
  kode_unik: string;
  nama_kk: string;
  alamat_muzaqi: string;
  jumlah_jiwa: number;
  jenis_bayar: "UANG" | "BERAS";
  jenis_zakat: "FITRAH" | "MAAL";
  nominal_zakat: string | number;
  nominal_infaq: string | number;
  total_beras_kg: string | number;
  waktu_transaksi: string;
}

interface TransaksiMeta {
  total_count: number;
  total_pages: number;
  current_page: number;
  limit: number;
}

interface TransaksiResponse {
  data: TransaksiZisItem[];
  meta: TransaksiMeta;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const fixedDistributionPercent = {
  fakir: 62.5,
  amil: 8,
  fisabilillah: 11,
  lainnya: 18.5,
};

const toFixed2 = (value: number) => Math.round(value * 100) / 100;

const calculateFixedDistribution = (total: number) => ({
  fakir: toFixed2((fixedDistributionPercent.fakir / 100) * total),
  amil: toFixed2((fixedDistributionPercent.amil / 100) * total),
  fisabilillah: toFixed2((fixedDistributionPercent.fisabilillah / 100) * total),
  lainnya: toFixed2((fixedDistributionPercent.lainnya / 100) * total),
});

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatTanggal = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const formatAreaCode = (value: string | null | undefined): string => {
  if (!value) {
    return "-";
  }

  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 99) {
      return String(parsed).padStart(2, "0");
    }

    return String(parsed);
  }

  return normalized;
};

const formatBlokName = (value: string): string => {
  const trimmed = value.trim();
  if (/^blok\s+/i.test(trimmed)) {
    return trimmed;
  }

  return `Blok ${trimmed}`;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MasjidDashboardPage() {
  const { user } = useAuth();
  const defaultMasjidId = useMemo(() => user?.masjid_ids?.[0] ?? "", [user]);

  const [dashboardData, setDashboardData] = useState<DashboardZisPayload | null>(null);
  const [reportData, setReportData] = useState<MasjidReportResponse["data"] | null>(null);
  const [transaksi, setTransaksi] = useState<TransaksiZisItem[]>([]);
  const [transaksiMeta, setTransaksiMeta] = useState<TransaksiMeta | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingTransaksi, setIsLoadingTransaksi] = useState(false);

  // Filter & Pagination state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTrxId, setEditTrxId] = useState("");
  const [editNamaKk, setEditNamaKk] = useState("");
  const [editAlamat, setEditAlamat] = useState("");
  const [editWaktu, setEditWaktu] = useState("");
  const [editJumlahJiwa, setEditJumlahJiwa] = useState(1);
  const [editJenisBayar, setEditJenisBayar] = useState<"UANG" | "BERAS">("UANG");
  const [editJenisZakat, setEditJenisZakat] = useState<"FITRAH" | "MAAL">("FITRAH");
  const [editNominalInfaq, setEditNominalInfaq] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const openEditModal = (trx: TransaksiZisItem) => {
    setEditTrxId(trx.id);
    setEditNamaKk(trx.nama_kk);
    setEditAlamat(trx.alamat_muzaqi);

    // adjust timezone for input display
    const dt = new Date(trx.waktu_transaksi);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    setEditWaktu(dt.toISOString().slice(0, 16));

    setEditJumlahJiwa(trx.jumlah_jiwa);
    setEditJenisBayar(trx.jenis_bayar);
    setEditJenisZakat(trx.jenis_zakat ?? "FITRAH");
    setEditNominalInfaq(String(trx.nominal_infaq || ""));
    setIsEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editNamaKk.trim().length < 2) return toast.error("Nama Kepala Keluarga minimal 2 karakter.");
    if (editAlamat.trim().length < 3) return toast.error("Alamat minimal 3 karakter.");
    if (!editWaktu) return toast.error("Waktu transaksi wajib diisi.");
    if (editJumlahJiwa < 1) return toast.error("Jumlah jiwa minimal 1.");

    setIsUpdating(true);
    try {
      await api.put(`/zis/transaksi/${editTrxId}`, {
        nama_kk: editNamaKk,
        alamat_muzaqi: editAlamat,
        waktu_transaksi: new Date(editWaktu).toISOString(),
        jumlah_jiwa: editJumlahJiwa,
        jenis_bayar: editJenisBayar,
        jenis_zakat: editJenisZakat,
        nominal_infaq: Number(editNominalInfaq || 0),
      });
      toast.success("Data berhasil diperbarui!");
      setIsEditOpen(false);
      fetchTransaksi(defaultMasjidId, appliedStart, appliedEnd, page, limit).catch(() => undefined);
      fetchDashboard(defaultMasjidId).catch(() => undefined);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsUpdating(false);
    }
  };


  // Fetch dashboard + report
  const fetchDashboard = useCallback(async (masjidId: string) => {
    setIsLoadingData(true);
    try {
      const [dashRes, reportRes] = await Promise.all([
        api.get<{ data: DashboardZisPayload }>("/zis/dashboard", {
          params: { masjid_id: masjidId },
        }),
        api.get<MasjidReportResponse>("/masjid/report", {
          params: { masjid_id: masjidId },
        }),
      ]);
      setDashboardData(dashRes.data.data);
      setReportData(reportRes.data.data);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setDashboardData(null);
      setReportData(null);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Fetch transaksi list (with optional date filter & pagination)
  const fetchTransaksi = useCallback(
    async (masjidId: string, start?: string, end?: string, currentPage = 1, currentLimit = 10) => {
      setIsLoadingTransaksi(true);
      try {
        const params: Record<string, string | number> = {
          masjid_id: masjidId,
          page: currentPage,
          limit: currentLimit
        };
        if (start) params.start_date = new Date(start).toISOString();
        if (end) {
          const d = new Date(end);
          d.setHours(23, 59, 59, 999);
          params.end_date = d.toISOString();
        }
        const res = await api.get<TransaksiResponse>("/zis/transaksi", { params });
        setTransaksi(res.data.data ?? []);
        setTransaksiMeta(res.data.meta);
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        setTransaksi([]);
        setTransaksiMeta(null);
      } finally {
        setIsLoadingTransaksi(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!defaultMasjidId) {
      setDashboardData(null);
      setReportData(null);
      setTransaksi([]);
      setTransaksiMeta(null);
      return;
    }
    fetchDashboard(defaultMasjidId).catch(() => undefined);
  }, [defaultMasjidId, fetchDashboard]);

  useEffect(() => {
    if (!defaultMasjidId) return;
    fetchTransaksi(defaultMasjidId, appliedStart, appliedEnd, page, limit).catch(() => undefined);
  }, [defaultMasjidId, fetchTransaksi, appliedStart, appliedEnd, page, limit]);

  const handleApplyFilter = () => {
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
    setPage(1);
  };

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStart("");
    setAppliedEnd("");
    setPage(1);
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus transaksi "${nama}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await api.delete(`/zis/transaksi/${id}`);
      toast.success("Transaksi berhasil dihapus.");
      fetchTransaksi(defaultMasjidId, appliedStart, appliedEnd).catch(() => undefined);
      fetchDashboard(defaultMasjidId).catch(() => undefined);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  const handleCetakKwitansi = async (trxId: string) => {
    try {
      const res = await api.get(`/zis/transaksi/${trxId}/kwitansi`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };


  // Build export URL
  const buildExportUrl = (type: "muzaqi" | "distribusi", fmt: "XLSX" | "PDF") => {
    const params = new URLSearchParams({ format: fmt });
    if (defaultMasjidId) params.set("masjid_id", defaultMasjidId);
    if (appliedStart) params.set("start_date", new Date(appliedStart).toISOString());
    if (appliedEnd) {
      const d = new Date(appliedEnd);
      d.setHours(23, 59, 59, 999);
      params.set("end_date", d.toISOString());
    }
    return `/api/zis/transaksi/export/${type}?${params.toString()}`;
  };

  const handleExport = async (type: "muzaqi" | "distribusi") => {
    try {
      // Selalu gunakan PDF
      const params: Record<string, string> = { format: "PDF" };

      if (defaultMasjidId) params.masjid_id = defaultMasjidId;
      if (appliedStart) params.start_date = new Date(appliedStart).toISOString();
      if (appliedEnd) {
        const d = new Date(appliedEnd);
        d.setHours(23, 59, 59, 999);
        params.end_date = d.toISOString();
      }

      const res = await api.get(`/zis/transaksi/export/${type}`, {
        params,
        responseType: "blob",
      });

      const blob = new Blob([res.data as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Open PDF in new tab for viewing / printing
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────
  const fixedUangDistribution = dashboardData
    ? calculateFixedDistribution(Number(dashboardData.total_uang_zakat || 0))
    : null;
  const fixedBerasDistribution = dashboardData
    ? calculateFixedDistribution(Number(dashboardData.total_beras || 0))
    : null;

  const wilayahLabel = reportData
    ? `RW ${formatAreaCode(reportData.masjid.blok_wilayah.no_rw)} • RT ${formatAreaCode(reportData.masjid.blok_wilayah.no_rt)} • ${formatBlokName(reportData.masjid.blok_wilayah.nama_blok)}`
    : "-";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
            <HandCoins className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Dashboard ZIS Masjid
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Ringkasan zakat, infaq, dan distribusi dana
            </p>
          </div>
        </div>
      </header>

      {/* Profile card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Kiri */}
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Pengelola
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-foreground">
                  {user?.nama ?? "-"}
                </p>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">
                  {user?.email ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Wilayah
                </p>
                <p className="text-base font-medium text-slate-800 dark:text-foreground/90">
                  {wilayahLabel}
                </p>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">
                  {reportData?.masjid.blok_wilayah.nama_kompleks ?? "-"}
                </p>
              </div>
            </div>

            {/* Kanan */}
            <div className="md:text-right border-t md:border-t-0 md:border-l border-slate-100 dark:border-white/10 pt-5 md:pt-0 md:pl-8">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide md:justify-end flex items-center gap-2 mb-2">
                <Building2 className="size-4 hidden md:block" />
                <span>Masjid Yang Dikelola</span>
              </p>
              <h2 className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {reportData?.masjid.nama_masjid ?? "-"}
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400 mt-2 max-w-sm md:ml-auto">
                {reportData?.masjid.alamat ?? "Data alamat belum tersedia."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!defaultMasjidId ? (
        <Card>
          <CardHeader>
            <CardTitle>Akun Belum Terhubung Ke Masjid</CardTitle>
            <CardDescription>
              Login sebagai pengurus masjid yang sudah memiliki penugasan masjid agar dashboard dapat dimuat.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : isLoadingData ? (
        <ZisCardsSkeleton />
      ) : !dashboardData ? (
        <Card>
          <CardHeader>
            <CardTitle>Belum Ada Data</CardTitle>
            <CardDescription>Data dashboard belum tersedia untuk masjid akun ini.</CardDescription>
          </CardHeader>
        </Card>
      ) : fixedUangDistribution && fixedBerasDistribution ? (
        <>
          {/* ZIS Summary Cards */}
          <Suspense fallback={<ZisCardsSkeleton />}>
            <ZisCards
              dashboardData={dashboardData}
              fixedUangDistribution={fixedUangDistribution}
              fixedBerasDistribution={fixedBerasDistribution}
              formatRupiah={formatRupiah}
              pengaturanZis={dashboardData.pengaturan_zis}
            />
          </Suspense>

          {/* ── Riwayat Transaksi ─────────────────────────────── */}
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Riwayat Transaksi</CardTitle>
                  <CardDescription className="mt-0.5">
                    {transaksi.length} data transaksi ZIS
                    {appliedStart || appliedEnd ? " (terfilter)" : ""}
                  </CardDescription>
                </div>
                <Link href="/dashboard/masjid/input">
                  <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    + Catat ZIS Baru
                  </Button>
                </Link>
              </div>

              {/* Filter */}
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 rounded-xl border border-input bg-white dark:bg-card px-3 text-sm min-w-37.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 rounded-xl border border-input bg-white dark:bg-card px-3 text-sm min-w-37.5"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-9"
                  onClick={handleApplyFilter}
                  disabled={isLoadingTransaksi}
                >
                  <Search className="size-3.5" />
                  Terapkan Filter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-9"
                  onClick={handleResetFilter}
                  disabled={isLoadingTransaksi}
                >
                  <FilterX className="size-3.5" />
                  Reset Filter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
                  onClick={() => handleExport("muzaqi")}
                >
                  <Download className="size-3.5" />
                  Rekap Muzaqi
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleExport("distribusi")}
                >
                  <Download className="size-3.5" />
                  Rekap Distribusi
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoadingTransaksi ? (
                <div className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
                  Memuat data transaksi...
                </div>
              ) : transaksi.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
                  Belum ada transaksi ZIS yang tercatat.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/8 bg-slate-50/60 dark:bg-white/3">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                          Nama KK
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                          Alamat Muzaqi
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                          Jiwa
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                          Jenis
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                          Nominal Zakat
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                          Infaq
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                          Waktu
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/6">
                      {transaksi.map((trx) => {
                        const isUang = trx.jenis_bayar === "UANG";
                        const isMaal = trx.jenis_zakat === "MAAL";
                        const nominalZakat = Number(trx.nominal_zakat || 0);
                        const nominalInfaq = Number(trx.nominal_infaq || 0);
                        const totalBeras = Number(trx.total_beras_kg || 0);

                        return (
                          <tr
                            key={trx.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-white/3 transition-colors"
                          >
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-foreground whitespace-nowrap">
                              {trx.nama_kk}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-foreground/80 whitespace-nowrap">
                              {trx.alamat_muzaqi}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-700 dark:text-foreground/80">
                              {trx.jumlah_jiwa}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isUang
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                  }`}
                              >
                                {trx.jenis_bayar === "UANG" ? "Uang" : "Beras"}
                              </span>
                              <span
                                className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isMaal
                                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                                  : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                                  }`}
                              >
                                {isMaal ? "Maal" : "Fitrah"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900 dark:text-foreground whitespace-nowrap">
                              {isUang ? formatRupiah(nominalZakat) : `${totalBeras.toFixed(2)} kg`}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900 dark:text-foreground whitespace-nowrap">
                              {formatRupiah(nominalInfaq)}
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                              <div className="text-xs leading-5">
                                {formatTanggal(trx.waktu_transaksi)}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-muted-foreground/60">
                                {trx.kode_unik}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Edit — Menampilkan Modal Popup */}
                                <button
                                  type="button"
                                  onClick={() => openEditModal(trx)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors"
                                >
                                  <Pencil className="size-3" />
                                  Edit
                                </button>
                                {/* Cetak */}
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                                  onClick={() => handleCetakKwitansi(trx.id)}
                                >
                                  <Printer className="size-3" />
                                  Cetak
                                </button>
                                {/* Hapus */}
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 transition-colors"
                                  onClick={() => handleDelete(trx.id, trx.nama_kk)}
                                >
                                  <Trash2 className="size-3" />
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>

            {/* Pagination / Footer */}
            {transaksiMeta && transaksi.length > 0 && (
              <div className="border-t border-slate-100 dark:border-white/8 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                    Menampilkan
                  </span>
                  <select
                    className="h-8 rounded-lg border border-input bg-white dark:bg-card px-2 text-sm focus:ring-1 focus:ring-emerald-500"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    disabled={isLoadingTransaksi}
                  >
                    {[10, 20, 50, 100].map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                    dari {transaksiMeta.total_count} data
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 pl-2.5"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoadingTransaksi}
                  >
                    <ChevronLeft className="size-4" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                  </Button>
                  <div className="px-2 text-sm font-medium text-slate-600 dark:text-foreground/80">
                    {page} / {transaksiMeta.total_pages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 pr-2.5"
                    onClick={() => setPage((p) => Math.min(transaksiMeta.total_pages, p + 1))}
                    disabled={page === transaksiMeta.total_pages || isLoadingTransaksi}
                  >
                    <span className="hidden sm:inline">Selanjutnya</span>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      ) : null}

      {/* MODAL EDIT TRANSAKSI ZIS */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-3xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-card shadow-2xl sm:max-w-md">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-foreground flex items-center gap-2">
              <Pencil className="size-5 text-emerald-600 dark:text-emerald-300" /> Revisi Data ZIS
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submitEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 dark:text-foreground">Nama Kepala Keluarga</Label>
              <Input
                value={editNamaKk}
                onChange={(e) => setEditNamaKk(e.target.value)}
                className="rounded-xl border-2 h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 dark:text-foreground">Alamat Lengkap</Label>
              <Input
                value={editAlamat}
                onChange={(e) => setEditAlamat(e.target.value)}
                className="rounded-xl border-2 h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 dark:text-foreground">Waktu Transaksi</Label>
              <Input
                type="datetime-local"
                value={editWaktu}
                onChange={(e) => setEditWaktu(e.target.value)}
                className="rounded-xl border-2 h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-foreground">Jumlah Jiwa</Label>
                <div className="flex items-center gap-2 mt-1">
                  <button type="button" onClick={() => setEditJumlahJiwa(j => Math.max(1, j - 1))} className="size-10 bg-slate-100 dark:bg-white/10 rounded-lg text-lg font-bold border-2">−</button>
                  <span className="flex-1 text-center font-black text-xl">{editJumlahJiwa}</span>
                  <button type="button" onClick={() => setEditJumlahJiwa(j => j + 1)} className="size-10 bg-slate-100 dark:bg-white/10 rounded-lg text-lg font-bold border-2">+</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-foreground">Jenis Bayar</Label>
                <select
                  className="w-full flex h-11 items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-card dark:text-white"
                  value={editJenisBayar}
                  onChange={(e) => setEditJenisBayar(e.target.value as any)}
                >
                  <option value="UANG">Tunai (Uang)</option>
                  <option value="BERAS">Beras (Kg)</option>
                </select>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-foreground">Jenis Zakat</Label>
                  <select
                    className="w-full flex h-11 items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-card dark:text-white"
                    value={editJenisZakat}
                    onChange={(e) => setEditJenisZakat(e.target.value as any)}
                  >
                    <option value="FITRAH">Fitrah</option>
                    <option value="MAAL">Maal</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 dark:text-foreground">Nominal Infaq (Opsional)</Label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={editNominalInfaq}
                onChange={(e) => setEditNominalInfaq(e.target.value)}
                className="rounded-xl border-2 h-11"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <div className="text-xs text-slate-500 mb-2 italic">
                *) Nominal Zakat akan otomatis dihitung ulang oleh sistem.
              </div>
              <Button type="submit" variant="masjid" size="lg" className="w-full shadow-lg" disabled={isUpdating}>
                {isUpdating ? "Menyimpan Ulang..." : "Simpan Revisi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
