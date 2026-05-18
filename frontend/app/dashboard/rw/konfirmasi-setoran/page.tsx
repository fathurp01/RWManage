"use client";

import { useState, useEffect } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, Clock, MapPin, Receipt, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const itemsPerPage = 3;
  const historyItemsPerPage = 8;

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

  // Pagination Logic for Pending items (Left Side)
  const totalPages = Math.ceil(pendingSetoran.length / itemsPerPage);
  const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
  
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = pendingSetoran.slice(indexOfFirstItem, indexOfLastItem);

  // Pagination Logic for History items (Right Side)
  const totalHistoryPages = Math.ceil(historySetoran.length / historyItemsPerPage);
  const activeHistoryPage = historyPage > totalHistoryPages ? Math.max(1, totalHistoryPages) : historyPage;

  const indexOfLastHistoryItem = activeHistoryPage * historyItemsPerPage;
  const indexOfFirstHistoryItem = indexOfLastHistoryItem - historyItemsPerPage;
  const currentHistoryItems = historySetoran.slice(indexOfFirstHistoryItem, indexOfLastHistoryItem);

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Page Header ── */}
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

      {/* ── Alert Info Antrean ── */}
      {!loading && pendingSetoran.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 shadow-xs">
          <Clock className="size-4 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            Ada {pendingSetoran.length} setoran RT yang membutuhkan validasi Anda selaku Ketua RW.
          </p>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="inline-flex size-12 animate-spin items-center justify-center rounded-full border-4 border-violet-200 border-t-violet-500 mx-auto" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Memuat data setoran RT...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ── KIRI: Perlu Konfirmasi ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between min-h-8">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Clock className="size-3.5" />
                </span>
                <h2 className="text-base font-extrabold text-slate-900">Perlu Konfirmasi</h2>
                {pendingSetoran.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                    {pendingSetoran.length} antrean
                  </span>
                )}
              </div>

              {/* Pagination in Header */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 shadow-3xs backdrop-blur-xs shrink-0">
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={activePage === 1}
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-md bg-white border-slate-200/80 shadow-2xs hover:bg-amber-50 hover:text-amber-650 hover:border-amber-200 text-slate-700 disabled:opacity-40 transition-all duration-200"
                  >
                    <ChevronLeft className="size-4 shrink-0" />
                  </Button>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1.5 select-none min-w-[2.2rem] text-center">
                    {activePage} <span className="text-slate-400 font-normal">/</span> {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={activePage === totalPages}
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-md bg-white border-slate-200/80 shadow-2xs hover:bg-amber-50 hover:text-amber-650 hover:border-amber-200 text-slate-700 disabled:opacity-40 transition-all duration-200"
                  >
                    <ChevronRight className="size-4 shrink-0" />
                  </Button>
                </div>
              )}
            </div>

            {pendingSetoran.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center gap-4">
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                  <CheckCircle2 className="size-7" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Semua Beres!</h3>
                  <p className="text-sm text-slate-500 mt-1">Tidak ada setoran RT yang menunggu konfirmasi.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {currentItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="p-4.5 space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-0.5">Dari Unit RT</p>
                          <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-[15px]">
                            <MapPin className="size-4 text-indigo-500 shrink-0" />
                            {item.blok_wilayah.nama_blok} · RT {item.blok_wilayah.no_rt ?? "-"}
                          </h3>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-100">
                          Menunggu
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tanggal Setor</p>
                          <p className="text-sm font-bold text-slate-700">
                            {new Date(item.tanggal_setor).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Nominal Setoran</p>
                          <p className="text-base font-extrabold tabular-nums text-slate-900">
                            Rp {Number(item.nominal).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border-t border-slate-100 px-4.5 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        {item.bukti_url && (
                          <a
                            href={item.bukti_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-700 hover:text-slate-900 transition-colors bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
                          >
                            <Receipt className="size-3.5 text-slate-500" /> Lihat Bukti
                          </a>
                        )}
                      </div>
                      <Button
                        onClick={() => handleApprove(item.id)}
                        disabled={processing === item.id}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 shadow-xs hover:shadow-md hover:shadow-blue-500/20 text-white rounded-lg transition-all h-8.5 px-3.5 gap-1 font-bold text-[13px]"
                      >
                        {processing === item.id ? (
                          <div className="size-3 animate-spin rounded-full border border-white border-t-transparent" />
                        ) : (
                          <>
                            Konfirmasi <ArrowRight className="size-3" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}


              </div>
            )}
          </div>

          {/* ── KANAN: Riwayat Setoran Terkini (Limit 8) ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between min-h-8">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Receipt className="size-3.5" />
                </span>
                <h2 className="text-base font-extrabold text-slate-900">Riwayat Terkini</h2>
              </div>

              {/* Pagination in Header */}
              {totalHistoryPages > 1 && (
                <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 shadow-3xs backdrop-blur-xs shrink-0">
                  <Button
                    onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
                    disabled={activeHistoryPage === 1}
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-md bg-white border-slate-200/80 shadow-2xs hover:bg-slate-150 hover:text-slate-700 hover:border-slate-300 text-slate-700 disabled:opacity-40 transition-all duration-200"
                  >
                    <ChevronLeft className="size-4 shrink-0" />
                  </Button>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1.5 select-none min-w-[2.2rem] text-center">
                    {activeHistoryPage} <span className="text-slate-400 font-normal">/</span> {totalHistoryPages}
                  </span>
                  <Button
                    onClick={() => setHistoryPage((prev) => Math.min(prev + 1, totalHistoryPages))}
                    disabled={activeHistoryPage === totalHistoryPages}
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-md bg-white border-slate-200/80 shadow-2xs hover:bg-slate-150 hover:text-slate-700 hover:border-slate-300 text-slate-700 disabled:opacity-40 transition-all duration-200"
                  >
                    <ChevronRight className="size-4 shrink-0" />
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between min-h-[400px]">
              <div>
                <div className="flex items-center justify-between gap-4 px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Histori Setoran RT</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {historySetoran.length} Diterima
                  </span>
                </div>

                <div>
                  {historySetoran.length === 0 ? (
                    <div className="py-12 text-center text-sm font-semibold text-slate-400 italic">
                      Belum ada riwayat setoran yang dikonfirmasi.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {currentHistoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/40 transition-colors duration-150"
                        >
                          <div className="flex items-center gap-3">
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <CheckCircle2 className="size-4.5" />
                            </span>
                            <div>
                              <p className="font-bold text-base text-slate-800">
                                {item.blok_wilayah.nama_blok}
                              </p>
                              <p className="text-sm text-slate-500 font-semibold mt-0.5">
                                RT {item.blok_wilayah.no_rt ?? "-"} · {new Date(item.tanggal_setor).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold tabular-nums text-[15px] text-slate-900">
                              Rp {Number(item.nominal).toLocaleString("id-ID")}
                            </p>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 mt-1 border border-emerald-100">
                              TERKONFIRMASI
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Pagination Buttons History (Kiri / Kanan) ── */}

            </div>
          </div>

        </div>
      )}
    </main>
  );
}
