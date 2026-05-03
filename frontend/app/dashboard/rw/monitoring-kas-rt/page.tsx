"use client";

import { useState, useEffect } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Wallet, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface KasRTSummary {
  blok_wilayah_id: string;
  nama_blok: string;
  no_rt: string | null;
  total_masuk: number;
  total_keluar: number;
  saldo: number;
  persentase_bayar: number;
}

export default function MonitoringKasRTPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KasRTSummary[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rw/kas-rt-summary");
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

  const totalSaldoSemuaRT = data.reduce((acc, curr) => acc + curr.saldo, 0);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20">
          <Building2 className="size-7" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-foreground mt-2">
          Monitoring Kas RT
        </h1>
        <p className="text-lg text-slate-500 dark:text-muted-foreground">
          RW dapat memantau serapan iuran dan penggunaan dana kas di masing-masing RT secara real-time.
        </p>
      </div>

      <Separator className="opacity-50" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl bg-linear-to-br from-indigo-600 to-violet-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="size-24 rotate-12" />
          </div>
          <CardContent className="p-8 space-y-2 relative z-10">
            <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider">Total Dana di Seluruh RT</p>
            <p className="text-4xl font-black">Rp {totalSaldoSemuaRT.toLocaleString("id-ID")}</p>
            <div className="flex items-center gap-2 text-xs text-indigo-200">
              <TrendingUp className="size-4" />
              <span>Gabungan saldo dari {data.length} unit RT</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white/90 dark:bg-card/50 backdrop-blur-xl overflow-hidden rounded-3xl">
        <CardHeader className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 p-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Daftar Saldo Kas RT</CardTitle>
              <CardDescription>Berdasarkan data transaksi yang tercatat di sistem</CardDescription>
            </div>
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-black px-4 py-1 rounded-full text-xs">
              {data.length} RT TERDATA
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-white/5 border-none">
                  <TableHead className="font-black py-6 pl-8 text-slate-500 uppercase text-xs tracking-widest">Unit RT / Blok</TableHead>
                  <TableHead className="font-black text-center text-slate-500 uppercase text-xs tracking-widest">Kepatuhan Bayar</TableHead>
                  <TableHead className="font-black text-right text-slate-500 uppercase text-xs tracking-widest">Total Masuk</TableHead>
                  <TableHead className="font-black text-right text-slate-500 uppercase text-xs tracking-widest">Total Keluar</TableHead>
                  <TableHead className="font-black text-right pr-8 text-slate-500 uppercase text-xs tracking-widest">Saldo Akhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400 font-medium italic">
                      Belum ada data kas RT yang tercatat di wilayah Anda.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.blok_wilayah_id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all border-b border-slate-50 dark:border-white/5">
                      <TableCell className="py-6 pl-8">
                        <p className="font-black text-lg text-slate-800 dark:text-slate-200">{item.nama_blok}</p>
                        <p className="text-xs text-slate-400 font-bold">Unit RT {item.no_rt ?? "-"}</p>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="inline-flex flex-col items-center">
                            <p className={`text-xl font-black ${item.persentase_bayar > 80 ? 'text-emerald-500' : item.persentase_bayar > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {item.persentase_bayar.toFixed(1)}%
                            </p>
                            <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                               <div 
                                 className={`h-full ${item.persentase_bayar > 80 ? 'bg-emerald-500' : item.persentase_bayar > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                 style={{ width: `${item.persentase_bayar}%` }} 
                               />
                            </div>
                         </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          + Rp {item.total_masuk.toLocaleString("id-ID")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          - Rp {item.total_keluar.toLocaleString("id-ID")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="inline-flex flex-col items-end">
                          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                            Rp {item.saldo.toLocaleString("id-ID")}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 h-4 border-indigo-100 text-indigo-400 dark:border-indigo-900/40">
                            READY
                          </Badge>
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
    </div>
  );
}
