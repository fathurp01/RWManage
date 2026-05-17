"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Map,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  RotateCcw,
  GitBranch,
} from "lucide-react";

interface BlokWilayah {
  id: string;
  nama_blok: string;
  no_rt: string | null;
  created_at?: string;
  _count?: {
    rt_users: number;
    pengurus_masjid_users: number;
    users: number;
    warga: number;
    masjid: number;
  };
}

interface BlokResponse {
  success: boolean;
  message: string;
  data: {
    blok_list: BlokWilayah[];
    wilayah_rw: { id: string; no_rw: string; nama_kompleks: string };
  };
}

interface BlokListResponse {
  success: boolean;
  message: string;
  data: BlokWilayah[];
}

export default function BlokWilayahPage() {
  const [blokList, setBlokList] = useState<BlokWilayah[]>([]);
  const [filteredList, setFilteredList] = useState<BlokWilayah[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [wilayahRwId, setWilayahRwId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [form, setForm] = useState({ nama_blok: "", no_rt: "" });
  const [selectedBlok, setSelectedBlok] = useState<BlokWilayah | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // First get the RW context (rw id)
      const rwContextRes = await api.get<BlokResponse>("/rw/blok-wilayah");
      const rwId = rwContextRes.data.data?.wilayah_rw?.id ?? "";
      setWilayahRwId(rwId);

      if (rwId) {
        const res = await api.get<BlokListResponse>(`/rw/blok-wilayah-list?wilayah_rw_id=${rwId}`);
        const list = res.data.data || [];
        setBlokList(list);
        setFilteredList(list);
      }
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Frontend filtering
  useEffect(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      setFilteredList(blokList);
    } else {
      setFilteredList(
        blokList.filter(
          (b) =>
            b.nama_blok.toLowerCase().includes(q) ||
            (b.no_rt ?? "").toLowerCase().includes(q)
        )
      );
    }
  }, [searchTerm, blokList]);

  const isFiltering = searchTerm.trim() !== "";

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_blok.trim() || !form.no_rt.trim()) {
      return toast.error("Nama blok dan nomor RT wajib diisi");
    }
    setIsSubmitting(true);
    try {
      await api.post("/rw/blok-wilayah", {
        wilayah_rw_id: wilayahRwId,
        nama_blok: `Blok ${form.nama_blok.trim()}`,
        no_rt: form.no_rt.trim(),
      });
      toast.success("Blok wilayah berhasil ditambahkan");
      setShowAddForm(false);
      setForm({ nama_blok: "", no_rt: "" });
      loadData();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlok || !form.nama_blok.trim() || !form.no_rt.trim()) {
      return toast.error("Nama blok dan nomor RT wajib diisi");
    }
    setIsSubmitting(true);
    try {
      await api.patch(`/rw/blok-wilayah/${selectedBlok.id}`, {
        nama_blok: `Blok ${form.nama_blok.trim()}`,
        no_rt: form.no_rt.trim(),
      });
      toast.success("Blok wilayah berhasil diperbarui");
      setShowEditModal(false);
      setSelectedBlok(null);
      setForm({ nama_blok: "", no_rt: "" });
      loadData();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedBlok) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/rw/blok-wilayah/${selectedBlok.id}`);
      toast.success("Blok wilayah berhasil dihapus");
      setShowDeleteModal(false);
      setSelectedBlok(null);
      loadData();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (blok: BlokWilayah) => {
    setSelectedBlok(blok);
    setForm({ nama_blok: blok.nama_blok.replace(/^Blok\s+/i, ''), no_rt: blok.no_rt ?? "" });
    setShowEditModal(true);
  };

  const openDeleteModal = (blok: BlokWilayah) => {
    const rtCount = blok._count?.rt_users ?? 0;
    const masjidCount = blok._count?.pengurus_masjid_users ?? 0;
    
    if (rtCount > 0 || masjidCount > 0) {
      toast.error("Masih ada akun terdaftar (RT / Pengurus Masjid). Harap hapus akun terdaftar tersebut terlebih dahulu.");
      return;
    }

    setSelectedBlok(blok);
    setShowDeleteModal(true);
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <Map className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Data Blok Wilayah
            </h1>
            <p className="text-sm text-slate-500">
              Kelola pembagian blok dan RT di wilayah RW
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setForm({ nama_blok: "", no_rt: "" }); setShowAddForm((v) => !v); }}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
        >
          <Plus className="size-4 mr-2" />
          Tambah Blok
        </Button>
      </header>

      {/* ── Form Tambah (collapsible) ── */}
      {showAddForm && (
        <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-indigo-100">
              <Plus className="size-5 text-indigo-600" />
            </span>
            <h2 className="text-base font-bold text-indigo-800">Tambah Blok Wilayah Baru</h2>
          </div>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-blok" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Map className="size-4 text-indigo-500" />
                  Nama Blok
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-500 font-semibold text-sm select-none">Blok</span>
                  <Input
                    id="create-blok"
                    value={form.nama_blok}
                    onChange={(e) => setForm((prev) => ({ ...prev, nama_blok: e.target.value }))}
                    placeholder="Contoh: A, Flamboyan"
                    disabled={isSubmitting}
                    className="h-11 rounded-xl text-sm pl-12"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-rt" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <GitBranch className="size-4 text-indigo-500" />
                  Nomor RT
                </Label>
                <Input
                  id="create-rt"
                  value={form.no_rt}
                  onChange={(e) => setForm((prev) => ({ ...prev, no_rt: e.target.value }))}
                  placeholder="Contoh: 001, 002"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}
                className="h-11 px-5 rounded-xl text-sm font-semibold border-slate-200">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-sm text-sm">
                {isSubmitting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menyimpan...</> : <><Plus className="size-4 mr-2" /> Simpan Blok</>}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filter & Search ── */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Search className="size-4 text-indigo-500" />
          Cari Blok Wilayah
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama blok atau nomor RT..."
              className="pl-10 h-11 rounded-xl text-sm w-full"
            />
          </div>
          {isFiltering && (
            <Button
              variant="outline"
              onClick={() => setSearchTerm("")}
              className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-sm transition-all"
            >
              <RotateCcw className="size-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabel Data ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-800">Daftar Blok Wilayah</h2>
          {!isLoading && (
            <span className="text-sm text-slate-500 tabular-nums">
              {filteredList.length} blok ditemukan
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-indigo-200 border-t-indigo-500 mx-auto" />
            <p className="mt-4 text-base font-semibold text-slate-500">Memuat data blok wilayah...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
              <Map className="size-8 text-slate-400" />
            </span>
            <p className="text-lg font-bold text-slate-600">Belum Ada Blok Wilayah</p>
            <p className="text-sm text-slate-400 mt-1">
              {isFiltering
                ? "Tidak ada blok yang cocok dengan pencarian Anda."
                : "Klik tombol \"Tambah Blok\" untuk membuat blok wilayah pertama."}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-12">No</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Nama Blok</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Nomor RT</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Akun RT</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Akun Masjid</th>
                  <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((blok, idx) => (
                  <tr key={blok.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4 text-slate-400 font-medium tabular-nums">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                          <Map className="size-4 text-indigo-600" />
                        </span>
                        <span className="font-bold text-slate-900">{blok.nama_blok}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-violet-100">
                        <GitBranch className="size-3.5" />
                        RT {(blok.no_rt ?? "—").padStart(3, "0")}
                      </span>
                    </td>
                    {/* Kolom Akun RT */}
                    <td className="px-6 py-4">
                      {(() => {
                        const count = blok._count?.rt_users ?? 0;
                        return count > 0 ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-amber-200">
                            {count === 1 ? "1 Terdaftar" : `${count} Terdaftar`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-400 font-medium text-xs px-3 py-1.5 rounded-lg border border-slate-100">
                            Kosong
                          </span>
                        );
                      })()}
                    </td>
                    {/* Kolom Akun Masjid */}
                    <td className="px-6 py-4">
                      {(() => {
                        const count = blok._count?.pengurus_masjid_users ?? 0;
                        return count > 0 ? (
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-blue-200">
                            {count === 1 ? "1 Terdaftar" : `${count} Terdaftar`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-400 font-medium text-xs px-3 py-1.5 rounded-lg border border-slate-100">
                            Kosong
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(blok)}
                          className="h-9 px-3 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-semibold"
                        >
                          <Pencil className="size-4 mr-1.5" />
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteModal(blok)}
                          className="h-9 px-3 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 font-semibold"
                        >
                          <Trash2 className="size-4 mr-1.5" />
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Edit Modal ── */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md !rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="size-5 text-indigo-600" />
              Ubah Data Blok
            </DialogTitle>
            <DialogDescription>
              Perbarui nama blok atau nomor RT.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit_nama_blok" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Map className="size-4 text-indigo-500" /> Nama Blok
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-500 font-semibold text-sm select-none">Blok</span>
                <Input
                  id="edit_nama_blok"
                  value={form.nama_blok}
                  onChange={(e) => setForm((prev) => ({ ...prev, nama_blok: e.target.value }))}
                  placeholder="Contoh: A, Flamboyan"
                  className="h-11 rounded-xl text-sm pl-12"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_no_rt" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <GitBranch className="size-4 text-indigo-500" /> Nomor RT
              </Label>
              <Input
                id="edit_no_rt"
                value={form.no_rt}
                onChange={(e) => setForm((prev) => ({ ...prev, no_rt: e.target.value }))}
                className="h-11 rounded-xl text-sm"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}
                className="rounded-xl h-11 px-5 font-semibold">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}
                className="rounded-xl h-11 px-6 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-sm">
                {isSubmitting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ── */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md !rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="size-5" />
              Hapus Blok Wilayah
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  Anda akan menghapus blok{" "}
                  <strong className="text-slate-900">{selectedBlok?.nama_blok} (RT {selectedBlok?.no_rt})</strong>.
                  Tindakan ini <strong className="text-red-600">tidak dapat dibatalkan</strong>.
                </p>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-xs font-medium flex gap-2">
                  <span className="shrink-0 text-lg leading-none">⚠️</span>
                  <span>
                    Pastikan semua <strong>akun RT, data warga, dan data masjid</strong> yang
                    terdaftar di blok ini sudah dihapus atau dipindahkan terlebih dahulu.
                    Menghapus blok yang masih memiliki data terkait akan gagal.
                  </span>
                </div>
                <p>Ketik <strong className="text-slate-900">HAPUS</strong> untuk konfirmasi:</p>
                <input
                  type="text"
                  id="delete-confirm-input"
                  placeholder="Ketik HAPUS di sini"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                  onChange={(e) => {
                    const btn = document.getElementById("delete-confirm-btn") as HTMLButtonElement | null;
                    if (btn) btn.disabled = e.target.value !== "HAPUS";
                  }}
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => {
              setShowDeleteModal(false);
              // reset confirm input
              const inp = document.getElementById("delete-confirm-input") as HTMLInputElement | null;
              if (inp) inp.value = "";
            }}
              className="rounded-xl h-11 px-5 font-semibold">
              Batal
            </Button>
            <Button id="delete-confirm-btn" onClick={handleDeleteSubmit} disabled={true}
              className="rounded-xl h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-40">
              {isSubmitting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menghapus...</> : "Ya, Hapus Blok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
