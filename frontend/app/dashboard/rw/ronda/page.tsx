"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { performaRondaClient, type RwMonitoringRondaData } from "@/lib/api/performaRonda";
import { Calendar, ShieldCheck, Clock, Users, ShieldAlert, Award, AlertTriangle, ArrowUpDown, BellRing, Sparkles, Filter, CheckCircle2, Search, RotateCcw, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function RwMonitoringRondaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RwMonitoringRondaData | null>(null);
  const [expandedBloks, setExpandedBloks] = useState<string[]>([]);
  const [blokDetails, setBlokDetails] = useState<Record<string, { jadwals: any[]; presensi: any[] }>>({});
  const [loadingBloks, setLoadingBloks] = useState<Record<string, boolean>>({});

  // Filter States
  const [filterRt, setFilterRt] = useState<string>("all");
  const [filterKeaktifan, setFilterKeaktifan] = useState<string>("all");
  const [searchOfficer, setSearchOfficer] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("default");

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterRt, filterKeaktifan, searchOfficer, sortOption]);

  // Month & Year Selector for Performance Report
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<string>("monitoring");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const firstDay = new Date(Number(selectedYear), Number(selectedMonth) - 1, 1);
      const lastDay = new Date(Number(selectedYear), Number(selectedMonth), 0);
      const tanggal_mulai = firstDay.toISOString().split("T")[0];
      const tanggal_akhir = lastDay.toISOString().split("T")[0];

      const res = await performaRondaClient.getMonitoringRw({ tanggal_mulai, tanggal_akhir });
      setData(res);
      if (res && res.blok_data) {
        const ids = res.blok_data.map(b => b.blok_id);
        for (const id of ids) {
          try {
            setLoadingBloks(prev => ({ ...prev, [id]: true }));
            const detailRes = await performaRondaClient.getDetailRondaBlok(id);
            setBlokDetails(prev => ({ ...prev, [id]: detailRes }));
          } catch (err) {
            console.error("Gagal memuat detail presensi untuk blok " + id, err);
          } finally {
            setLoadingBloks(prev => ({ ...prev, [id]: false }));
          }
        }
      }
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const handleAccordionChange = async (values: string[]) => {
    setExpandedBloks(values);
    for (const val of values) {
      if (!blokDetails[val] && !loadingBloks[val]) {
        try {
          setLoadingBloks(prev => ({ ...prev, [val]: true }));
          const res = await performaRondaClient.getDetailRondaBlok(val);
          setBlokDetails(prev => ({ ...prev, [val]: res }));
        } catch (err) {
          toast.error("Gagal memuat riwayat presensi RT");
        } finally {
          setLoadingBloks(prev => ({ ...prev, [val]: false }));
        }
      }
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const hariList = [
    { label: "Senin", value: 1 },
    { label: "Selasa", value: 2 },
    { label: "Rabu", value: 3 },
    { label: "Kamis", value: 4 },
    { label: "Jumat", value: 5 },
    { label: "Sabtu", value: 6 },
    { label: "Minggu", value: 0 },
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

  const getBlockStats = (blok: any) => {
    let totalHadir = 0;
    let totalIzin = 0;
    let totalAlfa = 0;

    blok.jadwal.forEach((j: any) => {
      totalHadir += j.stats?.HADIR || 0;
      totalIzin += j.stats?.IZIN || 0;
      totalAlfa += j.stats?.ALFA || 0;
    });

    const total = totalHadir + totalIzin + totalAlfa;
    const attendanceRate = total > 0 ? Math.round((totalHadir / total) * 100) : 100;
    const alfaRate = total > 0 ? Math.round((totalAlfa / total) * 100) : 0;

    let statusKinerja = "AMAN";
    if (attendanceRate < 40) {
      statusKinerja = "RAWAN";
    } else if (attendanceRate < 75) {
      statusKinerja = "PERHATIAN";
    }

    return { totalHadir, totalIzin, totalAlfa, total, attendanceRate, alfaRate, statusKinerja };
  };

  const emptyTonightBlocks = data?.blok_data.filter(b => b.is_any_kosong_malam_ini) || [];

  const filteredAndSortedBloks = (data?.blok_data || [])
    .filter(blok => {
      if (filterRt !== "all" && blok.blok_id !== filterRt) return false;
      if (filterKeaktifan !== "all") {
        const hasMatchingSchedule = blok.jadwal.some(j => {
          if (filterKeaktifan === "aktif" && j.status_keaktifan !== "aktif") return false;
          if (filterKeaktifan === "kurang_aktif" && j.status_keaktifan !== "kurang_aktif") return false;
          if (filterKeaktifan === "tidak_aktif" && j.status_keaktifan !== "tidak_aktif") return false;
          if (filterKeaktifan === "belum_ada" && j.status_keaktifan !== "belum_ada") return false;
          return true;
        });
        if (!hasMatchingSchedule && blok.jadwal.length > 0) return false;
      }
      if (searchOfficer.trim() !== "") {
        const query = searchOfficer.toLowerCase();
        const hasOfficer = blok.jadwal.some(j =>
          j.petugas?.some((p: any) => p.nama_petugas.toLowerCase().includes(query))
        );
        if (!hasOfficer) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOption === "alfa_desc") return getBlockStats(b).alfaRate - getBlockStats(a).alfaRate;
      if (sortOption === "attendance_asc") return getBlockStats(a).attendanceRate - getBlockStats(b).attendanceRate;
      return a.no_rt.localeCompare(b.no_rt);
    });

  const totalItems = filteredAndSortedBloks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBloks = filteredAndSortedBloks.slice(startIndex, endIndex);

  const handleReprimand = (no_rt: string, nama_blok: string) => {
    toast.success(`Surat Teguran Elektronik berhasil dikirim kepada Ketua RT ${no_rt} - ${nama_blok}!`, {
      description: "Ketua RT akan menerima notifikasi segera untuk mengevaluasi warganya.",
      duration: 5000,
    });
  };

  const isFiltering = filterRt !== "all" || filterKeaktifan !== "all" || searchOfficer.trim() !== "" || sortOption !== "default";

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Header persis seperti Blok Wilayah ── */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Monitoring Ronda
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Pantau jadwal patroli ronda, tingkat keaktifan, dan rapor keamanan bulanan dari seluruh RT
            </p>
          </div>
        </div>

        {/* Selectors dengan tinggi h-11 agar seragam dengan Blok Wilayah */}
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px] h-11 rounded-xl border-slate-200/70 bg-white text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="!rounded-xl !p-1.5 shadow-lg border border-slate-100">
              {monthNames.map(m => (
                <SelectItem key={m.value} value={m.value} className="!text-sm !py-2 !px-3 !rounded-lg">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[90px] h-11 rounded-xl border-slate-200/70 bg-white text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="!rounded-xl !p-1.5 shadow-lg border border-slate-100">
              <SelectItem value="2026" className="!text-sm !py-2 !px-3 !rounded-lg">2026</SelectItem>
              <SelectItem value="2027" className="!text-sm !py-2 !px-3 !rounded-lg">2027</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* ── EWS Alert Banner ── */}
      {emptyTonightBlocks.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 text-white p-5 md:p-6 shadow-sm border border-red-400/20">
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <ShieldAlert className="size-48" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="flex items-start gap-4">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white border border-white/10 backdrop-blur-md shadow-xs animate-bounce">
                  <ShieldAlert className="size-6 text-white" />
                </span>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge className="bg-white text-red-600 font-bold border-0 text-[10px] uppercase tracking-wider py-0.5 px-2 animate-pulse">CRITICAL WARNING</Badge>
                    <h3 className="font-extrabold text-base md:text-lg tracking-tight">Kekosongan Pos Patroli Malam Ini!</h3>
                  </div>
                  <p className="text-sm text-red-50/90 font-medium max-w-3xl leading-relaxed">
                    Malam ini wilayah <span className="underline font-bold">{emptyTonightBlocks.map(b => `RT ${b.no_rt.toString().padStart(3, '0')}`).join(', ')}</span> terdeteksi kosong tanpa petugas aktif (Semua berstatus Sakit, Izin, atau Alfa)!
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <Button
                  onClick={() => toast.info("Pesan instruksi darurat telah dikirimkan ke Satpam RW!")}
                  className="bg-white text-rose-600 font-extrabold rounded-2xl hover:bg-red-50 hover:scale-105 transition-all text-sm px-6 py-6 shadow-sm border border-white"
                >
                  <BellRing className="size-4 mr-2" /> Instruksikan Satpam RW
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-12 text-center shadow-sm">
          <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-violet-200 border-t-violet-500 mx-auto" />
          <p className="mt-4 text-base font-semibold text-slate-500">Memuat data monitoring ronda...</p>
          <p className="text-sm text-slate-400 mt-1">Mohon tunggu sebentar</p>
        </div>
      ) : (
        <>
          {/* ── Main Tabbed Content ── */}
          <Tabs defaultValue="monitoring" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-50 border border-slate-100 p-1.5 rounded-2xl w-fit">
              <TabsTrigger value="monitoring" className="rounded-xl text-sm font-bold gap-1.5 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                <ShieldCheck className="size-4" /> Pemantauan Ronda
              </TabsTrigger>
              <TabsTrigger value="performance" className="rounded-xl text-sm font-bold gap-1.5 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                <Award className="size-4" /> Rapor Kinerja Ronda RT Bulan {monthNames.find(m => m.value === selectedMonth)?.label}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="monitoring" className="space-y-6 pt-0">
              {/* ── Panel Ringkasan (Summary Cards yang Indah & Nyaman Dibaca) ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* Total Jadwal Aktif */}
                <div className="rounded-3xl border border-violet-100 border-t-4 border-t-violet-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-violet-950 dark:border-t-violet-500">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Jadwal Aktif</p>
                    <h3 className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1.5 tabular-nums">
                      {data?.summary.total_jadwal || 0}
                    </h3>
                  </div>
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-500 dark:bg-violet-950 dark:text-violet-400">
                    <Calendar className="size-5.5" />
                  </span>
                </div>

                {/* Total Kehadiran */}
                <div className="rounded-3xl border border-emerald-100 border-t-4 border-t-emerald-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-emerald-950 dark:border-t-emerald-500">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hadir Patroli</p>
                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums">
                      {data?.summary.presensi.HADIR || 0}
                    </h3>
                  </div>
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950 dark:text-emerald-400">
                    <ShieldCheck className="size-5.5" />
                  </span>
                </div>

                {/* Izin / Sakit */}
                <div className="rounded-3xl border border-amber-100 border-t-4 border-t-amber-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-amber-950 dark:border-t-amber-500">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Izin / Sakit</p>
                    <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5 tabular-nums">
                      {data?.summary.presensi.IZIN || 0}
                    </h3>
                  </div>
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-950 dark:text-amber-400">
                    <Clock className="size-5.5" />
                  </span>
                </div>

                {/* Alfa */}
                <div className="rounded-3xl border border-rose-100 border-t-4 border-t-rose-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-rose-950 dark:border-t-rose-500">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Alfa (Vakum)</p>
                    <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5 tabular-nums">
                      {data?.summary.presensi.ALFA || 0}
                    </h3>
                  </div>
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950 dark:text-rose-400">
                    <AlertTriangle className="size-5.5" />
                  </span>
                </div>
              </div>

              {/* ── Filter Panel (Persis Saringan Masjid - Horizontal & Premium) ── */}
              <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Search className="size-4 text-indigo-500" />
                  Cari & Saring Jadwal Ronda
                </p>
                <div className="flex flex-col xl:flex-row gap-3">
                  {/* Search Input (Mendominasi kiri) */}
                  <div className="relative flex-1 min-w-0">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      placeholder="Cari nama petugas..."
                      value={searchOfficer}
                      onChange={(e) => setSearchOfficer(e.target.value)}
                      className="pl-10 h-11 rounded-xl text-base w-full bg-white border-slate-200"
                    />
                  </div>

                  {/* Filter Wilayah RT */}
                  <Select value={filterRt} onValueChange={setFilterRt}>
                    <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[160px] font-medium transition-all ${filterRt !== "all"
                      ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                      : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"
                      }`}>
                      <Users className={`size-4 mr-1 shrink-0 ${filterRt !== "all" ? "text-indigo-500" : "text-slate-400"}`} />
                      <SelectValue placeholder="Semua RT" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                      <SelectItem value="all" className="!text-sm !py-2 !px-3 !rounded-lg">Semua RT</SelectItem>
                      {data?.blok_data.map(b => (
                        <SelectItem key={b.blok_id} value={b.blok_id} className="!text-sm !py-2 !px-3 !rounded-lg">
                          RT {b.no_rt.toString().padStart(3, '0')} - {b.nama_blok}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filter Status Keaktifan */}
                  <Select value={filterKeaktifan} onValueChange={setFilterKeaktifan}>
                    <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[160px] font-medium transition-all ${filterKeaktifan !== "all"
                      ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                      : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"
                      }`}>
                      <ShieldCheck className={`size-4 mr-1 shrink-0 ${filterKeaktifan !== "all" ? "text-indigo-500" : "text-slate-400"}`} />
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                      <SelectItem value="all" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Status</SelectItem>
                      <SelectItem value="aktif" className="!text-sm !py-2 !px-3 !rounded-lg">🟢 Aktif Prima</SelectItem>
                      <SelectItem value="kurang_aktif" className="!text-sm !py-2 !px-3 !rounded-lg">🟡 Kurang Aktif</SelectItem>
                      <SelectItem value="tidak_aktif" className="!text-sm !py-2 !px-3 !rounded-lg">🔴 Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Urutkan Berdasarkan */}
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[185px] font-medium transition-all ${sortOption !== "default"
                      ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                      : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"
                      }`}>
                      <ArrowUpDown className={`size-4 mr-1 shrink-0 ${sortOption !== "default" ? "text-indigo-500" : "text-slate-400"}`} />
                      <SelectValue placeholder="Urutkan" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                      <SelectItem value="default" className="!text-sm !py-2 !px-3 !rounded-lg">No RT (Default)</SelectItem>
                      <SelectItem value="alfa_desc" className="!text-sm !py-2 !px-3 !rounded-lg">⚠️ Tingkat Alfa Tertinggi</SelectItem>
                      <SelectItem value="attendance_asc" className="!text-sm !py-2 !px-3 !rounded-lg">📉 Kehadiran Terendah</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Reset Button (Sama dengan Reset Masjid) */}
                  {isFiltering && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilterRt("all");
                        setFilterKeaktifan("all");
                        setSearchOfficer("");
                        setSortOption("default");
                      }}
                      className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw className="size-4" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* ── Container List persis Monitoring Kas RT ── */}
              <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-800">Daftar Jadwal Ronda Seluruh RT</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Pantau keaktifan patroli dan penjagaan dari setiap blok wilayah.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl shrink-0">
                      Menampilkan {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, totalItems)} dari {totalItems} RT
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={activePage === 1}
                        className="size-8 rounded-lg border-slate-300 bg-white hover:bg-violet-50 text-slate-800 hover:text-violet-600 hover:border-violet-300 disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all shadow-xs flex items-center justify-center"
                      >
                        <ChevronLeft className="size-5 stroke-[2.5px]" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={activePage === totalPages}
                        className="size-8 rounded-lg border-slate-300 bg-white hover:bg-violet-50 text-slate-800 hover:text-violet-600 hover:border-violet-300 disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all shadow-xs flex items-center justify-center"
                      >
                        <ChevronRight className="size-5 stroke-[2.5px]" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-0">
                  {totalItems === 0 ? (
                    <div className="py-16 text-center text-sm font-medium text-slate-400">
                      Tidak ada data yang cocok dengan pencarian Anda.
                    </div>
                  ) : (
                    <Accordion type="multiple" value={expandedBloks} onValueChange={handleAccordionChange} className="w-full">
                      {paginatedBloks.map((blok) => {
                        const stats = getBlockStats(blok);
                        const isAlert = blok.is_any_kosong_malam_ini;

                        return (
                          <AccordionItem value={blok.blok_id} key={blok.blok_id} className={`border-b border-slate-200 last:border-b-0 ${isAlert ? "bg-red-50/20" : ""}`}>
                            <AccordionTrigger className="px-6 py-4.5 hover:no-underline hover:bg-slate-50/50 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-4 gap-4">
                                <div className="flex items-center gap-4">
                                  <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                    isAlert
                                      ? "bg-red-50 text-red-600"
                                      : "bg-violet-50 text-violet-600"
                                  }`}>
                                    <Building2 className="size-4" />
                                  </span>
                                  <div className="text-left">
                                    <div className="flex items-center gap-2">
                                      {/* Teks RT disamakan dengan ukuran text-base font-bold agar lebih terbaca legang */}
                                      <h3 className="text-base font-bold text-slate-900">
                                        RT {blok.no_rt.toString().padStart(3, '0')} <span className="font-semibold text-slate-400 text-sm ml-1.5">{blok.nama_blok}</span>
                                      </h3>
                                      {isAlert && (
                                        <Badge className="bg-red-500 text-white text-[9px] uppercase px-1.5 py-0.5 border-0">Kosong Malam Ini</Badge>
                                      )}
                                    </div>
                                    {/* Deskripsi dinaikkan ke text-sm */}
                                    <p className="text-sm text-slate-400 mt-1 font-medium">
                                      {blok.jadwal.length} Jadwal Aktif • {stats.attendanceRate}% Kehadiran Warga
                                    </p>
                                  </div>
                                </div>

                                <div className="text-left sm:text-right shrink-0">
                                  {stats.statusKinerja === "RAWAN" ? (
                                    <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1.5 rounded-md font-bold text-xs">
                                      <AlertTriangle className="size-3.5" /> Tidak Aktif
                                    </span>
                                  ) : stats.statusKinerja === "PERHATIAN" ? (
                                    <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md font-bold text-xs">
                                      <Clock className="size-3.5" /> Perlu Perhatian
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md font-bold text-xs">
                                      <ShieldCheck className="size-3.5" /> Ronda Aktif
                                    </span>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-6 bg-slate-50/50">
                              <Tabs defaultValue="jadwal" className="w-full">
                                <TabsList className="bg-white border border-slate-200 mb-4 rounded-xl p-0.5 w-fit">
                                  <TabsTrigger value="jadwal" className="text-sm font-bold rounded-lg py-2 px-4">Jadwal 7 Hari</TabsTrigger>
                                  <TabsTrigger value="presensi" className="text-sm font-bold rounded-lg py-2 px-4">Riwayat Kehadiran</TabsTrigger>
                                </TabsList>

                                <TabsContent value="jadwal" className="pt-0">
                                  {/* Kalender 7 Hari yang Kompak & Nyaman Dibaca */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {hariList.map(hari => {
                                      const jadwalHariIni = blok.jadwal.filter(j => j.hari_minggu === hari.value);
                                      const hasSchedule = jadwalHariIni.length > 0;
                                      const isTodayEmpty = hasSchedule && jadwalHariIni.some(j => j.is_kosong_malam_ini);

                                      // Tampilan minimal untuk hari yang tidak ada jadwal
                                      if (!hasSchedule) {
                                        return (
                                          <div key={hari.value} className="rounded-xl bg-slate-50/50 border border-slate-200/70 p-3.5 flex flex-col justify-between items-center text-center min-h-[145px] shadow-xs">
                                            <h4 className="font-bold text-sm text-slate-500 mt-1 text-center">
                                              {hari.label}
                                            </h4>
                                            <span className="text-xs text-slate-400 font-medium leading-relaxed max-w-[130px] mb-2 text-center">
                                              Jadwal belum ditetapkan
                                            </span>
                                          </div>
                                        );
                                      }

                                      // Tampilan kartu untuk hari yang ada jadwal
                                      return (
                                        <div key={hari.value} className={`rounded-xl bg-white border p-3.5 flex flex-col min-h-[145px] ${isTodayEmpty ? "border-red-300 ring-1 ring-red-100 shadow-sm" : "border-slate-200 shadow-sm"
                                          }`}>
                                          <div className="flex items-center justify-center mb-2.5 relative w-full">
                                            <h4 className={`font-bold text-sm ${isTodayEmpty ? 'text-red-600' : 'text-slate-800'} text-center`}>
                                              {hari.label}
                                            </h4>
                                            {isTodayEmpty && <span className="absolute right-0 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Kosong</span>}
                                          </div>

                                          <div className="space-y-2.5">
                                            {jadwalHariIni.map((jadwal: any) => {
                                              let badgeClass = "bg-slate-100 text-slate-600";
                                              let label = "Belum Ada Data";
                                              if (jadwal.status_keaktifan === "aktif") { badgeClass = "bg-emerald-100 text-emerald-700"; label = "Aktif"; }
                                              if (jadwal.status_keaktifan === "kurang_aktif") { badgeClass = "bg-amber-100 text-amber-700"; label = "Kurang"; }
                                              if (jadwal.status_keaktifan === "tidak_aktif") { badgeClass = "bg-rose-100 text-rose-700"; label = "Vakum"; }

                                              return (
                                                <div key={jadwal.id} className="flex flex-col gap-2">
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                      {jadwal.jam_mulai} - {jadwal.jam_selesai}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeClass}`}>{label}</span>
                                                  </div>

                                                  <div className="bg-slate-50 rounded p-2 border border-slate-100">
                                                    {jadwal.petugas && jadwal.petugas.length > 0 ? (
                                                      <ul className="space-y-1">
                                                        {jadwal.petugas.map((p: any) => (
                                                          <li key={p.id} className="flex justify-between items-center text-xs">
                                                            <span className="font-semibold text-slate-700 truncate max-w-[100px]">{p.nama_petugas}</span>
                                                            <span className="text-slate-400 shrink-0">{p.no_hp || '-'}</span>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    ) : (
                                                      <span className="text-xs italic text-slate-400">Belum ada petugas</span>
                                                    )}
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </TabsContent>

                                <TabsContent value="presensi" className="pt-0">
                                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                    {loadingBloks[blok.blok_id] ? (
                                      <div className="py-8 text-center text-xs text-slate-500">Memuat...</div>
                                    ) : !blokDetails[blok.blok_id] || blokDetails[blok.blok_id].presensi.length === 0 ? (
                                      <div className="py-8 text-center text-sm text-slate-400">Belum ada riwayat presensi dalam 30 hari.</div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                          <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                              {/* Table header disesuaikan ukuran teksnya */}
                                              <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-500">Tanggal</th>
                                              <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-500">Petugas Ronda</th>
                                              <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-500">Status</th>
                                              <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-500">Catatan</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-200/60 text-sm">
                                            {blokDetails[blok.blok_id].presensi.map((p: any) => (
                                              <tr key={p.id} className="hover:bg-slate-50/50">
                                                <td className="px-5 py-3 text-slate-600">
                                                  {new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </td>
                                                {/* Text disamakan font-semibold text-slate-900 text-sm */}
                                                <td className="px-5 py-3 font-semibold text-slate-900">{p.nama_petugas}</td>
                                                <td className="px-5 py-3">
                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status_hadir === 'HADIR' ? 'bg-emerald-100 text-emerald-700' :
                                                    p.status_hadir === 'ALFA' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {p.status_hadir}
                                                  </span>
                                                </td>
                                                {/* Catatan disesuaikan text-sm text-slate-500 */}
                                                <td className="px-5 py-3 text-slate-500 truncate max-w-[200px]">{p.catatan || "-"}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </TabsContent>
                              </Tabs>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* RAPOR KINERJA TAB */}
            <TabsContent value="performance" className="space-y-6 pt-0">
              <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                      <Award className="size-4.5" />
                    </span>
                    <div>
                      {/* Sub-judul diselaraskan warnanya dengan text-slate-800 */}
                      <h2 className="text-base font-bold text-slate-800">Rapor Ronda Bulanan RT</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Akumulasi tingkat kehadiran vs alfa petugas pada periode ini.</p>
                    </div>
                  </div>
                </div>

                <div className="p-0">
                  {!data || data.blok_data.length === 0 ? (
                    <div className="py-16 text-center text-sm text-slate-400">Tidak ada data untuk periode ini.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/70 border-b border-slate-200">
                          <tr>
                            {/* Table header disesuaikan ukuran teksnya */}
                            <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500">Wilayah</th>
                            <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500">Statistik Kehadiran (H / I / A)</th>
                            <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500">Tingkat Kepatuhan (%)</th>
                            <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500">Kategori Kinerja</th>
                            <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500 text-right">Tindakan Evaluasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 text-sm">
                          {data.blok_data.map(blok => {
                            const stats = getBlockStats(blok);
                            return (
                              <tr key={blok.blok_id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  {/* Text disamakan font-semibold text-slate-900 text-sm dan subtitle text-xs text-slate-500 */}
                                  <p className="font-semibold text-sm text-slate-900">RT {blok.no_rt.toString().padStart(3, '0')}</p>
                                  <p className="text-xs text-slate-500 font-medium">{blok.nama_blok}</p>
                                </td>
                                <td className="px-6 py-4 font-bold text-sm">
                                  <span className="text-emerald-600 mr-2">{stats.totalHadir}H</span>
                                  <span className="text-amber-600 mr-2">{stats.totalIzin}I</span>
                                  <span className="text-rose-600">{stats.totalAlfa}A</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1.5 w-28">
                                    <span className={`text-base font-extrabold ${stats.attendanceRate > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {stats.attendanceRate}%
                                    </span>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${stats.attendanceRate > 70 ? 'bg-emerald-500' : stats.attendanceRate > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${stats.attendanceRate}%` }}></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex px-3 py-1 rounded-md text-xs font-bold ${stats.statusKinerja === 'RAWAN' ? 'bg-red-100 text-red-700 border border-red-200' :
                                    stats.statusKinerja === 'PERHATIAN' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    }`}>
                                    {stats.statusKinerja === 'RAWAN' ? 'Rawan Vakum' : stats.statusKinerja === 'PERHATIAN' ? 'Perlu Perhatian' : 'Kinerja Bagus'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {stats.statusKinerja !== 'AMAN' ? (
                                    <Button onClick={() => handleReprimand(blok.no_rt, blok.nama_blok)} size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white">
                                      Tegur RT
                                    </Button>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-400 px-4 py-2">Terkendali</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </main>
  );
}
