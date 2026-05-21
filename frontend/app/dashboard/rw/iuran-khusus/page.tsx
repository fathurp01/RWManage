"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Wallet, ArrowLeft, FileText, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api\/?$/, "");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<KasItem[]>([]);
  const [summary, setSummary] = useState({ total_masuk: 0, total_keluar: 0, saldo: 0 });
  const [nominalTotal, setNominalTotal] = useState(0);
  const [createFileName, setCreateFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / pageSize));
  }, [items.length, pageSize]);

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
        payload.append("wilayah_rw_id", wilayahRwId);
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
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setCreateFileName("");
        setShowAddForm(false);
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

  const summaryCards = [
    {
      label: "Total Masuk",
      value: formatRupiah(summary.total_masuk),
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconText: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200/50 dark:border-emerald-800/30",
      valueColor: "text-emerald-700 dark:text-emerald-400",
      icon: TrendingUp,
    },
    {
      label: "Total Tercatat",
      value: formatRupiah(nominalTotal),
      gradient: "from-violet-500 to-purple-600",
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      iconText: "text-violet-600 dark:text-violet-400",
      border: "border-violet-200/50 dark:border-violet-800/30",
      valueColor: "text-violet-700 dark:text-violet-400",
      icon: FileText,
    },
    {
      label: "Saldo RW",
      value: formatRupiah(summary.saldo),
      gradient: "from-indigo-500 to-violet-600",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
      iconText: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-200/50 dark:border-indigo-800/30",
      valueColor: "text-indigo-700 dark:text-indigo-400",
      icon: Wallet,
    },
  ];

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/30">
            <Wallet className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Iuran Khusus RW
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Pemasukan non-RT, masuk 100% ke Kas RW
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className={showAddForm
              ? "gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white border-0 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 rounded-xl h-11 px-5 font-bold"
              : "gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0 shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300 rounded-xl h-11 px-5 font-bold"
            }
            variant="default"
          >
            {showAddForm ? "Tutup Form" : (
              <>
                <Plus className="size-4" />
                Tambah Iuran Khusus
              </>
            )}
          </Button>

          <Link href="/dashboard/rw/kas">
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 rounded-xl h-11 px-5 font-bold">
              <ArrowLeft className="size-4" />
              Buku Kas RW
            </Button>
          </Link>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map(({ label, value, icon: Icon, gradient, iconBg, iconText, border, valueColor }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-3xl border bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${border}`}
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${gradient} rounded-t-3xl`} />
            <div className="p-5 pt-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-muted-foreground mb-1">
                  {label}
                </p>
                <p className={`text-xl font-extrabold tabular-nums truncate ${valueColor}`}>
                  {value}
                </p>
              </div>
              <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-2xl ${iconBg} ${iconText}`}>
                <Icon className="size-5" />
              </span>
            </div>
          </div>
        ))}
      </section>

      {showAddForm && (
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Plus className="size-4.5 text-slate-400" />
              Tambah Iuran Khusus
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Catat pemasukan dari sewa fasum, donatur, atau sumber lain di luar RT.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tanggal" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tanggal</Label>
                <Input id="tanggal" name="tanggal" type="date" disabled={isCreating} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="sumber" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keterangan</Label>
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
                <Label htmlFor="nominal" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nominal (Rp)</Label>
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
                <Label htmlFor="bukti_url" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Link Bukti (opsional)</Label>
                <Input id="bukti_url" name="bukti_url" type="url" placeholder="https://..." disabled={isCreating} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bukti_foto" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Foto Bukti (opsional)</Label>
                <div className="relative flex items-center h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 px-3.5 py-2 text-sm transition-all duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
                  <input
                    id="bukti_foto"
                    name="bukti_foto"
                    type="file"
                    accept="image/*"
                    disabled={isCreating}
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setCreateFileName(file ? file.name : "");
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:pointer-events-none"
                  />
                  <div className="flex items-center gap-2.5 w-full pointer-events-none select-none">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors">
                      Choose File
                    </span>
                    <span className="text-slate-300 dark:text-slate-600 font-light">|</span>
                    <span className="text-slate-400 dark:text-slate-500 truncate flex-1">
                      {createFileName || "No file chosen"}
                    </span>
                  </div>
                </div>
              </div>

              {createState.message ? <p className="sm:col-span-2 text-sm text-destructive">{createState.message}</p> : null}

              <Button type="submit" variant="rw" disabled={isCreating} className="sm:col-span-2 w-full sm:w-auto">
                {isCreating ? "Menyimpan..." : "Simpan Iuran Khusus"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="size-4.5 text-slate-400" />
            Riwayat Iuran Khusus
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Daftar transaksi yang sudah dicatat pada menu ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">Memuat data...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">Belum ada iuran khusus yang tercatat.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 dark:border-white/8 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-white/3">
                      <TableHead className="font-semibold w-[15%]">Tanggal</TableHead>
                      <TableHead className="font-semibold w-[12%]">Jenis</TableHead>
                      <TableHead className="font-semibold w-[38%]">Keterangan</TableHead>
                      <TableHead className="font-semibold w-[15%]">Nominal</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell w-[12%]">Kode Unik</TableHead>
                      <TableHead className="text-right font-semibold w-[8%]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-white/3 transition-colors">
                        <TableCell className="text-sm text-slate-600 dark:text-muted-foreground whitespace-nowrap">
                          {formatDate(item.tanggal)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.jenis_transaksi === "MASUK" ? "success" : "destructive"}>
                            {item.jenis_transaksi}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-sm text-slate-900 dark:text-foreground">{item.keterangan}</p>
                          <div className="mt-1">
                            {item.bukti_foto_url ? (
                              <a
                                href={`${baseUrl}${item.bukti_foto_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline underline-offset-4"
                              >
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Lihat Foto Bukti →
                              </a>
                            ) : item.bukti_url ? (
                              <a
                                href={item.bukti_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline underline-offset-4"
                              >
                                <span className="size-1.5 rounded-full bg-indigo-500" />
                                Lihat Link Bukti →
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-muted-foreground">Tanpa bukti</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold tabular-nums text-slate-900 dark:text-foreground whitespace-nowrap">
                          {formatRupiah(item.nominal)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <code className="text-xs text-slate-500 dark:text-muted-foreground bg-slate-100 dark:bg-white/8 px-2 py-0.5 rounded-md">
                            {item.kode_unik}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            <EditKasDialog item={item} onSaved={loadData} />
                            <DeleteKasDialog itemId={item.id} onDeleted={loadData} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {items.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/8">
                  {/* Info text */}
                  <div className="text-sm text-slate-500 dark:text-muted-foreground select-none">
                    Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(items.length, (currentPage - 1) * pageSize + 1)}</span> - <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(items.length, currentPage * pageSize)}</span> dari <span className="font-semibold text-slate-700 dark:text-slate-200">{items.length}</span> transaksi
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4">
                    {/* Page limit selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-muted-foreground whitespace-nowrap">Baris per halaman:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="h-8 rounded-lg border border-input bg-white dark:bg-input/20 px-2 py-1 text-xs text-foreground outline-none transition-all duration-200 focus-visible:border-ring"
                      >
                        {[10, 20, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Navigation arrows */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || loading}
                      >
                        <ChevronLeft className="size-4" />
                        <span className="sr-only">Halaman Sebelumnya</span>
                      </Button>

                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 select-none min-w-[50px] text-center">
                        {currentPage} / {totalPages}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || loading}
                      >
                        <ChevronRight className="size-4" />
                        <span className="sr-only">Halaman Selanjutnya</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function EditKasDialog({ item, onSaved }: { item: KasItem; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [editFileName, setEditFileName] = useState<string>("");
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setEditFileName("");
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
    }
  }, [open]);

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
            <div className="relative flex items-center h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 px-3.5 py-2 text-sm transition-all duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
              <input
                id={`foto-${item.id}`}
                name="bukti_foto"
                type="file"
                accept="image/*"
                disabled={isEditing}
                ref={editFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setEditFileName(file ? file.name : "");
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:pointer-events-none"
              />
              <div className="flex items-center gap-2.5 w-full pointer-events-none select-none">
                <span className="font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Choose File
                </span>
                <span className="text-slate-300 dark:text-slate-600 font-light">|</span>
                <span className="text-slate-400 dark:text-slate-500 truncate flex-1">
                  {editFileName || "No file chosen"}
                </span>
              </div>
            </div>
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