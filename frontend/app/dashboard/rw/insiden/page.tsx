"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { laporanInsidenClient, type LaporanInsidenRecord, type StatusInsiden } from "@/lib/api/laporanInsiden";
import { performaRondaClient } from "@/lib/api/performaRonda";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { FileText, MapPin, Phone, User, Calendar, FileDown, Eye, CheckCircle2, ShieldAlert, AlertTriangle, Clock, Search, RotateCcw, Users, Filter, ChevronLeft, ChevronRight, X } from "lucide-react";

export default function RwMonitoringLaporanPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<LaporanInsidenRecord[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Selection for Export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<LaporanInsidenRecord | null>(null);
  const [imageError, setImageError] = useState(false);
  const [proofZoomOpen, setProofZoomOpen] = useState(false);

  // Reset image error state when report changes
  useEffect(() => {
    setImageError(false);
  }, [selectedReport]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterUrgency]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await laporanInsidenClient.list();
      setReports(data);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const statusColors: Record<string, string> = {
    LAPORAN: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50",
    PROSES: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
    SELESAI: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    DITUTUP: "bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50",
  };

  // Urgency detection helpers
  const getUrgency = (tipe: string, deskripsi: string, storedUrgency?: string): { label: string; color: string; bg: string } => {
    const u = (storedUrgency || "").toUpperCase();
    if (u === "TINGGI") return { label: "Tinggi", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/30" };
    if (u === "SEDANG") return { label: "Sedang", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/30" };
    if (u === "RENDAH") return { label: "Rendah", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/30" };

    const t = (tipe || "").toLowerCase();
    const d = (deskripsi || "").toLowerCase();

    if (
      t.includes("kebakaran") || t.includes("kemalingan") || t.includes("maling") ||
      t.includes("curi") || t.includes("rampok") || t.includes("darurat") ||
      t.includes("kritis") || t.includes("kecelakaan") || t.includes("kekerasan") ||
      t.includes("sajam") || t.includes("kelahi") || t.includes("darah") ||
      d.includes("kebakaran") || d.includes("kemalingan") || d.includes("maling") ||
      d.includes("darurat") || d.includes("kritis") || d.includes("kecelakaan")
    ) {
      return { label: "Tinggi", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/30" };
    }

    if (
      t.includes("ribut") || t.includes("tikai") || t.includes("hilang") ||
      t.includes("rusak") || t.includes("fasilitas") || t.includes("bocor") ||
      t.includes("banjir") || t.includes("hewan") || t.includes("parkir") ||
      t.includes("curiga") || d.includes("ribut") || d.includes("tikai") ||
      d.includes("hilang") || d.includes("rusak") || d.includes("banjir")
    ) {
      return { label: "Sedang", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/30" };
    }

    return { label: "Rendah", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/30" };
  };

  // Relative elapsed duration helper
  const getElapsedString = (dateString: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const incidentDate = new Date(dateString);
    incidentDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - incidentDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hari Ini";
    if (diffDays === 1) return "Kemarin";
    if (diffDays > 1) return `${diffDays} Hari Lalu`;
    return "Akan Datang";
  };

  // Coordination Delay detection
  const isDelayedReport = (status: string, dateString: string): boolean => {
    if (status !== "LAPORAN") return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const incidentDate = new Date(dateString);
    incidentDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - incidentDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 3;
  };

  // Photo URL builder helper
  const getPhotoUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/api\/?$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${base}${path}`;
  };

  // RT and Block display helper
  const getRtLabel = (report: LaporanInsidenRecord) => {
    if (!report.blok_wilayah) return "Umum / RW";
    const noRt = report.blok_wilayah.no_rt
      ? `RT ${report.blok_wilayah.no_rt.padStart(3, '0')}`
      : "";
    const namaBlok = `Blok ${report.blok_wilayah.nama_blok}`;
    return noRt ? `${namaBlok} . ${noRt}` : namaBlok;
  };

  // Status friendly display mapping
  const getStatusLabel = (status: string): string => {
    if (status === "LAPORAN") return "Belum Ditangani";
    if (status === "PROSES") return "Sedang Ditangani";
    if (status === "SELESAI") return "Selesai Ditangani";
    if (status === "DITUTUP") return "Ditutup";
    return status;
  };

  // Dynamic Select Trigger styling to match active status theme
  const getStatusTriggerStyle = (status: string): string => {
    if (status === "LAPORAN") return "!bg-rose-50/70 !border-rose-300 !text-rose-700 hover:!bg-rose-100/80 dark:!bg-rose-950/20 dark:!border-rose-900/50 dark:!text-rose-400 font-extrabold shadow-sm";
    if (status === "PROSES") return "!bg-amber-50/70 !border-amber-300 !text-amber-700 hover:!bg-amber-100/80 dark:!bg-amber-950/20 dark:!border-amber-900/50 dark:!text-amber-400 font-extrabold shadow-sm";
    if (status === "SELESAI") return "!bg-emerald-50/70 !border-emerald-300 !text-emerald-700 hover:!bg-emerald-100/80 dark:!bg-emerald-950/20 dark:!border-emerald-900/50 dark:!text-emerald-400 font-extrabold shadow-sm";
    if (status === "DITUTUP") return "!bg-slate-50/70 !border-slate-300 !text-slate-600 hover:!bg-slate-100/80 dark:!bg-slate-800/20 dark:!border-slate-700/50 dark:!text-slate-400 font-extrabold shadow-sm";
    return "!bg-white !border-slate-200 dark:!border-slate-800 !text-slate-600 dark:!text-slate-400 hover:!border-indigo-300 hover:!bg-slate-50/40 font-semibold";
  };

  const getStatusTriggerIcon = (status: string) => {
    const size = "size-4.5 mr-1.5 shrink-0";
    if (status === "LAPORAN") return <AlertTriangle className={`${size} text-rose-500`} />;
    if (status === "PROSES") return <Clock className={`${size} text-amber-500`} />;
    if (status === "SELESAI") return <CheckCircle2 className={`${size} text-emerald-500`} />;
    if (status === "DITUTUP") return <CheckCircle2 className={`${size} text-slate-500`} />;
    return <Filter className={`${size} text-indigo-500`} />;
  };

  // Dynamic Select Trigger styling to match active urgency theme
  const getUrgencyTriggerStyle = (urgency: string): string => {
    if (urgency === "TINGGI") return "!bg-rose-50/70 !border-rose-300 !text-rose-700 hover:!bg-rose-100/80 dark:!bg-rose-950/20 dark:!border-rose-900/50 dark:!text-rose-400 font-extrabold shadow-sm";
    if (urgency === "SEDANG") return "!bg-amber-50/70 !border-amber-300 !text-amber-700 hover:!bg-amber-100/80 dark:!bg-amber-950/20 dark:!border-amber-900/50 dark:!text-amber-400 font-extrabold shadow-sm";
    if (urgency === "RENDAH") return "!bg-blue-50/70 !border-blue-300 !text-blue-700 hover:!bg-blue-100/80 dark:!bg-blue-950/20 dark:!border-blue-900/50 dark:!text-blue-400 font-extrabold shadow-sm";
    return "!bg-white !border-slate-200 dark:!border-slate-800 !text-slate-600 dark:!text-slate-400 hover:!border-indigo-300 hover:!bg-slate-50/40 font-semibold";
  };

  const getUrgencyTriggerIcon = (urgency: string) => {
    const size = "size-4.5 mr-1.5 shrink-0";
    if (urgency === "TINGGI") return <AlertTriangle className={`${size} text-rose-500`} />;
    if (urgency === "SEDANG") return <Clock className={`${size} text-amber-500`} />;
    if (urgency === "RENDAH") return <CheckCircle2 className={`${size} text-blue-500`} />;
    return <Filter className={`${size} text-indigo-500`} />;
  };

  // Consolidated PDF Exports
  const handleExportSelective = async () => {
    if (selectedIds.size === 0) {
      toast.error("Pilih minimal satu laporan untuk diekspor");
      return;
    }

    toast.info(`Mengekspor ${selectedIds.size} laporan terpilih secara kolektif...`);

    try {
      const idsQueryParam = Array.from(selectedIds).join(",");
      const blob = await laporanInsidenClient.exportPdfGrouped({ ids: idsQueryParam });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_Kejadian_Terpilih_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Ekspor laporan berhasil diselesaikan dengan Kop Surat resmi RWManage");
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Gagal mengekspor laporan: " + getApiError(error).message);
    }
  };

  const handleExportSingle = async (report: LaporanInsidenRecord) => {
    toast.info(`Mengekspor laporan "${report.tipe_insiden}"...`);
    try {
      const blob = await laporanInsidenClient.exportPdf(report.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_Kejadian_${report.tipe_insiden.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Ekspor laporan berhasil diselesaikan dengan Kop Surat resmi RWManage");
    } catch (error) {
      toast.error("Gagal mengekspor laporan: " + getApiError(error).message);
    }
  };

  const handleExportAll = async () => {
    if (reports.length === 0) {
      toast.error("Tidak ada laporan untuk diekspor");
      return;
    }

    toast.info("Mengekspor seluruh laporan kejadian...");

    try {
      const blob = await laporanInsidenClient.exportPdfGrouped();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_Kejadian_Seluruhnya_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Seluruh laporan berhasil diekspor dengan Kop Surat resmi RWManage");
    } catch (error) {
      toast.error("Gagal mengekspor laporan: " + getApiError(error).message);
    }
  };

  const handleOpenDetail = (report: LaporanInsidenRecord) => {
    setSelectedReport(report);
    setDetailOpen(true);
  };

  // Filter & Search Logic
  const filteredReports = reports.filter((report) => {
    // 1. Text Search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchType = (report.tipe_insiden || "").toLowerCase().includes(q);
      const matchLoc = (report.lokasi || "").toLowerCase().includes(q);
      const matchDesc = (report.deskripsi || "").toLowerCase().includes(q);
      const matchReporter = (report.pelapor_nama || "").toLowerCase().includes(q);

      if (!matchType && !matchLoc && !matchDesc && !matchReporter) {
        return false;
      }
    }

    // 2. Filter Status
    if (filterStatus !== "all") {
      if (report.status !== filterStatus) {
        return false;
      }
    }

    // 3. Filter Urgency
    if (filterUrgency !== "all") {
      const urgencyLabel = getUrgency(report.tipe_insiden, report.deskripsi, report.urgensi).label.toUpperCase();
      if (urgencyLabel !== filterUrgency) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredReports.slice(start, end);
  }, [filteredReports, currentPage, pageSize]);

  const selectAll = () => {
    if (selectedIds.size === filteredReports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map(r => r.id)));
    }
  };

  const isFiltering = searchQuery.trim() !== "" || filterStatus !== "all" || filterUrgency !== "all";

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate Metrics from raw reports
  const totalLaporanBaru = reports.filter(r => r.status === "LAPORAN").length;

  const sedangDitangani = reports.filter(r => r.status === "PROSES").length;

  const selesaiBulanIni = reports.filter(r => {
    if (r.status !== "SELESAI") return false;
    const date = r.ditindaklanjuti_tanggal ? new Date(r.ditindaklanjuti_tanggal) : new Date(r.updated_at || r.created_at);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;

  const totalDelayedCount = reports.filter(r => isDelayedReport(r.status, r.tanggal_insiden)).length;

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Page Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <ShieldAlert className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
              Monitoring Laporan Kejadian - {monthNames[currentMonth]} {currentYear}
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Pantau laporan insiden keamanan, tingkat urgensi, dan status koordinasi di setiap RT
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button onClick={handleExportAll} className="gap-2 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 font-bold">
            <FileDown className="size-4.5 text-white" /> Export Semua PDF
          </Button>

          {selectedIds.size > 0 && (
            <Button onClick={handleExportSelective} className="gap-2 h-11 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm">
              <FileDown className="size-4.5" /> Export Terpilih ({selectedIds.size})
            </Button>
          )}
        </div>
      </header>

      {/* ── Friendly Notice for Delayed Actions (Amber alert style samakan setoran) ── */}
      {totalDelayedCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 shadow-xs dark:bg-amber-950/20 dark:border-amber-900/30">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 dark:text-amber-500" />
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Ada {totalDelayedCount} laporan baru yang belum ditindaklanjuti lebih dari 3 hari oleh RT terkait. Harap lakukan koordinasi langsung.
          </p>
        </div>
      )}

      {/* ── Summary Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Laporan Baru */}
        <div className="rounded-3xl border border-slate-200/80 border-t-4 border-t-rose-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Laporan Baru</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
              {totalLaporanBaru} <span className="text-xs font-bold text-slate-400 uppercase tracking-normal">Laporan</span>
            </h3>
          </div>
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/50">
            <AlertTriangle className="size-5.5" />
          </span>
        </div>

        {/* Sedang Ditangani */}
        <div className="rounded-3xl border border-slate-200/80 border-t-4 border-t-amber-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sedang Ditangani</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
              {sedangDitangani} <span className="text-xs font-bold text-slate-400 uppercase tracking-normal">Laporan</span>
            </h3>
          </div>
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50">
            <Clock className="size-5.5" />
          </span>
        </div>

        {/* Selesai Bulan Ini */}
        <div className="rounded-3xl border border-slate-200/80 border-t-4 border-t-emerald-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Selesai Bulan {monthNames[currentMonth]} {currentYear}</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {selesaiBulanIni} <span className="text-xs font-bold text-slate-400 uppercase tracking-normal">Laporan</span>
            </h3>
          </div>
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/50">
            <CheckCircle2 className="size-5.5" />
          </span>
        </div>
      </div>

      {/* ── Ronda-Style Filter Panel (Search, Status) ── */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3 dark:bg-slate-900 dark:border-slate-800">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Search className="size-4 text-indigo-500" />
          Cari & Saring Laporan Kejadian
        </p>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Cari tipe kejadian, lokasi, pelapor, deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl text-sm w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Filter Status */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[200px] transition-all duration-300 ${getStatusTriggerStyle(filterStatus)}`}>
              {getStatusTriggerIcon(filterStatus)}
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100 dark:border-slate-800">
              <SelectItem value="all" className="!text-sm !py-2 !px-3 !rounded-lg font-medium">Semua Status</SelectItem>
              <SelectItem value="LAPORAN" className="!text-sm !py-2 !px-3 !rounded-lg font-medium">Belum Ditangani</SelectItem>
              <SelectItem value="PROSES" className="!text-sm !py-2 !px-3 !rounded-lg font-medium">Sedang Diproses</SelectItem>
              <SelectItem value="SELESAI" className="!text-sm !py-2 !px-3 !rounded-lg font-medium">Selesai</SelectItem>
              <SelectItem value="DITUTUP" className="!text-sm !py-2 !px-3 !rounded-lg font-medium">Ditutup</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Urgensi */}
          <Select value={filterUrgency} onValueChange={setFilterUrgency}>
            <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[200px] transition-all duration-300 ${getUrgencyTriggerStyle(filterUrgency)}`}>
              {getUrgencyTriggerIcon(filterUrgency)}
              <SelectValue placeholder="Semua Urgensi" />
            </SelectTrigger>
            <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100 dark:border-slate-800">
              <SelectItem value="all" className="!text-sm !py-2 !px-3 !rounded-lg font-medium">Semua Urgensi</SelectItem>
              <SelectItem value="TINGGI" className="!text-sm !py-2 !px-3 !rounded-lg font-medium">Tinggi</SelectItem>
              <SelectItem value="SEDANG" className="!text-sm !py-2 !px-3 !rounded-lg font-medium">Sedang</SelectItem>
              <SelectItem value="RENDAH" className="!text-sm !py-2 !px-3 !rounded-lg font-medium">Rendah</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Button */}
          {isFiltering && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("all");
                setFilterUrgency("all");
              }}
              className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-xs transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-12 text-center shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div className="inline-flex size-12 animate-spin items-center justify-center rounded-full border-4 border-slate-200 border-t-slate-500 mx-auto" />
          <p className="mt-4 text-base font-semibold text-slate-500 dark:text-slate-450">Memuat laporan insiden...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-12 text-center shadow-sm flex flex-col items-center gap-3 dark:bg-slate-900 dark:border-slate-800">
          <CheckCircle2 className="size-12 text-emerald-400 opacity-60" />
          <p className="font-extrabold text-slate-800 dark:text-foreground text-lg">Tidak ada hasil laporan</p>
          <p className="text-sm text-slate-500 max-w-md">Tidak ada laporan kejadian yang cocok dengan saringan filter Anda.</p>
        </div>
      ) : (
        /* ── Flattened Incidents Table Card (No Dropdowns, Spans, or Accordions) ── */
        <Card className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 shrink-0">
                  <ShieldAlert className="size-5.5" />
                </span>
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-foreground">
                    Daftar Kasus Laporan Keamanan
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-400 mt-0.5">
                    Menampilkan {paginatedReports.length} dari {filteredReports.length} laporan aktif. Pilih laporan untuk diekspor kolektif atau klik detail.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 px-4 py-2 rounded-xl self-start sm:self-auto cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-950 transition-colors">
                <Checkbox
                  id="selectAll"
                  checked={selectedIds.size === filteredReports.length && filteredReports.length > 0}
                  onCheckedChange={selectAll}
                  className="size-4.5 rounded border-slate-300 bg-white"
                />
                <label htmlFor="selectAll" className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  Pilih Semua Hasil Saringan ({filteredReports.length})
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-4 px-6 w-12 text-center">
                    {/* Checkbox Header */}
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-32">
                    Tgl Laporan
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Kejadian
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-36">
                    Pelapor
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-24">
                    Urgensi
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-44">
                    Status
                  </th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-32 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedReports.map((report) => {
                  const urgency = getUrgency(report.tipe_insiden, report.deskripsi, report.urgensi);
                  const isDelayed = isDelayedReport(report.status, report.tanggal_insiden);

                  return (
                    <tr
                      key={report.id}
                      className={`hover:bg-slate-50/30 dark:hover:bg-slate-950/20 transition-colors ${selectedIds.has(report.id) ? "bg-indigo-50/20 dark:bg-indigo-950/5" : ""}`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-4.5 px-6 text-center align-middle">
                        <Checkbox
                          checked={selectedIds.has(report.id)}
                          onCheckedChange={() => toggleSelect(report.id)}
                          className="size-4.5 rounded border-slate-300 bg-white"
                        />
                      </td>

                      {/* Tanggal Laporan */}
                      <td className="py-4.5 px-4 align-middle">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-350 block">
                          {new Date(report.tanggal_insiden).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                        <span className="text-xs text-slate-400 block mt-1">
                          {getElapsedString(report.tanggal_insiden)}
                        </span>
                      </td>

                      {/* Detail Kejadian */}
                      <td className="py-4.5 px-4 align-middle max-w-[300px]">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-slate-800 dark:text-foreground break-words line-clamp-1">
                            {report.tipe_insiden}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-pre-wrap leading-relaxed line-clamp-2 break-all">
                            {report.deskripsi}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 font-medium break-words">
                            <MapPin className="size-3.5 text-slate-400 shrink-0" />
                            <span className="whitespace-pre-wrap leading-relaxed">{report.lokasi}</span>
                          </div>
                        </div>
                      </td>

                      {/* Pelapor */}
                      <td className="py-4.5 px-4 align-middle">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-350 block whitespace-pre-wrap">
                          {report.pelapor_nama}
                        </span>
                        <span className="text-xs text-slate-400 block mt-1 font-medium">
                          {getRtLabel(report)}
                        </span>
                      </td>

                      {/* Urgensi */}
                      <td className="py-4.5 px-4 align-middle">
                        <Badge className={`${urgency.bg} ${urgency.color} border-0 text-[10px] font-black uppercase rounded-md px-2 py-0.5`}>
                          {urgency.label}
                        </Badge>
                      </td>

                      {/* Status + Warning Delayed */}
                      <td className="py-4.5 px-4 align-middle">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-extrabold ${statusColors[report.status]}`}>
                            {getStatusLabel(report.status)}
                          </span>
                          {isDelayed && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-100 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400 text-[10px] font-extrabold rounded-md px-2 py-0.5 leading-none shrink-0">
                              {"⚠ Terlambat (>3 Hari)"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-4.5 px-6 text-right align-middle">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(report)}
                          className="gap-1.5 h-8.5 rounded-xl border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 font-semibold transition-all shrink-0 dark:border-slate-800 dark:text-slate-300"
                        >
                          <Eye className="size-4" /> Lihat Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredReports.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-2 border-t border-slate-100 dark:border-slate-800">
                {/* Info text */}
                <div className="text-sm text-slate-500 dark:text-muted-foreground select-none">
                  Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(filteredReports.length, (currentPage - 1) * pageSize + 1)}</span> - <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(filteredReports.length, currentPage * pageSize)}</span> dari <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredReports.length}</span> laporan
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                  {/* Page limit selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-muted-foreground whitespace-nowrap">Baris per halaman:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-700 dark:text-slate-350 outline-none transition-all duration-200 focus-visible:border-indigo-500"
                    >
                      {[5, 10, 20, 50].map((size) => (
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
                      className="size-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="size-4" />
                      <span className="sr-only">Halaman Sebelumnya</span>
                    </Button>

                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 select-none min-w-[100px] text-center">
                      Halaman {currentPage} / {totalPages}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-50 disabled:pointer-events-none transition-colors"
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
      )}

      {/* ── Polished Details Modal Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-2xl rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden p-0 gap-0 animate-in fade-in zoom-in-95 duration-200">
          {/* Header with gradient pattern accent */}
          <div className="relative overflow-hidden bg-slate-50/70 dark:bg-slate-950/40 p-6 pt-7.5 pb-5 pr-14 border-b border-slate-100 dark:border-slate-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full blur-2xl" />

            {/* Custom Boxed Close Button */}
            <button
              onClick={() => setDetailOpen(false)}
              className="absolute top-5 right-5 inline-flex size-8.5 items-center justify-center rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shadow-sm transition-all duration-200 focus:outline-hidden"
            >
              <X className="size-4" />
            </button>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedReport && isDelayedReport(selectedReport.status, selectedReport.tanggal_insiden) && (
                    <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-0 font-extrabold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md shadow-sm shadow-rose-500/20 animate-pulse">
                      Perlu Tindakan RT
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap pr-4">
                <DialogTitle className="text-xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
                  {selectedReport?.tipe_insiden}
                </DialogTitle>
                {selectedReport && (
                  <Badge variant="secondary" className={`${statusColors[selectedReport.status]} text-[11px] font-black px-2.5 py-0.5 rounded-full shrink-0 shadow-xs flex items-center justify-center`}>
                    {getStatusLabel(selectedReport.status)}
                  </Badge>
                )}
              </div>

              {selectedReport && (
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <Badge className={`${getUrgency(selectedReport.tipe_insiden, selectedReport.deskripsi, selectedReport.urgensi).bg} ${getUrgency(selectedReport.tipe_insiden, selectedReport.deskripsi, selectedReport.urgensi).color} text-[11px] font-extrabold rounded-lg border-0 px-2 py-0.5`}>
                    Urgensi: {getUrgency(selectedReport.tipe_insiden, selectedReport.deskripsi, selectedReport.urgensi).label}
                  </Badge>
                  <Badge className="bg-slate-100 border border-slate-200/60 text-slate-600 dark:bg-slate-800 dark:border-slate-700/60 dark:text-slate-350 text-[11px] font-extrabold rounded-lg px-2 py-0.5">
                    Wilayah: {getRtLabel(selectedReport)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {selectedReport && (
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Overdue alert inside modal */}
              {isDelayedReport(selectedReport.status, selectedReport.tanggal_insiden) && (
                <div className="flex gap-3 items-start p-4 bg-gradient-to-r from-rose-50 to-rose-100/50 border border-rose-200 text-rose-800 rounded-2xl dark:from-rose-950/20 dark:to-rose-950/10 dark:border-rose-900/40">
                  <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5 dark:text-rose-450" />
                  <div>
                    <h5 className="font-extrabold text-sm text-rose-900 dark:text-rose-400 leading-tight">Peringatan: Koordinasi RT Terlambat</h5>
                    <p className="text-xs text-rose-700 dark:text-rose-350 mt-1 leading-relaxed font-medium">Laporan baru ini sudah terbit selama {Math.floor((new Date().getTime() - new Date(selectedReport.tanggal_insiden).getTime()) / (1000 * 60 * 60 * 24))} hari dan belum direspons oleh pengurus RT. Silakan lakukan komunikasi langsung dengan Ketua RT terkait.</p>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  {/* Left Side: Descriptions */}
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-1.5 mb-2 text-slate-700 dark:text-slate-300">
                      <FileText className="size-4.5 text-indigo-500 shrink-0" /> Deskripsi Kejadian Laporan
                    </h4>
                    <div className="p-4.5 bg-slate-50/50 dark:bg-slate-955/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl text-sm text-slate-700 dark:text-slate-305 leading-relaxed font-medium min-h-[120px] max-h-[160px] overflow-y-auto shadow-inner select-text scrollbar-thin break-all">
                      {selectedReport.deskripsi}
                    </div>
                  </div>

                  {/* Bukti Kejadian (Foto) */}
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-1.5 mb-2 text-slate-700 dark:text-slate-300">
                      <Eye className="size-4.5 text-indigo-500 shrink-0" /> Bukti Kejadian (Foto)
                    </h4>
                    {selectedReport.foto_bukti_url && !imageError ? (
                      <div
                        onClick={() => setProofZoomOpen(true)}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-1.5 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer"
                      >
                        <div className="relative w-full h-44 overflow-hidden rounded-xl">
                          <img
                            src={getPhotoUrl(selectedReport.foto_bukti_url) ?? ""}
                            alt="Bukti Kejadian Laporan"
                            onError={() => setImageError(true)}
                            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 text-slate-800 font-bold text-xs shadow-lg transition-transform hover:scale-105">
                              <Eye className="size-3.5" /> Buka Detail Foto
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 italic block mt-1 select-none">
                        Tidak ada bukti kejadian
                      </p>
                    )}
                  </div>

                  {selectedReport.tindakan_diambil && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <h4 className="text-sm font-bold flex items-center gap-1.5 mb-2 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="size-4.5 text-emerald-500 shrink-0" /> Tindakan Penyelesaian oleh RT
                      </h4>
                      <div className="p-4.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-sm text-emerald-900 dark:text-emerald-300 leading-relaxed font-semibold shadow-xs">
                        {selectedReport.tindakan_diambil}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Administrative Info Card */}
                <div className="bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                      Informasi Administratif
                    </h4>

                    <div className="space-y-4 text-sm">
                      {/* Waktu */}
                      <div className="flex items-start gap-3">
                        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0 mt-0.5 shadow-sm">
                          <Calendar className="size-4.5" />
                        </span>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Waktu Kejadian</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5 leading-snug">
                            {new Date(selectedReport.tanggal_insiden).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5 font-medium">
                            ({getElapsedString(selectedReport.tanggal_insiden)})
                          </span>
                        </div>
                      </div>

                      {/* Lokasi */}
                      <div className="flex items-start gap-3">
                        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-450 shrink-0 mt-0.5 shadow-sm">
                          <MapPin className="size-4.5" />
                        </span>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lokasi Kejadian</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5 leading-snug">
                            {selectedReport.lokasi}
                          </span>
                        </div>
                      </div>

                      {/* Pelapor */}
                      <div className="flex items-start gap-3">
                        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400 shrink-0 mt-0.5 shadow-sm">
                          <User className="size-4.5" />
                        </span>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nama Pelapor</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5 leading-snug">
                            {selectedReport.pelapor_nama}
                          </span>
                        </div>
                      </div>

                      {/* Kontak */}
                      {selectedReport.pelapor_no_hp && (
                        <div className="flex items-start gap-3">
                          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 shrink-0 mt-0.5 shadow-sm">
                            <Phone className="size-4.5" />
                          </span>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kontak Handphone</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5 leading-snug select-all">
                              {selectedReport.pelapor_no_hp}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 p-6 gap-2 bg-slate-50/50 dark:bg-slate-950/20">
            <Button variant="outline" onClick={() => setDetailOpen(false)} className="rounded-xl h-11 px-6 font-semibold dark:border-slate-800">Tutup</Button>
            <Button
              className="gap-2 rounded-xl h-11 px-6 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
              onClick={() => {
                if (selectedReport) {
                  handleExportSingle(selectedReport);
                  setDetailOpen(false);
                }
              }}
            >
              <FileDown className="size-4.5" /> Export Laporan Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Evidence Zoom Modal Dialog (Lightbox) ── */}
      <Dialog open={proofZoomOpen} onOpenChange={setProofZoomOpen}>
        <DialogContent showCloseButton={false} className="max-w-5xl sm:max-w-5xl p-0 overflow-hidden bg-slate-955 border-0 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          {/* Visually hidden accessibility headings for screen readers */}
          <DialogTitle className="sr-only">Bukti Kejadian Laporan</DialogTitle>
          <DialogDescription className="sr-only">Detail zoom foto bukti kejadian laporan insiden</DialogDescription>
          
          <div className="relative w-full max-h-[85vh] flex items-center justify-center bg-slate-955 p-2 select-none">
            {/* Custom Boxed Close Button for Zoom Dialog */}
            <button
              onClick={() => setProofZoomOpen(false)}
              className="absolute top-4 right-4 z-50 inline-flex size-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all shadow-md focus:outline-hidden"
            >
              <X className="size-4.5" />
            </button>
            {selectedReport && selectedReport.foto_bukti_url && (
              <img
                src={getPhotoUrl(selectedReport.foto_bukti_url) ?? ""}
                alt="Bukti Detail Kejadian"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
