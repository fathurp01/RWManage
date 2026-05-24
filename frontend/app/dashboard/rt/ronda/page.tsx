"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { getApiError, downloadApiFile } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rtClient, type RtJadwalRonda, type RtRondaPetugas, type RtStatusKehadiran, type RtPerformaRecord, type RtPresensiRonda } from "@/lib/api/rt";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  Plus,
  Users,
  CalendarCheck,
  PencilLine,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Calendar,
  Building2,
  Phone,
  UserPlus,
  Loader2,
  CalendarDays,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Award,
  Filter,
  FileDown
} from "lucide-react";

// Helpers
const HARI_MINGGU = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HARI_MINGGU_ORDERED = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 0, label: "Minggu" },
];

const monthNames = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" }
];

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ManajemenRondaPage() {
  const [loading, setLoading] = useState(true);
  const [jadwalList, setJadwalList] = useState<RtJadwalRonda[]>([]);
  const [performaData, setPerformaData] = useState<RtPerformaRecord[]>([]);
  const [weeklyPerforma, setWeeklyPerforma] = useState<RtPerformaRecord[]>([]);
  const [markingPetugas, setMarkingPetugas] = useState<string | null>(null);

  // Filter Top
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  // Presensi Modal
  const [presensiModalOpen, setPresensiModalOpen] = useState(false);
  const [presensiDate, setPresensiDate] = useState<string>(getLocalDateString(new Date()));
  const [activeJadwalId, setActiveJadwalId] = useState<string>("");
  const [modalPresensi, setModalPresensi] = useState<RtPresensiRonda[]>([]);
  const [presensiNotes, setPresensiNotes] = useState<Record<string, string>>({});

  const last7Days = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(d);

      // Format label
      let label = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
      if (i === 0) {
        label = `Hari Ini (${label})`;
      } else if (i === 1) {
        label = `Kemarin (${label})`;
      }
      options.push({ value: dateStr, label });
    }
    return options;
  }, []);

  // Jadwal & Petugas Modals
  const [jadwalModalOpen, setJadwalModalOpen] = useState(false);
  const [editingJadwal, setEditingJadwal] = useState<Partial<RtJadwalRonda>>({});
  const [petugasModalOpen, setPetugasModalOpen] = useState(false);
  const [selectedJadwalId, setSelectedJadwalId] = useState("");
  const [newPetugas, setNewPetugas] = useState({ nama_petugas: "", no_hp: "", catatan: "" });

  // Filter Table 3
  const [searchOfficer, setSearchOfficer] = useState<string>("");
  const [filterKelompok, setFilterKelompok] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("default");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [raporLimit, setRaporLimit] = useState<number>(10);
  const itemsPerPage = raporLimit;

  // New Histori Table Pagination States
  const [historiPage, setHistoriPage] = useState<number>(1);
  const [historiLimit, setHistoriLimit] = useState<number>(10);

  // New Weekly Table Pagination States
  const [weeklyPage, setWeeklyPage] = useState<number>(1);
  const weeklyLimit = 10;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const jData = await rtClient.listJadwalRonda();
      setJadwalList(jData);

      const firstDay = new Date(Number(selectedYear), Number(selectedMonth) - 1, 1, 0, 0, 0, 0);
      const lastDay = new Date(Number(selectedYear), Number(selectedMonth), 0, 23, 59, 59, 999);
      const tanggal_mulai = firstDay.toISOString();
      const tanggal_akhir = lastDay.toISOString();
      const pData = await rtClient.listPerforma({ tanggal_mulai, tanggal_akhir });
      setPerformaData(pData);

      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 6);
      lastWeek.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 59, 999);
      const wMulai = lastWeek.toISOString();
      const wAkhir = today.toISOString();
      const wData = await rtClient.listPerforma({ tanggal_mulai: wMulai, tanggal_akhir: wAkhir });
      setWeeklyPerforma(wData);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Presensi Modal Effect
  useEffect(() => {
    if (presensiModalOpen && activeJadwalId && presensiDate) {
      rtClient.listPresensi(activeJadwalId, { tanggal_mulai: presensiDate, tanggal_akhir: presensiDate })
        .then(data => setModalPresensi(data))
        .catch(err => toast.error(getApiError(err).message));
    }
  }, [presensiModalOpen, activeJadwalId, presensiDate]);

  useEffect(() => {
    const notes: Record<string, string> = {};
    modalPresensi.forEach(p => {
      notes[p.nama_petugas] = p.catatan || "";
    });
    setPresensiNotes(notes);
  }, [modalPresensi]);

  const handleMarkPresence = async (nama_petugas: string, status: RtStatusKehadiran, catatan?: string) => {
    if (!activeJadwalId || markingPetugas) return;
    try {
      setMarkingPetugas(nama_petugas);
      await rtClient.markPresensi(activeJadwalId, { tanggal: presensiDate, nama_petugas, status_hadir: status, catatan });
      toast.success(`Presensi ${nama_petugas} berhasil dicatat sebagai ${status}!`);
      const fresh = await rtClient.listPresensi(activeJadwalId, { tanggal_mulai: presensiDate, tanggal_akhir: presensiDate });
      setModalPresensi(fresh);
      loadData();
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setMarkingPetugas(null);
    }
  };

  // Jadwal & Petugas handlers
  const handleSaveJadwal = async () => {
    if (!editingJadwal.nama_jadwal?.trim()) {
      toast.error("Nama kelompok / jadwal wajib diisi!");
      return;
    }
    if (!editingJadwal.jam_mulai) {
      toast.error("Jam mulai patroli wajib diisi!");
      return;
    }
    if (!editingJadwal.jam_selesai) {
      toast.error("Jam selesai patroli wajib diisi!");
      return;
    }
    try {
      if (editingJadwal.id) {
        await rtClient.updateJadwalRonda(editingJadwal.id, editingJadwal);
        toast.success("Jadwal ronda berhasil diperbarui!");
      } else {
        await rtClient.createJadwalRonda(editingJadwal);
        toast.success("Jadwal ronda baru berhasil dibuat!");
      }
      setJadwalModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleExportPdf = async () => {
    const filename = `histori-absensi-ronda-rt-${selectedMonth}-${selectedYear}.pdf`;
    try {
      toast.info("Mengunduh laporan PDF...");
      
      const firstDay = new Date(Number(selectedYear), Number(selectedMonth) - 1, 1, 0, 0, 0, 0);
      const lastDay = new Date(Number(selectedYear), Number(selectedMonth), 0, 23, 59, 59, 999);
      const tanggal_mulai = firstDay.toISOString();
      const tanggal_akhir = lastDay.toISOString();

      await downloadApiFile("/rt/performa-ronda/export-pdf", filename, {
        tanggal_mulai,
        tanggal_akhir
      });
      toast.success("Laporan PDF berhasil diunduh!");
    } catch (err) {
      toast.error("Gagal mengunduh laporan PDF.");
    }
  };

  const handleDeleteJadwal = async (id: string) => {
    if (!confirm("Hapus jadwal ini? Tindakan ini akan menghapus seluruh data petugas di dalamnya.")) return;
    try {
      await rtClient.deleteJadwalRonda(id);
      toast.success("Jadwal ronda berhasil dihapus!");
      loadData();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleAddPetugas = async () => {
    if (!newPetugas.nama_petugas) return;
    try {
      await rtClient.addPetugas(selectedJadwalId, newPetugas);
      toast.success("Petugas ronda baru berhasil ditambahkan!");
      setNewPetugas({ nama_petugas: "", no_hp: "", catatan: "" });
      setPetugasModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleRemovePetugas = async (id: string) => {
    try {
      await rtClient.removePetugas(id);
      toast.success("Petugas ronda berhasil dihapus!");
      loadData();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  // Stats for Header
  const totalPetugasCount = jadwalList.reduce((acc, curr) => acc + (curr.petugas?.length || 0), 0);
  const hadirCount = performaData.filter(p => p.status_kehadiran === "HADIR").length;
  const alfaCount = performaData.filter(p => p.status_kehadiran === "ALFA").length;

  // Modal Presensi logic
  const selectedDayOfWeek = new Date(presensiDate).getUTCDay();
  const jadwalForSelectedDay = useMemo(() => {
    return jadwalList.filter(j => j.hari_minggu === selectedDayOfWeek);
  }, [jadwalList, selectedDayOfWeek]);

  useEffect(() => {
    if (jadwalForSelectedDay.length > 0) {
      if (!jadwalForSelectedDay.some(j => j.id === activeJadwalId)) {
        setActiveJadwalId(jadwalForSelectedDay[0].id);
      }
    } else {
      if (activeJadwalId !== "") setActiveJadwalId("");
      setModalPresensi(prev => prev.length === 0 ? prev : []);
    }
  }, [jadwalForSelectedDay, activeJadwalId]);

  // Table 3 Aggregation
  const raporPetugas = useMemo(() => {
    const map = new Map<string, any>();
    const petugasKelompokMap = new Map<string, { id: string, nama: string }>();
    jadwalList.forEach(j => {
      j.petugas?.forEach(p => {
        petugasKelompokMap.set(p.nama_petugas, { id: j.id, nama: j.nama_jadwal });
      });
    });

    jadwalList.forEach(j => {
      j.petugas?.forEach(p => {
        map.set(p.nama_petugas, {
          nama_petugas: p.nama_petugas,
          jadwal_id: j.id,
          nama_kelompok: j.nama_jadwal,
          totalHadir: 0,
          totalIzin: 0,
          totalAlfa: 0,
          total: 0,
          attendanceRate: 100,
          statusKinerja: "AMAN"
        });
      });
    });

    performaData.forEach(p => {
      let stat = map.get(p.nama_petugas);
      if (!stat) {
        const k = petugasKelompokMap.get(p.nama_petugas) || { id: "unknown", nama: "Tidak Diketahui" };
        stat = {
          nama_petugas: p.nama_petugas,
          jadwal_id: k.id,
          nama_kelompok: k.nama,
          totalHadir: 0,
          totalIzin: 0,
          totalAlfa: 0,
          total: 0,
          attendanceRate: 100,
          statusKinerja: "AMAN"
        };
        map.set(p.nama_petugas, stat);
      }

      if (p.status_kehadiran === "HADIR") stat.totalHadir++;
      else if (p.status_kehadiran === "IZIN" || p.status_kehadiran === "LIBUR") stat.totalIzin++;
      else if (p.status_kehadiran === "ALFA") stat.totalAlfa++;
    });

    map.forEach(stat => {
      stat.total = stat.totalHadir + stat.totalIzin + stat.totalAlfa;
      if (stat.total > 0) {
        stat.attendanceRate = Math.round(((stat.totalHadir + stat.totalIzin * 0.5) / stat.total) * 100);
      }
      if (stat.attendanceRate < 40) stat.statusKinerja = "RAWAN";
      else if (stat.attendanceRate < 75) stat.statusKinerja = "PERHATIAN";
      else stat.statusKinerja = "AMAN";
    });

    return Array.from(map.values());
  }, [jadwalList, performaData]);

  useEffect(() => {
    setCurrentPage(1);
    setHistoriPage(1);
    setWeeklyPage(1);
  }, [searchOfficer, filterKelompok, filterStatus, sortOption]);

  const filteredRapor = useMemo(() => {
    return raporPetugas.filter(p => {
      if (searchOfficer && !p.nama_petugas.toLowerCase().includes(searchOfficer.toLowerCase())) return false;
      if (filterKelompok !== "all" && p.jadwal_id !== filterKelompok) return false;
      if (filterStatus !== "all" && p.statusKinerja !== filterStatus.toUpperCase()) return false;
      return true;
    }).sort((a, b) => {
      if (sortOption === "alfa_desc") return b.totalAlfa - a.totalAlfa;
      if (sortOption === "attendance_asc") return a.attendanceRate - b.attendanceRate;
      return a.nama_petugas.localeCompare(b.nama_petugas);
    });
  }, [raporPetugas, searchOfficer, filterKelompok, filterStatus, sortOption]);

  const totalRaporItems = filteredRapor.length;
  const totalRaporPages = Math.ceil(totalRaporItems / itemsPerPage) || 1;
  const activeRaporPage = Math.min(currentPage, totalRaporPages);
  const startRaporIndex = (activeRaporPage - 1) * itemsPerPage;
  const endRaporIndex = startRaporIndex + itemsPerPage;
  const paginatedRapor = filteredRapor.slice(startRaporIndex, endRaporIndex);

  // Helper map for officer groups
  const officerGroupMap = useMemo(() => {
    const map = new Map<string, { id: string; nama: string }>();
    jadwalList.forEach(j => {
      j.petugas?.forEach(p => {
        map.set(p.nama_petugas, { id: j.id, nama: j.nama_jadwal });
      });
    });
    return map;
  }, [jadwalList]);

  // History filtering influenced by active Cari & Saring filters
  const filteredHistori = useMemo(() => {
    return performaData.filter(p => {
      if (searchOfficer && !p.nama_petugas.toLowerCase().includes(searchOfficer.toLowerCase())) return false;

      const groupInfo = officerGroupMap.get(p.nama_petugas) || { id: "unknown", nama: "Tidak Diketahui" };
      if (filterKelompok !== "all" && groupInfo.id !== filterKelompok) return false;

      if (filterStatus !== "all") {
        const officerRapor = raporPetugas.find(r => r.nama_petugas === p.nama_petugas);
        if (!officerRapor || officerRapor.statusKinerja !== filterStatus.toUpperCase()) return false;
      }
      return true;
    });
  }, [performaData, searchOfficer, filterKelompok, filterStatus, raporPetugas, officerGroupMap]);

  // Histori Pagination Calculations
  const totalHistoriItems = filteredHistori.length;
  const totalHistoriPages = Math.ceil(totalHistoriItems / historiLimit) || 1;
  const activeHistoriPage = Math.min(historiPage, totalHistoriPages);
  const startHistoriIndex = (activeHistoriPage - 1) * historiLimit;
  const endHistoriIndex = startHistoriIndex + historiLimit;
  const paginatedHistori = useMemo(() => {
    return filteredHistori
      .slice()
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
      .slice(startHistoriIndex, endHistoriIndex);
  }, [filteredHistori, startHistoriIndex, endHistoriIndex]);

  // Table 2 (Presensi Mingguan) Pagination Calculations influenced by active Cari & Saring filters
  const filteredWeekly = useMemo(() => {
    return weeklyPerforma.filter(p => {
      if (searchOfficer && !p.nama_petugas.toLowerCase().includes(searchOfficer.toLowerCase())) return false;

      const groupInfo = officerGroupMap.get(p.nama_petugas) || { id: "unknown", nama: "Tidak Diketahui" };
      if (filterKelompok !== "all" && groupInfo.id !== filterKelompok) return false;

      if (filterStatus !== "all") {
        const officerRapor = raporPetugas.find(r => r.nama_petugas === p.nama_petugas);
        if (!officerRapor || officerRapor.statusKinerja !== filterStatus.toUpperCase()) return false;
      }
      return true;
    });
  }, [weeklyPerforma, searchOfficer, filterKelompok, filterStatus, raporPetugas, officerGroupMap]);

  const sortedWeekly = useMemo(() => {
    return filteredWeekly
      .slice()
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [filteredWeekly]);

  const totalWeeklyItems = sortedWeekly.length;
  const totalWeeklyPages = Math.ceil(totalWeeklyItems / weeklyLimit) || 1;
  const activeWeeklyPage = Math.min(weeklyPage, totalWeeklyPages);
  const startWeeklyIndex = (activeWeeklyPage - 1) * weeklyLimit;
  const endWeeklyIndex = startWeeklyIndex + weeklyLimit;
  const paginatedWeekly = useMemo(() => {
    return sortedWeekly.slice(startWeeklyIndex, endWeeklyIndex);
  }, [sortedWeekly, startWeeklyIndex, endWeeklyIndex]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Header & Filter Top ── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="rt">Ronda RT</Badge>
            <span className="text-sm text-slate-500 dark:text-muted-foreground">
              Pemantauan jadwal patroli dan kehadiran warga
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
            Manajemen Ronda
          </h1>
          <p className="text-base text-slate-500 dark:text-muted-foreground">
            Kelola jadwal patroli ronda, tugaskan warga, dan catat presensi
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-1.5 rounded-2xl shadow-xs border border-slate-200 dark:border-white/10 shrink-0 self-end sm:self-auto">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-10 border-0 bg-transparent shadow-none focus:ring-0 font-bold text-slate-700 dark:text-slate-200 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {monthNames.map(m => <SelectItem key={m.value} value={m.value} className="rounded-lg">{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-10 border-0 bg-transparent shadow-none focus:ring-0 font-bold text-slate-700 dark:text-slate-200 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {[0, 1, 2].map(offset => {
                const y = String(new Date().getFullYear() - offset);
                return <SelectItem key={y} value={y} className="rounded-lg">{y}</SelectItem>
              })}
            </SelectContent>
          </Select>
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-12 text-center shadow-sm">
          <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-violet-200 border-t-violet-500 mx-auto" />
          <p className="mt-4 text-base font-semibold text-slate-500">Memuat data manajemen ronda...</p>
        </div>
      ) : (
        <>
          {/* ── Status Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="rounded-3xl border border-violet-100 border-t-4 border-t-violet-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Kelompok Ronda</p>
                <h3 className="text-2xl font-black text-violet-600 mt-1.5 tabular-nums">{jadwalList.length}</h3>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                <Calendar className="size-5.5" />
              </span>
            </div>
            <div className="rounded-3xl border border-indigo-100 border-t-4 border-t-indigo-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Warga Terdaftar</p>
                <h3 className="text-2xl font-black text-indigo-600 mt-1.5 tabular-nums">{totalPetugasCount}</h3>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                <Users className="size-5.5" />
              </span>
            </div>
            <div className="rounded-3xl border border-emerald-100 border-t-4 border-t-emerald-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Hadir Bulan Ini</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1.5 tabular-nums">{hadirCount} <span className="text-xs font-medium text-slate-400">kali</span></h3>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                <ShieldCheck className="size-5.5" />
              </span>
            </div>
            <div className="rounded-3xl border border-rose-100 border-t-4 border-t-rose-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Absen / Alfa Bulan Ini</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1.5 tabular-nums">{alfaCount} <span className="text-xs font-medium text-slate-400">kali</span></h3>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <AlertTriangle className="size-5.5" />
              </span>
            </div>
          </div>

          {/* ── Table 1: Jadwal & Petugas (7 Hari) ── */}
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                  <CalendarDays className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Daftar Jadwal & Petugas Ronda</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Jadwal kelompok patroli dari Senin hingga Minggu.</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingJadwal({
                    minggu_mulai: getLocalDateString(new Date()),
                    hari_minggu: 1,
                    jam_mulai: "21:00",
                    jam_selesai: "00:00",
                    nama_jadwal: ""
                  });
                  setJadwalModalOpen(true);
                }}
                className="rounded-xl h-9 px-4 font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm border-0 transition-all cursor-pointer"
              >
                <Plus className="size-4 mr-1.5" />
                Kelompok Baru
              </Button>
            </div>
            <div className="p-6 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {HARI_MINGGU_ORDERED.map(hari => {
                  const jadwalHariIni = jadwalList.filter(j => j.hari_minggu === hari.value);
                  const hasSchedule = jadwalHariIni.length > 0;

                  if (!hasSchedule) {
                    return (
                      <div key={hari.value} className="rounded-xl bg-slate-50/50 border border-slate-200/70 p-3.5 flex flex-col justify-between items-center text-center min-h-[145px] shadow-xs">
                        <h4 className="font-bold text-sm text-slate-500 mt-1 text-center">{hari.label}</h4>
                        <span className="text-xs text-slate-400 font-medium leading-relaxed mb-2 text-center">Jadwal belum ditetapkan</span>
                      </div>
                    );
                  }

                  return (
                    <div key={hari.value} className="rounded-xl bg-white border border-slate-200 shadow-sm p-3.5 flex flex-col min-h-[145px]">
                      <h4 className="font-bold text-sm text-slate-800 text-center mb-2.5">{hari.label}</h4>
                      <div className="space-y-2.5">
                        {jadwalHariIni.map((jadwal) => (
                          <div key={jadwal.id} className="flex flex-col gap-2 group relative">
                            <div className="flex justify-between items-center gap-1">
                              <span className="text-[10px] sm:text-xs font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
                                {jadwal.jam_mulai} - {jadwal.jam_selesai}
                              </span>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingJadwal({
                                      ...jadwal,
                                      minggu_mulai: jadwal.minggu_mulai.slice(0, 10),
                                      minggu_selesai: jadwal.minggu_selesai?.slice(0, 10)
                                    });
                                    setJadwalModalOpen(true);
                                  }}
                                  title="Ubah Jadwal"
                                  className="text-slate-400 hover:text-indigo-600 p-0.5 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                >
                                  <PencilLine className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteJadwal(jadwal.id)}
                                  title="Hapus Jadwal"
                                  className="text-slate-400 hover:text-rose-600 p-0.5 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="bg-slate-50 rounded p-2 border border-slate-100">
                              <div className="flex items-center justify-between mb-1.5 border-b border-slate-200/60 pb-1.5 gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase truncate" title={jadwal.nama_jadwal}>{jadwal.nama_jadwal}</span>
                                <button
                                  onClick={() => {
                                    setSelectedJadwalId(jadwal.id);
                                    setPetugasModalOpen(true);
                                  }}
                                  title="Tambah Petugas"
                                  className="text-indigo-600 hover:text-indigo-800 p-0.5 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors cursor-pointer shrink-0"
                                >
                                  <Plus className="size-3" />
                                </button>
                              </div>
                              {jadwal.petugas && jadwal.petugas.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {jadwal.petugas.map((p) => (
                                    <li key={p.id} className="flex justify-between items-start text-xs py-0.5 border-b border-slate-100/50 last:border-0 pb-1 last:pb-0">
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-bold text-slate-700 truncate" title={p.nama_petugas}>{p.nama_petugas}</span>
                                        {p.no_hp && (
                                          <span className="text-slate-400 text-[9px] font-medium leading-none mt-0.5 truncate">{p.no_hp}</span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => handleRemovePetugas(p.id)}
                                        title="Hapus Petugas"
                                        className="text-rose-400 hover:text-rose-600 p-0.5 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0 mt-0.5"
                                      >
                                        <Trash2 className="size-3" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-[9px] italic text-slate-400 block text-center py-0.5">Belum ada petugas</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Filter Panel untuk Table 3 ── */}
          <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3 mt-2">
            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Search className="size-4 text-indigo-500" />
              Cari & Saring Histori Kehadiran
            </p>
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  placeholder="Cari nama petugas..."
                  value={searchOfficer}
                  onChange={(e) => setSearchOfficer(e.target.value)}
                  className="pl-10 h-11 rounded-xl text-base w-full bg-white border-slate-200"
                />
              </div>

              <Select value={filterKelompok} onValueChange={setFilterKelompok}>
                <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[160px] font-medium transition-all ${filterKelompok !== "all" ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm" : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"}`}>
                  <Users className={`size-4 mr-1 shrink-0 ${filterKelompok !== "all" ? "text-indigo-500" : "text-slate-400"}`} />
                  <SelectValue placeholder="Semua Kelompok" />
                </SelectTrigger>
                <SelectContent className="!rounded-xl p-1.5 border-slate-100">
                  <SelectItem value="all" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Kelompok</SelectItem>
                  {jadwalList.map(b => (
                    <SelectItem key={b.id} value={b.id} className="!text-sm !py-2 !px-3 !rounded-lg">
                      {b.nama_jadwal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[160px] font-medium transition-all ${filterStatus !== "all" ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm" : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"}`}>
                  <ShieldCheck className={`size-4 mr-1 shrink-0 ${filterStatus !== "all" ? "text-indigo-500" : "text-slate-400"}`} />
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="!rounded-xl p-1.5 border-slate-100">
                  <SelectItem value="all" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Status Kinerja</SelectItem>
                  <SelectItem value="aman" className="!text-sm !py-2 !px-3 !rounded-lg">Kinerja Aman</SelectItem>
                  <SelectItem value="perhatian" className="!text-sm !py-2 !px-3 !rounded-lg">Perlu Perhatian</SelectItem>
                  <SelectItem value="rawan" className="!text-sm !py-2 !px-3 !rounded-lg">Rawan (Tinggi Alfa)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[185px] font-medium transition-all ${sortOption !== "default" ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm" : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"}`}>
                  <ArrowUpDown className={`size-4 mr-1 shrink-0 ${sortOption !== "default" ? "text-indigo-500" : "text-slate-400"}`} />
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent className="!rounded-xl p-1.5 border-slate-100">
                  <SelectItem value="default" className="!text-sm !py-2 !px-3 !rounded-lg">Urutkan Berdasar : Nama Petugas (Default)</SelectItem>
                  <SelectItem value="alfa_desc" className="!text-sm !py-2 !px-3 !rounded-lg">Urutkan Berdasar : Tingkat Alfa Tertinggi</SelectItem>
                  <SelectItem value="attendance_asc" className="!text-sm !py-2 !px-3 !rounded-lg">Urutkan Berdasar : Kehadiran Terendah</SelectItem>
                </SelectContent>
              </Select>

              {(filterKelompok !== "all" || filterStatus !== "all" || searchOfficer !== "" || sortOption !== "default") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterKelompok("all");
                    setFilterStatus("all");
                    setSearchOfficer("");
                    setSortOption("default");
                  }}
                  className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 shadow-xs transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* ── Table 2: Presensi Mingguan ── */}
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden mt-6">
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CalendarCheck className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Presensi Kehadiran (7 Hari Terakhir)</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Catatan riwayat patroli ronda satu minggu ke belakang.</p>
                </div>
              </div>
              <Button
                onClick={() => setPresensiModalOpen(true)}
                className="rounded-xl h-10 px-5 font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="size-4.5" />
                Catat Kehadiran
              </Button>
            </div>
            <div className="p-0">
              {totalWeeklyItems === 0 ? (
                <div className="py-12 text-center text-sm font-medium text-slate-400">
                  Belum ada riwayat kehadiran dalam 7 hari terakhir.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full text-left border-t-0">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal</TableHead>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Petugas Ronda</TableHead>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 text-sm">
                      {paginatedWeekly.map((p) => (
                        <TableRow key={p.id} className="hover:bg-slate-50/50">
                          <TableCell className="px-6 py-3 text-slate-600 font-medium">
                            {new Date(p.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                          </TableCell>
                          <TableCell className="px-6 py-3 font-bold text-slate-900">{p.nama_petugas}</TableCell>
                          <TableCell className="px-6 py-3">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${p.status_kehadiran === 'HADIR' ? 'bg-emerald-100 text-emerald-700' :
                              p.status_kehadiran === 'ALFA' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                              {p.status_kehadiran}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-slate-500 font-medium max-w-[220px] break-words whitespace-pre-wrap">
                            {p.catatan || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl shrink-0">
                Menampilkan {totalWeeklyItems > 0 ? startWeeklyIndex + 1 : 0}–{Math.min(endWeeklyIndex, totalWeeklyItems)} dari {totalWeeklyItems} data
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="icon" onClick={() => setWeeklyPage(prev => Math.max(prev - 1, 1))} disabled={activeWeeklyPage === 1} className="size-8 rounded-lg border-slate-300">
                  <ChevronLeft className="size-5" />
                </Button>
                <span className="text-xs font-bold text-slate-700 min-w-[30px] text-center">
                  {activeWeeklyPage} / {totalWeeklyPages}
                </span>
                <Button variant="outline" size="icon" onClick={() => setWeeklyPage(prev => Math.min(prev + 1, totalWeeklyPages))} disabled={activeWeeklyPage === totalWeeklyPages} className="size-8 rounded-lg border-slate-300">
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* ── Table 3: Rapor Bulanan Petugas ── */}
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden mt-0">
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Award className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Rapor Kehadiran Petugas Ronda (Bulan {monthNames.find(m => m.value === selectedMonth)?.label} {selectedYear})
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">Akumulasi tingkat kehadiran per petugas di bulan ini.</p>
                </div>
              </div>
            </div>
            <div className="p-0">
              {totalRaporItems === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">Tidak ada data petugas yang cocok.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full text-left">
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Petugas Ronda</TableHead>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Statistik Kehadiran</TableHead>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Tingkat Kepatuhan</TableHead>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Kategori Kinerja</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 text-sm">
                      {paginatedRapor.map(p => (
                        <TableRow key={p.nama_petugas} className="hover:bg-slate-50/50">
                          <TableCell className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-xs uppercase">
                                {p.nama_petugas.slice(0, 2)}
                              </span>
                              <div className="text-left">
                                <h4 className="text-md font-bold text-slate-900">{p.nama_petugas}</h4>
                                <p className="text-sm text-slate-400 font-medium">{p.nama_kelompok}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center px-2 py-1.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700">{p.totalHadir} Hadir</span>
                              <span className="inline-flex items-center px-2 py-1.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700">{p.totalIzin} Izin</span>
                              <span className="inline-flex items-center px-2 py-1.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700">{p.totalAlfa} Alfa</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-full max-w-[120px] bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div className={`h-full rounded-full ${p.attendanceRate >= 80 ? 'bg-emerald-500' : p.attendanceRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${p.attendanceRate}%` }} />
                              </div>
                              <span className={`font-black text-sm ${p.attendanceRate >= 80 ? 'text-emerald-600' : p.attendanceRate >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {p.attendanceRate}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-right">
                            <Badge variant="outline" className={`font-bold border-0 px-2.5 py-1 uppercase ${p.statusKinerja === 'RAWAN' ? 'bg-red-100 text-red-700' : p.statusKinerja === 'PERHATIAN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {p.statusKinerja}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl shrink-0">
                Menampilkan {totalRaporItems > 0 ? startRaporIndex + 1 : 0}–{Math.min(endRaporIndex, totalRaporItems)} dari {totalRaporItems} Petugas
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={activeRaporPage === 1} className="size-8 rounded-lg border-slate-300">
                  <ChevronLeft className="size-5" />
                </Button>
                <span className="text-xs font-bold text-slate-700 min-w-[30px] text-center">
                  {activeRaporPage} / {totalRaporPages}
                </span>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalRaporPages))} disabled={activeRaporPage === totalRaporPages} className="size-8 rounded-lg border-slate-300">
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            </div>
          </div>


          {/* ── Table 4: Histori Absensi Kehadiran Bulanan ── */}
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden mt-6">
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <CalendarCheck className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Histori Absensi Kehadiran (Bulan {monthNames.find(m => m.value === selectedMonth)?.label} {selectedYear})
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">Catatan riwayat kehadiran petugas ronda yang dipengaruhi oleh filter aktif.</p>
                </div>
              </div>
              <Button
                onClick={handleExportPdf}
                variant="outline"
                className="rounded-xl h-9 px-4 font-semibold text-xs border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <FileDown className="size-4 shrink-0" />
                Export PDF
              </Button>
            </div>
            <div className="p-0">
              {totalHistoriItems === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">Tidak ada riwayat kehadiran yang cocok.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full text-left">
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal</TableHead>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Petugas Ronda</TableHead>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                        <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 text-sm">
                      {paginatedHistori.map((p) => (
                        <TableRow key={p.id} className="hover:bg-slate-50/50">
                          <TableCell className="px-6 py-3 text-slate-600 font-medium">
                            {new Date(p.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                          </TableCell>
                          <TableCell className="px-6 py-3 font-bold text-slate-900">{p.nama_petugas}</TableCell>
                          <TableCell className="px-6 py-3">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${p.status_kehadiran === 'HADIR' ? 'bg-emerald-100 text-emerald-700' :
                              p.status_kehadiran === 'ALFA' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                              {p.status_kehadiran}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-slate-500 font-medium max-w-[220px] break-words whitespace-pre-wrap">
                            {p.catatan || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl shrink-0">
                Menampilkan {totalHistoriItems > 0 ? startHistoriIndex + 1 : 0}–{Math.min(endHistoriIndex, totalHistoriItems)} dari {totalHistoriItems} data
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="icon" onClick={() => setHistoriPage(prev => Math.max(prev - 1, 1))} disabled={activeHistoriPage === 1} className="size-8 rounded-lg border-slate-300">
                  <ChevronLeft className="size-5" />
                </Button>
                <span className="text-xs font-bold text-slate-700 min-w-[30px] text-center">
                  {activeHistoriPage} / {totalHistoriPages}
                </span>
                <Button variant="outline" size="icon" onClick={() => setHistoriPage(prev => Math.min(prev + 1, totalHistoriPages))} disabled={activeHistoriPage === totalHistoriPages} className="size-8 rounded-lg border-slate-300">
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal Presensi (Catat Kehadiran) ── */}
      <Dialog open={presensiModalOpen} onOpenChange={setPresensiModalOpen}>
        <DialogContent className="rounded-3xl border-slate-100 shadow-2xl p-0 bg-white sm:max-w-[calc(100%-2rem)] md:max-w-3xl overflow-hidden">
          <DialogHeader className="bg-slate-50 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5 pr-14 text-left">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CalendarCheck className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">Catat Kehadiran Harian</DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">Pilih tanggal dan kelompok ronda untuk mencatat kehadiran (1-klik).</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-3 sm:p-6">
            {/* Control Row: Date Selector & Schedule Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5 flex-1 w-full sm:max-w-md">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Tanggal Absensi:</span>
                <Select value={presensiDate} onValueChange={setPresensiDate}>
                  <SelectTrigger className="!w-full h-10 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white shadow-xs cursor-pointer focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl p-1.5 shadow-xl border-slate-100 max-h-[220px]">
                    {last7Days.map((day) => (
                      <SelectItem key={day.value} value={day.value} className="rounded-lg">{day.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {jadwalForSelectedDay.length > 1 && (
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 w-fit">
                  {jadwalForSelectedDay.map(j => (
                    <Button
                      key={j.id}
                      variant="ghost"
                      onClick={() => setActiveJadwalId(j.id)}
                      className={`rounded-lg h-7 px-3 text-[10px] font-extrabold transition-all cursor-pointer ${activeJadwalId === j.id
                        ? "bg-white text-emerald-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
                        }`}
                    >
                      {j.nama_jadwal} ({j.jam_mulai} - {j.jam_selesai})
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {jadwalForSelectedDay.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <CalendarDays className="size-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">Tidak ada jadwal ronda untuk hari {HARI_MINGGU[selectedDayOfWeek]}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* ── Desktop & Tablet View (Table) ── */}
                <div className="hidden sm:block rounded-2xl border border-slate-200/80 overflow-hidden">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="font-bold text-xs text-slate-500 py-3.5 pl-6 w-[160px]">Nama Petugas</TableHead>
                        <TableHead className="font-bold text-xs text-slate-500 py-3.5 text-center w-[210px]">Catat Kehadiran</TableHead>
                        <TableHead className="font-bold text-xs text-slate-500 py-3.5 pl-4 text-left">Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas?.map(petugas => {
                        const pData = modalPresensi.find(p => p.nama_petugas === petugas.nama_petugas);
                        const currentStatus = pData?.status_hadir || "BELUM_DICATAT";
                        return (
                          <TableRow key={petugas.id} className="hover:bg-slate-50/40">
                            <TableCell className="py-3 pl-6 w-[160px]">
                              <p className="font-bold text-slate-900 text-sm">{petugas.nama_petugas}</p>
                              {currentStatus === "BELUM_DICATAT" ? (
                                <Badge variant="outline" className="mt-1 text-[9px] text-slate-400 border-slate-200 uppercase">Belum Absen</Badge>
                              ) : (
                                <Badge variant="outline" className={`mt-1 text-[9px] uppercase ${currentStatus === "HADIR" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : currentStatus === "IZIN" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-rose-600 bg-rose-50 border-rose-200"}`}>
                                  Status: {currentStatus}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-3 text-center w-[210px]">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  disabled={markingPetugas !== null}
                                  onClick={() => {
                                    const note = presensiNotes[petugas.nama_petugas] !== undefined 
                                      ? presensiNotes[petugas.nama_petugas] 
                                      : (pData?.catatan || "");
                                    handleMarkPresence(petugas.nama_petugas, "HADIR", note);
                                  }}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${currentStatus === "HADIR" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200/80"} ${markingPetugas !== null ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                >
                                  {markingPetugas === petugas.nama_petugas ? "..." : "Hadir"}
                                </button>
                                <button
                                  disabled={markingPetugas !== null}
                                  onClick={() => {
                                    const note = presensiNotes[petugas.nama_petugas] !== undefined 
                                      ? presensiNotes[petugas.nama_petugas] 
                                      : (pData?.catatan || "");
                                    handleMarkPresence(petugas.nama_petugas, "IZIN", note);
                                  }}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${currentStatus === "IZIN" ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200/80"} ${markingPetugas !== null ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                >Izin</button>
                                <button
                                  disabled={markingPetugas !== null}
                                  onClick={() => {
                                    const note = presensiNotes[petugas.nama_petugas] !== undefined 
                                      ? presensiNotes[petugas.nama_petugas] 
                                      : (pData?.catatan || "");
                                    handleMarkPresence(petugas.nama_petugas, "ALFA", note);
                                  }}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${currentStatus === "ALFA" ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200/80"} ${markingPetugas !== null ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                >Alfa</button>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 pl-4 text-left">
                              <Input
                                placeholder="Tambah catatan..."
                                value={presensiNotes[petugas.nama_petugas] !== undefined ? presensiNotes[petugas.nama_petugas] : (pData?.catatan || "")}
                                onChange={(e) => setPresensiNotes(prev => ({ ...prev, [petugas.nama_petugas]: e.target.value }))}
                                onBlur={() => {
                                  if (currentStatus !== "BELUM_DICATAT") {
                                    const note = presensiNotes[petugas.nama_petugas] !== undefined ? presensiNotes[petugas.nama_petugas] : (pData?.catatan || "");
                                    handleMarkPresence(petugas.nama_petugas, currentStatus, note);
                                  }
                                }}
                                className="h-8.5 rounded-xl border-slate-200 text-xs w-full max-w-[280px] text-left focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas ||
                        jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas?.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6 text-slate-400 text-sm italic">
                              Belum ada warga/petugas yang terdaftar pada regu ini.
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </div>

                {/* ── Mobile View (Cards Stack) ── */}
                <div className="block sm:hidden space-y-3">
                  {jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas?.map(petugas => {
                    const pData = modalPresensi.find(p => p.nama_petugas === petugas.nama_petugas);
                    const currentStatus = pData?.status_hadir || "BELUM_DICATAT";
                    return (
                      <div key={petugas.id} className="p-3 bg-slate-50/50 rounded-2xl border border-slate-200/60 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 text-sm leading-snug break-words">{petugas.nama_petugas}</p>
                            <div className="mt-1">
                              {currentStatus === "BELUM_DICATAT" ? (
                                <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-200 uppercase px-1.5 py-0.5">Belum Absen</Badge>
                              ) : (
                                <Badge variant="outline" className={`text-[9px] uppercase px-1.5 py-0.5 ${currentStatus === "HADIR" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : currentStatus === "IZIN" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-rose-600 bg-rose-50 border-rose-200"}`}>
                                  {currentStatus}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 w-[125px]">
                            <Input
                              placeholder="Catatan..."
                              value={presensiNotes[petugas.nama_petugas] !== undefined ? presensiNotes[petugas.nama_petugas] : (pData?.catatan || "")}
                              onChange={(e) => setPresensiNotes(prev => ({ ...prev, [petugas.nama_petugas]: e.target.value }))}
                              onBlur={() => {
                                if (currentStatus !== "BELUM_DICATAT") {
                                  const note = presensiNotes[petugas.nama_petugas] !== undefined ? presensiNotes[petugas.nama_petugas] : (pData?.catatan || "");
                                  handleMarkPresence(petugas.nama_petugas, currentStatus, note);
                                }
                              }}
                              className="h-8 rounded-xl border-slate-200 text-xs text-left px-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            disabled={markingPetugas !== null}
                            onClick={() => {
                              const note = presensiNotes[petugas.nama_petugas] !== undefined 
                                ? presensiNotes[petugas.nama_petugas] 
                                : (pData?.catatan || "");
                              handleMarkPresence(petugas.nama_petugas, "HADIR", note);
                            }}
                            className={`py-2 text-xs font-bold rounded-xl transition-all border text-center ${currentStatus === "HADIR" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70"} ${markingPetugas !== null ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            {markingPetugas === petugas.nama_petugas ? "..." : "Hadir"}
                          </button>
                          <button
                            disabled={markingPetugas !== null}
                            onClick={() => {
                              const note = presensiNotes[petugas.nama_petugas] !== undefined 
                                ? presensiNotes[petugas.nama_petugas] 
                                : (pData?.catatan || "");
                              handleMarkPresence(petugas.nama_petugas, "IZIN", note);
                            }}
                            className={`py-2 text-xs font-bold rounded-xl transition-all border text-center ${currentStatus === "IZIN" ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70"} ${markingPetugas !== null ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            Izin
                          </button>
                          <button
                            disabled={markingPetugas !== null}
                            onClick={() => {
                              const note = presensiNotes[petugas.nama_petugas] !== undefined 
                                ? presensiNotes[petugas.nama_petugas] 
                                : (pData?.catatan || "");
                              handleMarkPresence(petugas.nama_petugas, "ALFA", note);
                            }}
                            className={`py-2 text-xs font-bold rounded-xl transition-all border text-center ${currentStatus === "ALFA" ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/70"} ${markingPetugas !== null ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            Alfa
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(!jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas ||
                    jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas?.length === 0) && (
                      <div className="text-center py-8 text-slate-400 text-sm italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        Belum ada warga/petugas yang terdaftar pada regu ini.
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Jadwal */}
      <Dialog open={jadwalModalOpen} onOpenChange={setJadwalModalOpen}>
        <DialogContent className="rounded-3xl border-slate-100 shadow-2xl p-6 bg-white max-w-md">
          <DialogHeader className="pb-2 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Calendar className="size-4.5" />
              </span>
              {editingJadwal.id ? "Edit Kelompok Ronda" : "Buat Kelompok Ronda Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Kelompok / Jadwal</Label>
              <Input
                placeholder="Contoh: Regu Alpha / Pos 1"
                value={editingJadwal.nama_jadwal || ""}
                onChange={(e) => setEditingJadwal({ ...editingJadwal, nama_jadwal: e.target.value })}
                className="rounded-xl border-slate-200 h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hari Patroli</Label>
              <Select value={String(editingJadwal.hari_minggu || 0)} onValueChange={(val) => setEditingJadwal({ ...editingJadwal, hari_minggu: Number(val) })}>
                <SelectTrigger className="!w-full !rounded-xl border-slate-200 !h-11 !text-sm !px-3.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="!rounded-xl p-1.5 shadow-xl border-slate-100">
                  {HARI_MINGGU.map((hari, idx) => (
                    <SelectItem key={idx} value={String(idx)} className="!rounded-lg">{hari}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jam Mulai</Label>
                <TimePickerSelect
                  value={editingJadwal.jam_mulai ? editingJadwal.jam_mulai.slice(0, 5) : ""}
                  onChange={(val) => setEditingJadwal({ ...editingJadwal, jam_mulai: val })}
                  label="Jam Mulai"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jam Selesai</Label>
                <TimePickerSelect
                  value={editingJadwal.jam_selesai ? editingJadwal.jam_selesai.slice(0, 5) : ""}
                  onChange={(val) => setEditingJadwal({ ...editingJadwal, jam_selesai: val })}
                  label="Jam Selesai"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setJadwalModalOpen(false)} className="rounded-xl h-11 px-5 border-slate-200 text-sm font-semibold transition-all cursor-pointer">Batal</Button>
            <Button onClick={handleSaveJadwal} className="rounded-xl h-11 px-6 font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm border-0 transition-all cursor-pointer">Simpan Jadwal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Petugas */}
      <Dialog open={petugasModalOpen} onOpenChange={setPetugasModalOpen}>
        <DialogContent className="rounded-3xl border-slate-100 shadow-2xl p-6 bg-white max-w-md">
          <DialogHeader className="pb-2 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <UserPlus className="size-4.5" />
              </span>
              Tambah Warga / Petugas
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap</Label>
              <Input placeholder="Masukkan nama..." value={newPetugas.nama_petugas} onChange={(e) => setNewPetugas({ ...newPetugas, nama_petugas: e.target.value })} className="rounded-xl border-slate-200 h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">No HP (Opsional)</Label>
              <Input placeholder="Contoh: 08123456789" value={newPetugas.no_hp} onChange={(e) => setNewPetugas({ ...newPetugas, no_hp: e.target.value })} className="rounded-xl border-slate-200 h-11" />
            </div>
          </div>
          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setPetugasModalOpen(false)} className="rounded-xl h-11 px-5 border-slate-200 text-sm font-semibold transition-all cursor-pointer">Batal</Button>
            <Button onClick={handleAddPetugas} className="rounded-xl h-11 px-6 font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm border-0 transition-all cursor-pointer">Tambahkan Petugas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  );
}

// Custom Time Picker Component with Scrollable Hour and Minute Columns
function TimePickerSelect({
  value,
  onChange,
  label
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState("21");
  const [selectedMinute, setSelectedMinute] = useState("00");

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      if (h) setSelectedHour(h.padStart(2, "0"));
      if (m) setSelectedMinute(m.padStart(2, "0"));
    }
  }, [value]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  const handleSelectHour = (h: string) => {
    setSelectedHour(h);
    onChange(`${h}:${selectedMinute}`);
  };

  const handleSelectMinute = (m: string) => {
    setSelectedMinute(m);
    onChange(`${selectedHour}:${m}`);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.time-picker-${label.replace(/\s+/g, "-")}`)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open, label]);

  // Auto scroll to active elements
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const activeButtons = document.querySelectorAll(`.time-picker-${label.replace(/\s+/g, "-")} .bg-indigo-600`);
        activeButtons.forEach((btn) => {
          btn.scrollIntoView({ block: "center", behavior: "auto" });
        });
      }, 50);
    }
  }, [open, label]);

  return (
    <div className={`relative time-picker-${label.replace(/\s+/g, "-")} w-full`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 h-11 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:border-indigo-400 transition-colors cursor-pointer"
      >
        <span>{value || "00:00"}</span>
        <Clock className="size-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:bg-slate-950 dark:border-white/10 w-[200px] left-0 md:left-auto md:right-0">
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Jam</span>
            <div className="h-44 overflow-y-auto w-full divide-y divide-slate-100 flex flex-col pr-0.5 border border-slate-100 rounded-lg p-1 bg-slate-50/50">
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSelectHour(h)}
                  className={`py-1.5 text-xs rounded-md font-bold transition-all text-center cursor-pointer shrink-0 ${selectedHour === h
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px bg-slate-200 dark:bg-slate-800 self-stretch my-2" />

          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Menit</span>
            <div className="h-44 overflow-y-auto w-full divide-y divide-slate-100 flex flex-col pl-0.5 border border-slate-100 rounded-lg p-1 bg-slate-50/50">
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMinute(m)}
                  className={`py-1.5 text-xs rounded-md font-bold transition-all text-center cursor-pointer shrink-0 ${selectedMinute === m
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
