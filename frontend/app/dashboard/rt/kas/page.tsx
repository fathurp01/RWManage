"use client";

import { useState, useEffect } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpenText, Plus, Wallet, Pencil, Trash2, ImageIcon, X, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Image from "next/image";

interface KasRTItem {
  id: string;
  jenis_transaksi: "MASUK" | "KELUAR";
  tanggal: string;
  keterangan: string;
  nominal: number | string;
  kode_unik: string;
  bukti_url: string | null;
}

export default function BukuKasRTPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KasRTItem[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<KasRTItem | null>(null);

  // Form states
  const [jenis, setJenis] = useState<"MASUK" | "KELUAR">("KELUAR");
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rt/kas");
      if (res.data.success) {
        setData(res.data.data.transaksi || []);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingItem(null);
      setJenis("KELUAR");
      setNominal("");
      setKeterangan("");
      setFile(null);
      setPreviewUrl(null);
    }
  };

  const handleEdit = (item: KasRTItem) => {
    setEditingItem(item);
    setJenis(item.jenis_transaksi);
    setNominal(String(item.nominal));
    setKeterangan(item.keterangan);
    setPreviewUrl(item.bukti_url ? `${process.env.NEXT_PUBLIC_API_URL}${item.bukti_url}` : null);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan kas ini?")) return;
    
    try {
      const res = await api.delete(`/rt/kas/${id}`);
      if (res.data.success) {
        toast.success("Catatan kas berhasil dihapus.");
        loadData();
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append("jenis_transaksi", jenis);
      formData.append("nominal", nominal);
      formData.append("keterangan", keterangan);
      formData.append("tanggal", editingItem ? editingItem.tanggal : new Date().toISOString());
      if (file) {
        formData.append("bukti_foto", file);
      }

      const config = {
        headers: { "Content-Type": "multipart/form-data" }
      };

      let res;
      if (editingItem) {
        res = await api.put(`/rt/kas/${editingItem.id}`, formData, config);
      } else {
        res = await api.post("/rt/kas", formData, config);
      }

      if (res.data.success) {
        toast.success(editingItem ? "Data kas berhasil diperbarui." : "Transaksi berhasil dicatat.");
        handleOpenChange(false);
        loadData();
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalMasuk = data.filter(i => i.jenis_transaksi === "MASUK").reduce((acc, curr) => acc + Number(curr.nominal), 0);
  const totalKeluar = data.filter(i => i.jenis_transaksi === "KELUAR").reduce((acc, curr) => acc + Number(curr.nominal), 0);
  const saldo = totalMasuk - totalKeluar;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-slate-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">RT</Badge>
            <span className="text-sm text-slate-500 dark:text-muted-foreground">Buku kas operasional RT</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Buku Kas RT</h1>
          <p className="text-base text-slate-500 dark:text-muted-foreground">Catat pemasukan dan pengeluaran secara ringkas.</p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Catat Transaksi
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Transaksi" : "Tambah Transaksi"}</DialogTitle>
              <DialogDescription>Jenis transaksi, nominal, keterangan, dan bukti.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Jenis Transaksi</Label>
                <select
                  value={jenis}
                  onChange={(event) => setJenis(event.target.value as "MASUK" | "KELUAR")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="MASUK">MASUK</option>
                  <option value="KELUAR">KELUAR</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Nominal (Rp)</Label>
                <Input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Keterangan</Label>
                <Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Bukti (opsional)</Label>
                {previewUrl ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-slate-50">
                    <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 size-8 rounded-full bg-white border flex items-center justify-center"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 cursor-pointer">
                    <ImageIcon className="size-5 text-slate-500" />
                    <span className="text-sm text-slate-500">Pilih file bukti</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Batal</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Total Masuk</p>
            <p className="text-2xl font-bold">Rp {totalMasuk.toLocaleString("id-ID")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Total Keluar</p>
            <p className="text-2xl font-bold">Rp {totalKeluar.toLocaleString("id-ID")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-slate-500" />
              <div>
                <p className="text-xs text-slate-500">Saldo</p>
                <p className="text-2xl font-bold">Rp {saldo.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Riwayat Transaksi</CardTitle>
          <CardDescription>{data.length} transaksi tercatat</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-sm text-slate-500">Belum ada transaksi.</TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                          {item.bukti_url && (
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL}${item.bukti_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:underline"
                            >
                              <ExternalLink className="size-3" />
                              Lihat bukti
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.keterangan}</p>
                        <Badge variant={item.jenis_transaksi === "MASUK" ? "success" : "destructive"} className="mt-1">
                          {item.jenis_transaksi}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{item.kode_unik}</code>
                      </TableCell>
                      <TableCell className="font-semibold">{item.jenis_transaksi === "MASUK" ? "+" : "-"} Rp {Number(item.nominal).toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="icon-sm" onClick={() => handleEdit(item)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="destructive" size="icon-sm" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
