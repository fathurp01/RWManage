"use client";

import { useState, useEffect } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle2, Clock, MapPin, Receipt, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SetoranItem {
  id: string;
  blok_wilayah_id: string;
  blok_wilayah: {
    nama_blok: string;
    no_rt: string | null;
  };
  nominal: number | string;
  status: "PENDING" | "TERKONFIRMASI";
  tanggal_setor: string;
  bukti_url: string | null;
}

export default function KonfirmasiSetoranPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SetoranItem[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rw/setoran-rt");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessing(id);
      const res = await api.post(`/rw/setoran-rt/${id}/approve`);
      if (res.data.success) {
        toast.success("Setoran berhasil dikonfirmasi!");
        loadData();
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const pendingSetoran = data.filter((s) => s.status === "PENDING");
  const historySetoran = data.filter((s) => s.status === "TERKONFIRMASI");

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/20">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-foreground mt-2">
          Konfirmasi Setoran RT
        </h1>
        <p className="text-lg text-slate-500 dark:text-muted-foreground">
          Validasi dan konfirmasi dana iuran yang disetorkan oleh Admin RT ke Kas RW.
        </p>
      </div>

      <Separator className="opacity-50" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Side: Pending Setoran */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/30">
              <Clock className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200">Perlu Konfirmasi</h2>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-black px-3">
              {pendingSetoran.length} ANTRIAN
            </Badge>
          </div>

          {pendingSetoran.length === 0 ? (
            <Card className="border-4 border-dashed border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/5 rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center p-16 text-center space-y-6">
                <div className="size-20 rounded-full bg-white dark:bg-white/10 shadow-xl flex items-center justify-center">
                  <CheckCircle2 className="size-10 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-black text-slate-700 dark:text-slate-200">Semua Beres!</p>
                  <p className="text-slate-400 font-medium">Tidak ada setoran RT yang menunggu konfirmasi saat ini.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {pendingSetoran.map((item) => (
                <Card key={item.id} className="border-none shadow-2xl shadow-slate-200/60 dark:shadow-none bg-white dark:bg-card/50 overflow-hidden group hover:ring-4 hover:ring-indigo-500/20 transition-all rounded-3xl">
                  <CardContent className="p-0">
                    <div className="flex flex-col">
                      <div className="p-8 space-y-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded inline-block">DARI UNIT RT</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-2">
                              <MapPin className="size-5 text-indigo-500" />
                              {item.blok_wilayah.nama_blok} <span className="text-slate-300 font-normal">|</span> RT {item.blok_wilayah.no_rt ?? "-"}
                            </h3>
                          </div>
                          <Badge className="bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 font-bold">MENUNGGU</Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-10 p-6 rounded-2xl bg-slate-50 dark:bg-white/5">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TANGGAL SETOR</p>
                            <p className="text-lg font-black text-slate-700 dark:text-slate-300">
                              {new Date(item.tanggal_setor).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NOMINAL SETORAN</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-foreground">
                              Rp {Number(item.nominal).toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-900 dark:bg-white/10 p-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {item.bukti_url && (
                            <a 
                              href={item.bukti_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center gap-2 transition-all"
                            >
                              <Receipt className="size-4" /> Lihat Bukti
                            </a>
                          )}
                        </div>
                        <Button 
                          onClick={() => handleApprove(item.id)}
                          disabled={processing === item.id}
                          className="h-12 px-8 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl shadow-xl shadow-indigo-500/20 transition-all transform active:scale-95 flex items-center gap-2"
                        >
                          {processing === item.id ? (
                            <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              Konfirmasi <ArrowRight className="size-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: History */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5">
              <Receipt className="size-5 text-slate-500 dark:text-slate-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200">Riwayat Terkini</h2>
          </div>

          <Card className="border-none shadow-2xl shadow-slate-200/40 dark:shadow-none bg-white/60 dark:bg-card/20 backdrop-blur-xl overflow-hidden rounded-3xl">
            <CardContent className="p-0">
              {historySetoran.length === 0 ? (
                <div className="p-20 text-center text-slate-400 font-medium italic">Belum ada riwayat setoran yang dikonfirmasi.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {historySetoran.slice(0, 10).map((item) => (
                    <div key={item.id} className="p-6 flex items-center justify-between group hover:bg-white/40 dark:hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                          <CheckCircle2 className="size-6" />
                        </div>
                        <div>
                          <p className="font-black text-lg text-slate-800 dark:text-slate-100">
                            {item.blok_wilayah.nama_blok}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] h-4 py-0 font-bold border-emerald-100 text-emerald-600 dark:border-emerald-900/40 dark:text-emerald-400">RT {item.blok_wilayah.no_rt ?? "-"}</Badge>
                            <p className="text-xs text-slate-400 font-bold">
                              {new Date(item.tanggal_setor).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-xl text-slate-900 dark:text-white">
                          Rp {Number(item.nominal).toLocaleString("id-ID")}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-500">TERKONFIRMASI</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
