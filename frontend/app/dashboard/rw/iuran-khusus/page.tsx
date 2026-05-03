"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Wallet, ArrowLeft, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface KasItem {
  id: string;
  wilayah_rw_id: string;
  jenis_transaksi: "MASUK" | "KELUAR";
  tanggal: string;
  keterangan: string;
  nominal: number | string;
  bukti_url: string | null;
  bukti_foto_url: string | null;
  kode_unik: string;
}

interface KasResponse {
  data: {
    items: KasItem[];
    summary: {
      total_masuk: number;
      total_keluar: number;
      saldo: number;
    };
  };
}

interface ActionState {
  message: string;
  fieldErrors: FieldErrors;
}

const initialState: ActionState = {
  message: "",
  fieldErrors: {},
};

const formatRupiah = (value: number | string): string => {
  const numericValue = Number(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
};

const formatDate = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "-"
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(parsed);
};

export default function IuranKhususRwPage() {
  const { user } = useAuth();
  const wilayahRwId = user?.wilayah_rw_id ?? "";
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<KasItem[]>([]);
  const [summary, setSummary] = useState({ total_masuk: 0, total_keluar: 0, saldo: 0 });
  const [nominalTotal, setNominalTotal] = useState(0);

  const loadData = useCallback(async () => {
    if (!wilayahRwId) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.get<KasResponse>("/rw/kas", {
        params: {
          wilayah_rw_id: wilayahRwId,
          jenis_transaksi: "MASUK",
          search: "Iuran Khusus",
        },
      });

      const rows = response.data.data.items ?? [];
      setItems(rows);
      setSummary(response.data.data.summary ?? { total_masuk: 0, total_keluar: 0, saldo: 0 });
      setNominalTotal(rows.reduce((accumulator, item) => accumulator + Number(item.nominal || 0), 0));
    } catch (error) {
      toast.error(getApiError(error).message);
      setItems([]);
      setSummary({ total_masuk: 0, total_keluar: 0, saldo: 0 });
      setNominalTotal(0);
    } finally {
      setLoading(false);
    }
  }, [wilayahRwId]);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const [createState, createAction, isCreating] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const tanggal = String(formData.get("tanggal") ?? "").trim();
      const sumber = String(formData.get("sumber") ?? "").trim();
      const nominal = String(formData.get("nominal") ?? "").trim();
      const buktiUrl = String(formData.get("bukti_url") ?? "").trim();

      const fieldErrors: FieldErrors = {};
      if (!sumber) fieldErrors.sumber = "Keterangan wajib diisi.";
      if (!nominal || Number(nominal) <= 0) fieldErrors.nominal = "Nominal harus lebih dari 0.";
      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Periksa kembali data iuran khusus.", fieldErrors };
      }

      try {
        const payload = new FormData();
        payload.append("jenis_transaksi", "MASUK");
        if (tanggal) {
          payload.append("tanggal", new Date(`${tanggal}T00:00:00.000Z`).toISOString());
        }
        payload.append("keterangan", `Iuran Khusus - ${sumber}`);
        payload.append("nominal", nominal);
        if (buktiUrl) payload.append("bukti_url", buktiUrl);

        const buktiFoto = formData.get("bukti_foto") as File;
        if (buktiFoto && buktiFoto.size > 0) {
          payload.append("bukti_foto", buktiFoto);
        }

        await api.post("/rw/kas", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Iuran khusus berhasil disimpan.");
        await loadData();
        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  if (!wilayahRwId) {
    return (
      <main className="flex flex-1 flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Iuran Khusus RW</CardTitle>
            <CardDescription>Login sebagai RW untuk mengelola iuran khusus.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="rw">RW</Badge>
            <span className="text-sm text-slate-500 dark:text-muted-foreground">Pemasukan non-RT, masuk 100% ke Kas RW</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Input Iuran Khusus</h1>
          <p className="text-base text-slate-500 dark:text-muted-foreground">
            Catat pemasukan dari sewa fasum, donatur, atau sumber lain di luar RT.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/rw/kas">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="size-4" />
              Buku Kas RW
            </Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-slate-500" />
            Ringkasan Iuran Khusus
          </CardTitle>
          <CardDescription>Semua pemasukan di halaman ini otomatis dicatat sebagai MASUK untuk Kas RW.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/70 dark:border-white/8 bg-white dark:bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total Masuk</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-foreground">{formatRupiah(summary.total_masuk)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 dark:border-white/8 bg-white dark:bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total Tercatat</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-foreground">{formatRupiah(nominalTotal)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 dark:border-white/8 bg-white dark:bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Saldo RW</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-foreground">{formatRupiah(summary.saldo)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Tambah Iuran Khusus</CardTitle>
          <CardDescription>Isi sumber dana, nominal, dan bukti bila ada.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form action={createAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tanggal">Tanggal</Label>
              <Input id="tanggal" name="tanggal" type="date" disabled={isCreating} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sumber">Keterangan</Label>
              <Input
                id="sumber"
                name="sumber"
                placeholder="Contoh: Sewa lahan fasum"
                aria-invalid={Boolean(createState.fieldErrors.sumber)}
                disabled={isCreating}
              />
              {createState.fieldErrors.sumber ? <p className="text-xs text-destructive">{createState.fieldErrors.sumber}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nominal">Nominal (Rp)</Label>
              <Input
                id="nominal"
                name="nominal"
                type="number"
                min={0}
                step={1000}
                aria-invalid={Boolean(createState.fieldErrors.nominal)}
                disabled={isCreating}
              />
              {createState.fieldErrors.nominal ? <p className="text-xs text-destructive">{createState.fieldErrors.nominal}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bukti_url">Link Bukti (opsional)</Label>
              <Input id="bukti_url" name="bukti_url" type="url" placeholder="https://..." disabled={isCreating} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bukti_foto">Foto Bukti (opsional)</Label>
              <Input id="bukti_foto" name="bukti_foto" type="file" accept="image/*" disabled={isCreating} className="cursor-pointer file:cursor-pointer" />
            </div>

            {createState.message ? <p className="sm:col-span-2 text-sm text-destructive">{createState.message}</p> : null}

            <Button type="submit" variant="rw" disabled={isCreating} className="sm:col-span-2 w-full sm:w-auto">
              {isCreating ? "Menyimpan..." : "Simpan Iuran Khusus"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4 text-slate-500" />
            Riwayat Iuran Khusus
          </CardTitle>
          <CardDescription>Daftar transaksi yang sudah dicatat pada menu ini.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <p className="text-sm text-slate-500">Memuat data...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada iuran khusus yang tercatat.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-white/8">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 dark:bg-white/3">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Tanggal</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Keterangan</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 text-right">Nominal</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 dark:border-white/8">
                      <td className="px-4 py-4 text-sm text-slate-500">{formatDate(item.tanggal)}</td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900 dark:text-foreground">{item.keterangan}</p>
                        <p className="text-xs text-slate-400">{item.kode_unik}</p>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-900 dark:text-foreground">{formatRupiah(item.nominal)}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <EditKasDialog item={item} onSaved={loadData} />
                          <DeleteKasDialog itemId={item.id} onDeleted={loadData} />
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
    </main>
  );
}

function EditKasDialog({ item, onSaved }: { item: KasItem; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);

  const [editState, editAction, isEditing] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const itemId = String(formData.get("id") ?? "").trim();
      const sumber = String(formData.get("sumber") ?? "").trim();
      const nominal = String(formData.get("nominal") ?? "").trim();
      const buktiUrl = String(formData.get("bukti_url") ?? "").trim();

      const fieldErrors: FieldErrors = {};
      if (!itemId) fieldErrors.id = "id transaksi tidak valid.";
      if (!sumber) fieldErrors.sumber = "Keterangan wajib diisi.";
      if (!nominal || Number(nominal) <= 0) fieldErrors.nominal = "Nominal harus lebih dari 0.";

      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Periksa kembali data iuran khusus.", fieldErrors };
      }

      try {
        const payload = new FormData();
        payload.append("jenis_transaksi", "MASUK");
        payload.append("keterangan", `Iuran Khusus - ${sumber}`);
        payload.append("nominal", nominal);
        if (buktiUrl) payload.append("bukti_url", buktiUrl);

        const buktiFoto = formData.get("bukti_foto") as File;
        if (buktiFoto && buktiFoto.size > 0) {
          payload.append("bukti_foto", buktiFoto);
        }

        await api.patch(`/rw/kas/${itemId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Iuran khusus berhasil diperbarui.");
        await onSaved();
        setOpen(false);
        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon-sm" variant="outline">
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit transaksi</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle>Edit Iuran Khusus</DialogTitle>
          <DialogDescription>Perbarui data tanpa mengubah jenis transaksi.</DialogDescription>
        </DialogHeader>

        <form action={editAction} className="space-y-4 mt-2">
          <input type="hidden" name="id" value={item.id} />

          <div className="space-y-1.5">
            <Label htmlFor={`sumber-${item.id}`}>Keterangan</Label>
            <Input
              id={`sumber-${item.id}`}
              name="sumber"
              defaultValue={item.keterangan.replace(/^Iuran Khusus -\s*/i, "")}
              disabled={isEditing}
            />
            {editState.fieldErrors.sumber ? <p className="text-xs text-destructive">{editState.fieldErrors.sumber}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`nominal-${item.id}`}>Nominal (Rp)</Label>
            <Input id={`nominal-${item.id}`} name="nominal" type="number" min={0} step={1000} defaultValue={String(Number(item.nominal))} disabled={isEditing} />
            {editState.fieldErrors.nominal ? <p className="text-xs text-destructive">{editState.fieldErrors.nominal}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`bukti-${item.id}`}>Link Bukti</Label>
            <Input id={`bukti-${item.id}`} name="bukti_url" type="url" defaultValue={item.bukti_url ?? ""} placeholder="https://..." disabled={isEditing} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`foto-${item.id}`}>Ganti Foto Bukti (opsional)</Label>
            <Input id={`foto-${item.id}`} name="bukti_foto" type="file" accept="image/*" disabled={isEditing} className="cursor-pointer file:cursor-pointer" />
          </div>

          {editState.message ? <p className="text-sm text-destructive">{editState.message}</p> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={isEditing} onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" variant="rw" disabled={isEditing}>{isEditing ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteKasDialog({ itemId, onDeleted }: { itemId: string; onDeleted: () => Promise<void> }) {
  const [open, setOpen] = useState(false);

  const [deleteState, deleteAction, isDeleting] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const id = String(formData.get("id") ?? "").trim();

      if (!id) {
        return { message: "id transaksi tidak valid.", fieldErrors: { id: "id transaksi tidak valid." } };
      }

      try {
        await api.delete(`/rw/kas/${id}`);
        toast.success("Iuran khusus berhasil dihapus.");
        await onDeleted();
        setOpen(false);
        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon-sm" variant="destructive">
          <Trash2 className="size-3.5" />
          <span className="sr-only">Hapus transaksi</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle>Hapus Iuran Khusus</DialogTitle>
          <DialogDescription>Aksi ini tidak dapat dibatalkan.</DialogDescription>
        </DialogHeader>

        <form action={deleteAction} className="space-y-4">
          <input type="hidden" name="id" value={itemId} />
          {deleteState.message ? <p className="text-sm text-destructive">{deleteState.message}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" variant="destructive" disabled={isDeleting}>{isDeleting ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}