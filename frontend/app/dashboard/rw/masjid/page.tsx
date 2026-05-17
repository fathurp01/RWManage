"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  MapPin,
  RotateCcw,
  Loader2,
  GitBranch,
} from "lucide-react";

interface BlokWilayah {
  id: string;
  nama_blok: string;
  no_rt: string | null;
}

interface BlokListResponse {
  data: {
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
    blok_list: BlokWilayah[];
  };
}

interface RwMasjidItem {
  id: string;
  nama_masjid: string;
  alamat: string;
  blok_wilayah_id: string;
  blok_wilayah: {
    id: string;
    nama_blok: string;
    no_rt: string | null;
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
  };
  pengurus_masjid?: {
    user: { nama: string };
  }[];
}

interface RwMasjidListResponse {
  data: RwMasjidItem[];
}

interface MasjidFormState {
  blok_wilayah_id: string;
  nama_masjid: string;
  alamat: string;
}

const initialFormState: MasjidFormState = {
  blok_wilayah_id: "",
  nama_masjid: "",
  alamat: "",
};

const formatAreaCode = (value: string | null | undefined): string => {
  if (!value) return "-";
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 99) {
      return String(parsed).padStart(3, "0");
    }
    return String(parsed);
  }
  return normalized;
};

const formatBlokName = (value: string): string => {
  const trimmed = value.trim();
  if (/^blok\s+/i.test(trimmed)) return trimmed;
  return `Blok ${trimmed}`;
};

const formatBlokLabel = (blok: BlokWilayah, rwCode: string) => {
  const rtPart = blok.no_rt ? `RT ${formatAreaCode(blok.no_rt)}` : "Tanpa RT";
  return `${formatBlokName(blok.nama_blok)} — ${rtPart}`;
};

