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

  const getHadirColor = (count: number) => {
    if (count > 0) return "text-emerald-600 dark:text-emerald-400 font-bold";
    return "text-slate-500";
  };

  const getAlfaColor = (count: number) => {
    if (count > 0) return "text-rose-600 dark:text-rose-400 font-bold";
    return "text-slate-500";
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RW</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Monitoring Operasional</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground mt-2">Monitoring Ronda</h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">Pantau keaktifan dan jadwal kegiatan ronda dari seluruh RT di wilayah Anda (View-only).</p>
      </header>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Calendar className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Jadwal Aktif</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{data?.summary.total_jadwal || 0}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Kehadiran</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{data?.summary.presensi.HADIR || 0}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl">
                <Clock className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Izin / Sakit</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{data?.summary.presensi.IZIN || 0}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl">
                <ShieldAlert className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Tidak Hadir (Alfa)</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{data?.summary.presensi.ALFA || 0}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jadwal Ronda Seluruh RT</CardTitle>
          <CardDescription>Lihat jadwal ronda lengkap dari setiap RT beserta petugas yang berjaga</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Memuat jadwal ronda...</div>
          ) : !data || data.blok_data.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Belum ada RT yang membuat jadwal ronda.</div>
          ) : (
            <Accordion type="multiple" defaultValue={data.blok_data.map(b => b.blok_id)} className="w-full">
              {data.blok_data.map((blok) => {
                const totalJadwal = blok.jadwal.length;
                const aktif = totalJadwal > 0;

                return (
                  <AccordionItem value={blok.blok_id} key={blok.blok_id} className="border-b-0 border-t">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline bg-slate-50/50 dark:bg-slate-900/20">
                      <div className="flex items-center gap-4 w-full justify-between pr-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
                            RT
                          </div>
                          <div className="text-left">
                            <span className="block font-bold text-slate-900 dark:text-slate-50">RT {blok.no_rt.toString().padStart(3, '0')} - {blok.nama_blok}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {totalJadwal} Jadwal terdaftar
                            </span>
                          </div>
                        </div>
                        <Badge variant={aktif ? "success" : "secondary"}>
                          {aktif ? "Ronda Aktif" : "Jadwal Kosong"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 pt-4 px-6 bg-white dark:bg-slate-950">
                      {aktif ? (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {hariList.map(hari => {
                            const jadwalHariIni = blok.jadwal.filter(j => j.hari_minggu === hari);
                            if (jadwalHariIni.length === 0) return null;

                            return (
                              <div key={hari} className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900/30">
                                <h4 className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-3">
                                  <Calendar className="size-4" /> {hari}
                                </h4>
                                <div className="space-y-3">
                                  {jadwalHariIni.map(jadwal => (
                                    <div key={jadwal.id} className="bg-white dark:bg-slate-900 border shadow-sm rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Clock className="size-3 text-slate-400" />
                                        <span className="text-xs font-medium">{jadwal.jam_mulai} - {jadwal.jam_selesai}</span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <Users className="size-3 text-slate-400 mt-0.5" />
                                        <div className="flex-1">
                                          {jadwal.petugas && jadwal.petugas.length > 0 ? (
                                            <ul className="text-sm space-y-1">
                                              {jadwal.petugas.map((p: any) => (
                                                <li key={p.id} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                                                  <span>{p.nama_petugas}</span>
                                                  {p.no_hp && <span className="text-xs text-slate-400">{p.no_hp}</span>}
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
                        <div className="text-center py-6 text-slate-500 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed">
                          <ShieldAlert className="size-8 mx-auto mb-2 text-slate-400 opacity-50" />
                          <p>RT ini belum menetapkan jadwal ronda apapun.</p>
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
