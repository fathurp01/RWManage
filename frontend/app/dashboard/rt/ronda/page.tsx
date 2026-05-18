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
import { Trash2, Plus, Users, CalendarCheck, PencilLine } from "lucide-react";

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
        toast.success("Jadwal diupdate");
      } else {
        await rtClient.createJadwalRonda(editingJadwal);
        toast.success("Jadwal dibuat");
      }
      setJadwalModalOpen(false);
      loadJadwal();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleDeleteJadwal = async (id: string) => {
    if (!confirm("Hapus jadwal ini?")) return;
    try {
      await rtClient.deleteJadwalRonda(id);
      toast.success("Jadwal dihapus");
      loadJadwal();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleAddPetugas = async () => {
    if (!newPetugas.nama_petugas) return;
    try {
      await rtClient.addPetugas(selectedJadwalId, newPetugas);
      toast.success("Petugas ditambahkan");
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
      toast.success("Petugas dihapus");
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
      toast.success(`Presensi ${nama_petugas} disimpan`);
      loadPresensi();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RT</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Operasional keamanan</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Manajemen Ronda</h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">Kelola jadwal ronda, tugaskan warga, dan catat presensi keamanan harian.</p>
      </header>

      <Tabs defaultValue="presensi" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="presensi" className="gap-2">
            <CalendarCheck className="size-4" />
            Presensi Harian
          </TabsTrigger>
          <TabsTrigger value="jadwal" className="gap-2">
            <Users className="size-4" />
            Jadwal & Petugas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presensi" className="space-y-4">
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Presensi Tanggal</CardTitle>
                <div className="flex items-center gap-2">
                  <Input type="date" value={presensiDate} onChange={(e) => setPresensiDate(e.target.value)} className="w-auto" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              {jadwalForSelectedDay.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>Tidak ada jadwal ronda untuk hari {HARI_MINGGU[selectedDayOfWeek]}.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {jadwalForSelectedDay.length > 1 && (
                    <div className="flex gap-2">
                      {jadwalForSelectedDay.map(j => (
                        <Button
                          key={j.id}
                          variant={activeJadwalId === j.id ? "default" : "outline"}
                          onClick={() => setActiveJadwalId(j.id)}
                        >
                          {j.nama_jadwal} ({j.jam_mulai} - {j.jam_selesai})
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 dark:border-white/8 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/70 dark:bg-slate-900/40">
                          <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-300 py-3">Nama Petugas</TableHead>
                          <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-300 py-3">Pencatatan Kehadiran (1-Klik)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas?.map(petugas => {
                          const pData = presensiData.find(p => p.nama_petugas === petugas.nama_petugas);
                          const currentStatus = pData?.status_hadir || "BELUM_DICATAT";
                          return (
                            <TableRow key={petugas.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/10 transition-colors">
                              <TableCell className="font-semibold text-slate-900 dark:text-foreground py-4">
                                <div className="flex items-center gap-2">
                                  <span>{petugas.nama_petugas}</span>
                                  {currentStatus === "BELUM_DICATAT" && (
                                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200 py-0.5 px-1.5 rounded-md font-semibold">Belum Absen</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/8 p-0.5 bg-slate-50 dark:bg-slate-950/40 w-fit gap-0.5 shadow-xs">
                                  <button
                                    onClick={() => handleMarkPresence(petugas.nama_petugas, "HADIR")}
                                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                                      currentStatus === "HADIR"
                                        ? "bg-emerald-500 text-white shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                                    }`}
                                  >
                                    🟢 Hadir
                                  </button>
                                  <button
                                    onClick={() => handleMarkPresence(petugas.nama_petugas, "IZIN")}
                                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                                      currentStatus === "IZIN"
                                        ? "bg-amber-500 text-white shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                                    }`}
                                  >
                                    🟡 Izin
                                  </button>
                                  <button
                                    onClick={() => handleMarkPresence(petugas.nama_petugas, "ALFA")}
                                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                                      currentStatus === "ALFA"
                                        ? "bg-rose-500 text-white shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                                    }`}
                                  >
                                    🔴 Alfa
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {jadwalForSelectedDay.find(j => j.id === activeJadwalId)?.petugas?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-6 text-slate-500 dark:text-muted-foreground text-xs italic">
                              Belum ada petugas yang ditugaskan pada jadwal ini.
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
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => {
              setEditingJadwal({ minggu_mulai: new Date().toISOString().slice(0, 10), hari_minggu: 0 });
              setJadwalModalOpen(true);
            }}>
              <Plus className="size-4" />
              Buat Jadwal Baru
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {jadwalList.map(jadwal => (
              <Card key={jadwal.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{jadwal.nama_jadwal}</CardTitle>
                      <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{HARI_MINGGU[jadwal.hari_minggu]}</span>
                        • {jadwal.jam_mulai} - {jadwal.jam_selesai}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => {
                        setEditingJadwal({ ...jadwal, minggu_mulai: jadwal.minggu_mulai.slice(0, 10), minggu_selesai: jadwal.minggu_selesai?.slice(0, 10) });
                        setJadwalModalOpen(true);
                      }}>
                        <PencilLine className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-rose-500" onClick={() => handleDeleteJadwal(jadwal.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Petugas ({jadwal.petugas?.length || 0})</h4>
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => {
                      setSelectedJadwalId(jadwal.id);
                      setPetugasModalOpen(true);
                    }}>
                      <Plus className="size-3" /> Tambah
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {jadwal.petugas?.map(petugas => (
                      <li key={petugas.id} className="flex flex-wrap items-center justify-between text-sm rounded-md bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                        <span>{petugas.nama_petugas} {petugas.no_hp && <span className="text-slate-400 text-xs ml-1">({petugas.no_hp})</span>}</span>
                        <Button size="icon" variant="ghost" className="size-6 text-rose-500 hover:bg-rose-100" onClick={() => handleRemovePetugas(petugas.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </li>
                    ))}
                    {jadwal.petugas?.length === 0 && (
                      <li className="text-xs text-slate-500 text-center py-2">Belum ada petugas ditambahkan.</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
            {jadwalList.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed">
                Belum ada jadwal ronda. Buat jadwal pertama Anda.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Jadwal */}
      <Dialog open={jadwalModalOpen} onOpenChange={setJadwalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingJadwal.id ? "Edit Jadwal" : "Buat Jadwal Baru"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nama Jadwal</Label>
              <Input placeholder="Contoh: Regu Alpha / Pos Ronda 1" value={editingJadwal.nama_jadwal || ""} onChange={(e) => setEditingJadwal({...editingJadwal, nama_jadwal: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hari</Label>
                <Select value={String(editingJadwal.hari_minggu || 0)} onValueChange={(val) => setEditingJadwal({...editingJadwal, hari_minggu: Number(val)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HARI_MINGGU.map((hari, idx) => (
                      <SelectItem key={idx} value={String(idx)}>{hari}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input placeholder="Opsional" value={editingJadwal.catatan || ""} onChange={(e) => setEditingJadwal({...editingJadwal, catatan: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jam Mulai</Label>
                <Input type="time" value={editingJadwal.jam_mulai || ""} onChange={(e) => setEditingJadwal({...editingJadwal, jam_mulai: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Jam Selesai</Label>
                <Input type="time" value={editingJadwal.jam_selesai || ""} onChange={(e) => setEditingJadwal({...editingJadwal, jam_selesai: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai Berlaku</Label>
                <Input type="date" value={editingJadwal.minggu_mulai || ""} onChange={(e) => setEditingJadwal({...editingJadwal, minggu_mulai: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Berakhir Pada (Opsional)</Label>
                <Input type="date" value={editingJadwal.minggu_selesai || ""} onChange={(e) => setEditingJadwal({...editingJadwal, minggu_selesai: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJadwalModalOpen(false)}>Batal</Button>
            <Button onClick={handleSaveJadwal}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Petugas */}
      <Dialog open={petugasModalOpen} onOpenChange={setPetugasModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Petugas Ronda</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nama Warga / Petugas</Label>
              <Input placeholder="Nama Lengkap" value={newPetugas.nama_petugas} onChange={(e) => setNewPetugas({...newPetugas, nama_petugas: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>No HP (Opsional)</Label>
              <Input placeholder="08..." value={newPetugas.no_hp} onChange={(e) => setNewPetugas({...newPetugas, no_hp: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPetugasModalOpen(false)}>Batal</Button>
            <Button onClick={handleAddPetugas}>Tambahkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
