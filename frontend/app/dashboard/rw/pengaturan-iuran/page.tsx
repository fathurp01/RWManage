"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Settings, Save, AlertCircle, Calculator } from "lucide-react";
import { api, getApiError } from "@/lib/axios";

export default function PengaturanIuranPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nominal, setNominal] = useState("");
  const [persenRT, setPersenRT] = useState(70);
  const [persenRW, setPersenRW] = useState(30);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rw/pengaturan-iuran");
      if (res.data.success && res.data.data) {
        setNominal(res.data.data.nominal_iuran.toString());
        setPersenRT(res.data.data.persen_rt);
        setPersenRW(res.data.data.persen_rw);
      }
    } catch (error) {
      const apiError = getApiError(error);
      if (apiError.status !== 404) {
        toast.error("Gagal mengambil data pengaturan.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (persenRT + persenRW !== 100) {
      toast.error("Total persentase harus 100%");
      return;
    }

    try {
      setSaving(true);
      const res = await api.post("/rw/pengaturan-iuran", {
        nominal_iuran: Number(nominal),
        persen_rt: Number(persenRT),
        persen_rw: Number(persenRW),
      });

      if (res.data.success) {
        toast.success("Pengaturan berhasil disimpan.");
      } else {
        toast.error(res.data.message || "Gagal menyimpan pengaturan.");
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-lg font-medium text-slate-500">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/20">
          <Settings className="size-7" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-foreground mt-2">
          Pengaturan Iuran
        </h1>
        <p className="text-lg text-slate-500 dark:text-muted-foreground max-w-2xl">
          Tentukan nominal iuran standar bulanan dan bagaimana dana tersebut dibagi antara Kas RT dan Kas RW secara otomatis.
        </p>
      </div>

      <Card className="border-none shadow-lg shadow-slate-200/40 dark:shadow-none bg-white/90 dark:bg-card/50 backdrop-blur-xl">
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Pengaturan Per Warga</CardTitle>
          <CardDescription>
            Kalau nanti Anda ingin menyesuaikan data per warga, tempatnya ada di menu Iuran Warga RW. Menu itu dipakai untuk kontrol per warga, bukan RT.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            Saat ini halaman ini fokus ke kebijakan global: nominal iuran dan pembagian RT/RW.
          </p>
          <Link href="/dashboard/rw/warga">
            <Button variant="outline" className="gap-2">
              Buka Iuran Warga
            </Button>
          </Link>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="max-w-3xl">
        <div className="grid gap-8 md:grid-cols-1">
          <Card className="overflow-hidden border-none shadow-2xl shadow-slate-200/60 dark:shadow-none bg-white/90 dark:bg-card/50 backdrop-blur-xl">
            <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white dark:bg-white/10 shadow-sm">
                  <Calculator className="size-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Kebijakan Iuran Wilayah</CardTitle>
                  <CardDescription>Standarisasi iuran untuk seluruh warga</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <Label htmlFor="nominal" className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  Nominal Iuran Bulanan
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">Rp</span>
                  <Input
                    id="nominal"
                    type="number"
                    placeholder="Contoh: 100000"
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                    required
                    className="pl-16 text-3xl font-black h-20 bg-slate-50/50 border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-2xl"
                  />
                </div>
                <p className="text-sm text-slate-400 font-medium italic">
                  * RT akan menggunakan nominal ini sebagai standar penagihan kepada warga.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <Label htmlFor="persenRT" className="text-base font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    Porsi Kas RT
                  </Label>
                  <div className="relative">
                    <Input
                      id="persenRT"
                      type="number"
                      max="100"
                      value={persenRT}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                        setPersenRT(val);
                        setPersenRW(100 - val);
                      }}
                      required
                      className="text-4xl font-black h-16 bg-white dark:bg-card border-none text-center rounded-xl"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-400">%</span>
                  </div>
                </div>

                <div className="space-y-3 p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                  <Label htmlFor="persenRW" className="text-base font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-2">
                    <div className="size-2 rounded-full bg-indigo-500" />
                    Porsi Kas RW
                  </Label>
                  <div className="relative">
                    <Input
                      id="persenRW"
                      type="number"
                      max="100"
                      value={persenRW}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                        setPersenRW(val);
                        setPersenRT(100 - val);
                      }}
                      required
                      className="text-4xl font-black h-16 bg-white dark:bg-card border-none text-center rounded-xl"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-indigo-400">%</span>
                  </div>
                </div>
              </div>

              {(persenRT + persenRW !== 100) && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 animate-pulse">
                  <AlertCircle className="size-6" />
                  <span className="font-bold">Total persentase harus 100%! Saat ini: {persenRT + persenRW}%</span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="bg-slate-900 dark:bg-white/5 rounded-3xl p-8 text-white space-y-6 shadow-2xl shadow-slate-900/20">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Simulasi Pembagian Per Warga:</p>
                  <div className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold">AUTOMATIC SPLIT</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400">RT akan menerima:</p>
                    <p className="text-4xl font-black text-emerald-400">
                      Rp {((Number(nominal) * persenRT) / 100).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400">RW akan menerima:</p>
                    <p className="text-4xl font-black text-indigo-400">
                      Rp {((Number(nominal) * persenRW) / 100).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={saving || (persenRT + persenRW !== 100)}
                className="w-full h-20 bg-linear-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white text-xl font-black rounded-2xl shadow-xl shadow-indigo-500/40 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving ? (
                  <span className="flex items-center gap-3">
                    <div className="size-6 animate-spin rounded-full border-4 border-white border-t-transparent" />
                    Menyimpan...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <Save className="size-6" />
                    Simpan & Terapkan Kebijakan
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
