"use client";

import { useEffect, useState } from "react";
import { getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/axios";
import {
  Users,
  Home,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Search,
  MapPin,
  User,
  CreditCard,
  Baby,
  Briefcase,
  GraduationCap,
  Calendar,
  RotateCcw,
} from "lucide-react";

interface AnggotaKeluarga {
  id: string;
  nama: string;
  hubungan: string;
  nik?: string;
  tanggal_lahir?: string;
  pendidikan?: string;
  pekerjaan?: string;
}

interface IdentitasWarga {
  id: string;
  tipe_dokumen: string;
  nomor_dokumen?: string;
  tanggal_terbit?: string;
}

interface KepalaKeluarga {
  id: string;
  nama_kk: string;
  blok_wilayah_id: string;
  nama_blok: string;
  no_rt: number;
  nik?: string;
  tanggal_lahir?: string;
  pekerjaan?: string;
  pendidikan?: string;
  anggota_keluarga?: AnggotaKeluarga[];
  identitas?: IdentitasWarga[];
}

interface BlokPenduduk {
  blok_id: string;
  nama_blok: string;
  no_rt: number;
  total_kk: number;
  total_anggota: number;
  warga: KepalaKeluarga[];
}

interface DataPendudukResponse {
  success: boolean;
  data: {
    wilayah_rw?: {
      id: string;
      nama_kompleks: string;
      no_rw: string | number;
    };
    summary?: {
      total_kk: number;
      total_anggota: number;
      total_penduduk: number;
      total_rt: number;
    };
    blok_data?: BlokPenduduk[];
  };
  summary?: {
    total_kk: number;
    total_anggota: number;
    total_penduduk: number;
    total_rt: number;
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatTanggal(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function hubunganColor(hubungan: string) {
  const h = hubungan.toLowerCase();
  if (h.includes("kepala")) return "bg-violet-100 text-violet-700 border-violet-200";
  if (h.includes("istri") || h.includes("suami")) return "bg-pink-100 text-pink-700 border-pink-200";
  if (h.includes("anak")) return "bg-sky-100 text-sky-700 border-sky-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

// ─── Komponen Kartu Anggota ───────────────────────────────────────────────────
function AnggotaCard({
  anggota,
}: {
  anggota: AnggotaKeluarga;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-2.5 shadow-sm">
      {/* Nama & hubungan */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <User className="size-4 text-slate-500" />
          </span>
          <p className="font-bold text-base text-slate-900 leading-tight truncate">{anggota.nama}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${hubunganColor(anggota.hubungan)}`}>
          {anggota.hubungan}
        </span>
      </div>

      {/* Detail pribadi (Selalu tampil, jika kosong beri penanda) */}
      <div className="grid grid-cols-1 gap-1.5 text-sm mt-1">
        <div className="flex items-center gap-2 text-slate-600">
          <CreditCard className="size-3.5 shrink-0 text-slate-400" />
          <span className="font-medium min-w-[75px]">NIK:</span>
          {anggota.nik ? (
            <span className="text-slate-700 font-mono text-xs tracking-wide">{anggota.nik}</span>
          ) : (
            <span className="text-slate-400 italic text-xs">Belum diisi</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="size-3.5 shrink-0 text-slate-400" />
          <span className="font-medium min-w-[75px]">Lahir:</span>
          {anggota.tanggal_lahir ? (
            <span className="text-slate-700 text-xs">{formatTanggal(anggota.tanggal_lahir)}</span>
          ) : (
            <span className="text-slate-400 italic text-xs">Belum diisi</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-600">
          <Briefcase className="size-3.5 shrink-0 text-slate-400" />
          <span className="font-medium min-w-[75px]">Pekerjaan:</span>
          {anggota.pekerjaan ? (
            <span className="text-slate-700 text-xs">{anggota.pekerjaan}</span>
          ) : (
            <span className="text-slate-400 italic text-xs">Belum diisi</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-600">
          <GraduationCap className="size-3.5 shrink-0 text-slate-400" />
          <span className="font-medium min-w-[75px]">Pendidikan:</span>
          {anggota.pendidikan ? (
            <span className="text-slate-700 text-xs">{anggota.pendidikan}</span>
          ) : (
            <span className="text-slate-400 italic text-xs">Belum diisi</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Komponen Kartu KK ────────────────────────────────────────────────────────
function KKCard({
  kk,
  isExpanded,
  onToggle,
}: {
  kk: KepalaKeluarga;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Total anggota = KK sendiri + anggota keluarga lainnya
  const anggotaLain = kk.anggota_keluarga ?? [];
  const totalSeluruh = anggotaLain.length + 1; // +1 untuk KK sendiri

  // KTP utama untuk ditampilkan di header
  const ktpDoc = kk.identitas?.find((d) => d.tipe_dokumen === "KTP") ?? kk.identitas?.[0];

  // NIK KK (for Anggota Card display if needed, though they want No KK in header)
  const nikDariKtp = ktpDoc?.nomor_dokumen;

  // KK disintesis sebagai entri anggota pertama (lengkap dengan data pribadi)
  const kkSebagaiAnggota: AnggotaKeluarga = {
    id: kk.id,
    nama: kk.nama_kk,
    hubungan: "Kepala Keluarga",
    nik: kk.nik || nikDariKtp,
    tanggal_lahir: kk.tanggal_lahir,
    pekerjaan: kk.pekerjaan,
    pendidikan: kk.pendidikan,
  };

  return (
    <div className={`rounded-3xl border bg-white shadow-sm transition-all duration-200 overflow-hidden ${isExpanded ? "border-violet-200 shadow-md shadow-violet-100/50" : "border-slate-200/70 hover:border-violet-200/70 hover:shadow-md"}`}>
      {/* ── Baris header KK ── */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-4 transition-colors hover:bg-violet-50/40"
        aria-expanded={isExpanded}
      >
        {/* Avatar KK */}
        <span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-2xl font-extrabold text-sm transition-colors ${isExpanded ? "bg-violet-600 text-white shadow-sm shadow-violet-500/40" : "bg-violet-100 text-violet-700"}`}>
          KK
        </span>

        {/* Info KK: nama + lokasi */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg text-slate-900 leading-tight truncate">{kk.nama_kk}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="size-3.5 shrink-0 text-slate-400" />
            <p className="text-sm text-slate-500 truncate">{kk.nama_blok} &middot; RT {String(kk.no_rt).padStart(3, "0")}</p>
          </div>
        </div>

        {/* Kolom tengah: NO KK + tanggal terbit KK */}
        <div className="flex flex-col gap-1 min-w-0 shrink-0 mr-2 sm:mr-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 w-12">NO KK</span>
            <span className="text-xs font-mono text-slate-700">{kk.no_kk || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 w-12">TERBIT</span>
            <span className="text-xs text-slate-500">{kk.tanggal_terbit_kk ? formatTanggal(kk.tanggal_terbit_kk) : "-"}</span>
          </div>
        </div>

        {/* Kanan: jumlah anggota + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xl font-extrabold tabular-nums text-violet-600 leading-none">{totalSeluruh}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-1">anggota</p>
          </div>
          <span className={`inline-flex size-8 items-center justify-center rounded-xl transition-all ${isExpanded ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-400"}`}>
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </span>
        </div>
      </button>

      {/* ── Detail Panel ── */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5">
          <div className="flex items-center gap-2 mb-3">
            <Baby className="size-4 text-violet-500 shrink-0" />
            <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">
              Anggota Keluarga
            </h3>
            <span className="ml-auto inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
              {totalSeluruh} orang
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {/* KK sendiri sebagai kartu pertama */}
            <AnggotaCard anggota={kkSebagaiAnggota} />
            {/* Anggota keluarga lainnya */}
            {anggotaLain.map((anggota) => (
              <AnggotaCard key={anggota.id} anggota={anggota} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Halaman Utama ────────────────────────────────────────────────────────────
export default function DataPendudukPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KepalaKeluarga[]>([]);
  const [summary, setSummary] = useState<{
    total_kk: number;
    total_anggota: number;
    total_penduduk: number;
    total_rt: number;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [filterBlok, setFilterBlok] = useState("all");
  const [filterRt, setFilterRt] = useState("all");
  const [filteredData, setFilteredData] = useState<KepalaKeluarga[]>([]);
  const [blokOptions, setBlokOptions] = useState<{ id: string; nama: string }[]>([]);
  const [rtOptions, setRtOptions] = useState<string[]>([]);
  const [expandedKK, setExpandedKK] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get<DataPendudukResponse>("/rw/data-penduduk");

      if (response.data.success) {
        const blokData = response.data.data?.blok_data || [];
        const flattened = blokData.flatMap((blok) =>
          (blok.warga || []).map((warga) => ({
            ...warga,
            blok_wilayah_id: blok.blok_id,
            nama_blok: blok.nama_blok,
            no_rt: blok.no_rt,
          }))
        );

        setData(flattened);
        setSummary(response.data.data?.summary || response.data.summary || null);

        const uniqueBloks = Array.from(
          new Map(
            blokData.map((blok) => [
              blok.blok_id,
              { id: blok.blok_id, nama: blok.nama_blok },
            ])
          ).values()
        );
        setBlokOptions(uniqueBloks);

        // Extract unique RT numbers
        const uniqueRts = Array.from(
          new Set(blokData.map((blok) => blok.no_rt))
        ).sort((a, b) => a - b);
        setRtOptions(uniqueRts);
      }
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (kk) =>
          kk.nama_kk.toLowerCase().includes(q) ||
          kk.no_kk?.toLowerCase().includes(q) ||
          kk.nik?.toLowerCase().includes(q) ||
          kk.anggota_keluarga?.some((a) => a.nama.toLowerCase().includes(q)) ||
          kk.anggota_keluarga?.some((a) => a.nik?.toLowerCase().includes(q))
      );
    }

    if (filterBlok && filterBlok !== "all") {
      result = result.filter((kk) => kk.blok_wilayah_id === filterBlok);
    }

    if (filterRt && filterRt !== "all") {
      result = result.filter((kk) => String(kk.no_rt) === filterRt);
    }

    setFilteredData(result);
  }, [search, filterBlok, filterRt, data]);

  const toggleExpand = (kkId: string) => {
    setExpandedKK(expandedKK === kkId ? null : kkId);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Header ── */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/30">
            <Users className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Data Penduduk
            </h1>
            <p className="text-sm text-slate-500">
              Informasi seluruh kepala keluarga &amp; anggota di wilayah RW
            </p>
          </div>
        </div>
      </header>

      {/* ── Kartu Ringkasan ── */}
      {summary && (
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {/* Total KK */}
          <div className="relative overflow-hidden rounded-3xl border border-violet-200/50 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-linear-to-r from-violet-500 to-purple-600" />
            <div className="p-5 pt-6 flex flex-col gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Home className="size-5" />
              </span>
              <p className="text-3xl font-extrabold tabular-nums text-violet-700">{summary.total_kk}</p>
              <p className="text-sm font-semibold text-slate-500">Kepala Keluarga</p>
            </div>
          </div>

          {/* Total Penduduk */}
          <div className="relative overflow-hidden rounded-3xl border border-indigo-200/50 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-linear-to-r from-indigo-500 to-violet-600" />
            <div className="p-5 pt-6 flex flex-col gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Users className="size-5" />
              </span>
              <p className="text-3xl font-extrabold tabular-nums text-indigo-700">{summary.total_penduduk}</p>
              <p className="text-sm font-semibold text-slate-500">Total Penduduk</p>
            </div>
          </div>

          {/* Total RT */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-linear-to-r from-slate-400 to-slate-600" />
            <div className="p-5 pt-6 flex flex-col gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <GitBranch className="size-5" />
              </span>
              <p className="text-3xl font-extrabold tabular-nums text-slate-700">{summary.total_rt}</p>
              <p className="text-sm font-semibold text-slate-500">Jumlah RT</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Kotak Pencarian & Filter ── */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Search className="size-4 text-violet-500" />
          Cari & Saring Data Penduduk
        </p>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Cari nama KK, anggota, atau NIK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl text-base w-full"
            />
          </div>
          {/* Filter blok */}
          <Select value={filterBlok} onValueChange={setFilterBlok}>
            <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[150px] font-medium transition-all ${
              filterBlok !== "all"
                ? "!bg-violet-50 !border-violet-400 !text-violet-700 shadow-sm shadow-violet-100"
                : "!bg-white !border-slate-200 !text-slate-600 hover:!border-violet-300 hover:!bg-violet-50/50"
            }`}>
              <MapPin className={`size-4 mr-1 shrink-0 ${filterBlok !== "all" ? "text-violet-500" : "text-slate-400"}`} />
              <SelectValue placeholder="Semua Blok" />
            </SelectTrigger>
            <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
              <SelectItem value="all" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">
                Semua Blok
              </SelectItem>
              {blokOptions.map((blok) => (
                <SelectItem key={blok.id} value={blok.id} className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">
                  {blok.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Filter RT */}
          <Select value={filterRt} onValueChange={setFilterRt}>
            <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[140px] font-medium transition-all ${
              filterRt !== "all"
                ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm shadow-indigo-100"
                : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300 hover:!bg-indigo-50/50"
            }`}>
              <GitBranch className={`size-4 mr-1 shrink-0 ${filterRt !== "all" ? "text-indigo-500" : "text-slate-400"}`} />
              <SelectValue placeholder="Semua RT" />
            </SelectTrigger>
            <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
              <SelectItem value="all" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">
                Semua RT
              </SelectItem>
              {rtOptions.map((rt) => (
                <SelectItem key={rt} value={rt.toString()} className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">
                  RT {rt.toString().padStart(3, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Reset Filter */}
          {(search || filterBlok !== "all" || filterRt !== "all") && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setFilterBlok("all");
                setFilterRt("all");
              }}
              className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-sm shadow-rose-100 transition-all"
            >
              <RotateCcw className="size-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
        {search && (
          <p className="text-sm text-slate-500">
            Menampilkan <strong className="text-violet-600">{filteredData.length}</strong> dari{" "}
            <strong>{data.length}</strong> kepala keluarga
          </p>
        )}
      </div>

      {/* ── Daftar KK ── */}
      <section className="flex flex-col gap-3">
        {/* Header section */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-800">
            Daftar Kepala Keluarga
          </h2>
          {!loading && (
            <span className="text-sm text-slate-500 tabular-nums">
              {filteredData.length} KK ditampilkan
            </span>
          )}
        </div>

        {loading ? (
          /* Loading state */
          <div className="rounded-3xl border border-slate-200/70 bg-white p-12 text-center shadow-sm">
            <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-violet-200 border-t-violet-500 mx-auto" />
            <p className="mt-4 text-base font-semibold text-slate-500">Memuat data penduduk...</p>
            <p className="text-sm text-slate-400 mt-1">Mohon tunggu sebentar</p>
          </div>
        ) : filteredData.length === 0 ? (
          /* Empty state */
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-slate-100 mx-auto">
              <Users className="size-7 text-slate-400" />
            </span>
            <p className="mt-4 text-base font-semibold text-slate-600">
              {data.length === 0 ? "Belum ada data penduduk" : "Tidak ada hasil pencarian"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {data.length === 0
                ? "Data akan muncul setelah admin RT menambahkan warga."
                : "Coba ubah kata kunci atau pilih blok yang berbeda."}
            </p>
          </div>
        ) : (
          /* List */
          <div className="flex flex-col gap-3">
            {filteredData.map((kk) => (
              <KKCard
                key={kk.id}
                kk={kk}
                isExpanded={expandedKK === kk.id}
                onToggle={() => toggleExpand(kk.id)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
