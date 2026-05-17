"use client";

import { useState, useEffect } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle2, Clock, MapPin, Receipt, ArrowRight } from "lucide-react";

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

  const pendingSetoran = data.filter((s) => s.status === "PENDING");
  const historySetoran = data.filter((s) => s.status === "TERKONFIRMASI");

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/30">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Konfirmasi Setoran RT
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Validasi dan konfirmasi dana iuran yang disetorkan oleh Admin RT ke Kas RW
            </p>
          </div>
        </div>
      </header>

      {/* Pending count info */}
      {!loading && pendingSetoran.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3">
          <Clock className="size-4 text-amber-500 shrink-0" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {pendingSetoran.length} setoran menunggu konfirmasi
          </p>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
            Memuat data setoran...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side: Pending Setoran */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-800 dark:text-foreground">Perlu Konfirmasi</h2>
              <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                {pendingSetoran.length} antrian
              </span>
            </div>

            {pendingSetoran.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <span className="inline-flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="size-7 text-emerald-500" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-700 dark:text-foreground">Semua Beres!</p>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">Tidak ada setoran RT yang menunggu konfirmasi.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingSetoran.map((item) => (
                  <Card key={item.id} className="overflow-hidden border border-slate-200/60 dark:border-white/8">
                    <CardContent className="p-0">
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-1">Dari Unit RT</p>
                            <h3 className="font-bold text-slate-900 dark:text-foreground flex items-center gap-1.5">
                              <MapPin className="size-4 text-violet-500 shrink-0" />
                              {item.blok_wilayah.nama_blok} · RT {item.blok_wilayah.no_rt ?? "-"}
                            </h3>
                          </div>
                          <Badge variant="pending" className="shrink-0">MENUNGGU</Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-slate-50 dark:bg-white/4 border border-slate-100 dark:border-white/6">
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Tanggal Setor</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-foreground">
                              {new Date(item.tanggal_setor).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Nominal Setoran</p>
                            <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-foreground">
                              Rp {Number(item.nominal).toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-800 dark:bg-white/6 px-5 py-3.5 flex items-center justify-between gap-3">
                        <div>
                          {item.bukti_url && (
                            <a
                              href={item.bukti_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                            >
                              <Receipt className="size-3.5" /> Lihat Bukti
                            </a>
                          )}
                        </div>
                        <Button
                          onClick={() => handleApprove(item.id)}
                          disabled={processing === item.id}
                          size="sm"
                          className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                        >
                          {processing === item.id ? (
                            <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              Konfirmasi <ArrowRight className="size-3.5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: History */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-slate-500" />
              <h2 className="text-base font-bold text-slate-800 dark:text-foreground">Riwayat Terkini</h2>
            </div>

            <Card>
              <CardContent className="p-0">
                {historySetoran.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
                    Belum ada riwayat setoran yang dikonfirmasi.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/6">
                    {historySetoran.slice(0, 10).map((item) => (
                      <div key={item.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-white/3 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-4" />
                          </span>
                          <div>
                            <p className="font-semibold text-sm text-slate-900 dark:text-foreground">
                              {item.blok_wilayah.nama_blok}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground">
                              RT {item.blok_wilayah.no_rt ?? "-"} · {new Date(item.tanggal_setor).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold tabular-nums text-sm text-slate-900 dark:text-foreground">
                            Rp {Number(item.nominal).toLocaleString("id-ID")}
                          </p>
                          <p className="text-[10px] font-semibold text-emerald-500 uppercase">Terkonfirmasi</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}
