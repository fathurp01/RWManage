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
import { FileText, MapPin, Phone, User, Calendar, FileDown, Eye, CheckCircle2 } from "lucide-react";

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
    
    // We will export them one by one or create a single PDF if backend supports it.
    // The backend `exportLaporanPdf` takes a specific `laporan_id` so we trigger multiple downloads or alert user.
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

  const statusColors = {
    LAPORAN: "bg-rose-100 text-rose-700",
    PROSES: "bg-amber-100 text-amber-700",
    SELESAI: "bg-emerald-100 text-emerald-700",
    DITUTUP: "bg-slate-100 text-slate-700"
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
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">RW</Badge>
              <span className="text-sm text-slate-500 dark:text-muted-foreground">Validator Keamanan</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground mt-2">Monitoring Laporan Kejadian</h1>
            <p className="text-base text-slate-500 dark:text-muted-foreground">Pantau dan validasi laporan insiden dari seluruh RT. Pilih laporan untuk diekspor ke format PDF.</p>
          </div>
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-sm font-medium text-slate-600">{selectedIds.size} terpilih</span>
            <div className="w-px h-6 bg-slate-200"></div>
            <Button onClick={handleExportSelective} disabled={selectedIds.size === 0} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <FileDown className="size-4" /> Export PDF Terpilih
            </Button>
          </div>
        </div>
      </header>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">Memuat laporan insiden...</CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
            <CheckCircle2 className="size-12 text-emerald-400 mb-3 opacity-50" />
            <p className="text-lg font-medium text-slate-700">Wilayah Aman</p>
            <p>Belum ada laporan kejadian tercatat.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-lg">Daftar Laporan (Berdasarkan Status)</CardTitle>
              <CardDescription>Pilih laporan yang ingin Anda teruskan ke pihak eksternal</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="selectAll" checked={selectedIds.size === reports.length && reports.length > 0} onCheckedChange={selectAll} />
              <label htmlFor="selectAll" className="text-sm font-medium leading-none cursor-pointer">Pilih Semua</label>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="multiple" defaultValue={statusOrder} className="w-full">
              {statusOrder.map((status) => {
                const statusReports = groupedReports[status];
                if (!statusReports || statusReports.length === 0) return null;
                
                return (
                  <AccordionItem value={status} key={status} className="border-b-0">
                    <AccordionTrigger className={`px-6 py-4 hover:no-underline bg-slate-50/50 dark:bg-slate-900/20 ${statusColors[status].replace('text-', 'border-l-4 border-l-')}`}>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className={statusColors[status]}>{status === "PROSES" ? "DITANGANI" : status}</Badge>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{statusReports.length} Laporan</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0 pt-0">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {statusReports.map(report => (
                          <div key={report.id} className={`flex items-center gap-4 p-4 pl-8 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedIds.has(report.id) ? 'bg-indigo-50/30' : ''}`}>
                            <Checkbox 
                              checked={selectedIds.has(report.id)} 
                              onCheckedChange={() => toggleSelect(report.id)} 
                            />
                            
                            <div className="flex-1 min-w-0 grid sm:grid-cols-12 gap-4 items-center cursor-pointer" onClick={() => handleOpenDetail(report)}>
                              <div className="sm:col-span-5">
                                <h4 className="font-semibold text-sm truncate">
                                  {report.tipe_insiden} 
                                  {report.blok_wilayah && <span className="ml-2 font-normal text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">RT {report.blok_wilayah.nama_blok}</span>}
                                </h4>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                  <MapPin className="size-3" /> <span className="truncate">{report.lokasi}</span>
                                </div>
                              </div>
                              
                              <div className="sm:col-span-3">
                                <span className="block text-xs text-slate-500">Tanggal Kejadian</span>
                                <span className="text-sm">{new Date(report.tanggal_insiden).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                              
                              <div className="sm:col-span-3">
                                <span className="block text-xs text-slate-500">Pelapor</span>
                                <span className="text-sm truncate">{report.pelapor_nama}</span>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">Detail Laporan</Badge>
              {selectedReport && <Badge variant="secondary" className={statusColors[selectedReport.status]}>{selectedReport.status}</Badge>}
            </div>
            <DialogTitle className="text-2xl flex items-center gap-3">
              {selectedReport?.tipe_insiden}
              {selectedReport?.blok_wilayah && (
                <Badge variant="outline" className="text-sm font-medium border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300">
                  RT {selectedReport.blok_wilayah.nama_blok}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>ID: {selectedReport?.id}</DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="grid md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <FileText className="size-4" /> Deskripsi
                  </h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                    {selectedReport.deskripsi}
                  </div>
                </div>

                {selectedReport.tindakan_diambil && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400">
                      <CheckCircle2 className="size-4" /> Tindakan Penyelesaian
                    </h4>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 rounded-lg text-sm text-indigo-900 dark:text-indigo-200">
                      {selectedReport.tindakan_diambil}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-950 border rounded-xl p-4">
                  <h4 className="text-sm font-semibold mb-3 border-b pb-2">Informasi Rinci</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <Calendar className="size-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="block text-xs text-slate-500">Tanggal & Waktu Laporan</span>
                        <span>{new Date(selectedReport.created_at).toLocaleString("id-ID")}</span>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <MapPin className="size-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="block text-xs text-slate-500">Lokasi</span>
                        <span>{selectedReport.lokasi}</span>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <User className="size-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="block text-xs text-slate-500">Pelapor</span>
                        <span>{selectedReport.pelapor_nama}</span>
                      </div>
                    </li>
                    {selectedReport.pelapor_no_hp && (
                      <li className="flex gap-3">
                        <Phone className="size-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="block text-xs text-slate-500">Kontak Pelapor</span>
                          <span>{selectedReport.pelapor_no_hp}</span>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Tutup</Button>
            <Button 
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
