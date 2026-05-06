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
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

interface WargaWithDetails extends RtWargaRecord {
  anggota_keluarga?: RtAnggotaKeluargaRecord[];
  identitas?: RtIdentitasWargaRecord[];
}

export default function RtWargaPage() {
  const [loading, setLoading] = useState(true);
  const [warga, setWarga] = useState<WargaWithDetails[]>([]);
  const [expandedKK, setExpandedKK] = useState<string | null>(null);
  const [formKK, setFormKK] = useState("");
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
    if (!formKK.trim()) {
      toast.error("Nama KK tidak boleh kosong");
      return;
    }
    try {
      await rtClient.createWarga({ nama_kk: formKK });
      toast.success("Kepala Keluarga ditambahkan");
      setFormKK("");
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Nama Kepala Keluarga"
              value={formKK}
              onChange={(e) => setFormKK(e.target.value)}
            />
            <Button onClick={handleAddKK}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daftar Kepala Keluarga */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Daftar Kepala Keluarga ({warga.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="text-sm text-slate-500">Memuat...</div>
          ) : warga.length === 0 ? (
            <div className="text-sm text-slate-500">Belum ada kepala keluarga</div>
          ) : (
            <div className="space-y-2">
              {warga.map((kk) => (
                <div
                  key={kk.id}
                  className="border rounded-lg overflow-hidden dark:border-white/8"
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
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {expandedKK === kk.id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <div className="text-left font-semibold">{kk.nama_kk}</div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <div className="space-y-4">
                          <div>
                            <h2 className="font-semibold text-lg">
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
                              className="bg-red-600 hover:bg-red-700"
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
                    <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 space-y-3 border-t dark:border-white/8">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">
                          Data Identitas ({kk.identitas?.length || 0})
                        </h4>
                        {kk.identitas && kk.identitas.length > 0 ? (
                          <div className="space-y-2">
                            {kk.identitas.map((identitas) => (
                              <div
                                key={identitas.id}
                                className="bg-white dark:bg-white/5 rounded p-2 text-sm"
                              >
                                <div className="font-medium">
                                  {identitas.tipe_dokumen}
                                </div>
                                {identitas.nomor_dokumen && (
                                  <div className="text-xs text-slate-500">
                                    Nomor: {identitas.nomor_dokumen}
                                  </div>
                                )}
                                {identitas.tanggal_terbit && (
                                  <div className="text-xs text-slate-500">
                                    Terbit: {identitas.tanggal_terbit}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">
                            Belum ada data identitas
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold">
                            Anggota Keluarga (
                            {kk.anggota_keluarga?.length || 0})
                          </h4>
                          {addingAnggotaFor !== kk.id && (
                            <Button
                              size="sm"
                              variant="outline"
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
                              <Plus className="w-3 h-3 mr-1" />
                              Tambah
                            </Button>
                          )}
                        </div>

                        {/* Add Anggota Form */}
                        {addingAnggotaFor === kk.id && (
                          <div className="bg-white dark:bg-white/5 rounded p-3 mb-2 space-y-2">
                            <Input
                              placeholder="Nama Anggota"
                              value={formAnggota.nama}
                              onChange={(e) =>
                                setFormAnggota({
                                  ...formAnggota,
                                  nama: e.target.value,
                                })
                              }
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
                              <SelectTrigger>
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
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={handleAddAnggota}
                                className="flex-1"
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
                                className="flex-1"
                              >
                                Batal
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Anggota List */}
                        {kk.anggota_keluarga &&
                        kk.anggota_keluarga.length > 0 ? (
                          <div className="space-y-2">
                            {kk.anggota_keluarga.map((anggota) => (
                              <div
                                key={anggota.id}
                                className="bg-white dark:bg-white/5 rounded p-2 text-sm"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-medium">
                                    {anggota.nama}
                                  </div>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="ghost">
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <div className="space-y-4">
                                        <div>
                                          <h2 className="font-semibold text-lg">
                                            Hapus Anggota Keluarga?
                                          </h2>
                                          <p className="text-sm text-slate-500 mt-1">
                                            Apakah Anda yakin ingin menghapus "
                                            {anggota.nama}"? Data tidak dapat
                                            dikembalikan.
                                          </p>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <DialogClose asChild>
                                            <Button variant="outline">
                                              Batal
                                            </Button>
                                          </DialogClose>
                                          <Button
                                            className="bg-red-600 hover:bg-red-700"
                                            onClick={() => {
                                              handleDeleteAnggota(
                                                anggota.id,
                                                kk.id
                                              );
                                            }}
                                          >
                                            Hapus
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {anggota.hubungan}
                                </div>
                                {anggota.nik && (
                                  <div className="text-xs text-slate-500">
                                    NIK: {anggota.nik}
                                  </div>
                                )}
                                {anggota.tanggal_lahir && (
                                  <div className="text-xs text-slate-500">
                                    Lahir: {anggota.tanggal_lahir}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">
                            Belum ada anggota keluarga
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
