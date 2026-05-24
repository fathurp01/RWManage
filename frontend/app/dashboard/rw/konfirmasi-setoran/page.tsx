"use client";

import { useState, useEffect, useMemo } from "react";
import { api, getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Receipt,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Search,
  RotateCcw,
  X,
} from "lucide-react";

interface BlokWilayah {
  id: string;
  nama_blok: string;
  no_rt: string | null;
}

interface BlokListResponse {
  success: boolean;
  data: {
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
    blok_list: BlokWilayah[];
  };
}

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

const formatAreaCode = (value: string | null | undefined): string => {
  if (!value) return "-";
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 99) {
      return String(parsed).padStart(3, "0");
    }
    return String(parsed);
  }
  return normalized;
};

const formatBlokName = (value: string): string => {
  const trimmed = value.trim();
  if (/^blok\s+/i.test(trimmed)) return trimmed;
  return `Blok ${trimmed}`;
};

const formatBlokLabel = (blok: BlokWilayah) => {
  const rtPart = blok.no_rt ? `RT ${formatAreaCode(blok.no_rt)}` : "Tanpa RT";
  return `${formatBlokName(blok.nama_blok)} — ${rtPart}`;
};

const getProofUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/api\/?$/, "");
  if (trimmed.startsWith("/")) {
    return `${apiBaseUrl}${trimmed}`;
  }
  return `${apiBaseUrl}/${trimmed}`;
};

export default function KonfirmasiSetoranPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SetoranItem[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const [blokList, setBlokList] = useState<BlokWilayah[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBlokId, setFilterBlokId] = useState("ALL");

  const itemsPerPage = 3;
  const historyItemsPerPage = 8;

  useEffect(() => {
    loadData();
    loadBlok();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setHistoryPage(1);
  }, [searchTerm, filterBlokId]);

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

  const loadBlok = async () => {
    try {
      const response = await api.get<BlokListResponse>("/rw/blok-wilayah");
      if (response.data.success) {
        setBlokList(response.data.data.blok_list ?? []);
      }
    } catch (error) {
      console.error("Failed to load blok wilayah:", error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessing(id);
      const res = await api.post(`/rw/setoran-rt/${id}/approve`, { status: "TERKONFIRMASI" });
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

  const blokOptions = useMemo(() => {
    return blokList.map((blok) => ({
      value: blok.id,
      label: formatBlokLabel(blok),
    }));
  }, [blokList]);

  const isFiltering = searchTerm !== "" || filterBlokId !== "ALL";

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search filter: matches nama_blok, no_rt, nominal, or date
      const matchSearch = (() => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        const blokName = item.blok_wilayah.nama_blok.toLowerCase();
        const rtNum = (item.blok_wilayah.no_rt ?? "").toLowerCase();
        const nominalStr = String(item.nominal).toLowerCase();

        const dateObj = new Date(item.tanggal_setor);
        const isInvalidDate = Number.isNaN(dateObj.getTime());
        const dateStrLong = isInvalidDate ? "" : dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }).toLowerCase();
        const dateStrShort = isInvalidDate ? "" : dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }).toLowerCase();

        return (
          blokName.includes(q) ||
          rtNum.includes(q) ||
          `rt ${rtNum}`.includes(q) ||
          nominalStr.includes(q) ||
          dateStrLong.includes(q) ||
          dateStrShort.includes(q)
        );
      })();

      // Blok filter
      const matchBlok = filterBlokId === "ALL" || item.blok_wilayah_id === filterBlokId;

      return matchSearch && matchBlok;
    });
  }, [data, searchTerm, filterBlokId]);

  const pendingSetoran = useMemo(() => filteredData.filter((s) => s.status === "PENDING"), [filteredData]);
  const historySetoran = useMemo(() => filteredData.filter((s) => s.status === "TERKONFIRMASI"), [filteredData]);

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
            <BadgeCheck className="size-5" />
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

      {/* ── Cari & Saring Setoran (styled like masjid page) ── */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Search className="size-4 text-indigo-500" />
          Cari & Saring Setoran
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama blok, RT, nominal, atau tanggal..."
              className="pl-10 h-11 rounded-xl text-base w-full"
            />
          </div>
          {/* Filter blok */}
          <Select value={filterBlokId} onValueChange={setFilterBlokId}>
            <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[170px] font-medium transition-all ${filterBlokId !== "ALL"
              ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
              : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"
              }`}>
              <MapPin className={`size-4 mr-1 shrink-0 ${filterBlokId !== "ALL" ? "text-indigo-500" : "text-slate-400"}`} />
              <SelectValue placeholder="Semua Blok" />
            </SelectTrigger>
            <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
              <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Blok / RT</SelectItem>
              {blokOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="!text-sm !py-2 !px-3 !rounded-lg">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Reset */}
          {isFiltering && (
            <Button
              variant="outline"
              onClick={() => { setSearchTerm(""); setFilterBlokId("ALL"); }}
              className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-sm transition-all"
            >
              <RotateCcw className="size-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </div>

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
                          <Dialog>
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-700 hover:text-slate-900 transition-colors bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs cursor-pointer outline-none"
                              >
                                <Receipt className="size-3.5 text-slate-500" /> Lihat Bukti
                              </button>
                            </DialogTrigger>
                            <DialogContent showCloseButton={false} className="max-w-[90vw] md:max-w-4xl p-0 bg-transparent border-none ring-0 shadow-none focus:outline-none flex items-center justify-center">
                              <DialogTitle className="sr-only">Bukti Transfer</DialogTitle>
                              <div className="relative max-w-full max-h-[85vh] overflow-hidden rounded-2xl">
                                <img
                                  src={getProofUrl(item.bukti_url)}
                                  alt="Bukti Transfer"
                                  className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                                />
                                <DialogClose asChild>
                                  <button
                                    type="button"
                                    className="absolute top-4 right-4 z-50 inline-flex size-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all border border-white/10 cursor-pointer outline-none"
                                  >
                                    <X className="size-4.5" />
                                    <span className="sr-only">Close</span>
                                  </button>
                                </DialogClose>
                              </div>
                            </DialogContent>
                          </Dialog>
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
