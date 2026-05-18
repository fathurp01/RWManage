"use client";

import { useEffect, useState } from "react";
import { getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import {
  rtClient,
  type RtWargaRecord,
  type RtAnggotaKeluargaRecord,
  type RtIdentitasWargaRecord,
} from "@/lib/api/rt";
import { Plus, Trash2, ChevronDown, ChevronRight, Users, Heart, ShieldAlert } from "lucide-react";

interface WargaWithDetails extends RtWargaRecord {
  anggota_keluarga?: RtAnggotaKeluargaRecord[];
  identitas?: RtIdentitasWargaRecord[];
}

export default function RtWargaPage() {
  const [loading, setLoading] = useState(true);
  const [warga, setWarga] = useState<WargaWithDetails[]>([]);
  const [expandedKK, setExpandedKK] = useState<string | null>(null);
  const [formKK, setFormKK] = useState({
    nama_kk: "",
    no_kk: "",
    nik: "",
    tanggal_terbit_kk: "",
    tanggal_lahir: "",
    pendidikan: "",
    pekerjaan: "",
    status_keluarga: "MAMPU",
  });
  const [formAnggota, setFormAnggota] = useState({
    kkId: "",
    nama: "",
    hubungan: "",
    nik: "",
    tanggal_lahir: "",
  });
  const [addingAnggotaFor, setAddingAnggotaFor] = useState<string | null>(null);

  const loadWarga = async () => {
    try {
      setLoading(true);
      const wargaList = await rtClient.listWarga();
      const wargaWithDetails = await Promise.all(
        wargaList.map(async (w) => {
          try {
            const [anggota, identitas] = await Promise.all([
              rtClient.listAnggota(w.id),
              rtClient.listIdentitas(w.id),
            ]);
            return { ...w, anggota_keluarga: anggota, identitas };
          } catch {
            return { ...w, anggota_keluarga: [], identitas: [] };
          }
        })
      );
      setWarga(wargaWithDetails);
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAnggota = async (kkId: string) => {
    try {
      const anggota = await rtClient.listAnggota(kkId);
      setWarga((prev) =>
        prev.map((w) =>
          w.id === kkId ? { ...w, anggota_keluarga: anggota } : w
        )
      );
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    }
  };

  useEffect(() => {
    loadWarga();
  }, []);

  const handleAddKK = async () => {
    if (!formKK.nama_kk.trim()) {
      toast.error("Nama Kepala Keluarga tidak boleh kosong");
      return;
    }
    try {
      await rtClient.createWarga({ 
        nama_kk: formKK.nama_kk,
        no_kk: formKK.no_kk || undefined,
        nik: formKK.nik || undefined,
        tanggal_terbit_kk: formKK.tanggal_terbit_kk || undefined,
        tanggal_lahir: formKK.tanggal_lahir || undefined,
        pendidikan: formKK.pendidikan || undefined,
        pekerjaan: formKK.pekerjaan || undefined,
        status_keluarga: formKK.status_keluarga as "MAMPU" | "KURANG_MAMPU" | "LANSIA",
      });
      toast.success("Kepala Keluarga ditambahkan");
      setFormKK({
        nama_kk: "",
        no_kk: "",
        nik: "",
        tanggal_terbit_kk: "",
        tanggal_lahir: "",
        pendidikan: "",
        pekerjaan: "",
        status_keluarga: "MAMPU",
      });
      loadWarga();
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    }
  };

  const handleAddAnggota = async () => {
    if (!formAnggota.nama.trim() || !formAnggota.hubungan.trim()) {
      toast.error("Nama dan hubungan wajib diisi");
      return;
    }
    try {
      await rtClient.createAnggota({
        warga_id: formAnggota.kkId,
        nama: formAnggota.nama,
        hubungan: formAnggota.hubungan,
        nik: formAnggota.nik || undefined,
        tanggal_lahir: formAnggota.tanggal_lahir || undefined,
      });
      toast.success("Anggota Keluarga ditambahkan");
      setFormAnggota({ kkId: "", nama: "", hubungan: "", nik: "", tanggal_lahir: "" });
      setAddingAnggotaFor(null);
      loadAnggota(formAnggota.kkId);
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    }
  };

  const handleDeleteKK = async (id: string) => {
    try {
      await rtClient.deleteWarga(id);
      toast.success("Kepala Keluarga dihapus");
      loadWarga();
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    }
  };

  const handleDeleteAnggota = async (id: string, kkId: string) => {
    try {
      await rtClient.removeAnggota(id);
      toast.success("Anggota Keluarga dihapus");
      loadAnggota(kkId);
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    }
  };

  const renderWargaList = (list: WargaWithDetails[], emptyText: string) => {
    if (list.length === 0) {
      return <div className="text-sm text-slate-500 italic py-2">{emptyText}</div>;
    }

    return (
      <div className="space-y-2.5">
        {list.map((kk) => (
          <div
            key={kk.id}
            className="border rounded-xl overflow-hidden dark:border-white/8 bg-white dark:bg-card"
          >
            {/* KK Header */}
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                setExpandedKK(expandedKK === kk.id ? null : kk.id)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpandedKK(expandedKK === kk.id ? null : kk.id);
                }
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2.5 flex-1">
                {expandedKK === kk.id ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <div className="text-left font-semibold text-slate-800 dark:text-foreground">{kk.nama_kk}</div>
                {kk.status_keluarga === "KURANG_MAMPU" && (
                  <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50/50 dark:border-amber-900/40 dark:text-amber-400 dark:bg-amber-950/20">Kurang Mampu</Badge>
                )}
                {kk.status_keluarga === "LANSIA" && (
                  <Badge variant="outline" className="text-[10px] border-sky-200 text-sky-700 bg-sky-50/50 dark:border-sky-900/40 dark:text-sky-400 dark:bg-sky-950/20">Lansia</Badge>
                )}
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <div className="space-y-4">
                    <div>
                      <h2 className="font-semibold text-lg text-slate-900 dark:text-foreground">
                        Hapus Kepala Keluarga?
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Apakah Anda yakin ingin menghapus "{kk.nama_kk}"?
                        Data tidak dapat dikembalikan.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <DialogClose asChild>
                        <Button variant="outline">Batal</Button>
                      </DialogClose>
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white font-medium"
                        onClick={() => {
                          handleDeleteKK(kk.id);
                        }}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Expanded Content */}
            {expandedKK === kk.id && (
              <div className="bg-slate-50/50 dark:bg-white/3 px-4 py-4 space-y-4 border-t dark:border-white/8">
                {/* Identity Documents */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Data Identitas ({kk.identitas?.length || 0})
                  </h4>
                  {kk.identitas && kk.identitas.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {kk.identitas.map((identitas) => (
                        <div
                          key={identitas.id}
                          className="bg-white dark:bg-card border border-slate-100 dark:border-white/8 rounded-xl p-3 text-xs shadow-xs"
                        >
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {identitas.tipe_dokumen}
                          </div>
                          {identitas.nomor_dokumen && (
                            <div className="text-slate-500 mt-1">
                              Nomor: <span className="font-semibold text-slate-700 dark:text-slate-300">{identitas.nomor_dokumen}</span>
                            </div>
                          )}
                          {identitas.tanggal_terbit && (
                            <div className="text-slate-400 mt-0.5">
                              Terbit: {identitas.tanggal_terbit}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Belum ada data identitas
                    </div>
                  )}
                </div>

                {/* Family Members */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Anggota Keluarga ({kk.anggota_keluarga?.length || 0})
                    </h4>
                    {addingAnggotaFor !== kk.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5 rounded-lg border-slate-200 hover:bg-slate-50"
                        onClick={() => {
                          setAddingAnggotaFor(kk.id);
                          setFormAnggota({
                            kkId: kk.id,
                            nama: "",
                            hubungan: "",
                            nik: "",
                            tanggal_lahir: "",
                          });
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Tambah Anggota
                      </Button>
                    )}
                  </div>

                  {/* Add Anggota Form */}
                  {addingAnggotaFor === kk.id && (
                    <div className="bg-white dark:bg-card border border-slate-100 dark:border-white/8 rounded-xl p-3 mb-3 space-y-2.5 shadow-xs">
                      <Input
                        placeholder="Nama Anggota"
                        value={formAnggota.nama}
                        onChange={(e) =>
                          setFormAnggota({
                            ...formAnggota,
                            nama: e.target.value,
                          })
                        }
                        className="text-xs h-9"
                      />
                      <Select
                        value={formAnggota.hubungan}
                        onValueChange={(v) =>
                          setFormAnggota({
                            ...formAnggota,
                            hubungan: v,
                          })
                        }
                      >
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Hubungan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Istri">Istri</SelectItem>
                          <SelectItem value="Anak">Anak</SelectItem>
                          <SelectItem value="Orang Tua">
                            Orang Tua
                          </SelectItem>
                          <SelectItem value="Saudara">Saudara</SelectItem>
                          <SelectItem value="Lainnya">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="NIK (opsional)"
                        value={formAnggota.nik}
                        onChange={(e) =>
                          setFormAnggota({
                            ...formAnggota,
                            nik: e.target.value,
                          })
                        }
                        className="text-xs h-9"
                      />
                      <Input
                        placeholder="Tanggal Lahir (opsional)"
                        type="date"
                        value={formAnggota.tanggal_lahir}
                        onChange={(e) =>
                          setFormAnggota({
                            ...formAnggota,
                            tanggal_lahir: e.target.value,
                          })
                        }
                        className="text-xs h-9"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddAnggota}
                          className="flex-1 text-xs h-8"
                        >
                          Simpan
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAddingAnggotaFor(null);
                            setFormAnggota({
                              kkId: "",
                              nama: "",
                              hubungan: "",
                              nik: "",
                              tanggal_lahir: "",
                            });
                          }}
                          className="flex-1 text-xs h-8 border-slate-200"
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Anggota List */}
                  {kk.anggota_keluarga && kk.anggota_keluarga.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {kk.anggota_keluarga.map((anggota) => (
                        <div
                          key={anggota.id}
                          className="bg-white dark:bg-card border border-slate-100 dark:border-white/8 rounded-xl p-3 text-xs shadow-xs"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {anggota.nama}
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <div className="space-y-4">
                                  <div>
                                    <h2 className="font-semibold text-lg text-slate-900 dark:text-foreground">
                                      Hapus Anggota Keluarga?
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                      Apakah Anda yakin ingin menghapus "{anggota.nama}"? Data tidak dapat dikembalikan.
                                    </p>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <DialogClose asChild>
                                      <Button variant="outline">Batal</Button>
                                    </DialogClose>
                                    <Button
                                      className="bg-red-600 hover:bg-red-700 text-white font-medium"
                                      onClick={() => {
                                        handleDeleteAnggota(anggota.id, kk.id);
                                      }}
                                    >
                                      Hapus
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            {anggota.hubungan}
                          </div>
                          {anggota.nik && (
                            <div className="text-slate-500">
                              NIK: <span className="font-medium text-slate-700 dark:text-slate-300">{anggota.nik}</span>
                            </div>
                          )}
                          {anggota.tanggal_lahir && (
                            <div className="text-slate-400 mt-0.5">
                              Lahir: {anggota.tanggal_lahir}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Belum ada anggota keluarga
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const wargaMampu = warga.filter((w) => w.status_keluarga === "MAMPU" || !w.status_keluarga);
  const wargaKurangMampu = warga.filter((w) => w.status_keluarga === "KURANG_MAMPU");
  const wargaLansia = warga.filter((w) => w.status_keluarga === "LANSIA");

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RT</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">
            Kelola data keluarga dan identitas warga
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
          Kelola Warga
        </h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">
          Mengelola kepala keluarga, anggota keluarga, dan data identitas lengkap warga RT
        </p>
      </header>

      {/* Tambah Kepala Keluarga */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Tambah Kepala Keluarga</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Nama Kepala Keluarga"
              value={formKK.nama_kk}
              onChange={(e) => setFormKK({ ...formKK, nama_kk: e.target.value })}
            />
            <Input
              placeholder="No. KK (opsional)"
              value={formKK.no_kk}
              onChange={(e) => setFormKK({ ...formKK, no_kk: e.target.value })}
            />
            <Input
              placeholder="NIK Kepala Keluarga (opsional)"
              value={formKK.nik}
              onChange={(e) => setFormKK({ ...formKK, nik: e.target.value })}
            />
            <Input
              placeholder="Tanggal Terbit KK (opsional)"
              type="date"
              value={formKK.tanggal_terbit_kk}
              onChange={(e) => setFormKK({ ...formKK, tanggal_terbit_kk: e.target.value })}
            />
            <Input
              placeholder="Tanggal Lahir Kepala Keluarga (opsional)"
              type="date"
              value={formKK.tanggal_lahir}
              onChange={(e) => setFormKK({ ...formKK, tanggal_lahir: e.target.value })}
            />
            <Select
              value={formKK.pendidikan}
              onValueChange={(v) => setFormKK({ ...formKK, pendidikan: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pendidikan (opsional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TK">TK</SelectItem>
                <SelectItem value="SD">SD</SelectItem>
                <SelectItem value="SMP">SMP</SelectItem>
                <SelectItem value="SMA">SMA/SMK</SelectItem>
                <SelectItem value="DIPLOMA">Diploma</SelectItem>
                <SelectItem value="SARJANA">Sarjana</SelectItem>
                <SelectItem value="LAINNYA">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Pekerjaan (opsional)"
              value={formKK.pekerjaan}
              onChange={(e) => setFormKK({ ...formKK, pekerjaan: e.target.value })}
            />
            <Select
              value={formKK.status_keluarga}
              onValueChange={(v) => setFormKK({ ...formKK, status_keluarga: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status Keluarga" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAMPU">Mampu (Standar)</SelectItem>
                <SelectItem value="KURANG_MAMPU">Kurang Mampu (Subsidi)</SelectItem>
                <SelectItem value="LANSIA">Lansia (Gratis/Waived)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddKK}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah KK
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3 Categories of Heads of Families */}
      <div className="space-y-6">
        {/* Warga Mampu */}
        <Card className="border-l-4 border-l-slate-400">
          <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Users className="w-5 h-5 text-slate-500" />
                Daftar Keluarga Mampu ({wargaMampu.length})
              </CardTitle>
              <Badge variant="secondary" className="bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300">
                Standar
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {loading ? (
              <div className="text-sm text-slate-500 py-2">Memuat...</div>
            ) : (
              renderWargaList(wargaMampu, "Belum ada kepala keluarga berstatus Mampu")
            )}
          </CardContent>
        </Card>

        {/* Warga Kurang Mampu */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                Daftar Keluarga Kurang Mampu ({wargaKurangMampu.length})
              </CardTitle>
              <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30">
                Subsidi
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {loading ? (
              <div className="text-sm text-slate-500 py-2">Memuat...</div>
            ) : (
              renderWargaList(wargaKurangMampu, "Belum ada kepala keluarga berstatus Kurang Mampu")
            )}
          </CardContent>
        </Card>

        {/* Warga Lansia */}
        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
                <Heart className="w-5 h-5 text-sky-500" />
                Daftar Keluarga Lansia ({wargaLansia.length})
              </CardTitle>
              <Badge className="bg-sky-100 hover:bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-900/30">
                Bebas Iuran / Lansia saja
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {loading ? (
              <div className="text-sm text-slate-500 py-2">Memuat...</div>
            ) : (
              renderWargaList(wargaLansia, "Belum ada kepala keluarga berstatus Lansia")
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

