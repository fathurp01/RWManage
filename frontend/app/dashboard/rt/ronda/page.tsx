"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rtClient, type RtJadwalRonda, type RtRondaPetugas, type RtStatusKehadiran, type RtPresensiRonda } from "@/lib/api/rt";
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
  CalendarDays
} from "lucide-react";

const HARI_MINGGU = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function ManajemenRondaPage() {
  const [loading, setLoading] = useState(true);
  const [jadwalList, setJadwalList] = useState<RtJadwalRonda[]>([]);
  
  // State for Presensi
  const [presensiDate, setPresensiDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [presensiData, setPresensiData] = useState<RtPresensiRonda[]>([]);
  const [activeJadwalId, setActiveJadwalId] = useState<string>("");

  // Modals state
  const [jadwalModalOpen, setJadwalModalOpen] = useState(false);
  const [editingJadwal, setEditingJadwal] = useState<Partial<RtJadwalRonda>>({});
  
  const [petugasModalOpen, setPetugasModalOpen] = useState(false);
  const [selectedJadwalId, setSelectedJadwalId] = useState("");
  const [newPetugas, setNewPetugas] = useState({ nama_petugas: "", no_hp: "", catatan: "" });

  const loadJadwal = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rtClient.listJadwalRonda();
      setJadwalList(data);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJadwal();
  }, [loadJadwal]);

  // Presensi logic
  const selectedDayOfWeek = new Date(presensiDate).getDay();
  const jadwalForSelectedDay = jadwalList.filter(j => j.hari_minggu === selectedDayOfWeek);

  useEffect(() => {
    if (jadwalForSelectedDay.length > 0) {
      if (!jadwalForSelectedDay.some(j => j.id === activeJadwalId)) {
        setActiveJadwalId(jadwalForSelectedDay[0].id);
      }
    } else {
      setActiveJadwalId("");
    }
  }, [selectedDayOfWeek, jadwalForSelectedDay, activeJadwalId]);

  const loadPresensi = useCallback(async () => {
    if (!activeJadwalId || !presensiDate) {
      setPresensiData([]);
      return;
    }
    try {
      const data = await rtClient.listPresensi(activeJadwalId, {
        tanggal_mulai: presensiDate,
        tanggal_akhir: presensiDate,
      });
      setPresensiData(data);
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  }, [activeJadwalId, presensiDate]);

  useEffect(() => {
    loadPresensi();
  }, [loadPresensi]);

  const handleSaveJadwal = async () => {
    try {
      if (editingJadwal.id) {
        await rtClient.updateJadwalRonda(editingJadwal.id, editingJadwal);
        toast.success("Jadwal ronda berhasil diperbarui!");
      } else {
        await rtClient.createJadwalRonda(editingJadwal);
        toast.success("Jadwal ronda baru berhasil dibuat!");
      }
      setJadwalModalOpen(false);
      loadJadwal();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleDeleteJadwal = async (id: string) => {
    if (!confirm("Hapus jadwal ini? Tindakan ini akan menghapus seluruh data petugas di dalamnya.")) return;
    try {
      await rtClient.deleteJadwalRonda(id);
      toast.success("Jadwal ronda berhasil dihapus!");
      loadJadwal();
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
      loadJadwal();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleRemovePetugas = async (id: string) => {
    try {
      await rtClient.removePetugas(id);
      toast.success("Petugas ronda berhasil dihapus!");
      loadJadwal();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleMarkPresence = async (nama_petugas: string, status: RtStatusKehadiran, catatan?: string) => {
    if (!activeJadwalId) return;
    try {
      await rtClient.markPresensi(activeJadwalId, {
        tanggal: presensiDate,
        nama_petugas,
        status_hadir: status,
        catatan,
      });
      toast.success(`Presensi ${nama_petugas} berhasil dicatat sebagai ${status}!`);
      loadPresensi();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  // Calculations for premium summary cards
  const totalPetugasCount = jadwalList.reduce((acc, curr) => acc + (curr.petugas?.length || 0), 0);
  const hadirCount = presensiData.filter(p => p.status_hadir === "HADIR").length;
  const alfaCount = presensiData.filter(p => p.status_hadir === "ALFA").length;

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Header persis seperti RW Ronda Page ── */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
                Manajemen Ronda
              </h1>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50">RT</Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Kelola jadwal patroli ronda, tugaskan warga, dan catat presensi keamanan harian di wilayah RT
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-12 text-center shadow-sm">
          <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-violet-200 border-t-violet-500 mx-auto" />
          <p className="mt-4 text-base font-semibold text-slate-500">Memuat data manajemen ronda...</p>
          <p className="text-sm text-slate-400 mt-1">Mohon tunggu sebentar</p>
        </div>
      ) : (
        <>
          {/* ── Panel Ringkasan (Summary Cards Indah & Aligned) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Total Jadwal */}
            <div className="rounded-3xl border border-violet-100 border-t-4 border-t-violet-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-violet-950 dark:border-t-violet-500">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Kelompok Ronda</p>
                <h3 className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1.5 tabular-nums">
                  {jadwalList.length}
                </h3>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-500 dark:bg-violet-950 dark:text-violet-400">
                <Calendar className="size-5.5" />
              </span>
            </div>

            {/* Total Warga Terdaftar */}
            <div className="rounded-3xl border border-indigo-100 border-t-4 border-t-indigo-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-indigo-950 dark:border-t-indigo-500">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Warga Terdaftar</p>
                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5 tabular-nums">
                  {totalPetugasCount}
                </h3>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400">
                <Users className="size-5.5" />
              </span>
            </div>

            {/* Hadir Hari Ini */}
            <div className="rounded-3xl border border-emerald-100 border-t-4 border-t-emerald-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-emerald-950 dark:border-t-emerald-500">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hadir Hari Ini</p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums">
                  {hadirCount} <span className="text-xs font-medium text-slate-400">warga</span>
                </h3>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950 dark:text-emerald-400">
                <ShieldCheck className="size-5.5" />
              </span>
            </div>

            {/* Absen / Alfa Hari Ini */}
            <div className="rounded-3xl border border-rose-100 border-t-4 border-t-rose-500 bg-white p-5 shadow-xs relative overflow-hidden flex items-center justify-between dark:bg-slate-950 dark:border-rose-950 dark:border-t-rose-500">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Absen / Alfa Hari Ini</p>
                <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5 tabular-nums">
                  {alfaCount} <span className="text-xs font-medium text-slate-400">warga</span>
                </h3>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950 dark:text-rose-400">
                <AlertTriangle className="size-5.5" />
              </span>
            </div>
          </div>

          <Tabs defaultValue="presensi" className="space-y-6">
            <TabsList className="bg-white border border-slate-200/80 dark:border-white/5 dark:bg-slate-900 rounded-2xl p-1 w-fit shadow-xs gap-1">
              <TabsTrigger value="presensi" className="text-sm font-bold rounded-xl py-2.5 px-5 gap-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/20">
                <CalendarCheck className="size-4" />
                Presensi Harian
              </TabsTrigger>
              <TabsTrigger value="jadwal" className="text-sm font-bold rounded-xl py-2.5 px-5 gap-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/20">
                <Users className="size-4" />
                Jadwal & Petugas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="presensi" className="space-y-4">
              <Card className="rounded-3xl border border-slate-100 dark:border-white/8 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 mt-0.5">
                        <CalendarCheck className="size-5" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Presensi Harian Keamanan</h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Catat kehadiran petugas ronda malam ini berdasarkan tanggal patroli.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Tanggal:</span>
                      <Input 
                        type="date" 
                        value={presensiDate} 
                        onChange={(e) => setPresensiDate(e.target.value)} 
                        className="w-auto h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/40 text-sm font-medium focus-visible:ring-indigo-500 cursor-pointer" 
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 px-6 pb-6">
                  {jadwalForSelectedDay.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
                      <CalendarDays className="size-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Tidak ada jadwal ronda untuk hari {HARI_MINGGU[selectedDayOfWeek]}.
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Silakan pilih tanggal lain atau buat jadwal baru di tab Jadwal & Petugas.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {jadwalForSelectedDay.length > 1 && (
                        <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-2xl border border-slate-100 dark:border-white/5 w-fit">
                          {jadwalForSelectedDay.map(j => (
                            <Button
                              key={j.id}
                              variant="ghost"
                              onClick={() => setActiveJadwalId(j.id)}
                              className={`rounded-xl h-9 px-4 text-xs font-bold transition-all ${
                                activeJadwalId === j.id
                                  ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100/50 dark:hover:bg-white/5"
                              }`}
                            >
                              {j.nama_jadwal} ({j.jam_mulai} - {j.jam_selesai})
                            </Button>
                          ))}
                        </div>
                      )}

                      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/80 dark:bg-white/3">
                              <TableHead className="font-bold text-xs text-slate-500 dark:text-slate-400 py-3.5 pl-6 w-[45%]">Nama Petugas</TableHead>
                              <TableHead className="font-bold text-xs text-slate-500 dark:text-slate-400 py-3.5 pr-6 w-[55%]">Pencatatan Kehadiran (1-Klik)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-slate-100 dark:divide-white/5">
                            {jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas?.map(petugas => {
                              const pData = presensiData.find(p => p.nama_petugas === petugas.nama_petugas);
                              const currentStatus = pData?.status_hadir || "BELUM_DICATAT";
                              return (
                                <TableRow key={petugas.id} className="hover:bg-slate-50/40 dark:hover:bg-white/1 animate-in fade-in duration-200">
                                  <TableCell className="py-4 pl-6 align-middle">
                                    <div className="flex items-center gap-3">
                                      <div className="inline-flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 font-bold text-xs uppercase shadow-xs">
                                        {petugas.nama_petugas.slice(0, 2)}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-900 dark:text-foreground text-sm">
                                          {petugas.nama_petugas}
                                        </p>
                                        {petugas.no_hp && (
                                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                            <Phone className="size-3" />
                                            {petugas.no_hp}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 pr-6 align-middle">
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/8 p-0.5 bg-slate-50 dark:bg-slate-950/40 w-fit gap-0.5 shadow-xs">
                                        <button
                                          type="button"
                                          onClick={() => handleMarkPresence(petugas.nama_petugas, "HADIR")}
                                          className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${
                                            currentStatus === "HADIR"
                                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5"
                                          }`}
                                        >
                                          🟢 Hadir
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMarkPresence(petugas.nama_petugas, "IZIN")}
                                          className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${
                                            currentStatus === "IZIN"
                                              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5"
                                          }`}
                                        >
                                          🟡 Izin
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMarkPresence(petugas.nama_petugas, "ALFA")}
                                          className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${
                                            currentStatus === "ALFA"
                                              ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5"
                                          }`}
                                        >
                                          🔴 Alfa
                                        </button>
                                      </div>
                                      
                                      {currentStatus === "BELUM_DICATAT" ? (
                                        <Badge variant="outline" className="border-slate-200 text-slate-400 dark:border-white/5 font-semibold text-[10px] uppercase tracking-wider py-1 px-2.5">
                                          Belum Absen
                                        </Badge>
                                      ) : (
                                        <Badge 
                                          variant="outline" 
                                          className={`font-bold text-[10px] uppercase tracking-wider py-1 px-2.5 ${
                                            currentStatus === "HADIR" 
                                              ? "bg-emerald-50/50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50" 
                                              : currentStatus === "IZIN" 
                                                ? "bg-amber-50/50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50" 
                                                : "bg-rose-50/50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50"
                                          }`}
                                        >
                                          Status: {currentStatus}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {(!jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas || 
                              jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas?.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center py-8 text-slate-400 dark:text-muted-foreground text-sm italic">
                                  Belum ada warga/petugas ronda yang terdaftar pada regu ini.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="jadwal" className="space-y-4">
              {/* Toolbar Buat Jadwal Baru */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-100 dark:border-white/5 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="size-4.5 text-indigo-500" />
                    Pengaturan Jadwal Keamanan
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Definisikan hari patroli, jam operasional kelompok, dan kelola penugasan warga.</p>
                </div>
                <Button 
                  onClick={() => {
                    setEditingJadwal({ minggu_mulai: new Date().toISOString().slice(0, 10), hari_minggu: 0 });
                    setJadwalModalOpen(true);
                  }}
                  className="rounded-xl h-11 px-6 font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 border-0 gap-2 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <Plus className="size-4.5" />
                  Buat Jadwal Baru
                </Button>
              </div>

              {/* Grid Jadwal */}
              <div className="grid gap-6 md:grid-cols-2">
                {jadwalList.map(jadwal => (
                  <Card key={jadwal.id} className="rounded-3xl border border-slate-200/60 dark:border-white/8 shadow-sm overflow-hidden bg-white dark:bg-slate-950 flex flex-col justify-between">
                    <div>
                      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-white/5 py-4 px-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-base font-extrabold text-slate-800 dark:text-slate-200">{jadwal.nama_jadwal}</CardTitle>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                              <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 font-bold text-[10px] rounded-lg px-2.5 py-0.5">
                                {HARI_MINGGU[jadwal.hari_minggu]}
                              </Badge>
                              • {jadwal.jam_mulai} - {jadwal.jam_selesai}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                              onClick={() => {
                                setEditingJadwal({ 
                                  ...jadwal, 
                                  minggu_mulai: jadwal.minggu_mulai.slice(0, 10), 
                                  minggu_selesai: jadwal.minggu_selesai?.slice(0, 10) 
                                });
                                setJadwalModalOpen(true);
                              }}
                            >
                              <PencilLine className="size-4 text-slate-500 dark:text-slate-400" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="size-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" 
                              onClick={() => handleDeleteJadwal(jadwal.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 px-5">
                        <div className="flex items-center justify-between mb-3.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Petugas Keamanan ({jadwal.petugas?.length || 0})
                          </h4>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 px-3 rounded-lg border-slate-200 dark:border-white/10 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold gap-1.5 transition-all shadow-xs" 
                            onClick={() => {
                              setSelectedJadwalId(jadwal.id);
                              setPetugasModalOpen(true);
                            }}
                          >
                            <UserPlus className="size-3.5" /> Tambah
                          </Button>
                        </div>
                        <ul className="space-y-2">
                          {jadwal.petugas?.map(petugas => (
                            <li key={petugas.id} className="flex items-center justify-between text-sm rounded-xl bg-slate-50/50 dark:bg-slate-900/30 px-3.5 py-2.5 border border-slate-100/50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{petugas.nama_petugas}</span>
                                {petugas.no_hp && (
                                  <span className="text-slate-400 text-xs flex items-center gap-0.5">
                                    • {petugas.no_hp}
                                  </span>
                                )}
                              </div>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="size-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex items-center justify-center" 
                                onClick={() => handleRemovePetugas(petugas.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </li>
                          ))}
                          {(!jadwal.petugas || jadwal.petugas.length === 0) && (
                            <li className="text-xs text-slate-400 italic text-center py-6 bg-slate-50/30 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
                              Belum ada warga/petugas terdaftar.
                            </li>
                          )}
                        </ul>
                      </CardContent>
                    </div>
                  </Card>
                ))}
                {jadwalList.length === 0 && !loading && (
                  <div className="col-span-full text-center py-12 bg-slate-50/30 dark:bg-slate-900/10 rounded-3xl border border-dashed border-slate-200 dark:border-white/8">
                    <Calendar className="size-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Belum ada kelompok / jadwal ronda malam.</p>
                    <p className="text-xs text-slate-400 mt-1">Silakan klik "Buat Jadwal Baru" untuk memulai penjadwalan.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Modal Jadwal */}
      <Dialog open={jadwalModalOpen} onOpenChange={setJadwalModalOpen}>
        <DialogContent className="rounded-3xl border-slate-100 dark:border-white/8 shadow-2xl p-6 bg-white dark:bg-card max-w-md">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-white/5">
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                <Calendar className="size-4.5" />
              </span>
              {editingJadwal.id ? "Edit Jadwal Ronda" : "Buat Jadwal Ronda Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Jadwal</Label>
              <Input 
                placeholder="Contoh: Regu Alpha / Pos Ronda 1" 
                value={editingJadwal.nama_jadwal || ""} 
                onChange={(e) => setEditingJadwal({...editingJadwal, nama_jadwal: e.target.value})} 
                className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/40 focus-visible:ring-indigo-500 h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hari Patroli</Label>
                <Select 
                  value={String(editingJadwal.hari_minggu || 0)} 
                  onValueChange={(val) => setEditingJadwal({...editingJadwal, hari_minggu: Number(val)})}
                >
                  <SelectTrigger className="!rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/40 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="!rounded-xl p-1.5 shadow-xl border border-slate-100">
                    {HARI_MINGGU.map((hari, idx) => (
                      <SelectItem key={idx} value={String(idx)} className="!rounded-lg">{hari}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catatan</Label>
                <Input 
                  placeholder="Opsional (contoh: Pos 1)" 
                  value={editingJadwal.catatan || ""} 
                  onChange={(e) => setEditingJadwal({...editingJadwal, catatan: e.target.value})} 
                  className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/40 focus-visible:ring-indigo-500 h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jam Mulai</Label>
                <Input 
                  type="time" 
                  value={editingJadwal.jam_mulai || ""} 
                  onChange={(e) => setEditingJadwal({...editingJadwal, jam_mulai: e.target.value})} 
                  className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/40 focus-visible:ring-indigo-500 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jam Selesai</Label>
                <Input 
                  type="time" 
                  value={editingJadwal.jam_selesai || ""} 
                  onChange={(e) => setEditingJadwal({...editingJadwal, jam_selesai: e.target.value})} 
                  className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/40 focus-visible:ring-indigo-500 h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal Mulai</Label>
                <Input 
                  type="date" 
                  value={editingJadwal.minggu_mulai || ""} 
                  onChange={(e) => setEditingJadwal({...editingJadwal, minggu_mulai: e.target.value})} 
                  className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/40 focus-visible:ring-indigo-500 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Berakhir Pada</Label>
                <Input 
                  type="date" 
                  value={editingJadwal.minggu_selesai || ""} 
                  onChange={(e) => setEditingJadwal({...editingJadwal, minggu_selesai: e.target.value})} 
                  className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/40 focus-visible:ring-indigo-500 h-11"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-white/5 gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setJadwalModalOpen(false)}
              className="rounded-xl h-11 px-5 border-slate-200 dark:border-white/10 text-sm font-semibold transition-all cursor-pointer"
            >
              Batal
            </Button>
            <Button 
              onClick={handleSaveJadwal}
              className="rounded-xl h-11 px-6 font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 border-0 transition-all hover:scale-[1.02] cursor-pointer"
            >
              Simpan Jadwal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Petugas */}
      <Dialog open={petugasModalOpen} onOpenChange={setPetugasModalOpen}>
        <DialogContent className="rounded-3xl border-slate-100 dark:border-white/8 shadow-2xl p-6 bg-white dark:bg-card max-w-md">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-white/5">
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                <UserPlus className="size-4.5" />
              </span>
              Tambah Petugas Ronda
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Warga / Petugas</Label>
              <Input 
                placeholder="Masukkan Nama Lengkap Petugas" 
                value={newPetugas.nama_petugas} 
                onChange={(e) => setNewPetugas({...newPetugas, nama_petugas: e.target.value})} 
                className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/40 focus-visible:ring-indigo-500 h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">No HP (Opsional)</Label>
              <Input 
                placeholder="Contoh: 08123456789" 
                value={newPetugas.no_hp} 
                onChange={(e) => setNewPetugas({...newPetugas, no_hp: e.target.value})} 
                className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/40 focus-visible:ring-indigo-500 h-11"
              />
            </div>
          </div>
          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-white/5 gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setPetugasModalOpen(false)}
              className="rounded-xl h-11 px-5 border-slate-200 dark:border-white/10 text-sm font-semibold transition-all cursor-pointer"
            >
              Batal
            </Button>
            <Button 
              onClick={handleAddPetugas}
              className="rounded-xl h-11 px-6 font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 border-0 transition-all hover:scale-[1.02] cursor-pointer"
            >
              Tambahkan Petugas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
