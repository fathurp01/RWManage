"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { performaRondaClient, type RwMonitoringRondaData } from "@/lib/api/performaRonda";
import { Calendar, ShieldCheck, Clock, Users, ShieldAlert } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function RwMonitoringRondaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RwMonitoringRondaData | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await performaRondaClient.getMonitoringRw();
      setData(res);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hariList = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];

  const summaryCards = [
    {
      label: "Total Jadwal Aktif",
      value: data?.summary.total_jadwal || 0,
      icon: Calendar,
      gradient: "from-violet-500 to-purple-600",
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      iconText: "text-violet-600 dark:text-violet-400",
      border: "border-violet-200/50 dark:border-violet-800/30",
      valueColor: "text-violet-700 dark:text-violet-400",
    },
    {
      label: "Total Kehadiran",
      value: data?.summary.presensi.HADIR || 0,
      icon: ShieldCheck,
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconText: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200/50 dark:border-emerald-800/30",
      valueColor: "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Izin / Sakit",
      value: data?.summary.presensi.IZIN || 0,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      iconText: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200/50 dark:border-amber-800/30",
      valueColor: "text-amber-700 dark:text-amber-400",
    },
    {
      label: "Tidak Hadir (Alfa)",
      value: data?.summary.presensi.ALFA || 0,
      icon: ShieldAlert,
      gradient: "from-rose-500 to-red-600",
      iconBg: "bg-rose-50 dark:bg-rose-950/40",
      iconText: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200/50 dark:border-rose-800/30",
      valueColor: "text-rose-700 dark:text-rose-400",
    },
  ];

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
              Monitoring Ronda
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Pantau keaktifan dan jadwal kegiatan ronda dari seluruh RT
            </p>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                <p className={`text-2xl font-extrabold tabular-nums truncate ${valueColor}`}>
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

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Jadwal Ronda Seluruh RT</CardTitle>
          <CardDescription>Lihat jadwal ronda lengkap dari setiap RT beserta petugas yang berjaga</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-muted-foreground">Memuat jadwal ronda...</div>
          ) : !data || data.blok_data.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-muted-foreground">Belum ada RT yang membuat jadwal ronda.</div>
          ) : (
            <Accordion type="multiple" defaultValue={data.blok_data.map(b => b.blok_id)} className="w-full">
              {data.blok_data.map((blok) => {
                const totalJadwal = blok.jadwal.length;
                const aktif = totalJadwal > 0;

                return (
                  <AccordionItem value={blok.blok_id} key={blok.blok_id} className="border-b-0 border-t border-slate-100 dark:border-white/8">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50/60 dark:hover:bg-white/3 transition-colors">
                      <div className="flex items-center gap-4 w-full justify-between pr-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-700 dark:text-violet-400 font-bold text-xs border border-violet-200 dark:border-violet-800/40">
                            RT
                          </div>
                          <div className="text-left">
                            <span className="block font-bold text-sm text-slate-900 dark:text-foreground">RT {blok.no_rt.toString().padStart(3, '0')} - {blok.nama_blok}</span>
                            <span className="block text-xs text-slate-500 dark:text-muted-foreground">
                              {totalJadwal} Jadwal terdaftar
                            </span>
                          </div>
                        </div>
                        <Badge variant={aktif ? "success" : "secondary"}>
                          {aktif ? "Ronda Aktif" : "Jadwal Kosong"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 pt-4 px-6 bg-slate-50/40 dark:bg-white/2">
                      {aktif ? (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {hariList.map(hari => {
                            const jadwalHariIni = blok.jadwal.filter(j => j.hari_minggu === hari);
                            if (jadwalHariIni.length === 0) return null;

                            return (
                              <div key={hari} className="rounded-2xl border border-slate-100 dark:border-white/8 p-4 bg-white dark:bg-card">
                                <h4 className="font-bold text-xs uppercase tracking-wide text-violet-700 dark:text-violet-400 flex items-center gap-2 mb-3">
                                  <Calendar className="size-3.5" /> {hari}
                                </h4>
                                <div className="space-y-3">
                                  {jadwalHariIni.map(jadwal => (
                                    <div key={jadwal.id} className="bg-slate-50/80 dark:bg-white/4 rounded-xl border border-slate-100 dark:border-white/6 p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Clock className="size-3 text-slate-400" />
                                        <span className="text-xs font-medium text-slate-700 dark:text-foreground">{jadwal.jam_mulai} - {jadwal.jam_selesai}</span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <Users className="size-3 text-slate-400 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          {jadwal.petugas && jadwal.petugas.length > 0 ? (
                                            <ul className="text-xs space-y-1">
                                              {jadwal.petugas.map((p: any) => (
                                                <li key={p.id} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                                                  <span>{p.nama_petugas}</span>
                                                  {p.no_hp && <span className="text-slate-400">{p.no_hp}</span>}
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <span className="text-xs text-rose-500 italic">Belum ada petugas di-assign</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-500 dark:text-muted-foreground bg-slate-50/60 dark:bg-white/3 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                          <ShieldAlert className="size-8 mx-auto mb-2 text-slate-400 opacity-50" />
                          <p className="text-sm">RT ini belum menetapkan jadwal ronda apapun.</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
