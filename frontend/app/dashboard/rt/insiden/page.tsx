"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { rtClient, type RtInsidenRecord, type RtStatusInsiden } from "@/lib/api/rt";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FileText,
  MapPin,
  Phone,
  User,
  Calendar,
  FileDown,
  Plus,
  PencilLine,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Search,
  RotateCcw,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  CheckCircle2,
  Loader2
} from "lucide-react";

export default function RtInsidenPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<RtInsidenRecord[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Selection for Export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail Modal States
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<RtInsidenRecord | null>(null);
  const [imageError, setImageError] = useState(false);
  const [proofZoomOpen, setProofZoomOpen] = useState(false);

  // Form States (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [pelaporNama, setPelaporNama] = useState("");
  const [pelaporNoHp, setPelaporNoHp] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [urgensi, setUrgensi] = useState<"RENDAH" | "SEDANG" | "TINGGI">("RENDAH");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail Status Update State
  const [updateStatus, setUpdateStatus] = useState<RtStatusInsiden>("LAPORAN");
  const [tindakan, setTindakan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Clean file names when closing modal
  useEffect(() => {
    if (!modalOpen) {
      setFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [modalOpen]);

  // Reset image error state and load updateStatus/tindakan when selectedReport changes
  useEffect(() => {
    setImageError(false);
    if (selectedReport) {
      setUpdateStatus(selectedReport.status);
      setTindakan(selectedReport.tindakan_diambil || "");
    }
  }, [selectedReport]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, filterStatus, filterUrgency]);

  // Fetch all reports using stabilized empty dependencies
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rtClient.listInsiden();
      setReports(data);

      // Update selected report if it is currently open
      setSelectedReport((prev) => {
        if (!prev) return null;
        const updated = data.find(r => r.id === prev.id);
        return updated || null;
      });
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

  const handleExportSelective = async () => {
    if (selectedIds.size === 0) {
      toast.error("Pilih minimal satu laporan untuk diekspor");
      return;
    }

    toast.info(`Mengekspor ${selectedIds.size} laporan terpilih secara kolektif...`);

    try {
      const idsQueryParam = Array.from(selectedIds).join(",");
      const blob = await rtClient.exportPdfGrouped({ ids: idsQueryParam });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_Kejadian_RT_Terpilih_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Ekspor laporan berhasil diselesaikan dengan Kop Surat resmi RT");
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Gagal mengekspor laporan: " + getApiError(error).message);
    }
  };

  const handleExportSingle = async (report: RtInsidenRecord) => {
    toast.info(`Mengekspor laporan "${report.tipe_insiden}"...`);
    try {
      const blob = await rtClient.exportPdf(report.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_Kejadian_RT_${report.tipe_insiden.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Ekspor laporan berhasil diselesaikan dengan Kop Surat resmi RT");
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
      const blob = await rtClient.exportPdfGrouped();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_Kejadian_RT_Seluruhnya_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Seluruh laporan berhasil diekspor dengan Kop Surat resmi RT");
    } catch (error) {
      toast.error("Gagal mengekspor laporan: " + getApiError(error).message);
    }
  };

  const handleOpenCreate = () => {
    setIsEdit(false);
    setJudul("");
    setDeskripsi("");
    setLokasi("");
    setPelaporNama("");
    setPelaporNoHp("");
    setFile(null);
    setUrgensi("RENDAH");
    setModalOpen(true);
  };

  const handleOpenEdit = (incident: RtInsidenRecord) => {
    setIsEdit(true);
    setJudul(incident.tipe_insiden);
    setDeskripsi(incident.deskripsi);
    setLokasi(incident.lokasi);
    setPelaporNama(incident.pelapor_nama);
    setPelaporNoHp(incident.pelapor_no_hp || "");
    setFile(null);
    setUrgensi(incident.urgensi || "RENDAH");
    setDetailOpen(false); // Close detail when editing
    setModalOpen(true);
  };

  const submit = async () => {
    if (!judul || !deskripsi || !lokasi || !pelaporNama) {
      toast.error("Mohon lengkapi field wajib");
      return;
    }
    setIsSubmitting(true);
    try {
      if (isEdit && selectedReport) {
        await rtClient.updateInsiden(selectedReport.id, {
          tipe_insiden: judul,
          lokasi,
          deskripsi,
          urgensi,
          pelapor_nama: pelaporNama,
          pelapor_no_hp: pelaporNoHp || null,
          foto_bukti: file,
        });
        toast.success("Laporan berhasil diperbarui");
      } else {
        await rtClient.createInsiden({
          tipe_insiden: judul || "Insiden RT",
          tanggal_insiden: new Date().toISOString(),
          lokasi,
          deskripsi,
          pelapor_nama: pelaporNama,
          pelapor_no_hp: pelaporNoHp || undefined,
          foto_bukti: file,
          urgensi,
        });
        toast.success("Laporan berhasil dikirim");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus laporan ini?")) return;
    try {
      await rtClient.removeInsiden(id);
      toast.success("Laporan berhasil dihapus");
      if (selectedReport?.id === id) {
        setSelectedReport(null);
        setDetailOpen(false);
      }
      load();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    setIsUpdatingStatus(true);
    try {
      await rtClient.updateInsiden(selectedReport.id, {
        status: updateStatus,
        tindakan_diambil: tindakan || null,
      });
      toast.success("Status penanganan laporan diperbarui");
      load();
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setIsUpdatingStatus(false);
    }
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
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api\/?$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${base}${path}`;
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
    return "!bg-white !border-slate-200 dark:!border-slate-800 !text-slate-600 dark:!text-slate-400 hover:!border-cyan-300 hover:!bg-slate-50/40 font-semibold";
  };

  const getStatusTriggerIcon = (status: string) => {
    const size = "size-4.5 mr-1.5 shrink-0";
    if (status === "LAPORAN") return <AlertTriangle className={`${size} text-rose-500`} />;
    if (status === "PROSES") return <Clock className={`${size} text-amber-500`} />;
    if (status === "SELESAI") return <CheckCircle2 className={`${size} text-emerald-500`} />;
    if (status === "DITUTUP") return <CheckCircle2 className={`${size} text-slate-500`} />;
    return <Filter className={`${size} text-cyan-500`} />;
  };

  // Dynamic Select Trigger styling to match active urgency theme
  const getUrgencyTriggerStyle = (urgency: string): string => {
    if (urgency === "TINGGI") return "!bg-rose-50/70 !border-rose-300 !text-rose-700 hover:!bg-rose-100/80 dark:!bg-rose-950/20 dark:!border-rose-900/50 dark:!text-rose-400 font-extrabold shadow-sm";
    if (urgency === "SEDANG") return "!bg-amber-50/70 !border-amber-300 !text-amber-700 hover:!bg-amber-100/80 dark:!bg-amber-950/20 dark:!border-amber-900/50 dark:!text-amber-400 font-extrabold shadow-sm";
    if (urgency === "RENDAH") return "!bg-blue-50/70 !border-blue-300 !text-blue-700 hover:!bg-blue-100/80 dark:!bg-blue-950/20 dark:!border-blue-900/50 dark:!text-blue-400 font-extrabold shadow-sm";
    return "!bg-white !border-slate-200 dark:!border-slate-800 !text-slate-600 dark:!text-slate-400 hover:!border-cyan-300 hover:!bg-slate-50/40 font-semibold";
  };

  const getUrgencyTriggerIcon = (urgency: string) => {
    const size = "size-4.5 mr-1.5 shrink-0";
    if (urgency === "TINGGI") return <AlertTriangle className={`${size} text-rose-500`} />;
    if (urgency === "SEDANG") return <Clock className={`${size} text-amber-500`} />;
    if (urgency === "RENDAH") return <CheckCircle2 className={`${size} text-blue-500`} />;
    return <Filter className={`${size} text-cyan-500`} />;
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

  // Calculate Metrics from raw reports
  const totalLaporanBaru = reports.filter(r => r.status === "LAPORAN").length;
  const sedangDitangani = reports.filter(r => r.status === "PROSES").length;

  const selesaiBulanIni = reports.filter(r => {
    if (r.status !== "SELESAI") return false;
    const date = (r as any).ditindaklanjuti_tanggal ? new Date((r as any).ditindaklanjuti_tanggal) : new Date(r.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const totalDelayedCount = reports.filter(r => isDelayedReport(r.status, r.tanggal_insiden)).length;

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Page Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/30">
            <ShieldAlert className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Manajemen Laporan Kejadian
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Kelola, pantau, dan tindaklanjuti laporan insiden keamanan di wilayah RT Anda
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
          <Button
            onClick={handleExportAll}
            className="gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0 shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 font-bold text-xs"
          >
            <FileDown className="size-4 text-white" /> Export Semua PDF
          </Button>

          {selectedIds.size > 0 && (
            <Button
              onClick={handleExportSelective}
              className="gap-1.5 h-10 px-4 rounded-xl font-bold bg-cyan-600 text-white hover:bg-cyan-700 transition-all shadow-md shadow-cyan-500/20 hover:shadow-lg text-xs"
            >
              <FileDown className="size-4" /> Export Terpilih ({selectedIds.size})
            </Button>
          )}

          <Button
            onClick={handleOpenCreate}
            className="h-10 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-md shadow-cyan-500/20 hover:shadow-lg transition-all text-xs flex items-center gap-1.5"
          >
            <Plus className="size-4 text-white" /> Buat Laporan Baru
          </Button>
        </div>
      </header>

      {/* ── Friendly Notice for Delayed Actions ── */}
      {totalDelayedCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/55 px-4 py-3 shadow-xs dark:bg-amber-950/20 dark:border-amber-900/30">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 dark:text-amber-500" />
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Ada {totalDelayedCount} laporan baru yang belum ditindaklanjuti lebih dari 3 hari. Harap segera lakukan tindakan penyelesaian.
          </p>
        </div>
      )}

      {/* ── Summary Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Laporan Baru */}
        <div className="relative overflow-hidden rounded-3xl border border-rose-200/50 dark:border-rose-950/30 bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-rose-500 to-rose-600" />
          <div className="p-5 pt-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Laporan Baru</p>
              <h3 className="text-2xl font-black tabular-nums text-rose-700 dark:text-rose-400 tracking-tight truncate">
                {totalLaporanBaru} <span className="text-xs font-bold text-slate-400 uppercase tracking-normal">Laporan</span>
              </h3>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-2xl shrink-0 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 shadow-sm">
              <AlertTriangle className="size-5" />
            </span>
          </div>
        </div>

        {/* Sedang Ditangani */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/50 dark:border-amber-950/30 bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-amber-500 to-orange-600" />
          <div className="p-5 pt-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Sedang Ditangani</p>
              <h3 className="text-2xl font-black tabular-nums text-amber-700 dark:text-amber-400 tracking-tight truncate">
                {sedangDitangani} <span className="text-xs font-bold text-slate-400 uppercase tracking-normal">Laporan</span>
              </h3>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-2xl shrink-0 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 shadow-sm">
              <Clock className="size-5" />
            </span>
          </div>
        </div>

        {/* Selesai Bulan Ini */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200/50 dark:border-emerald-950/30 bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-emerald-500 to-teal-600" />
          <div className="p-5 pt-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Selesai Bulan Ini</p>
              <h3 className="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-450 tracking-tight truncate">
                {selesaiBulanIni} <span className="text-xs font-bold text-slate-400 uppercase tracking-normal">Laporan</span>
              </h3>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-2xl shrink-0 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 shadow-sm">
              <CheckCircle2 className="size-5" />
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Panel ── */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3 dark:bg-slate-900 dark:border-slate-800">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2">
          <Search className="size-4 text-cyan-500" />
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
        /* ── Flattened Incidents Table Card ── */
        <Card className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400 shrink-0">
                  <ShieldAlert className="size-5.5" />
                </span>
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-foreground">
                    Daftar Kasus Laporan Keamanan
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-450 mt-0.5">
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
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-36">
                    Tgl Laporan
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Kejadian
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-44">
                    Pelapor
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-28">
                    Urgensi
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-44">
                    Status
                  </th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-36 text-right">
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
                      className={`hover:bg-slate-50/30 dark:hover:bg-slate-955/20 transition-colors ${selectedIds.has(report.id) ? "bg-cyan-50/20 dark:bg-cyan-955/5" : ""}`}
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
                      <td className="py-4.5 px-6 align-middle">
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
                        {report.pelapor_no_hp && (
                          <span className="text-xs text-slate-400 block mt-1 font-medium">
                            {report.pelapor_no_hp}
                          </span>
                        )}
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
                          onClick={() => {
                            setSelectedReport(report);
                            setDetailOpen(true);
                          }}
                          className="gap-1.5 h-8.5 rounded-xl border-slate-200 text-slate-700 hover:bg-cyan-50 hover:text-cyan-600 hover:border-cyan-200 font-semibold transition-all shrink-0 dark:border-slate-800 dark:text-slate-300"
                        >
                          <Eye className="size-4 text-cyan-500" /> Tinjau & Kelola
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
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-700 dark:text-slate-355 outline-none transition-all duration-200 focus-visible:border-cyan-500"
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

      {/* ── Polished Details & Management Modal Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-3xl rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden p-0 gap-0 animate-in fade-in zoom-in-95 duration-200">
          {/* Header with gradient pattern accent */}
          <div className="relative overflow-hidden bg-slate-50/70 dark:bg-slate-950/40 p-6 pt-7.5 pb-5 pr-14 border-b border-slate-100 dark:border-slate-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-2xl" />

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
                    <Badge className="bg-rose-500 hover:bg-rose-650 text-white border-0 font-extrabold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md shadow-sm shadow-rose-500/20 animate-pulse">
                      Butuh Tindak Lanjut RT
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap pr-4">
                <DialogTitle className="text-xl font-black text-slate-955 dark:text-white tracking-tight leading-none">
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
                </div>
              )}
            </div>
          </div>

          {selectedReport && (
            <div className="px-6 py-5 space-y-4 max-h-[58vh] overflow-y-auto">
              {/* Overdue alert inside modal */}
              {isDelayedReport(selectedReport.status, selectedReport.tanggal_insiden) && (
                <div className="flex gap-3 items-start p-4 bg-gradient-to-r from-rose-50 to-rose-100/50 border border-rose-200 text-rose-800 rounded-2xl dark:from-rose-955/20 dark:to-rose-955/10 dark:border-rose-900/40">
                  <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5 dark:text-rose-450" />
                  <div>
                    <h5 className="font-extrabold text-sm text-rose-900 dark:text-rose-400 leading-tight">Peringatan: Penanganan Terlambat</h5>
                    <p className="text-xs text-rose-700 dark:text-rose-350 mt-1 leading-relaxed font-medium">Laporan ini sudah terbit selama {Math.floor((new Date().getTime() - new Date(selectedReport.tanggal_insiden).getTime()) / (1000 * 60 * 60 * 24))} hari dan belum diselesaikan oleh pengurus RT. Silakan lakukan tindakan penanganan secepatnya.</p>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                {/* Left Side: Description, Photo, and Update Form */}
                <div className="space-y-4">
                  {/* Deskripsi */}
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-1.5 mb-2 text-slate-700 dark:text-slate-300">
                      <FileText className="size-4.5 text-cyan-500 shrink-0" /> Deskripsi Laporan
                    </h4>
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-955/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl text-sm text-slate-700 dark:text-slate-350 leading-relaxed font-medium min-h-[100px] max-h-[140px] overflow-y-auto shadow-inner select-text scrollbar-thin break-all">
                      {selectedReport.deskripsi}
                    </div>
                  </div>

                  {/* Foto Bukti */}
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-1.5 mb-2 text-slate-700 dark:text-slate-350">
                      <Eye className="size-4.5 text-cyan-500 shrink-0" /> Bukti Kejadian (Foto)
                    </h4>
                    {selectedReport.foto_bukti_url && !imageError ? (
                      <div
                        onClick={() => setProofZoomOpen(true)}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 flex items-center justify-center p-1.5 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer"
                      >
                        <div className="relative w-full h-36 overflow-hidden rounded-xl">
                          <img
                            src={getPhotoUrl(selectedReport.foto_bukti_url) ?? ""}
                            alt="Bukti Kejadian Laporan"
                            onError={() => setImageError(true)}
                            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 text-slate-850 font-bold text-xs shadow-lg transition-transform hover:scale-105">
                              <Eye className="size-3.5" /> Perbesar Foto
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 italic block mt-1 select-none">
                        Tidak ada bukti kejadian (foto)
                      </p>
                    )}
                  </div>

                  {/* Perbarui Status Form */}
                  <div className="p-4 border border-cyan-100 bg-cyan-50/20 dark:bg-cyan-950/10 dark:border-cyan-900/30 rounded-2xl space-y-3">
                    <h4 className="text-sm font-bold text-cyan-900 dark:text-cyan-250 flex items-center gap-1.5">
                      <Clock className="size-4.5 text-cyan-500" /> Perbarui Status Penanganan
                    </h4>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-cyan-950 dark:text-cyan-200">Status Baru</Label>
                        <Select value={updateStatus} onValueChange={(val) => setUpdateStatus(val as any)} disabled={isUpdatingStatus}>
                          <SelectTrigger className="bg-white dark:bg-slate-900 h-9.5 text-xs focus:ring-cyan-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100 dark:border-slate-800">
                            <SelectItem value="LAPORAN" className="!text-xs !py-2 !px-3 !rounded-lg cursor-pointer">Laporan Baru (Belum Ditangani)</SelectItem>
                            <SelectItem value="PROSES" className="!text-xs !py-2 !px-3 !rounded-lg cursor-pointer">Sedang Ditangani</SelectItem>
                            <SelectItem value="SELESAI" className="!text-xs !py-2 !px-3 !rounded-lg cursor-pointer">Selesai Ditangani</SelectItem>
                            <SelectItem value="DITUTUP" className="!text-xs !py-2 !px-3 !rounded-lg cursor-pointer">Ditutup (Selesai/Batal)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-cyan-955 dark:text-cyan-200">Tindakan / Solusi yang Diambil</Label>
                        <textarea
                          className="flex min-h-18 max-h-28 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs focus-visible:outline-cyan-500 focus:ring-cyan-500"
                          placeholder="Tuliskan tindakan atau solusi penanganan..."
                          value={tindakan}
                          onChange={(e) => setTindakan(e.target.value)}
                          disabled={isUpdatingStatus}
                        />
                      </div>

                      <Button
                        onClick={handleUpdateStatus}
                        disabled={isUpdatingStatus}
                        className="w-full h-9 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 shadow-sm flex items-center justify-center gap-1.5"
                      >
                        {isUpdatingStatus ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            Menyimpan...
                          </>
                        ) : (
                          "Simpan Perubahan Status"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Side: Administrative Info & History */}
                <div className="space-y-4">
                  {/* Administrative Card */}
                  <div className="bg-slate-50/50 dark:bg-slate-955/30 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                        Informasi Administratif
                      </h4>

                      <div className="space-y-4 text-sm">
                        {/* Waktu */}
                        <div className="flex items-start gap-3">
                          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-955/50 dark:text-cyan-400 shrink-0 mt-0.5 shadow-sm">
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
                          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-955/50 dark:text-emerald-450 shrink-0 mt-0.5 shadow-sm">
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
                          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400 shrink-0 mt-0.5 shadow-sm">
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
                            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-955/50 dark:text-amber-400 shrink-0 mt-0.5 shadow-sm">
                              <Phone className="size-4.5" />
                            </span>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kontak Pelapor</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5 leading-snug select-all">
                                {selectedReport.pelapor_no_hp}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Taken Box */}
                  {selectedReport.tindakan_diambil && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                        Tindakan Penyelesaian RT Sebelumnya
                      </h4>
                      <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed font-semibold shadow-xs">
                        {selectedReport.tindakan_diambil}
                      </div>
                    </div>
                  )}

                  {/* Administrative CRUD Actions Section inside the modal */}
                  <div className="pt-2 flex flex-col gap-2.5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Tindakan Manajemen Laporan</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenEdit(selectedReport)}
                        className="gap-2 h-10 rounded-xl border-slate-200 hover:bg-cyan-50 hover:text-cyan-600 hover:border-cyan-200 font-bold dark:border-slate-800 text-xs transition-colors"
                      >
                        <PencilLine className="size-4 text-cyan-500" /> Edit Laporan
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(selectedReport.id)}
                        className="gap-2 h-10 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold text-xs"
                      >
                        <Trash2 className="size-4 text-rose-500" /> Hapus Laporan
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 p-6 gap-2 bg-slate-50/50 dark:bg-slate-955/20 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setDetailOpen(false)} className="rounded-xl h-11 px-6 font-semibold dark:border-slate-800 w-full sm:w-auto">
              Tutup
            </Button>
            <Button
              className="gap-2 rounded-xl h-11 px-6 font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0 shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 w-full sm:w-auto flex items-center justify-center"
              onClick={() => {
                if (selectedReport) {
                  handleExportSingle(selectedReport);
                  setDetailOpen(false);
                }
              }}
            >
              <FileDown className="size-4" /> Export Laporan Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Modal Dialog ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
              {isEdit ? "Edit Informasi Laporan" : "Buat Laporan Kejadian Baru"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              {isEdit ? "Perbarui deskripsi, judul, atau lokasi untuk kejadian ini." : "Catat laporan kejadian resmi di wilayah RT Anda."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-350">Judul / Tipe Insiden <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Contoh: Pencurian, Keributan Warga, Pohon Tumbang"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                disabled={isSubmitting}
                className="h-10.5 rounded-xl text-sm border-slate-200 focus-visible:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-350">Lokasi Kejadian <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Detail lokasi spesifik kejadian..."
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                disabled={isSubmitting}
                className="h-10.5 rounded-xl text-sm border-slate-200 focus-visible:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-350">Deskripsi / Kronologi Kejadian <span className="text-rose-500">*</span></Label>
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2 text-sm focus-visible:outline-cyan-500 focus:ring-cyan-500 dark:border-slate-800"
                placeholder="Jelaskan secara lengkap kronologi singkat kejadian..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-350">Urgensi Kejadian <span className="text-rose-500">*</span></Label>
              <Select value={urgensi} onValueChange={(val) => setUrgensi(val as any)} disabled={isSubmitting}>
                <SelectTrigger className="h-10.5 rounded-xl text-sm border-slate-200 focus:ring-cyan-500">
                  <SelectValue placeholder="Pilih tingkat urgensi..." />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100 dark:border-slate-800">
                  <SelectItem value="RENDAH" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Rendah</SelectItem>
                  <SelectItem value="SEDANG" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Sedang</SelectItem>
                  <SelectItem value="TINGGI" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Tinggi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-350">Nama Pelapor <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="Nama lengkap pelapor..."
                  value={pelaporNama}
                  onChange={(e) => setPelaporNama(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10.5 rounded-xl text-sm border-slate-200 focus-visible:ring-cyan-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-350">No HP Pelapor (Opsional)</Label>
                <Input
                  placeholder="0859..."
                  value={pelaporNoHp}
                  onChange={(e) => setPelaporNoHp(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10.5 rounded-xl text-sm border-slate-200 focus-visible:ring-cyan-500"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-350">
                Foto Bukti Kejadian {isEdit ? "(Opsional, pilih untuk mengganti)" : "(Opsional)"}
              </Label>
              <div className="relative flex items-center h-10.5 w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm transition-all duration-200 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/25">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] ?? null;
                    setFile(selectedFile);
                    setFileName(selectedFile ? selectedFile.name : "");
                  }}
                  disabled={isSubmitting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center gap-2.5 w-full pointer-events-none select-none">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Pilih Foto
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 font-light">|</span>
                  <span className="text-slate-400 dark:text-slate-500 truncate flex-1">
                    {fileName || "Belum ada file terpilih"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl h-11 px-5 font-semibold dark:border-slate-800 w-full sm:w-auto" disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              onClick={submit}
              disabled={isSubmitting}
              className="rounded-xl h-11 px-5 font-bold bg-cyan-600 text-white hover:bg-cyan-700 shadow-md shadow-cyan-500/20 hover:shadow-lg transition-all w-full sm:w-auto flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Mengirim...
                </>
              ) : (
                isEdit ? "Simpan Perubahan" : "Kirim Laporan"
              )}
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
