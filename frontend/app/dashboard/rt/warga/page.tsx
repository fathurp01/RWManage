"use client";

import { useEffect, useState, useMemo } from "react";
import { getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  rtClient,
  type RtWargaRecord,
  type RtAnggotaKeluargaRecord,
  type RtIdentitasWargaRecord,
} from "@/lib/api/rt";
import {
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Users,
  Home,
  Heart,
  ShieldAlert,
  Search,
  User,
  CreditCard,
  MapPin,
  RotateCcw,
  Briefcase,
  GraduationCap,
  Calendar,
  Loader2,
  Baby,
} from "lucide-react";

interface WargaWithDetails extends RtWargaRecord {
  anggota_keluarga?: RtAnggotaKeluargaRecord[];
  identitas?: RtIdentitasWargaRecord[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTanggal(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function hubunganColor(hubungan: string) {
  const h = hubungan.toLowerCase();
  if (h.includes("kepala")) return "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30";
  if (h.includes("istri") || h.includes("suami")) return "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/30";
  if (h.includes("anak")) return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30";
  return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/8 dark:text-slate-300 dark:border-white/8";
}

function formatHubungan(hubungan: string) {
  const h = hubungan.toUpperCase();
  if (h === "SUAMI") return "Suami";
  if (h === "ISTRI") return "Istri";
  if (h === "ANAK") return "Anak";
  if (h === "ORANG_TUA") return "Orang Tua";
  if (h === "SAUDARA") return "Saudara";
  if (h === "LAINNYA") return "Lainnya";
  return hubungan;
}

// ─── Komponen Kartu Anggota ───────────────────────────────────────────────────
function AnggotaCard({
  anggota,
  onDeleteClick,
  onEditClick,
}: {
  anggota: RtAnggotaKeluargaRecord;
  onDeleteClick?: () => void;
  onEditClick?: () => void;
}) {
  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-white/8 p-3.5 flex flex-col gap-2 shadow-xs relative group/item">
      {/* Nama & Hubungan */}
      <div className="flex items-start justify-between gap-2 pr-[72px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/8">
            <User className="size-3.5 text-slate-500 dark:text-slate-400" />
          </span>
          <p className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight truncate">{anggota.nama}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${hubunganColor(anggota.hubungan)}`}>
          {formatHubungan(anggota.hubungan)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="absolute right-2 top-2 flex items-center gap-1">
        {onEditClick && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 rounded-lg"
            onClick={(e) => { e.stopPropagation(); onEditClick(); }}
          >
            <Pencil className="w-3.5 h-3.5 text-cyan-500" />
          </Button>
        )}
        {onDeleteClick && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
            onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </Button>
        )}
      </div>

      {/* Detail Pribadi */}
      <div className="grid grid-cols-1 gap-1 text-xs mt-1.5">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <CreditCard className="size-3.5 shrink-0 text-slate-400" />
          <span className="font-semibold min-w-[70px]">NIK:</span>
          {anggota.nik ? (
            <span className="text-slate-700 dark:text-slate-300 font-mono text-xs tracking-wide">{anggota.nik}</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic">Belum diisi</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Calendar className="size-3.5 shrink-0 text-slate-400" />
          <span className="font-semibold min-w-[70px]">Lahir:</span>
          {anggota.tanggal_lahir ? (
            <span className="text-slate-700 dark:text-slate-300">{formatTanggal(anggota.tanggal_lahir)}</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic">Belum diisi</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Briefcase className="size-3.5 shrink-0 text-slate-400" />
          <span className="font-semibold min-w-[70px]">Pekerjaan:</span>
          {anggota.pekerjaan ? (
            <span className="text-slate-700 dark:text-slate-300">{anggota.pekerjaan}</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic">Belum diisi</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <GraduationCap className="size-3.5 shrink-0 text-slate-400" />
          <span className="font-semibold min-w-[70px]">Pendidikan:</span>
          {anggota.pendidikan ? (
            <span className="text-slate-700 dark:text-slate-300">{anggota.pendidikan}</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic">Belum diisi</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RtWargaPage() {
  const [loading, setLoading] = useState(true);
  const [warga, setWarga] = useState<WargaWithDetails[]>([]);
  const [expandedKK, setExpandedKK] = useState<string | null>(null);

  // States for Collapsible KK Add Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmittingKK, setIsSubmittingKK] = useState(false);
  const [formKK, setFormKK] = useState({
    nama_kk: "",
    no_kk: "",
    nik: "",
    tanggal_terbit_kk: "",
    tanggal_lahir: "",
    pendidikan: "",
    pekerjaan: "",
    status_keluarga: "MAMPU",
  });

  // Search filter
  const [search, setSearch] = useState("");

  // States for Inline Member Form
  const [addingAnggotaFor, setAddingAnggotaFor] = useState<string | null>(null);
  const [isSubmittingAnggota, setIsSubmittingAnggota] = useState(false);
  const [formAnggota, setFormAnggota] = useState({
    kkId: "",
    nama: "",
    hubungan: "",
    nik: "",
    tanggal_lahir: "",
    pekerjaan: "",
    pendidikan: "",
  });

  // Edit KK state
  const [editingKK, setEditingKK] = useState<WargaWithDetails | null>(null);
  const [isSubmittingEditKK, setIsSubmittingEditKK] = useState(false);
  const [formEditKK, setFormEditKK] = useState({
    nama_kk: "",
    no_kk: "",
    nik: "",
    tanggal_terbit_kk: "",
    tanggal_lahir: "",
    pendidikan: "",
    pekerjaan: "",
    status_keluarga: "MAMPU" as "MAMPU" | "KURANG_MAMPU" | "LANSIA",
  });

  // Edit Anggota state
  const [editingAnggota, setEditingAnggota] = useState<{ anggota: RtAnggotaKeluargaRecord; kkId: string } | null>(null);
  const [isSubmittingEditAnggota, setIsSubmittingEditAnggota] = useState(false);
  const [formEditAnggota, setFormEditAnggota] = useState({
    nama: "",
    hubungan: "",
    nik: "",
    tanggal_lahir: "",
    pekerjaan: "",
    pendidikan: "",
  });

  // Delete reference dialogues
  const [deletingKK, setDeletingKK] = useState<WargaWithDetails | null>(null);
  const [deletingAnggota, setDeletingAnggota] = useState<{ id: string; nama: string; kkId: string } | null>(null);

  // Pagination states
  const [pageMampu, setPageMampu] = useState(0);
  const [pageKurangMampu, setPageKurangMampu] = useState(0);
  const [pageLansia, setPageLansia] = useState(0);
  const itemsPerPage = 5;

  const loadWarga = async () => {
    try {
      setLoading(true);
      const wargaList = await rtClient.listWarga();
      const wargaWithDetails = await Promise.all(
        wargaList.map(async (w) => {
          try {
            const [anggota, identitas] = await Promise.all([
              rtClient.listAnggota(w.id),
              rtClient.listIdentitas(w.id),
            ]);
            return { ...w, anggota_keluarga: anggota, identitas };
          } catch {
            return { ...w, anggota_keluarga: [], identitas: [] };
          }
        })
      );
      setWarga(wargaWithDetails);
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAnggota = async (kkId: string) => {
    try {
      const anggota = await rtClient.listAnggota(kkId);
      setWarga((prev) =>
        prev.map((w) =>
          w.id === kkId ? { ...w, anggota_keluarga: anggota } : w
        )
      );
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    }
  };

  useEffect(() => {
    loadWarga();
  }, []);

  // Calculate status cards
  const totalKK = warga.length;
  const totalPenduduk = warga.reduce((sum, kk) => sum + 1 + (kk.anggota_keluarga?.length || 0), 0);

  const handleAddKK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKK.nama_kk.trim()) {
      toast.error("Nama Kepala Keluarga tidak boleh kosong");
      return;
    }
    setIsSubmittingKK(true);
    try {
      // Dates formatting to ISO string
      const payloadDateTerbit = formKK.tanggal_terbit_kk ? new Date(formKK.tanggal_terbit_kk).toISOString() : undefined;
      const payloadDateLahir = formKK.tanggal_lahir ? new Date(formKK.tanggal_lahir).toISOString() : undefined;

      await rtClient.createWarga({ 
        nama_kk: formKK.nama_kk.trim(),
        no_kk: formKK.no_kk.trim() || undefined,
        nik: formKK.nik.trim() || undefined,
        tanggal_terbit_kk: payloadDateTerbit,
        tanggal_lahir: payloadDateLahir,
        pendidikan: formKK.pendidikan || undefined,
        pekerjaan: formKK.pekerjaan.trim() || undefined,
        status_keluarga: formKK.status_keluarga as "MAMPU" | "KURANG_MAMPU" | "LANSIA",
      });
      
      toast.success("Kepala Keluarga berhasil ditambahkan");
      setFormKK({
        nama_kk: "",
        no_kk: "",
        nik: "",
        tanggal_terbit_kk: "",
        tanggal_lahir: "",
        pendidikan: "",
        pekerjaan: "",
        status_keluarga: "MAMPU",
      });
      setShowAddForm(false);
      loadWarga();
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    } finally {
      setIsSubmittingKK(false);
    }
  };

  const handleAddAnggota = async () => {
    if (!formAnggota.nama.trim() || !formAnggota.hubungan.trim()) {
      toast.error("Nama dan hubungan wajib diisi");
      return;
    }
    setIsSubmittingAnggota(true);
    try {
      // Date formatting to ISO string
      const payloadDateLahir = formAnggota.tanggal_lahir ? new Date(formAnggota.tanggal_lahir).toISOString() : undefined;

      await rtClient.createAnggota({
        warga_id: formAnggota.kkId,
        nama: formAnggota.nama.trim(),
        hubungan: formAnggota.hubungan, // uppercase from Select value
        nik: formAnggota.nik.trim() || undefined,
        tanggal_lahir: payloadDateLahir,
        pekerjaan: formAnggota.pekerjaan.trim() || undefined,
        pendidikan: formAnggota.pendidikan || undefined,
      });

      toast.success("Anggota Keluarga berhasil ditambahkan");
      setFormAnggota({
        kkId: "",
        nama: "",
        hubungan: "",
        nik: "",
        tanggal_lahir: "",
        pekerjaan: "",
        pendidikan: "",
      });
      setAddingAnggotaFor(null);
      loadAnggota(formAnggota.kkId);
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    } finally {
      setIsSubmittingAnggota(false);
    }
  };

  const handleDeleteKK = async (id: string) => {
    try {
      await rtClient.deleteWarga(id);
      toast.success("Kepala Keluarga berhasil dihapus");
      setDeletingKK(null);
      loadWarga();
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    }
  };

  const handleDeleteAnggota = async (id: string, kkId: string) => {
    try {
      await rtClient.removeAnggota(id);
      toast.success("Anggota Keluarga berhasil dihapus");
      setDeletingAnggota(null);
      loadAnggota(kkId);
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    }
  };

  const handleUpdateKK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKK || !formEditKK.nama_kk.trim()) {
      toast.error("Nama Kepala Keluarga tidak boleh kosong");
      return;
    }
    setIsSubmittingEditKK(true);
    try {
      const payloadDateTerbit = formEditKK.tanggal_terbit_kk ? new Date(formEditKK.tanggal_terbit_kk).toISOString() : undefined;
      const payloadDateLahir = formEditKK.tanggal_lahir ? new Date(formEditKK.tanggal_lahir).toISOString() : undefined;
      await rtClient.updateWarga(editingKK.id, {
        nama_kk: formEditKK.nama_kk.trim(),
        no_kk: formEditKK.no_kk.trim() || undefined,
        nik: formEditKK.nik.trim() || undefined,
        tanggal_terbit_kk: payloadDateTerbit,
        tanggal_lahir: payloadDateLahir,
        pendidikan: formEditKK.pendidikan || undefined,
        pekerjaan: formEditKK.pekerjaan.trim() || undefined,
        status_keluarga: formEditKK.status_keluarga,
      });
      toast.success("Data Kepala Keluarga berhasil diperbarui");
      setEditingKK(null);
      loadWarga();
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    } finally {
      setIsSubmittingEditKK(false);
    }
  };

  const handleUpdateAnggota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnggota || !formEditAnggota.nama.trim() || !formEditAnggota.hubungan.trim()) {
      toast.error("Nama dan hubungan wajib diisi");
      return;
    }
    setIsSubmittingEditAnggota(true);
    try {
      const payloadDateLahir = formEditAnggota.tanggal_lahir ? new Date(formEditAnggota.tanggal_lahir).toISOString() : undefined;
      await rtClient.updateAnggota(editingAnggota.anggota.id, {
        nama: formEditAnggota.nama.trim(),
        hubungan: formEditAnggota.hubungan,
        nik: formEditAnggota.nik.trim() || undefined,
        tanggal_lahir: payloadDateLahir,
        pekerjaan: formEditAnggota.pekerjaan.trim() || undefined,
        pendidikan: formEditAnggota.pendidikan || undefined,
      });
      toast.success("Data anggota berhasil diperbarui");
      setEditingAnggota(null);
      loadAnggota(editingAnggota.kkId);
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    } finally {
      setIsSubmittingEditAnggota(false);
    }
  };

  // Search filtering
  const filteredWarga = useMemo(() => {
    if (!search.trim()) return warga;
    const q = search.toLowerCase();
    return warga.filter(
      (kk) =>
        kk.nama_kk.toLowerCase().includes(q) ||
        kk.no_kk?.toLowerCase().includes(q) ||
        kk.nik?.toLowerCase().includes(q) ||
        kk.anggota_keluarga?.some((a) => a.nama.toLowerCase().includes(q)) ||
        kk.anggota_keluarga?.some((a) => a.nik?.toLowerCase().includes(q))
    );
  }, [warga, search]);

  const wargaMampu = useMemo(() => filteredWarga.filter((w) => w.status_keluarga === "MAMPU" || !w.status_keluarga), [filteredWarga]);
  const wargaKurangMampu = useMemo(() => filteredWarga.filter((w) => w.status_keluarga === "KURANG_MAMPU"), [filteredWarga]);
  const wargaLansia = useMemo(() => filteredWarga.filter((w) => w.status_keluarga === "LANSIA"), [filteredWarga]);

  // Reset pagination on search filter changes
  useEffect(() => {
    setPageMampu(0);
    setPageKurangMampu(0);
    setPageLansia(0);
  }, [filteredWarga]);

  const paginatedMampu = useMemo(() => {
    const start = pageMampu * itemsPerPage;
    return wargaMampu.slice(start, start + itemsPerPage);
  }, [wargaMampu, pageMampu]);

  const paginatedKurangMampu = useMemo(() => {
    const start = pageKurangMampu * itemsPerPage;
    return wargaKurangMampu.slice(start, start + itemsPerPage);
  }, [wargaKurangMampu, pageKurangMampu]);

  const paginatedLansia = useMemo(() => {
    const start = pageLansia * itemsPerPage;
    return wargaLansia.slice(start, start + itemsPerPage);
  }, [wargaLansia, pageLansia]);

  const toggleExpand = (kkId: string) => {
    setExpandedKK(expandedKK === kkId ? null : kkId);
  };

  // ─── Render KK list ────────────────────────────────────────────────────────────
  const renderWargaList = (
    list: WargaWithDetails[],
    emptyText: string,
    listFull: WargaWithDetails[]
  ) => {
    if (list.length === 0) {
      return (
        <div className="text-sm text-slate-400 italic py-4 text-center dark:text-slate-500">
          {emptyText}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {list.map((kk) => {
          const isExpanded = expandedKK === kk.id;
          const anggotaLain = kk.anggota_keluarga ?? [];
          const totalSeluruh = anggotaLain.length + 1; // KK + members

          const ktpDoc = kk.identitas?.find((d) => d.tipe_dokumen === "KTP") ?? kk.identitas?.[0];
          const kkSebagaiAnggota: RtAnggotaKeluargaRecord = {
            id: kk.id,
            warga_id: kk.id,
            nama: kk.nama_kk,
            hubungan: "Kepala Keluarga",
            nik: kk.nik || ktpDoc?.nomor_dokumen,
            tanggal_lahir: kk.tanggal_lahir,
            pekerjaan: kk.pekerjaan,
            pendidikan: kk.pendidikan,
          };

          return (
            <div
              key={kk.id}
              className={`rounded-3xl border bg-white dark:bg-card shadow-sm transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? "border-cyan-200 dark:border-cyan-900/60 shadow-md shadow-cyan-100/50 dark:shadow-none"
                  : "border-slate-200/70 dark:border-white/8 hover:border-cyan-200/70 dark:hover:border-cyan-900/40 hover:shadow-md"
              }`}
            >
              {/* KK Header */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleExpand(kk.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExpand(kk.id);
                  }
                }}
                className="w-full text-left px-5 py-3.5 flex items-center gap-4 transition-colors hover:bg-cyan-50/40 dark:hover:bg-white/3 cursor-pointer"
              >
                {/* KK Tag */}
                <span
                  className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl font-extrabold text-xs transition-colors ${
                    isExpanded
                      ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/40"
                      : "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400"
                  }`}
                >
                  {kk.nama_kk
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </span>

                {/* Info KK */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight truncate">
                      {kk.nama_kk}
                    </p>
                    {kk.status_keluarga === "KURANG_MAMPU" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200 text-amber-700 bg-amber-50/50 dark:border-amber-900/40 dark:text-amber-400 dark:bg-amber-950/20">
                        Kurang Mampu
                      </span>
                    )}
                    {kk.status_keluarga === "LANSIA" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-sky-200 text-sky-700 bg-sky-50/50 dark:border-sky-900/40 dark:text-sky-400 dark:bg-sky-950/20">
                        Lansia
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="size-3.5 shrink-0 text-slate-400" />
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {kk.blok_wilayah?.nama_blok ?? "Blok"} &middot; RT {kk.blok_wilayah?.no_rt ? String(kk.blok_wilayah.no_rt).padStart(3, "0") : "-"}
                    </p>
                  </div>
                </div>

                {/* KK Details (Center) */}
                <div className="flex flex-col gap-1 min-w-0 shrink-0 mr-2 sm:mr-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-12">
                      NO KK
                    </span>
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {kk.no_kk || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-12">
                      TERBIT
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {kk.tanggal_terbit_kk ? formatTanggal(kk.tanggal_terbit_kk) : "-"}
                    </span>
                  </div>
                </div>

                {/* Right Area: Members count + Dropdown Chevron + Delete KK */}
                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="text-right hidden sm:block">
                    <p className="text-base font-extrabold tabular-nums text-cyan-600 dark:text-cyan-400 leading-none">
                      {totalSeluruh}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                      anggota
                    </p>
                  </div>
                  
                  {/* Chevron Toggle */}
                  <button
                    onClick={() => toggleExpand(kk.id)}
                    className={`inline-flex size-8 items-center justify-center rounded-xl transition-all ${
                      isExpanded ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400" : "bg-slate-100 text-slate-400 dark:bg-white/8 dark:text-slate-500"
                    }`}
                  >
                    {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>

                  {/* Edit KK Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 text-cyan-500 hover:text-cyan-600 rounded-xl"
                    onClick={() => {
                      setEditingKK(kk);
                      setFormEditKK({
                        nama_kk: kk.nama_kk || "",
                        no_kk: kk.no_kk || "",
                        nik: kk.nik || "",
                        tanggal_terbit_kk: kk.tanggal_terbit_kk ? new Date(kk.tanggal_terbit_kk).toISOString().split('T')[0] : "",
                        tanggal_lahir: kk.tanggal_lahir ? new Date(kk.tanggal_lahir).toISOString().split('T')[0] : "",
                        pendidikan: kk.pendidikan || "",
                        pekerjaan: kk.pekerjaan || "",
                        status_keluarga: (kk.status_keluarga || "MAMPU") as "MAMPU" | "KURANG_MAMPU" | "LANSIA",
                      });
                    }}
                  >
                    <Pencil className="w-4 h-4 text-cyan-500" />
                  </Button>

                  {/* Delete KK Dialog */}
                  <Dialog open={deletingKK?.id === kk.id} onOpenChange={(open) => { if(!open) setDeletingKK(null); }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-red-500 hover:text-red-650 rounded-xl"
                        onClick={() => setDeletingKK(kk)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl">
                      <div className="space-y-4">
                        <div>
                          <DialogTitle className="font-semibold text-lg text-slate-900 dark:text-foreground">
                            Hapus Kepala Keluarga?
                          </DialogTitle>
                          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1 block">
                            Apakah Anda yakin ingin menghapus Kepala Keluarga <strong>"{kk.nama_kk}"</strong>?<br/>
                            Semua data iuran, identitas, dan anggota keluarga terkait juga akan terhapus. Tindakan ini tidak dapat dibatalkan.
                          </DialogDescription>
                        </div>
                        <div className="flex justify-end gap-2">
                          <DialogClose asChild>
                            <Button variant="outline" className="rounded-xl h-10">Batal</Button>
                          </DialogClose>
                          <Button
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl h-10 px-5 transition"
                            onClick={() => handleDeleteKK(kk.id)}
                          >
                            Hapus Permanen
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Detail Expanded Panel */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-white/8 bg-slate-50/60 dark:bg-white/3 px-5 py-5 space-y-5">
                  {/* Family Members Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Baby className="size-4 text-cyan-500 shrink-0" />
                      <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Anggota Keluarga
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-cyan-100 dark:bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-400">
                        {totalSeluruh} orang
                      </span>
                    </div>

                    {/* Inline Form to Add Anggota */}
                    {addingAnggotaFor === kk.id && (
                      <div className="bg-white dark:bg-card border border-cyan-100 dark:border-cyan-950/40 rounded-2xl p-4 mb-4 space-y-3.5 shadow-sm">
                        <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-white/8">
                          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                            <Plus className="size-4" />
                          </span>
                          <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">Tambah Anggota Keluarga Baru</h5>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {/* Nama Anggota */}
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nama Lengkap</Label>
                            <Input
                              placeholder="Contoh: Siti Aisyah"
                              value={formAnggota.nama}
                              onChange={(e) => setFormAnggota({ ...formAnggota, nama: e.target.value })}
                              className="text-xs h-9.5 rounded-lg"
                              disabled={isSubmittingAnggota}
                            />
                          </div>

                          {/* Hubungan */}
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Hubungan Keluarga</Label>
                            <Select
                              value={formAnggota.hubungan}
                              onValueChange={(v) => setFormAnggota({ ...formAnggota, hubungan: v })}
                              disabled={isSubmittingAnggota}
                            >
                              <SelectTrigger className="text-xs h-9.5 rounded-lg">
                                <SelectValue placeholder="Pilih hubungan" />
                              </SelectTrigger>
                              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                                <SelectItem value="SUAMI" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Suami</SelectItem>
                                <SelectItem value="ISTRI" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Istri</SelectItem>
                                <SelectItem value="ANAK" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Anak</SelectItem>
                                <SelectItem value="ORANG_TUA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Orang Tua</SelectItem>
                                <SelectItem value="SAUDARA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Saudara</SelectItem>
                                <SelectItem value="LAINNYA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* NIK */}
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">NIK <span className="text-[10px] text-slate-400">(opsional)</span></Label>
                            <Input
                              placeholder="16 Digit NIK"
                              maxLength={16}
                              value={formAnggota.nik}
                              onChange={(e) => setFormAnggota({ ...formAnggota, nik: e.target.value.replace(/\D/g, "") })}
                              className="text-xs h-9.5 rounded-lg font-mono tracking-wide"
                              disabled={isSubmittingAnggota}
                            />
                          </div>

                          {/* Tanggal Lahir */}
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tanggal Lahir <span className="text-[10px] text-slate-400">(opsional)</span></Label>
                            <Input
                              type="date"
                              value={formAnggota.tanggal_lahir}
                              onChange={(e) => setFormAnggota({ ...formAnggota, tanggal_lahir: e.target.value })}
                              className="text-xs h-9.5 rounded-lg"
                              disabled={isSubmittingAnggota}
                            />
                          </div>

                          {/* Pekerjaan */}
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pekerjaan <span className="text-[10px] text-slate-400">(opsional)</span></Label>
                            <Input
                              placeholder="Contoh: Karyawan Swasta"
                              value={formAnggota.pekerjaan}
                              onChange={(e) => setFormAnggota({ ...formAnggota, pekerjaan: e.target.value })}
                              className="text-xs h-9.5 rounded-lg"
                              disabled={isSubmittingAnggota}
                            />
                          </div>

                          {/* Pendidikan */}
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pendidikan <span className="text-[10px] text-slate-400">(opsional)</span></Label>
                            <Select
                              value={formAnggota.pendidikan}
                              onValueChange={(v) => setFormAnggota({ ...formAnggota, pendidikan: v })}
                              disabled={isSubmittingAnggota}
                            >
                              <SelectTrigger className="text-xs h-9.5 rounded-lg">
                                <SelectValue placeholder="Pilih pendidikan" />
                              </SelectTrigger>
                              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                                <SelectItem value="TK" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">TK</SelectItem>
                                <SelectItem value="SD" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SD</SelectItem>
                                <SelectItem value="SMP" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SMP</SelectItem>
                                <SelectItem value="SMA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SMA/SMK</SelectItem>
                                <SelectItem value="DIPLOMA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Diploma</SelectItem>
                                <SelectItem value="SARJANA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Sarjana</SelectItem>
                                <SelectItem value="LAINNYA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Form Submission Actions */}
                        <div className="flex gap-2 justify-end pt-1.5">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setAddingAnggotaFor(null);
                              setFormAnggota({
                                kkId: "",
                                nama: "",
                                hubungan: "",
                                nik: "",
                                tanggal_lahir: "",
                                pekerjaan: "",
                                pendidikan: "",
                              });
                            }}
                            className="text-xs h-8.5 rounded-xl border-slate-200 text-slate-600 px-4"
                            disabled={isSubmittingAnggota}
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleAddAnggota}
                            className="text-xs h-8.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-5 font-semibold transition"
                            disabled={isSubmittingAnggota}
                          >
                            {isSubmittingAnggota ? (
                              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menyimpan...</>
                            ) : (
                              "Simpan Anggota"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Members List Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {/* KK self as first card */}
                      <AnggotaCard
                        anggota={kkSebagaiAnggota}
                        onEditClick={() => {
                          setEditingKK(kk);
                          setFormEditKK({
                            nama_kk: kk.nama_kk || "",
                            no_kk: kk.no_kk || "",
                            nik: kk.nik || "",
                            tanggal_terbit_kk: kk.tanggal_terbit_kk ? new Date(kk.tanggal_terbit_kk).toISOString().split('T')[0] : "",
                            tanggal_lahir: kk.tanggal_lahir ? new Date(kk.tanggal_lahir).toISOString().split('T')[0] : "",
                            pendidikan: kk.pendidikan || "",
                            pekerjaan: kk.pekerjaan || "",
                            status_keluarga: (kk.status_keluarga || "MAMPU") as "MAMPU" | "KURANG_MAMPU" | "LANSIA",
                          });
                        }}
                      />

                      {/* Other members list */}
                      {anggotaLain.map((anggota) => (
                        <div key={anggota.id}>
                          <Dialog
                            open={deletingAnggota?.id === anggota.id}
                            onOpenChange={(open) => { if (!open) setDeletingAnggota(null); }}
                          >
                            <AnggotaCard
                              anggota={anggota}
                              onDeleteClick={() => setDeletingAnggota({ id: anggota.id, nama: anggota.nama, kkId: kk.id })}
                              onEditClick={() => {
                                setEditingAnggota({ anggota, kkId: kk.id });
                                setFormEditAnggota({
                                  nama: anggota.nama || "",
                                  hubungan: anggota.hubungan || "",
                                  nik: anggota.nik || "",
                                  tanggal_lahir: anggota.tanggal_lahir ? new Date(anggota.tanggal_lahir).toISOString().split('T')[0] : "",
                                  pekerjaan: anggota.pekerjaan || "",
                                  pendidikan: anggota.pendidikan || "",
                                });
                              }}
                            />
                            <DialogContent className="rounded-3xl">
                              <div className="space-y-4">
                                <div>
                                  <DialogTitle className="font-semibold text-lg text-slate-900 dark:text-foreground">
                                    Hapus Anggota Keluarga?
                                  </DialogTitle>
                                  <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1 block">
                                    Apakah Anda yakin ingin menghapus anggota keluarga <strong>"{anggota.nama}"</strong>?<br/>
                                    Tindakan ini tidak dapat dibatalkan.
                                  </DialogDescription>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <DialogClose asChild>
                                    <Button variant="outline" className="rounded-xl h-10">Batal</Button>
                                  </DialogClose>
                                  <Button
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl h-10 px-5 transition"
                                    onClick={() => handleDeleteAnggota(anggota.id, kk.id)}
                                  >
                                    Hapus
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      ))}

                      {/* Add Anggota Card Button */}
                      {addingAnggotaFor !== kk.id && (
                        <button
                          onClick={() => {
                            setAddingAnggotaFor(kk.id);
                            setFormAnggota({
                              kkId: kk.id,
                              nama: "",
                              hubungan: "",
                              nik: "",
                              tanggal_lahir: "",
                              pekerjaan: "",
                              pendidikan: "",
                            });
                          }}
                          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-transparent hover:border-cyan-400 dark:hover:border-cyan-600 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 transition-all duration-200 min-h-[120px] cursor-pointer"
                        >
                          <span className="inline-flex size-9 items-center justify-center rounded-full border-2 border-dashed border-slate-300 dark:border-white/15 group-hover:border-cyan-400 dark:group-hover:border-cyan-500 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-950 text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-all duration-200">
                            <Plus className="size-4" />
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-200">
                            Tambah Anggota
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ─── Header ────────────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/30">
            <Users className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Kelola Warga
            </h1>
            <p className="text-sm text-slate-500">
              Informasi seluruh kepala keluarga &amp; anggota di wilayah RT
            </p>
          </div>
        </div>

        {/* Tambah KK Collapsible Trigger Button */}
        <Button
          onClick={() => {
            setFormKK({
              nama_kk: "",
              no_kk: "",
              nik: "",
              tanggal_terbit_kk: "",
              tanggal_lahir: "",
              pendidikan: "",
              pekerjaan: "",
              status_keluarga: "MAMPU",
            });
            setShowAddForm((prev) => !prev);
          }}
          className="h-10 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-md shadow-cyan-500/20 hover:shadow-lg transition-all text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          Tambah Kepala Keluarga
        </Button>
      </header>

      {/* ─── RT Status Cards ─────────────────────────────────────────────────── */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Total Kepala Keluarga */}
        <div className="relative overflow-hidden rounded-3xl border border-cyan-200/50 dark:border-white/8 bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-cyan-500 to-blue-600" />
          <div className="p-5 pt-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Kepala Keluarga</p>
              <p className="text-2xl font-black tabular-nums text-cyan-700 dark:text-cyan-400 tracking-tight truncate">{loading ? "..." : totalKK}</p>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-2xl shrink-0 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400">
              <Home className="size-5" />
            </span>
          </div>
        </div>

        {/* Total Penduduk (KK + Members) */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-200/50 dark:border-white/8 bg-white dark:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-blue-500 to-cyan-600" />
          <div className="p-5 pt-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Total Penduduk</p>
              <p className="text-2xl font-black tabular-nums text-blue-700 dark:text-blue-400 tracking-tight truncate">{loading ? "..." : totalPenduduk}</p>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-2xl shrink-0 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
              <Users className="size-5" />
            </span>
          </div>
        </div>
      </section>

      {/* ─── Collapsible Form (Tambah Kepala Keluarga) ─────────────────────────── */}
      {showAddForm && (
        <div className="rounded-3xl border border-cyan-200/60 dark:border-cyan-950/40 bg-gradient-to-br from-cyan-50/80 to-blue-50/60 dark:from-white/3 dark:to-white/1 p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950/60">
              <Plus className="size-5 text-cyan-600 dark:text-cyan-400" />
            </span>
            <h2 className="text-base font-bold text-cyan-800 dark:text-cyan-400">Tambah Kepala Keluarga Baru</h2>
          </div>

          <form className="space-y-4" onSubmit={handleAddKK}>
            {/* Input Row 1: Nama KK, No. KK, NIK KK */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="nama_kk" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nama Kepala Keluarga</Label>
                <Input
                  id="nama_kk"
                  value={formKK.nama_kk}
                  onChange={(e) => setFormKK({ ...formKK, nama_kk: e.target.value })}
                  placeholder="Contoh: Aditya Nugraha"
                  className="h-11 rounded-xl text-sm"
                  disabled={isSubmittingKK}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="no_kk" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No. KK <span className="text-xs text-slate-400">(opsional)</span>
                </Label>
                <Input
                  id="no_kk"
                  value={formKK.no_kk}
                  maxLength={16}
                  onChange={(e) => setFormKK({ ...formKK, no_kk: e.target.value.replace(/\D/g, "") })}
                  placeholder="16 Digit Nomor KK"
                  className="h-11 rounded-xl text-sm font-mono tracking-wider"
                  disabled={isSubmittingKK}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nik" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  NIK Kepala Keluarga <span className="text-xs text-slate-400">(opsional)</span>
                </Label>
                <Input
                  id="nik"
                  value={formKK.nik}
                  maxLength={16}
                  onChange={(e) => setFormKK({ ...formKK, nik: e.target.value.replace(/\D/g, "") })}
                  placeholder="16 Digit NIK KK"
                  className="h-11 rounded-xl text-sm font-mono tracking-wider"
                  disabled={isSubmittingKK}
                />
              </div>
            </div>

            {/* Input Row 2: Tgl Terbit KK, Tgl Lahir, Pekerjaan */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="tanggal_terbit_kk" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Tanggal Terbit KK <span className="text-xs text-slate-400">(opsional)</span>
                </Label>
                <Input
                  id="tanggal_terbit_kk"
                  type="date"
                  value={formKK.tanggal_terbit_kk}
                  onChange={(e) => setFormKK({ ...formKK, tanggal_terbit_kk: e.target.value })}
                  className="h-11 rounded-xl text-sm"
                  disabled={isSubmittingKK}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tanggal_lahir" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Tanggal Lahir <span className="text-xs text-slate-400">(opsional)</span>
                </Label>
                <Input
                  id="tanggal_lahir"
                  type="date"
                  value={formKK.tanggal_lahir}
                  onChange={(e) => setFormKK({ ...formKK, tanggal_lahir: e.target.value })}
                  className="h-11 rounded-xl text-sm"
                  disabled={isSubmittingKK}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pekerjaan" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Pekerjaan <span className="text-xs text-slate-400">(opsional)</span>
                </Label>
                <Input
                  id="pekerjaan"
                  value={formKK.pekerjaan}
                  onChange={(e) => setFormKK({ ...formKK, pekerjaan: e.target.value })}
                  placeholder="Contoh: Pegawai Swasta"
                  className="h-11 rounded-xl text-sm"
                  disabled={isSubmittingKK}
                />
              </div>
            </div>

            {/* Input Row 3: Pendidikan, Kategori Keluarga */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pendidikan" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Pendidikan <span className="text-xs text-slate-400">(opsional)</span>
                </Label>
                <Select
                  value={formKK.pendidikan}
                  onValueChange={(v) => setFormKK({ ...formKK, pendidikan: v })}
                  disabled={isSubmittingKK}
                >
                  <SelectTrigger id="pendidikan" className="h-11 rounded-xl text-sm">
                    <SelectValue placeholder="Pilih Pendidikan" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                    <SelectItem value="TK" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">TK</SelectItem>
                    <SelectItem value="SD" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SD</SelectItem>
                    <SelectItem value="SMP" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SMP</SelectItem>
                    <SelectItem value="SMA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SMA/SMK</SelectItem>
                    <SelectItem value="DIPLOMA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Diploma</SelectItem>
                    <SelectItem value="SARJANA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Sarjana</SelectItem>
                    <SelectItem value="LAINNYA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status_keluarga" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kategori Keluarga</Label>
                <Select
                  value={formKK.status_keluarga}
                  onValueChange={(v) => setFormKK({ ...formKK, status_keluarga: v })}
                  disabled={isSubmittingKK}
                >
                  <SelectTrigger id="status_keluarga" className="h-11 rounded-xl text-sm">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                    <SelectItem value="MAMPU" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Keluarga Mampu (Standar)</SelectItem>
                    <SelectItem value="KURANG_MAMPU" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Keluarga Kurang Mampu (Subsidi)</SelectItem>
                    <SelectItem value="LANSIA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Keluarga Lansia (Gratis/Waived)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="h-11 px-5 rounded-xl text-sm font-semibold border-slate-200 dark:border-white/8 text-slate-700 dark:text-slate-300"
                disabled={isSubmittingKK}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingKK}
                className="h-11 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm shadow-md shadow-cyan-500/20 hover:shadow-lg transition"
              >
                {isSubmittingKK ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Plus className="size-4 mr-2" /> Simpan Kepala Keluarga</>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Search & Filter Box ──────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-white/8 bg-white dark:bg-card p-5 shadow-sm space-y-3">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Search className="size-4 text-cyan-500" />
          Cari & Saring Data Penduduk RT
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Text Input Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Cari nama Kepala Keluarga, anggota keluarga, atau NIK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl text-sm w-full"
            />
          </div>

          {/* Reset Filter Button */}
          {search && (
            <Button
              variant="outline"
              onClick={() => setSearch("")}
              className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-950/40 dark:text-rose-400 dark:bg-rose-950/20 shrink-0 font-semibold shadow-sm shadow-rose-100 dark:shadow-none transition-all"
            >
              <RotateCcw className="size-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
        {search && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Menampilkan <strong className="text-cyan-600 dark:text-cyan-400">{filteredWarga.length}</strong> dari{" "}
            <strong>{warga.length}</strong> Kepala Keluarga yang cocok.
          </p>
        )}
      </div>

      {/* ─── Warga List by Categories with Paginations ─────────────────────────── */}
      {loading ? (
        /* Loading Placeholder */
        <div className="rounded-3xl border border-slate-200/70 dark:border-white/8 bg-white dark:bg-card p-12 text-center shadow-sm">
          <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-cyan-200 border-t-cyan-600 mx-auto" />
          <p className="mt-4 text-base font-semibold text-slate-500 dark:text-slate-400">Memuat data warga RT...</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Mohon tunggu sebentar</p>
        </div>
      ) : filteredWarga.length === 0 ? (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/8 bg-white dark:bg-card p-12 text-center shadow-sm">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-slate-100 dark:bg-white/8 mx-auto">
            <Users className="size-7 text-slate-400 dark:text-slate-500" />
          </span>
          <p className="mt-4 text-base font-semibold text-slate-600 dark:text-slate-350">
            {warga.length === 0 ? "Belum ada data warga di RT ini" : "Tidak ada hasil pencarian"}
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {warga.length === 0
              ? "Klik tombol \"Tambah Kepala Keluarga\" untuk mendaftarkan keluarga pertama."
              : "Ubah kata kunci pencarian Anda untuk menemukan data lain."}
          </p>
        </div>
      ) : (
        /* Categorized sections */
        <div className="space-y-8">
          {/* SECTION 1: Keluarga Mampu */}
          <section className="flex flex-col gap-3">
            <div className="border-t border-slate-200/70 dark:border-white/8" />
            <div className="flex items-center justify-between px-1 border-b border-slate-200/70 dark:border-white/8 pb-2.5">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Users className="size-5 text-slate-500 dark:text-slate-450" />
                Daftar Kepala Keluarga Mampu ({wargaMampu.length})
              </h2>
              
              {/* Pagination controls */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  Menampilkan {wargaMampu.length === 0 ? 0 : pageMampu * itemsPerPage + 1}-{Math.min((pageMampu + 1) * itemsPerPage, wargaMampu.length)} dari {wargaMampu.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={pageMampu === 0}
                    onClick={() => setPageMampu((p) => Math.max(0, p - 1))}
                    className="size-8 rounded-lg !p-0 shadow-sm border-slate-200 dark:border-white/8 hover:border-cyan-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4 text-slate-600 dark:text-slate-400" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={(pageMampu + 1) * itemsPerPage >= wargaMampu.length}
                    onClick={() => setPageMampu((p) => p + 1)}
                    className="size-8 rounded-lg !p-0 shadow-sm border-slate-200 dark:border-white/8 hover:border-cyan-300 disabled:opacity-40"
                  >
                    <ChevronRight className="size-4 text-slate-600 dark:text-slate-400" />
                  </Button>
                </div>
              </div>
            </div>
            
            {renderWargaList(
              paginatedMampu,
              "Belum ada Kepala Keluarga dengan kategori Mampu.",
              wargaMampu
            )}
          </section>

          {/* SECTION 2: Keluarga Kurang Mampu */}
          <section className="flex flex-col gap-3">
            <div className="border-t border-slate-200/70 dark:border-white/8" />
            <div className="flex items-center justify-between px-1 border-b border-slate-200/70 dark:border-white/8 pb-2.5">
              <h2 className="text-base font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <Users className="size-5 text-amber-500 shrink-0" />
                Daftar Kepala Keluarga Kurang Mampu ({wargaKurangMampu.length})
              </h2>

              {/* Pagination controls */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-amber-700 dark:text-amber-450 font-medium hidden sm:inline">
                  Menampilkan {wargaKurangMampu.length === 0 ? 0 : pageKurangMampu * itemsPerPage + 1}-{Math.min((pageKurangMampu + 1) * itemsPerPage, wargaKurangMampu.length)} dari {wargaKurangMampu.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={pageKurangMampu === 0}
                    onClick={() => setPageKurangMampu((p) => Math.max(0, p - 1))}
                    className="size-8 rounded-lg !p-0 shadow-sm border-amber-200 dark:border-white/8 hover:border-amber-400 hover:bg-amber-50/50 disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4 text-amber-750 dark:text-amber-450" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={(pageKurangMampu + 1) * itemsPerPage >= wargaKurangMampu.length}
                    onClick={() => setPageKurangMampu((p) => p + 1)}
                    className="size-8 rounded-lg !p-0 shadow-sm border-amber-200 dark:border-white/8 hover:border-amber-400 hover:bg-amber-50/50 disabled:opacity-40"
                  >
                    <ChevronRight className="size-4 text-amber-750 dark:text-amber-450" />
                  </Button>
                </div>
              </div>
            </div>

            {renderWargaList(
              paginatedKurangMampu,
              "Belum ada Kepala Keluarga dengan kategori Kurang Mampu.",
              wargaKurangMampu
            )}
          </section>

          {/* SECTION 3: Keluarga Lansia */}
          <section className="flex flex-col gap-3">
            <div className="border-t border-slate-200/70 dark:border-white/8" />
            <div className="flex items-center justify-between px-1 border-b border-slate-200 dark:border-white/8 pb-2.5">
              <h2 className="text-base font-bold text-sky-800 dark:text-sky-400 flex items-center gap-2">
                <Users className="size-5 text-sky-500 shrink-0" />
                Daftar Kepala Keluarga Lansia ({wargaLansia.length})
              </h2>

              {/* Pagination controls */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-sky-700 dark:text-sky-450 font-medium hidden sm:inline">
                  Menampilkan {wargaLansia.length === 0 ? 0 : pageLansia * itemsPerPage + 1}-{Math.min((pageLansia + 1) * itemsPerPage, wargaLansia.length)} dari {wargaLansia.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={pageLansia === 0}
                    onClick={() => setPageLansia((p) => Math.max(0, p - 1))}
                    className="size-8 rounded-lg !p-0 shadow-sm border-sky-200 dark:border-white/8 hover:border-sky-400 hover:bg-sky-50/50 disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4 text-sky-750 dark:text-sky-450" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={(pageLansia + 1) * itemsPerPage >= wargaLansia.length}
                    onClick={() => setPageLansia((p) => p + 1)}
                    className="size-8 rounded-lg !p-0 shadow-sm border-sky-200 dark:border-white/8 hover:border-sky-400 hover:bg-sky-50/50 disabled:opacity-40"
                  >
                    <ChevronRight className="size-4 text-sky-750 dark:text-sky-450" />
                  </Button>
                </div>
              </div>
            </div>

            {renderWargaList(
              paginatedLansia,
              "Belum ada Kepala Keluarga dengan kategori Lansia.",
              wargaLansia
            )}
            <div className="border-t border-slate-200/70 dark:border-white/8" />
          </section>
        </div>
      )}

      {/* Dialog Edit Kepala Keluarga */}
      <Dialog open={!!editingKK} onOpenChange={(open) => { if (!open) setEditingKK(null); }}>
        <DialogContent className="rounded-3xl max-w-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-white/8">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950/60">
                <Pencil className="size-5 text-cyan-600 dark:text-cyan-400" />
              </span>
              <DialogTitle className="text-base font-bold text-cyan-800 dark:text-cyan-400">Edit Kepala Keluarga</DialogTitle>
            </div>

            <form onSubmit={handleUpdateKK} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="edit_nama_kk" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Kepala Keluarga</Label>
                  <Input
                    id="edit_nama_kk"
                    value={formEditKK.nama_kk}
                    onChange={(e) => setFormEditKK({ ...formEditKK, nama_kk: e.target.value })}
                    className="text-xs h-9.5 rounded-lg"
                    disabled={isSubmittingEditKK}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_no_kk" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No. KK <span className="text-[10px] text-slate-400">(opsional)</span>
                  </Label>
                  <Input
                    id="edit_no_kk"
                    value={formEditKK.no_kk}
                    maxLength={16}
                    onChange={(e) => setFormEditKK({ ...formEditKK, no_kk: e.target.value.replace(/\D/g, "") })}
                    className="text-xs h-9.5 rounded-lg font-mono tracking-wide"
                    disabled={isSubmittingEditKK}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_nik" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    NIK Kepala Keluarga <span className="text-[10px] text-slate-400">(opsional)</span>
                  </Label>
                  <Input
                    id="edit_nik"
                    value={formEditKK.nik}
                    maxLength={16}
                    onChange={(e) => setFormEditKK({ ...formEditKK, nik: e.target.value.replace(/\D/g, "") })}
                    className="text-xs h-9.5 rounded-lg font-mono tracking-wide"
                    disabled={isSubmittingEditKK}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_tanggal_terbit_kk" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tanggal Terbit KK <span className="text-[10px] text-slate-400">(opsional)</span>
                  </Label>
                  <Input
                    id="edit_tanggal_terbit_kk"
                    type="date"
                    value={formEditKK.tanggal_terbit_kk}
                    onChange={(e) => setFormEditKK({ ...formEditKK, tanggal_terbit_kk: e.target.value })}
                    className="text-xs h-9.5 rounded-lg"
                    disabled={isSubmittingEditKK}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_tanggal_lahir" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tanggal Lahir <span className="text-[10px] text-slate-400">(opsional)</span>
                  </Label>
                  <Input
                    id="edit_tanggal_lahir"
                    type="date"
                    value={formEditKK.tanggal_lahir}
                    onChange={(e) => setFormEditKK({ ...formEditKK, tanggal_lahir: e.target.value })}
                    className="text-xs h-9.5 rounded-lg"
                    disabled={isSubmittingEditKK}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_pekerjaan" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pekerjaan <span className="text-[10px] text-slate-400">(opsional)</span>
                  </Label>
                  <Input
                    id="edit_pekerjaan"
                    value={formEditKK.pekerjaan}
                    onChange={(e) => setFormEditKK({ ...formEditKK, pekerjaan: e.target.value })}
                    className="text-xs h-9.5 rounded-lg"
                    disabled={isSubmittingEditKK}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_pendidikan" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pendidikan <span className="text-[10px] text-slate-400">(opsional)</span>
                  </Label>
                  <Select
                    value={formEditKK.pendidikan}
                    onValueChange={(v) => setFormEditKK({ ...formEditKK, pendidikan: v })}
                    disabled={isSubmittingEditKK}
                  >
                    <SelectTrigger id="edit_pendidikan" className="text-xs h-9.5 rounded-lg">
                      <SelectValue placeholder="Pilih Pendidikan" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                      <SelectItem value="TK" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">TK</SelectItem>
                      <SelectItem value="SD" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SD</SelectItem>
                      <SelectItem value="SMP" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SMP</SelectItem>
                      <SelectItem value="SMA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SMA/SMK</SelectItem>
                      <SelectItem value="DIPLOMA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Diploma</SelectItem>
                      <SelectItem value="SARJANA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Sarjana</SelectItem>
                      <SelectItem value="LAINNYA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_status_keluarga" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kategori Keluarga</Label>
                  <Select
                    value={formEditKK.status_keluarga}
                    onValueChange={(v) => setFormEditKK({ ...formEditKK, status_keluarga: v as "MAMPU" | "KURANG_MAMPU" | "LANSIA" })}
                    disabled={isSubmittingEditKK}
                  >
                    <SelectTrigger id="edit_status_keluarga" className="text-xs h-9.5 rounded-lg">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                      <SelectItem value="MAMPU" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Mampu (Standar)</SelectItem>
                      <SelectItem value="KURANG_MAMPU" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Kurang Mampu</SelectItem>
                      <SelectItem value="LANSIA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Lansia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-white/8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingKK(null)}
                  className="text-xs h-8.5 rounded-xl border-slate-200 text-slate-650 px-4"
                  disabled={isSubmittingEditKK}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="text-xs h-8.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-5 font-semibold transition"
                  disabled={isSubmittingEditKK}
                >
                  {isSubmittingEditKK ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menyimpan...</>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Anggota Keluarga */}
      <Dialog open={!!editingAnggota} onOpenChange={(open) => { if (!open) setEditingAnggota(null); }}>
        <DialogContent className="rounded-3xl max-w-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-white/8">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950/60">
                <Pencil className="size-5 text-cyan-600 dark:text-cyan-400" />
              </span>
              <DialogTitle className="text-base font-bold text-cyan-800 dark:text-cyan-400">Edit Anggota Keluarga</DialogTitle>
            </div>

            <form onSubmit={handleUpdateAnggota} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="edit_anggota_nama" className="text-xs font-semibold text-slate-700 dark:text-slate-350">Nama Lengkap</Label>
                  <Input
                    id="edit_anggota_nama"
                    value={formEditAnggota.nama}
                    onChange={(e) => setFormEditAnggota({ ...formEditAnggota, nama: e.target.value })}
                    className="text-xs h-9.5 rounded-lg"
                    disabled={isSubmittingEditAnggota}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_anggota_hubungan" className="text-xs font-semibold text-slate-700 dark:text-slate-350">Hubungan Keluarga</Label>
                  <Select
                    value={formEditAnggota.hubungan}
                    onValueChange={(v) => setFormEditAnggota({ ...formEditAnggota, hubungan: v })}
                    disabled={isSubmittingEditAnggota}
                  >
                    <SelectTrigger id="edit_anggota_hubungan" className="text-xs h-9.5 rounded-lg">
                      <SelectValue placeholder="Pilih Hubungan" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                      <SelectItem value="SUAMI" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Suami</SelectItem>
                      <SelectItem value="ISTRI" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Istri</SelectItem>
                      <SelectItem value="ANAK" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Anak</SelectItem>
                      <SelectItem value="ORANG_TUA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Orang Tua</SelectItem>
                      <SelectItem value="SAUDARA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Saudara</SelectItem>
                      <SelectItem value="LAINNYA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_anggota_nik" className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    NIK <span className="text-[10px] text-slate-400">(opsional)</span>
                  </Label>
                  <Input
                    id="edit_anggota_nik"
                    value={formEditAnggota.nik}
                    maxLength={16}
                    onChange={(e) => setFormEditAnggota({ ...formEditAnggota, nik: e.target.value.replace(/\D/g, "") })}
                    className="text-xs h-9.5 rounded-lg font-mono tracking-wide"
                    disabled={isSubmittingEditAnggota}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_anggota_tanggal_lahir" className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    Tanggal Lahir <span className="text-[10px] text-slate-400">(opsional)</span>
                  </Label>
                  <Input
                    id="edit_anggota_tanggal_lahir"
                    type="date"
                    value={formEditAnggota.tanggal_lahir}
                    onChange={(e) => setFormEditAnggota({ ...formEditAnggota, tanggal_lahir: e.target.value })}
                    className="text-xs h-9.5 rounded-lg"
                    disabled={isSubmittingEditAnggota}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_anggota_pekerjaan" className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    Pekerjaan <span className="text-[10px] text-slate-400">(opsional)</span>
                  </Label>
                  <Input
                    id="edit_anggota_pekerjaan"
                    value={formEditAnggota.pekerjaan}
                    onChange={(e) => setFormEditAnggota({ ...formEditAnggota, pekerjaan: e.target.value })}
                    className="text-xs h-9.5 rounded-lg"
                    disabled={isSubmittingEditAnggota}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_anggota_pendidikan" className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    Pendidikan <span className="text-[10px] text-slate-400">(opsional)</span>
                  </Label>
                  <Select
                    value={formEditAnggota.pendidikan}
                    onValueChange={(v) => setFormEditAnggota({ ...formEditAnggota, pendidikan: v })}
                    disabled={isSubmittingEditAnggota}
                  >
                    <SelectTrigger id="edit_anggota_pendidikan" className="text-xs h-9.5 rounded-lg">
                      <SelectValue placeholder="Pilih Pendidikan" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                      <SelectItem value="TK" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">TK</SelectItem>
                      <SelectItem value="SD" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SD</SelectItem>
                      <SelectItem value="SMP" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SMP</SelectItem>
                      <SelectItem value="SMA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">SMA/SMK</SelectItem>
                      <SelectItem value="DIPLOMA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Diploma</SelectItem>
                      <SelectItem value="SARJANA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Sarjana</SelectItem>
                      <SelectItem value="LAINNYA" className="!text-sm !py-2 !px-3 !rounded-lg cursor-pointer">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-white/8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAnggota(null)}
                  className="text-xs h-8.5 rounded-xl border-slate-200 text-slate-650 px-4"
                  disabled={isSubmittingEditAnggota}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="text-xs h-8.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-5 font-semibold transition"
                  disabled={isSubmittingEditAnggota}
                >
                  {isSubmittingEditAnggota ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menyimpan...</>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
