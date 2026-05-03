"use client";

import { useState, useEffect } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { HandCoins, CheckCircle2, Clock, AlertCircle, Receipt, ImageIcon, X, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Image from "next/image";

interface SetoranRTItem {
  id: string;
  nominal: number | string;
  status: "PENDING" | "TERKONFIRMASI";
  tanggal_setor: string;
  tanggal_konfirmasi: string | null;
  bukti_url: string | null;
}

export default function SetoranKeRWPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SetoranRTItem[]>([]);
  const [titipanNominal, setTitipanNominal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rt/setoran");
      if (res.data.success) {
        setData(res.data.data.history || []);
        setTitipanNominal(Number(res.data.data.titipan_belum_setor || 0));
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
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

  const handleSubmitSetoran = async () => {
    if (titipanNominal <= 0) {
      toast.error("Tidak ada dana titipan untuk disetorkan.");
      return;
    }

    try {
      setSubmitting(true);
      
      const formData = new FormData();
      if (file) {
        formData.append("bukti_foto", file);
      }

      const res = await api.post("/rt/setoran/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        toast.success("Setoran berhasil diajukan! Menunggu konfirmasi RW.");
        setOpen(false);
        setFile(null);
        setPreviewUrl(null);
        loadData();
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-slate-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RT</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Setoran ke RW</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Setoran Iuran ke RW</h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">Titipan porsi RW dari pembayaran warga.</p>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Titipan Saat Ini</CardTitle>
          <CardDescription>Dana ini wajib disetor ke RW.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <div>
              <p className="text-sm text-slate-500">Nominal Titipan</p>
              <p className="text-2xl font-bold">Rp {(titipanNominal || 0).toLocaleString("id-ID")}</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={titipanNominal <= 0}>Ajukan Setoran</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Konfirmasi Setoran</DialogTitle>
                  <DialogDescription>
                    Ajukan setoran dana titipan ke RW.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="rounded-lg border p-3 text-sm text-slate-600">
                    Nominal yang akan diajukan: <span className="font-semibold">Rp {titipanNominal.toLocaleString("id-ID")}</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Bukti Transfer / Penyerahan (opsional)</Label>
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

                  <div className="rounded-lg border p-3 text-sm text-slate-600 inline-flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    Pastikan nominal dan bukti sesuai sebelum dikirim.
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                  <Button onClick={handleSubmitSetoran} disabled={submitting}>
                    {submitting ? "Memproses..." : "Kirim Setoran"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {titipanNominal > 0 ? (
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
              <AlertCircle className="size-4" />
              Ada titipan yang belum disetor.
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" />
              Tidak ada titipan yang menunggu setoran.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Riwayat Setoran</CardTitle>
          <CardDescription>Status pengajuan setoran Anda ke RW.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {data.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada riwayat setoran.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Tanggal</th>
                    <th className="py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Nominal</th>
                    <th className="py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Bukti</th>
                    <th className="py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 text-right">Konfirmasi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-4 text-sm text-slate-600 inline-flex items-center gap-2">
                        <Clock className="size-4" />
                        {new Date(item.tanggal_setor).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-4 font-semibold">Rp {Number(item.nominal).toLocaleString("id-ID")}</td>
                      <td className="py-4">
                        <Badge variant={item.status === "TERKONFIRMASI" ? "success" : "pending"}>{item.status}</Badge>
                      </td>
                      <td className="py-4">
                        {item.bukti_url ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}${item.bukti_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:underline"
                          >
                            <ExternalLink className="size-4" />
                            Lihat
                          </a>
                        ) : (
                          <span className="text-sm text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-4 text-right text-sm text-slate-600">
                        {item.status === "TERKONFIRMASI" && item.tanggal_konfirmasi
                          ? new Date(item.tanggal_konfirmasi).toLocaleDateString("id-ID")
                          : "Menunggu RW"}
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