export default function RwMasjidManagementPage() {
  const [blokList, setBlokList] = useState<BlokWilayah[]>([]);
  const [rwCode, setRwCode] = useState("");
  const [masjidList, setMasjidList] = useState<RwMasjidItem[]>([]);
  const [filteredMasjidList, setFilteredMasjidList] = useState<RwMasjidItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBlokId, setFilterBlokId] = useState("ALL");
  const [filterRt, setFilterRt] = useState("ALL");
  const [isLoadingBlok, setIsLoadingBlok] = useState(true);
  const [isLoadingMasjid, setIsLoadingMasjid] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [createForm, setCreateForm] = useState<MasjidFormState>(initialFormState);
  const [editingMasjid, setEditingMasjid] = useState<RwMasjidItem | null>(null);
  const [editForm, setEditForm] = useState<MasjidFormState>(initialFormState);
  const [showAddForm, setShowAddForm] = useState(false);

  const hasBlok = blokList.length > 0;

  const loadBlok = useCallback(async () => {
    setIsLoadingBlok(true);
    try {
      const response = await api.get<BlokListResponse>("/rw/blok-wilayah");
      const list = response.data.data.blok_list ?? [];
      setBlokList(list);
      setRwCode(response.data.data.wilayah_rw.no_rw ?? "");
      if (list.length > 0) {
        setCreateForm((prev) => ({
          ...prev,
          blok_wilayah_id: prev.blok_wilayah_id || list[0].id,
        }));
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setBlokList([]);
    } finally {
      setIsLoadingBlok(false);
    }
  }, []);

  const fetchMasjid = useCallback(async () => {
    setIsLoadingMasjid(true);
    try {
      const response = await api.get<RwMasjidListResponse>("/rw/masjid");
      setMasjidList(response.data.data ?? []);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setMasjidList([]);
    } finally {
      setIsLoadingMasjid(false);
    }
  }, []);

  useEffect(() => { loadBlok(); }, [loadBlok]);

  useEffect(() => {
    fetchMasjid().catch(() => {
      toast.error("Gagal memuat daftar masjid.");
      setMasjidList([]);
      setIsLoadingMasjid(false);
    });
  }, [fetchMasjid]);

  // Frontend filtering
  useEffect(() => {
    let result = masjidList;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.nama_masjid.toLowerCase().includes(q) ||
          m.alamat.toLowerCase().includes(q)
      );
    }

    if (filterBlokId !== "ALL") {
      result = result.filter((m) => m.blok_wilayah_id === filterBlokId);
    }

    if (filterRt !== "ALL") {
      result = result.filter((m) => String(m.blok_wilayah.no_rt) === filterRt);
    }

    setFilteredMasjidList(result);
  }, [searchTerm, filterBlokId, filterRt, masjidList]);

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.blok_wilayah_id || !createForm.nama_masjid.trim() || !createForm.alamat.trim()) {
      toast.error("Semua kolom wajib diisi.");
      return;
    }
    setIsSubmittingCreate(true);
    try {
      await api.post("/rw/masjid", {
        blok_wilayah_id: createForm.blok_wilayah_id,
        nama_masjid: createForm.nama_masjid.trim(),
        alamat: createForm.alamat.trim(),
      });
      toast.success("Masjid berhasil ditambahkan!");
      setCreateForm((prev) => ({ ...prev, nama_masjid: "", alamat: "" }));
      setShowAddForm(false);
      await fetchMasjid();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const openEditDialog = (item: RwMasjidItem) => {
    setEditingMasjid(item);
    setEditForm({ blok_wilayah_id: item.blok_wilayah_id, nama_masjid: item.nama_masjid, alamat: item.alamat });
  };

  const handleUpdateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMasjid) return;
    if (!editForm.blok_wilayah_id || !editForm.nama_masjid.trim() || !editForm.alamat.trim()) {
      toast.error("Semua kolom wajib diisi.");
      return;
    }
    setIsSubmittingUpdate(true);
    try {
      await api.patch(`/rw/masjid/${editingMasjid.id}`, {
        blok_wilayah_id: editForm.blok_wilayah_id,
        nama_masjid: editForm.nama_masjid.trim(),
        alamat: editForm.alamat.trim(),
      });
      toast.success("Data masjid berhasil diperbarui!");
      setEditingMasjid(null);
      await fetchMasjid();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const blokOptions = useMemo(() => blokList.map((blok) => ({
    value: blok.id,
    label: formatBlokLabel(blok, rwCode),
  })), [blokList, rwCode]);

  const rtOptions = useMemo(() => {
    const rts = Array.from(new Set(blokList.map((b) => b.no_rt).filter(Boolean)));
    return rts.sort((a, b) => Number(a) - Number(b));
  }, [blokList]);

  const isFiltering = searchTerm || filterBlokId !== "ALL" || filterRt !== "ALL";

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <Building2 className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Data Masjid
            </h1>
            <p className="text-sm text-slate-500">
              Daftar masjid di seluruh wilayah RW
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm((v) => !v)}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
        >
          <Plus className="size-4 mr-2" />
          Tambah Masjid
        </Button>
      </header>

      {/* ── Form Tambah (collapsible) ── */}
      {showAddForm && (
        <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-6 shadow-sm">
          {/* Form header */}
          <div className="flex items-center gap-2.5 mb-5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-indigo-100">
              <Plus className="size-5 text-indigo-600" />
            </span>
            <h2 className="text-base font-bold text-indigo-800">Tambah Masjid Baru</h2>
          </div>

          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            {/* Blok Wilayah — full width */}
            <div className="space-y-1.5">
              <Label htmlFor="create-blok" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <MapPin className="size-4 text-indigo-500" />
                Blok Wilayah
              </Label>
              <Select
                value={createForm.blok_wilayah_id}
                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, blok_wilayah_id: value }))}
                disabled={isLoadingBlok || !hasBlok || isSubmittingCreate}
              >
                <SelectTrigger id="create-blok" className="!h-11 !rounded-xl w-full text-sm">
                  <SelectValue placeholder="Pilih blok wilayah" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                  {blokOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="!text-sm !py-2 !px-3 !rounded-lg">{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nama Masjid + Alamat — side by side */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-nama" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Building2 className="size-4 text-indigo-500" />
                  Nama Masjid
                </Label>
                <Input
                  id="create-nama"
                  value={createForm.nama_masjid}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, nama_masjid: e.target.value }))}
                  placeholder="Contoh: Masjid Al-Ikhlas"
                  disabled={isSubmittingCreate || !hasBlok}
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-alamat" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <MapPin className="size-4 text-indigo-500" />
                  Alamat
                </Label>
                <Input
                  id="create-alamat"
                  value={createForm.alamat}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, alamat: e.target.value }))}
                  placeholder="Contoh: Jl. Melati Blok B2"
                  disabled={isSubmittingCreate || !hasBlok}
                  className="h-11 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="h-11 px-5 rounded-xl text-sm font-semibold border-slate-200"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCreate || !hasBlok}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-sm text-sm"
              >
                {isSubmittingCreate ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Plus className="size-4 mr-2" /> Simpan Masjid</>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filter & Search ── */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Search className="size-4 text-indigo-500" />
          Cari & Saring Masjid
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama masjid atau alamat..."
              className="pl-10 h-11 rounded-xl text-base w-full"
            />
          </div>
          {/* Filter blok */}
          <Select value={filterBlokId} onValueChange={setFilterBlokId}>
            <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[170px] font-medium transition-all ${
              filterBlokId !== "ALL"
                ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"
            }`}>
              <MapPin className={`size-4 mr-1 shrink-0 ${filterBlokId !== "ALL" ? "text-indigo-500" : "text-slate-400"}`} />
              <SelectValue placeholder="Semua Blok" />
            </SelectTrigger>
            <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
              <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Blok</SelectItem>
              {blokOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="!text-sm !py-2 !px-3 !rounded-lg">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Filter RT */}
          <Select value={filterRt} onValueChange={setFilterRt}>
            <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[140px] font-medium transition-all ${
              filterRt !== "ALL"
                ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"
            }`}>
              <GitBranch className={`size-4 mr-1 shrink-0 ${filterRt !== "ALL" ? "text-indigo-500" : "text-slate-400"}`} />
              <SelectValue placeholder="Semua RT" />
            </SelectTrigger>
            <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
              <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua RT</SelectItem>
              {rtOptions.map((rt) => (
                <SelectItem key={rt!} value={rt!} className="!text-sm !py-2 !px-3 !rounded-lg">
                  RT {rt!.padStart(3, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Reset */}
          {isFiltering && (
            <Button
              variant="outline"
              onClick={() => { setSearchTerm(""); setFilterBlokId("ALL"); setFilterRt("ALL"); }}
              className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-sm transition-all"
            >
              <RotateCcw className="size-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* ── Daftar Masjid ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-800">Daftar Masjid</h2>
          {!isLoadingMasjid && (
            <span className="text-sm text-slate-500 tabular-nums">
              {filteredMasjidList.length} masjid ditemukan
            </span>
          )}
        </div>

        {isLoadingMasjid ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-indigo-200 border-t-indigo-500 mx-auto" />
            <p className="mt-4 text-base font-semibold text-slate-500">Memuat data masjid...</p>
          </div>
        ) : filteredMasjidList.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
              <Building2 className="size-8 text-slate-400" />
            </span>
            <p className="text-lg font-bold text-slate-600">Belum Ada Masjid</p>
            <p className="text-sm text-slate-400 mt-1">
              {isFiltering ? "Tidak ada masjid yang cocok dengan filter Anda." : "Klik tombol \"Tambah Masjid\" untuk mendaftarkan masjid pertama."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">No</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Nama Masjid</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Alamat</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Lokasi</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Pengurus</th>
                  <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMasjidList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                          <Building2 className="size-4 text-indigo-600" />
                        </span>
                        <span className="font-extrabold text-slate-900">{item.nama_masjid}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate" title={item.alamat}>
                      {item.alamat}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-200">
                        <MapPin className="size-3.5 shrink-0 text-slate-400" />
                        {formatBlokName(item.blok_wilayah.nama_blok)}
                        {item.blok_wilayah.no_rt ? ` · RT ${formatAreaCode(item.blok_wilayah.no_rt)}` : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.pengurus_masjid && item.pengurus_masjid.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {item.pengurus_masjid.map((p, i) => (
                            <span key={i} className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                              {p.user.nama}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 italic">Belum ada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Dialog
                        open={editingMasjid?.id === item.id}
                        onOpenChange={(open) => { if (!open) setEditingMasjid(null); }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            onClick={() => openEditDialog(item)}
                            variant="ghost"
                            className="h-9 px-3 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors"
                          >
                            <Pencil className="size-4 mr-1.5" />
                            Ubah
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl">
                          <DialogHeader>
                            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                              <Pencil className="size-5 text-indigo-600" />
                              Ubah Data Masjid
                            </DialogTitle>
                            <DialogDescription>
                              Perbarui informasi masjid sesuai data terbaru.
                            </DialogDescription>
                          </DialogHeader>

                          <form className="space-y-4 mt-2" onSubmit={handleUpdateSubmit}>
                            <div className="space-y-1.5">
                              <Label htmlFor="edit-blok" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                <MapPin className="size-4 text-indigo-500" /> Blok Wilayah
                              </Label>
                              <Select
                                value={editForm.blok_wilayah_id}
                                onValueChange={(value) => setEditForm((prev) => ({ ...prev, blok_wilayah_id: value }))}
                                disabled={isSubmittingUpdate}
                              >
                                <SelectTrigger id="edit-blok" className="!h-11 !rounded-xl w-full text-sm">
                                  <SelectValue placeholder="Pilih blok wilayah" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                                  {blokOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value} className="!text-sm !py-2 !px-3 !rounded-lg">{option.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="edit-nama" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                <Building2 className="size-4 text-indigo-500" /> Nama Masjid
                              </Label>
                              <Input
                                id="edit-nama"
                                value={editForm.nama_masjid}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, nama_masjid: e.target.value }))}
                                disabled={isSubmittingUpdate}
                                className="h-11 rounded-xl text-sm"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="edit-alamat" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                <MapPin className="size-4 text-indigo-500" /> Alamat
                              </Label>
                              <Input
                                id="edit-alamat"
                                value={editForm.alamat}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, alamat: e.target.value }))}
                                disabled={isSubmittingUpdate}
                                className="h-11 rounded-xl text-sm"
                              />
                            </div>

                            <DialogFooter className="pt-2">
                              <Button
                                type="submit"
                                disabled={isSubmittingUpdate}
                                className="h-11 px-6 rounded-xl w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-sm text-sm"
                              >
                                {isSubmittingUpdate ? (
                                  <><Loader2 className="size-4 mr-2 animate-spin" /> Menyimpan...</>
                                ) : (
                                  "Simpan Perubahan"
                                )}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
