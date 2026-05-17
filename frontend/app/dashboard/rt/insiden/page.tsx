"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { rtClient, type RtInsidenRecord, type RtStatusInsiden } from "@/lib/api/rt";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, MapPin, Phone, User, Calendar, Plus, PencilLine, Trash2 } from "lucide-react";

export default function RtInsidenPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RtInsidenRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | RtStatusInsiden>("ALL");
  
  const [selectedIncident, setSelectedIncident] = useState<RtInsidenRecord | null>(null);

  // Form states (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [pelaporNama, setPelaporNama] = useState("");
  const [pelaporNoHp, setPelaporNoHp] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!modalOpen) {
      setFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [modalOpen]);

  // Detail status update state
  const [updateStatus, setUpdateStatus] = useState<RtStatusInsiden>("LAPORAN");
  const [tindakan, setTindakan] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rtClient.listInsiden(statusFilter === "ALL" ? undefined : { status: statusFilter });
      setRows(data);
      if (selectedIncident) {
        const updatedSelected = data.find(r => r.id === selectedIncident.id);
        if (updatedSelected) {
          setSelectedIncident(updatedSelected);
          setUpdateStatus(updatedSelected.status);
        } else {
          setSelectedIncident(null);
        }
      }
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedIncident]);

  useEffect(() => {
    load();
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenCreate = () => {
    setIsEdit(false);
    setJudul(""); setDeskripsi(""); setLokasi(""); setPelaporNama(""); setPelaporNoHp(""); setFile(null);
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
    setModalOpen(true);
  };

  const submit = async () => {
    if (!judul || !deskripsi || !lokasi || !pelaporNama) {
      toast.error("Mohon lengkapi field wajib");
      return;
    }
    try {
      if (isEdit && selectedIncident) {
        await rtClient.updateInsiden(selectedIncident.id, {
          tipe_insiden: judul,
          lokasi,
          deskripsi,
        });
        toast.success("Laporan diperbarui");
      } else {
        await rtClient.createInsiden({
          tipe_insiden: judul || "Insiden RT",
          tanggal_insiden: new Date().toISOString(),
          lokasi,
          deskripsi,
          pelapor_nama: pelaporNama,
          pelapor_no_hp: pelaporNoHp || undefined,
          foto_bukti: file,
        });
        toast.success("Laporan dikirim");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus laporan ini?")) return;
    try {
      await rtClient.removeInsiden(id);
      toast.success("Laporan dihapus");
      if (selectedIncident?.id === id) setSelectedIncident(null);
      load();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedIncident) return;
    try {
      await rtClient.updateInsiden(selectedIncident.id, {
        status: updateStatus,
        ...(tindakan && { tindakan_diambil: tindakan }) // backend actually accepts tindakan_diambil in partial body if handled, but we'll try sending it via updateInsiden payload cast
      } as any);
      toast.success("Status laporan diperbarui");
      load();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const statusColors = {
    LAPORAN: "bg-rose-100 text-rose-700",
    PROSES: "bg-amber-100 text-amber-700",
    SELESAI: "bg-emerald-100 text-emerald-700",
    DITUTUP: "bg-slate-100 text-slate-700"
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">RT</Badge>
              <span className="text-sm text-slate-500 dark:text-muted-foreground">Manajemen laporan insiden</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground mt-2">Laporan Kejadian</h1>
            <p className="text-base text-slate-500 dark:text-muted-foreground">Kelola laporan kejadian dan perbarui status penanganannya.</p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="size-4" /> Buat Laporan Baru
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="h-[calc(100vh-12rem)] flex flex-col">
            <CardHeader className="p-4 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Daftar Laporan</CardTitle>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
                  <SelectTrigger className="w-35 h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua</SelectItem>
                    <SelectItem value="LAPORAN">Laporan</SelectItem>
                    <SelectItem value="PROSES">Sedang Ditangani</SelectItem>
                    <SelectItem value="SELESAI">Selesai</SelectItem>
                    <SelectItem value="DITUTUP">Ditutup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-sm text-slate-500">Memuat data...</div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Belum ada laporan kejadian.</div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map(row => (
                    <li 
                      key={row.id} 
                      className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedIncident?.id === row.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                      onClick={() => {
                        setSelectedIncident(row);
                        setUpdateStatus(row.status);
                        setTindakan((row as any).tindakan_diambil || "");
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm line-clamp-1">{row.tipe_insiden}</h4>
                        <Badge variant="secondary" className={`text-[10px] ${statusColors[row.status] || ''}`}>
                          {row.status === "PROSES" ? "DITANGANI" : row.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <MapPin className="size-3" /> <span className="line-clamp-1">{row.lokasi}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="size-3" /> {new Date(row.tanggal_insiden).toLocaleDateString("id-ID")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Detail View */}
        <div className="lg:col-span-2">
          {selectedIncident ? (
            <Card className="h-full">
              <CardHeader className="border-b flex flex-row items-start justify-between p-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="secondary" className={statusColors[selectedIncident.status]}>{selectedIncident.status}</Badge>
                    <span className="text-xs text-slate-500">dilaporkan pada {new Date(selectedIncident.created_at).toLocaleString("id-ID")}</span>
                  </div>
                  <CardTitle className="text-2xl">{selectedIncident.tipe_insiden}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => handleOpenEdit(selectedIncident)}>
                    <PencilLine className="size-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="text-rose-500 border-rose-200 hover:bg-rose-50" onClick={() => handleDelete(selectedIncident.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Info Kejadian */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
                        <FileText className="size-4" /> Deskripsi Kejadian
                      </h4>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {selectedIncident.deskripsi}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Informasi Tambahan</h4>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <MapPin className="size-4 text-slate-400 mt-0.5" />
                          <div>
                            <span className="block text-xs text-slate-500">Lokasi</span>
                            <span className="font-medium">{selectedIncident.lokasi}</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <User className="size-4 text-slate-400 mt-0.5" />
                          <div>
                            <span className="block text-xs text-slate-500">Pelapor</span>
                            <span className="font-medium">{selectedIncident.pelapor_nama}</span>
                          </div>
                        </li>
                        {selectedIncident.pelapor_no_hp && (
                          <li className="flex items-start gap-3">
                            <Phone className="size-4 text-slate-400 mt-0.5" />
                            <div>
                              <span className="block text-xs text-slate-500">No. HP Pelapor</span>
                              <span className="font-medium">{selectedIncident.pelapor_no_hp}</span>
                            </div>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Penanganan Status */}
                  <div className="space-y-6">
                    <div className="p-5 border border-indigo-100 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-900/30 rounded-2xl">
                      <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-4">Perbarui Status Penanganan</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={updateStatus} onValueChange={(val) => setUpdateStatus(val as any)}>
                            <SelectTrigger className="bg-white dark:bg-slate-900">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LAPORAN">Laporan Baru</SelectItem>
                              <SelectItem value="PROSES">Sedang Ditangani</SelectItem>
                              <SelectItem value="SELESAI">Selesai</SelectItem>
                              <SelectItem value="DITUTUP">Ditutup (Batal/Selesai)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Tindakan yang diambil (Opsional)</Label>
                          <textarea 
                            className="flex min-h-20 w-full rounded-md border border-input bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                            placeholder="Deskripsikan tindakan penyelesaian..."
                            value={tindakan}
                            onChange={(e) => setTindakan(e.target.value)}
                          />
                        </div>
                        <Button className="w-full" onClick={handleUpdateStatus}>
                          Simpan Pembaruan
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="text-center">
                <FileText className="size-12 mx-auto mb-3 opacity-20" />
                <p>Pilih laporan di samping untuk melihat detail.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Laporan Insiden" : "Buat Laporan Baru"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Perbaiki informasi laporan yang sudah ada." : "Catat laporan kejadian di wilayah Anda."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Judul / Tipe Insiden</Label>
              <Input placeholder="Contoh: Pencurian, Keributan, Pohon Tumbang" value={judul} onChange={(e) => setJudul(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Lokasi Kejadian</Label>
              <Input placeholder="Detail lokasi..." value={lokasi} onChange={(e) => setLokasi(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ceritakan kronologi singkat..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
              />
            </div>
            {!isEdit && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Pelapor</Label>
                  <Input placeholder="Nama warga" value={pelaporNama} onChange={(e) => setPelaporNama(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>No HP Pelapor (Opsional)</Label>
                  <Input placeholder="08..." value={pelaporNoHp} onChange={(e) => setPelaporNoHp(e.target.value)} />
                </div>
              </div>
            )}
            {!isEdit && (
              <div className="space-y-2">
                <Label>Foto Bukti (Opsional)</Label>
                <div className="relative flex items-center h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 px-3.5 py-2 text-sm transition-all duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0] ?? null;
                      setFile(selectedFile);
                      setFileName(selectedFile ? selectedFile.name : "");
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-2.5 w-full pointer-events-none select-none">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors">
                      Choose File
                    </span>
                    <span className="text-slate-300 dark:text-slate-600 font-light">|</span>
                    <span className="text-slate-400 dark:text-slate-500 truncate flex-1">
                      {fileName || "No file chosen"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={submit}>{isEdit ? "Simpan Perubahan" : "Kirim Laporan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  );
}
