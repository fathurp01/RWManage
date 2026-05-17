"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { laporanInsidenClient, type LaporanInsidenRecord, type StatusInsiden } from "@/lib/api/laporanInsiden";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, MapPin, Phone, User, Calendar, FileDown, Eye, CheckCircle2, ShieldAlert } from "lucide-react";

export default function RwMonitoringLaporanPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<LaporanInsidenRecord[]>([]);
  
  // Selection for Export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<LaporanInsidenRecord | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await laporanInsidenClient.list();
      setReports(data);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map(r => r.id)));
    }
  };

  const handleExportSelective = async () => {
    if (selectedIds.size === 0) {
      toast.error("Pilih minimal satu laporan untuk diekspor");
      return;
    }
    
    toast.info(`Mengekspor ${selectedIds.size} laporan secara terpisah...`);
    
    try {
      for (const id of Array.from(selectedIds)) {
        const blob = await laporanInsidenClient.exportPdf(id);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Laporan_Insiden_${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        // Small delay to prevent browser blocking multiple popups
        await new Promise(res => setTimeout(res, 500));
      }
      toast.success("Ekspor berhasil diselesaikan");
      setSelectedIds(new Set()); // Clear selection
    } catch (error) {
      toast.error("Gagal mengekspor laporan: " + getApiError(error).message);
    }
  };

  const handleOpenDetail = (report: LaporanInsidenRecord) => {
    setSelectedReport(report);
    setDetailOpen(true);
  };

  const statusColors: Record<string, string> = {
    LAPORAN: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    PROSES: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    SELESAI: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    DITUTUP: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400",
  };

  // Group by Status for Accordion View
  const groupedReports = reports.reduce((acc, report) => {
    acc[report.status] = acc[report.status] || [];
    acc[report.status].push(report);
    return acc;
  }, {} as Record<StatusInsiden, LaporanInsidenRecord[]>);

  const statusOrder: StatusInsiden[] = ["LAPORAN", "PROSES", "SELESAI", "DITUTUP"];

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/30">
            <ShieldAlert className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Monitoring Laporan Kejadian
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Pantau dan validasi laporan insiden dari seluruh RT
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-slate-600 dark:text-muted-foreground">{selectedIds.size} terpilih</span>
          <Button onClick={handleExportSelective} disabled={selectedIds.size === 0} variant="rw" className="gap-2">
            <FileDown className="size-4" /> Export PDF
          </Button>
        </div>
      </header>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">Memuat laporan insiden...</CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center flex flex-col items-center gap-3">
            <CheckCircle2 className="size-10 text-emerald-400 opacity-50" />
            <p className="font-semibold text-slate-700 dark:text-foreground">Wilayah Aman</p>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">Belum ada laporan kejadian tercatat.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daftar Laporan (Berdasarkan Status)</CardTitle>
                <CardDescription>Pilih laporan yang ingin Anda teruskan ke pihak eksternal</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="selectAll" checked={selectedIds.size === reports.length && reports.length > 0} onCheckedChange={selectAll} />
                <label htmlFor="selectAll" className="text-xs font-semibold text-slate-600 dark:text-muted-foreground cursor-pointer">Pilih Semua</label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="multiple" defaultValue={statusOrder} className="w-full">
              {statusOrder.map((status) => {
                const statusReports = groupedReports[status];
                if (!statusReports || statusReports.length === 0) return null;
                
                return (
                  <AccordionItem value={status} key={status} className="border-b-0 border-t border-slate-100 dark:border-white/8">
                    <AccordionTrigger className="px-5 py-3.5 hover:no-underline hover:bg-slate-50/60 dark:hover:bg-white/3 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[status]}`}>
                          {status === "PROSES" ? "DITANGANI" : status}
                        </span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-foreground">{statusReports.length} Laporan</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0 pt-0">
                      <div className="divide-y divide-slate-100 dark:divide-white/6">
                        {statusReports.map(report => (
                          <div key={report.id} className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/60 dark:hover:bg-white/3 ${selectedIds.has(report.id) ? "bg-violet-50/50 dark:bg-violet-950/20" : ""}`}>
                            <Checkbox 
                              checked={selectedIds.has(report.id)} 
                              onCheckedChange={() => toggleSelect(report.id)} 
                            />
                            
                            <div className="flex-1 min-w-0 grid sm:grid-cols-12 gap-4 items-center cursor-pointer" onClick={() => handleOpenDetail(report)}>
                              <div className="sm:col-span-5">
                                <h4 className="font-semibold text-sm text-slate-900 dark:text-foreground truncate">
                                  {report.tipe_insiden} 
                                  {report.blok_wilayah && <span className="ml-2 font-normal text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">RT {report.blok_wilayah.nama_blok}</span>}
                                </h4>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                                  <MapPin className="size-3" /> <span className="truncate">{report.lokasi}</span>
                                </div>
                              </div>
                              
                              <div className="sm:col-span-3">
                                <span className="block text-[11px] text-slate-400 uppercase tracking-wide">Tanggal</span>
                                <span className="text-sm text-slate-700 dark:text-foreground">{new Date(report.tanggal_insiden).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                              </div>
                              
                              <div className="sm:col-span-3">
                                <span className="block text-[11px] text-slate-400 uppercase tracking-wide">Pelapor</span>
                                <span className="text-sm text-slate-700 dark:text-foreground truncate">{report.pelapor_nama}</span>
                              </div>
                            </div>
                            
                            <Button size="icon" variant="ghost" onClick={() => handleOpenDetail(report)}>
                              <Eye className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Modal Detail */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">Detail Laporan</Badge>
              {selectedReport && <Badge variant="secondary" className={statusColors[selectedReport.status]}>{selectedReport.status}</Badge>}
            </div>
            <DialogTitle className="text-xl flex items-center gap-3 flex-wrap">
              {selectedReport?.tipe_insiden}
              {selectedReport?.blok_wilayah && (
                <Badge variant="outline" className="text-sm font-medium border-violet-200 text-violet-700 bg-violet-50 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-300">
                  RT {selectedReport.blok_wilayah.nama_blok}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">ID: {selectedReport?.id}</DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="grid md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-slate-700 dark:text-foreground">
                    <FileText className="size-4" /> Deskripsi
                  </h4>
                  <div className="p-3 bg-slate-50 dark:bg-white/4 rounded-xl border border-slate-100 dark:border-white/6 text-sm text-slate-700 dark:text-slate-300">
                    {selectedReport.deskripsi}
                  </div>
                </div>

                {selectedReport.tindakan_diambil && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-violet-700 dark:text-violet-400">
                      <CheckCircle2 className="size-4" /> Tindakan Penyelesaian
                    </h4>
                    <div className="p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/30 rounded-xl text-sm text-violet-900 dark:text-violet-200">
                      {selectedReport.tindakan_diambil}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-white/4 border border-slate-100 dark:border-white/6 rounded-2xl p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 border-b border-slate-100 dark:border-white/8 pb-2">Informasi Rinci</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <Calendar className="size-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-xs text-slate-400">Tanggal & Waktu Laporan</span>
                        <span className="font-medium text-slate-700 dark:text-foreground">{new Date(selectedReport.created_at).toLocaleString("id-ID")}</span>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <MapPin className="size-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-xs text-slate-400">Lokasi</span>
                        <span className="font-medium text-slate-700 dark:text-foreground">{selectedReport.lokasi}</span>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <User className="size-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-xs text-slate-400">Pelapor</span>
                        <span className="font-medium text-slate-700 dark:text-foreground">{selectedReport.pelapor_nama}</span>
                      </div>
                    </li>
                    {selectedReport.pelapor_no_hp && (
                      <li className="flex gap-3">
                        <Phone className="size-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs text-slate-400">Kontak Pelapor</span>
                          <span className="font-medium text-slate-700 dark:text-foreground">{selectedReport.pelapor_no_hp}</span>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t border-slate-100 dark:border-white/8 pt-4 gap-2">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Tutup</Button>
            <Button 
              variant="rw"
              className="gap-2" 
              onClick={() => {
                if(selectedReport) {
                  const s = new Set(selectedIds);
                  s.add(selectedReport.id);
                  setSelectedIds(s);
                  handleExportSelective();
                  setDetailOpen(false);
                }
              }}
            >
              <FileDown className="size-4" /> Export Laporan Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
