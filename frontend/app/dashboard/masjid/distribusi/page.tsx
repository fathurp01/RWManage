"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Gift, Plus, Edit2, Pencil, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PengaturanZis {
  id: string;
  masjid_id: string;
  persen_fakir: number;
  persen_amil: number;
  persen_fisabilillah: number;
  persen_lainnya: number;
  harga_beras_per_kg: number | string;
}

interface DashboardZisPayload {
  masjid_id: string;
  pengaturan_zis: PengaturanZis;
  total_beras: number;
  total_uang_zakat: number;
  total_infaq: number;
  total_kk: number;
  total_jiwa: number;
  total_dana_distribusi: number;
  distribusi_uang_zakat: {
    nominal: { fakir: number; amil: number; fisabilillah: number; lainnya: number };
  };
  distribusi_beras_kg: {
    nominal_kg: { fakir: number; amil: number; fisabilillah: number; lainnya: number };
  };
}

interface DistribusiRecord {
  id: string;
  kategori: "FAKIR" | "AMIL" | "FISABILILLAH" | "LAINNYA";
  jenis: "UANG" | "BERAS";
  nominal: number;
  deskripsi?: string;
  tanggal: string;
  dicatat_oleh?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const kategoriBajax = {
  FAKIR: { label: "Fakir Miskin", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  AMIL: { label: "Amil", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  FISABILILLAH: { label: "Fisabilillah", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  LAINNYA: { label: "Lainnya", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300" },
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatTanggal = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

// ─── Distribution Card Component ──────────────────────────────────────────────

function DistribusiCard({
  kategori,
  persen,
  nominalUang,
  nominalBeras,
}: {
  kategori: string;
  persen: number;
  nominalUang: number;
  nominalBeras: number;
}) {
  const config =
    kategoriBajax[kategori as keyof typeof kategoriBajax] || {
      label: kategori,
      color: "bg-gray-100 text-gray-700",
    };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-foreground">{config.label}</h3>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${config.color}`}>{persen}%</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-muted-foreground">Uang:</span>
          <span className="font-medium text-slate-900 dark:text-foreground">{formatRupiah(nominalUang)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-muted-foreground">Beras:</span>
          <span className="font-medium text-slate-900 dark:text-foreground">{nominalBeras.toFixed(2)} kg</span>
        </div>
      </div>
      <div className="pt-2 border-t border-slate-100 dark:border-white/8">
        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2">
          <div className={`h-2 rounded-full ${config.color.split(" ")[0]}`} style={{ width: `${persen}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DistribusiPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardZisPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false);
  const [distribusiRecords, setDistribusiRecords] = useState<DistribusiRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DistribusiRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<DistribusiRecord | null>(null);

  // Edit state
  const [editPersentase, setEditPersentase] = useState({
    persen_fakir: 62.5,
    persen_amil: 8,
    persen_fisabilillah: 11,
    persen_lainnya: 18.5,
  });

  // Add record state
  const [newRecord, setNewRecord] = useState({
    kategori: "FAKIR" as "FAKIR" | "AMIL" | "FISABILILLAH" | "LAINNYA",
    jenis: "UANG" as "UANG" | "BERAS",
    nominal: "",
    deskripsi: "",
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/zis/dashboard");
      const payload = response.data.data as DashboardZisPayload;
      setData(payload);
      setEditPersentase({
        persen_fakir: payload.pengaturan_zis.persen_fakir,
        persen_amil: payload.pengaturan_zis.persen_amil,
        persen_fisabilillah: payload.pengaturan_zis.persen_fisabilillah,
        persen_lainnya: payload.pengaturan_zis.persen_lainnya,
      });
      // Fetch real distribution records
      const recordsRes = await api.get(`/zis/distribusi?masjid_id=${payload.masjid_id}`);
      if (recordsRes.data.success) {
        setDistribusiRecords(recordsRes.data.data);
      }
    } catch (err) {
      toast.error(getApiError(err).message || "Gagal memuat data distribusi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePersentase = async () => {
    try {
      // Validasi total persentase = 100
      const total =
        editPersentase.persen_fakir +
        editPersentase.persen_amil +
        editPersentase.persen_fisabilillah +
        editPersentase.persen_lainnya;

      if (Math.abs(total - 100) > 0.01) {
        toast.error(`Total persentase harus 100%. Saat ini: ${total}%`);
        return;
      }

      setIsSaving(true);
      await api.patch(`/pengaturan-zis/${data?.pengaturan_zis.id}`, editPersentase);
      toast.success("Persentase distribusi berhasil diperbarui");
      setIsEditDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(getApiError(err).message || "Gagal menyimpan persentase");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRecord = async () => {
    try {
      if (!newRecord.nominal || isNaN(parseFloat(newRecord.nominal))) {
        toast.error("Nominal harus berupa angka valid");
        return;
      }

      setIsSaving(true);
      const response = await api.post("/zis/distribusi", {
        masjid_id: data?.masjid_id,
        kategori: newRecord.kategori,
        jenis: newRecord.jenis,
        nominal: parseFloat(newRecord.nominal),
        deskripsi: newRecord.deskripsi,
      });

      setDistribusiRecords((prev) => [response.data.data, ...prev]);
      toast.success("Pencatatan distribusi berhasil ditambahkan");
      fetchData(); // Refresh dashboard stats
      setIsAddRecordDialogOpen(false);
      setNewRecord({
        kategori: "FAKIR",
        jenis: "UANG",
        nominal: "",
        deskripsi: "",
      });
    } catch (err) {
      toast.error(getApiError(err).message || "Gagal menambahkan pencatatan distribusi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRecord = async () => {
    try {
      if (!editingRecord || !editingRecord.nominal || isNaN(parseFloat(editingRecord.nominal.toString()))) {
        toast.error("Nominal harus berupa angka valid");
        return;
      }

      setIsSaving(true);
      const response = await api.patch(`/zis/distribusi/${editingRecord.id}`, {
        kategori: editingRecord.kategori,
        jenis: editingRecord.jenis,
        nominal: parseFloat(editingRecord.nominal.toString()),
        deskripsi: editingRecord.deskripsi,
        tanggal: editingRecord.tanggal,
      });

      setDistribusiRecords((prev) =>
        prev.map((r) => (r.id === editingRecord.id ? response.data.data : r))
      );
      toast.success("Pencatatan distribusi berhasil diperbarui");
      fetchData(); // Refresh dashboard stats
      setEditingRecord(null);
    } catch (err) {
      toast.error(getApiError(err).message || "Gagal memperbarui pencatatan distribusi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    try {
      if (!recordToDelete) return;

      setIsSaving(true);
      await api.delete(`/zis/distribusi/${recordToDelete.id}`);
      setDistribusiRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      toast.success("Pencatatan distribusi berhasil dihapus");
      fetchData(); // Refresh dashboard stats
      setRecordToDelete(null);
    } catch (err) {
      toast.error(getApiError(err).message || "Gagal menghapus pencatatan distribusi");
    } finally {
      setIsSaving(false);
    }
  };

  const totalPersentase = useMemo(() => {
    return (
      editPersentase.persen_fakir +
      editPersentase.persen_amil +
      editPersentase.persen_fisabilillah +
      editPersentase.persen_lainnya
    );
  }, [editPersentase]);

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <div className="h-10 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            Gagal memuat data. Silakan coba lagi.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
            <Gift className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Manajemen Distribusi
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Kelola distribusi zakat kepada penerima manfaat
            </p>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Ringkasan Dana Distribusi</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase">Total Zakat Uang</p>
            <p className="text-lg font-bold text-slate-900 dark:text-foreground">
              {formatRupiah(data.total_uang_zakat)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase">Total Infaq</p>
            <p className="text-lg font-bold text-slate-900 dark:text-foreground">
              {formatRupiah(data.total_infaq)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase">Total Distribusi</p>
            <p className="text-lg font-bold text-slate-900 dark:text-foreground">
              {formatRupiah(data.total_dana_distribusi)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase">Zakat Beras</p>
            <p className="text-lg font-bold text-slate-900 dark:text-foreground">{data.total_beras.toFixed(2)} kg</p>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-foreground">Rincian Distribusi</h2>
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsEditDialogOpen(true)}>
            <Edit2 className="size-3.5" />
            Ubah Persentase
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DistribusiCard
            kategori="FAKIR"
            persen={data.pengaturan_zis.persen_fakir}
            nominalUang={data.distribusi_uang_zakat.nominal.fakir}
            nominalBeras={data.distribusi_beras_kg.nominal_kg.fakir}
          />
          <DistribusiCard
            kategori="AMIL"
            persen={data.pengaturan_zis.persen_amil}
            nominalUang={data.distribusi_uang_zakat.nominal.amil}
            nominalBeras={data.distribusi_beras_kg.nominal_kg.amil}
          />
          <DistribusiCard
            kategori="FISABILILLAH"
            persen={data.pengaturan_zis.persen_fisabilillah}
            nominalUang={data.distribusi_uang_zakat.nominal.fisabilillah}
            nominalBeras={data.distribusi_beras_kg.nominal_kg.fisabilillah}
          />
          <DistribusiCard
            kategori="LAINNYA"
            persen={data.pengaturan_zis.persen_lainnya}
            nominalUang={data.distribusi_uang_zakat.nominal.lainnya}
            nominalBeras={data.distribusi_beras_kg.nominal_kg.lainnya}
          />
        </div>
      </div>

      {/* Pencatatan Distribusi */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Pencatatan Distribusi</CardTitle>
              <CardDescription className="mt-0.5">
                Catat setiap distribusi yang dilakukan kepada penerima
              </CardDescription>
            </div>
            <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsAddRecordDialogOpen(true)}>
              <Plus className="size-3.5" />
              Tambah Pencatatan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {distribusiRecords.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
              Belum ada pencatatan distribusi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/8 bg-slate-50/60 dark:bg-white/3">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                      Jenis
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                      Nominal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                      Deskripsi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                      Tanggal
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/6">
                  {distribusiRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${kategoriBajax[record.kategori].color}`}
                        >
                          {kategoriBajax[record.kategori].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-foreground/80">
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                          {record.jenis === "UANG" ? "Uang" : "Beras"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900 dark:text-foreground whitespace-nowrap">
                        {record.jenis === "UANG"
                          ? formatRupiah(Number(record.nominal))
                          : `${Number(record.nominal).toFixed(2)} kg`}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-foreground/70 text-xs">
                        {record.deskripsi || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                        <div className="text-xs leading-5">
                          {formatTanggal(record.tanggal)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingRecord(record)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors"
                          >
                            <Pencil className="size-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(record)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 transition-colors"
                          >
                            <Trash2 className="size-3" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Persentase Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Persentase Distribusi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="persen_fakir" className="text-sm font-medium">
                Fakir Miskin (%)
              </Label>
              <Input
                id="persen_fakir"
                type="number"
                step="0.1"
                value={editPersentase.persen_fakir}
                onChange={(e) =>
                  setEditPersentase({ ...editPersentase, persen_fakir: parseFloat(e.target.value) || 0 })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="persen_amil" className="text-sm font-medium">
                Amil (%)
              </Label>
              <Input
                id="persen_amil"
                type="number"
                step="0.1"
                value={editPersentase.persen_amil}
                onChange={(e) =>
                  setEditPersentase({ ...editPersentase, persen_amil: parseFloat(e.target.value) || 0 })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="persen_fisabilillah" className="text-sm font-medium">
                Fisabilillah (%)
              </Label>
              <Input
                id="persen_fisabilillah"
                type="number"
                step="0.1"
                value={editPersentase.persen_fisabilillah}
                onChange={(e) =>
                  setEditPersentase({
                    ...editPersentase,
                    persen_fisabilillah: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="persen_lainnya" className="text-sm font-medium">
                Lainnya (%)
              </Label>
              <Input
                id="persen_lainnya"
                type="number"
                step="0.1"
                value={editPersentase.persen_lainnya}
                onChange={(e) =>
                  setEditPersentase({ ...editPersentase, persen_lainnya: parseFloat(e.target.value) || 0 })
                }
                className="mt-1"
              />
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3 text-sm">
              <p className="text-slate-600 dark:text-foreground/70">
                Total: <span className={totalPersentase === 100 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  {totalPersentase.toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSavePersentase} disabled={isSaving || totalPersentase !== 100}>
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Pencatatan Distribusi</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-kategori" className="text-sm font-medium">
                  Kategori
                </Label>
                <select
                  id="edit-kategori"
                  value={editingRecord.kategori}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      kategori: e.target.value as "FAKIR" | "AMIL" | "FISABILILLAH" | "LAINNYA",
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-input bg-white dark:bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="FAKIR">Fakir Miskin</option>
                  <option value="AMIL">Amil</option>
                  <option value="FISABILILLAH">Fisabilillah</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-jenis" className="text-sm font-medium">
                  Jenis
                </Label>
                <select
                  id="edit-jenis"
                  value={editingRecord.jenis}
                  onChange={(e) => setEditingRecord({ ...editingRecord, jenis: e.target.value as "UANG" | "BERAS" })}
                  className="mt-1 w-full rounded-lg border border-input bg-white dark:bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="UANG">Uang</option>
                  <option value="BERAS">Beras</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-nominal" className="text-sm font-medium">
                  Nominal ({editingRecord.jenis === "UANG" ? "Rp" : "kg"})
                </Label>
                <Input
                  id="edit-nominal"
                  type="number"
                  step={editingRecord.jenis === "UANG" ? "1000" : "0.01"}
                  value={editingRecord.nominal}
                  onChange={(e) => setEditingRecord({ ...editingRecord, nominal: e.target.value as any })}
                  className="mt-1"
                  placeholder="Masukkan nominal"
                />
              </div>
              <div>
                <Label htmlFor="edit-deskripsi" className="text-sm font-medium">
                  Deskripsi (Opsional)
                </Label>
                <Input
                  id="edit-deskripsi"
                  value={editingRecord.deskripsi || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, deskripsi: e.target.value })}
                  className="mt-1"
                  placeholder="Catatan distribusi"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)}>
              Batal
            </Button>
            <Button onClick={handleEditRecord} disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Record Dialog */}
      <Dialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Pencatatan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-foreground/80">
              Apakah Anda yakin ingin menghapus pencatatan distribusi ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            {recordToDelete && (
              <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-4 space-y-2 border border-slate-100 dark:border-white/10">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Kategori:</span>
                  <span className="font-medium">{kategoriBajax[recordToDelete.kategori].label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Nominal:</span>
                  <span className="font-medium">
                    {recordToDelete.jenis === "UANG"
                      ? formatRupiah(Number(recordToDelete.nominal))
                      : `${Number(recordToDelete.nominal).toFixed(2)} kg`}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordToDelete(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteRecord} disabled={isSaving}>
              {isSaving ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Record Dialog */}
      <Dialog open={isAddRecordDialogOpen} onOpenChange={setIsAddRecordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pencatatan Distribusi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="kategori" className="text-sm font-medium">
                Kategori
              </Label>
              <select
                id="kategori"
                value={newRecord.kategori}
                onChange={(e) =>
                  setNewRecord({
                    ...newRecord,
                    kategori: e.target.value as "FAKIR" | "AMIL" | "FISABILILLAH" | "LAINNYA",
                  })
                }
                className="mt-1 w-full rounded-lg border border-input bg-white dark:bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="FAKIR">Fakir Miskin</option>
                <option value="AMIL">Amil</option>
                <option value="FISABILILLAH">Fisabilillah</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>
            <div>
              <Label htmlFor="jenis" className="text-sm font-medium">
                Jenis
              </Label>
              <select
                id="jenis"
                value={newRecord.jenis}
                onChange={(e) => setNewRecord({ ...newRecord, jenis: e.target.value as "UANG" | "BERAS" })}
                className="mt-1 w-full rounded-lg border border-input bg-white dark:bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="UANG">Uang</option>
                <option value="BERAS">Beras</option>
              </select>
            </div>
            <div>
              <Label htmlFor="nominal" className="text-sm font-medium">
                Nominal ({newRecord.jenis === "UANG" ? "Rp" : "kg"})
              </Label>
              <Input
                id="nominal"
                type="number"
                step={newRecord.jenis === "UANG" ? "1000" : "0.01"}
                value={newRecord.nominal}
                onChange={(e) => setNewRecord({ ...newRecord, nominal: e.target.value })}
                className="mt-1"
                placeholder="Masukkan nominal"
              />
            </div>
            <div>
              <Label htmlFor="deskripsi" className="text-sm font-medium">
                Deskripsi (Opsional)
              </Label>
              <Input
                id="deskripsi"
                value={newRecord.deskripsi}
                onChange={(e) => setNewRecord({ ...newRecord, deskripsi: e.target.value })}
                className="mt-1"
                placeholder="Catatan distribusi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRecordDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddRecord} disabled={isSaving}>
              {isSaving ? "Menambahkan..." : "Tambahkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
