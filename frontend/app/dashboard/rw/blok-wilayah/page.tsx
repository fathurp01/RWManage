"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Map,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  RotateCcw,
  GitBranch,
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Mail,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
  AlertTriangle,
} from "lucide-react";

interface PendingRT {
  id: string;
  nama: string;
  email: string;
  no_hp: string;
  role: string;
  status_akun: string;
  created_at: string;
  blok_wilayah: {
    id: string;
    nama_blok: string;
    no_rt: string | null;
  };
}

interface PendingRTResponse {
  success: boolean;
  message: string;
  data: PendingRT[];
}

interface BlokWilayah {
  id: string;
  nama_blok: string;
  no_rt: string | null;
  created_at?: string;
  users?: {
    id: string;
    nama: string;
    email: string;
    role: string;
    status_akun: string;
  }[];
  _count?: {
    rt_users: number;
    pengurus_masjid_users: number;
    users: number;
    warga: number;
    masjid: number;
  };
}

interface BlokResponse {
  success: boolean;
  message: string;
  data: {
    blok_list: BlokWilayah[];
    wilayah_rw: { id: string; no_rw: string; nama_kompleks: string };
  };
}

interface BlokListResponse {
  success: boolean;
  message: string;
  data: BlokWilayah[];
}

interface RtAccount {
  id: string;
  nama: string;
  email: string;
  no_hp: string;
  status_akun: string;
  created_at: string;
  blok_wilayah: {
    id: string;
    nama_blok: string;
    no_rt: string | null;
  } | null;
}

interface RtListResponse {
  success: boolean;
  message: string;
  data: RtAccount[];
}

export default function BlokWilayahPage() {
  const [blokList, setBlokList] = useState<BlokWilayah[]>([]);
  const [filteredList, setFilteredList] = useState<BlokWilayah[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [wilayahRwId, setWilayahRwId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [form, setForm] = useState({ nama_blok: "", no_rt: "" });
  const [selectedBlok, setSelectedBlok] = useState<BlokWilayah | null>(null);

  // Pending RT states
  const [pendingList, setPendingList] = useState<PendingRT[]>([]);
  const [approvalSearch, setApprovalSearch] = useState("");
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const [selectedPendingUser, setSelectedPendingUser] = useState<PendingRT | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [alasanPenolakan, setAlasanPenolakan] = useState("");

  const [currentApprovalPage, setCurrentApprovalPage] = useState(1);
  const approvalsPerPage = 5;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // RT CRUD States
  const [rtList, setRtList] = useState<RtAccount[]>([]);
  const occupiedBlokIds = useMemo(() => {
    return new Set(
      rtList
        .filter((rt) => rt.status_akun === "APPROVED" && rt.blok_wilayah?.id)
        .map((rt) => rt.blok_wilayah!.id)
    );
  }, [rtList]);
  const [rtSearchTerm, setRtSearchTerm] = useState("");
  const [rtFilterBlokId, setRtFilterBlokId] = useState("ALL");
  const [isLoadingRt, setIsLoadingRt] = useState(false);
  const [isSubmittingRt, setIsSubmittingRt] = useState(false);
  const [showAddRtForm, setShowAddRtForm] = useState(false);

  const initialRtForm = {
    nama: "",
    email: "",
    password: "",
    no_hp: "",
    blok_wilayah_id: "",
  };
  const [createRtForm, setCreateRtForm] = useState(initialRtForm);

  const [editingRt, setEditingRt] = useState<RtAccount | null>(null);
  const [editRtForm, setEditRtForm] = useState({
    nama: "",
    email: "",
    password: "",
    no_hp: "",
    blok_wilayah_id: "",
  });

  const [deletingRt, setDeletingRt] = useState<RtAccount | null>(null);
  const [deleteRtConfirmText, setDeleteRtConfirmText] = useState("");
  const [isDeletingRt, setIsDeletingRt] = useState(false);

  const [currentRtPage, setCurrentRtPage] = useState(1);
  const rtItemsPerPage = 10;

  const fetchRts = useCallback(async (search?: string) => {
    setIsLoadingRt(true);
    try {
      const url = search
        ? `/rw/rt-accounts?search=${encodeURIComponent(search)}`
        : `/rw/rt-accounts`;
      const res = await api.get<RtListResponse>(url);
      setRtList(res.data.data || []);
    } catch (error) {
      console.error("fetchRts error:", getApiError(error).message);
      toast.error(getApiError(error).message);
    } finally {
      setIsLoadingRt(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // First get the RW context (rw id)
      const rwContextRes = await api.get<BlokResponse>("/rw/blok-wilayah");
      const rwId = rwContextRes.data.data?.wilayah_rw?.id ?? "";
      setWilayahRwId(rwId);

      if (rwId) {
        const res = await api.get<BlokListResponse>(`/rw/blok-wilayah-list?wilayah_rw_id=${rwId}`);
        const list = res.data.data || [];
        setBlokList(list);
        setFilteredList(list);
      }
      // Also fetch the RT accounts
      await fetchRts();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchRts]);

  const fetchPending = useCallback(async (search?: string) => {
    setIsLoadingPending(true);
    try {
      const url = search
        ? `/auth/pending-rt?search=${encodeURIComponent(search)}`
        : `/auth/pending-rt`;
      const res = await api.get<PendingRTResponse>(url);
      setPendingList(res.data.data || []);
    } catch (error) {
      console.error("fetchPending error:", getApiError(error).message);
    } finally {
      setIsLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Basic debounce for approval search
    const timer = setTimeout(() => {
      fetchPending(approvalSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [approvalSearch, fetchPending]);

  // Reset approval page when search changes
  useEffect(() => {
    setCurrentApprovalPage(1);
  }, [approvalSearch]);

  const handleApprovePending = async () => {
    if (!selectedPendingUser) return;
    setIsSubmittingApproval(true);
    try {
      await api.patch("/auth/approve-rt", {
        user_id: selectedPendingUser.id,
        status_akun: "APPROVED",
      });
      toast.success(`Akun RT untuk ${selectedPendingUser.nama} berhasil disetujui`);
      setShowApproveModal(false);
      setSelectedPendingUser(null);
      fetchPending(approvalSearch);
      loadData();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleRejectPending = async () => {
    if (!selectedPendingUser) return;
    if (!alasanPenolakan.trim()) {
      return toast.error("Alasan penolakan wajib diisi");
    }

    setIsSubmittingApproval(true);
    try {
      await api.patch("/auth/approve-rt", {
        user_id: selectedPendingUser.id,
        status_akun: "REJECTED",
        alasan_penolakan: alasanPenolakan,
      });
      toast.success(`Pendaftaran akun RT untuk ${selectedPendingUser.nama} telah ditolak`);
      setShowRejectModal(false);
      setSelectedPendingUser(null);
      setAlasanPenolakan("");
      fetchPending(approvalSearch);
      loadData();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Debounced search for RT accounts
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRts(rtSearchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [rtSearchTerm, fetchRts]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentRtPage(1);
  }, [rtSearchTerm, rtFilterBlokId]);

  // Filtered RT List based on local dropdown filters and backend search
  const filteredRtList = useMemo(() => {
    return rtList.filter((item) => {
      if (rtFilterBlokId !== "ALL" && item.blok_wilayah?.id !== rtFilterBlokId) {
        return false;
      }
      return true;
    });
  }, [rtList, rtFilterBlokId]);

  // Paginated RT List
  const paginatedRtList = useMemo(() => {
    const start = (currentRtPage - 1) * rtItemsPerPage;
    return filteredRtList.slice(start, start + rtItemsPerPage);
  }, [filteredRtList, currentRtPage]);

  const totalRtPages = Math.ceil(filteredRtList.length / rtItemsPerPage);

  const blokOptions = useMemo(() => {
    return blokList.map((b) => ({
      value: b.id,
      label: `${b.nama_blok} (RT ${b.no_rt ? b.no_rt.padStart(3, "0") : "-"})`,
    }));
  }, [blokList]);

  // Submit Handler for Create RT
  const handleCreateRtSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!createRtForm.nama.trim() || !createRtForm.email.trim() || !createRtForm.password.trim() || !createRtForm.no_hp.trim() || !createRtForm.blok_wilayah_id) {
      return toast.error("Semua field wajib diisi");
    }
    setIsSubmittingRt(true);
    try {
      await api.post("/rw/rt-accounts", createRtForm);
      toast.success(`Akun Ketua RT untuk ${createRtForm.nama} berhasil ditambahkan`);
      setShowAddRtForm(false);
      setCreateRtForm(initialRtForm);
      fetchRts(rtSearchTerm);
      loadData(); // reload blok list because RT counts might change
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmittingRt(false);
    }
  };

  // Submit Handler for Update RT
  const handleEditRtSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRt) return;
    if (!editRtForm.nama.trim() || !editRtForm.email.trim() || !editRtForm.no_hp.trim() || !editRtForm.blok_wilayah_id) {
      return toast.error("Nama, email, nomor HP, dan blok wilayah wajib diisi");
    }
    setIsSubmittingRt(true);
    try {
      await api.patch(`/rw/rt-accounts/${editingRt.id}`, editRtForm);
      toast.success(`Akun Ketua RT berhasil diperbarui`);
      setEditingRt(null);
      fetchRts(rtSearchTerm);
      loadData(); // reload blok list
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmittingRt(false);
    }
  };

  // Submit Handler for Delete RT
  const handleDeleteRtSubmit = async () => {
    if (!deletingRt) return;
    setIsDeletingRt(true);
    try {
      await api.delete(`/rw/rt-accounts/${deletingRt.id}`);
      toast.success(`Akun Ketua RT untuk ${deletingRt.nama} berhasil dihapus`);
      setDeletingRt(null);
      setDeleteRtConfirmText("");
      fetchRts(rtSearchTerm);
      loadData(); // reload blok list
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsDeletingRt(false);
    }
  };

  const onlyPendingList = useMemo(() => {
    return pendingList.filter((item) => item.status_akun === "PENDING");
  }, [pendingList]);

  // Paginated pending list
  const paginatedPendingList = useMemo(() => {
    const start = (currentApprovalPage - 1) * approvalsPerPage;
    return onlyPendingList.slice(start, start + approvalsPerPage);
  }, [onlyPendingList, currentApprovalPage]);

  const totalApprovalPages = Math.ceil(onlyPendingList.length / approvalsPerPage);

  // Frontend filtering
  useEffect(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      setFilteredList(blokList);
    } else {
      setFilteredList(
        blokList.filter(
          (b) =>
            b.nama_blok.toLowerCase().includes(q) ||
            (b.no_rt ?? "").toLowerCase().includes(q)
        )
      );
    }
  }, [searchTerm, blokList]);

  // Reset blok page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginatedBlokList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  const totalBlokPages = Math.ceil(filteredList.length / itemsPerPage);

  const isFiltering = searchTerm.trim() !== "";

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_blok.trim() || !form.no_rt.trim()) {
      return toast.error("Nama blok dan nomor RT wajib diisi");
    }
    setIsSubmitting(true);
    try {
      await api.post("/rw/blok-wilayah", {
        wilayah_rw_id: wilayahRwId,
        nama_blok: `Blok ${form.nama_blok.trim()}`,
        no_rt: form.no_rt.trim(),
      });
      toast.success("Blok wilayah berhasil ditambahkan");
      setShowAddForm(false);
      setForm({ nama_blok: "", no_rt: "" });
      loadData();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlok || !form.nama_blok.trim() || !form.no_rt.trim()) {
      return toast.error("Nama blok dan nomor RT wajib diisi");
    }
    setIsSubmitting(true);
    try {
      await api.patch(`/rw/blok-wilayah/${selectedBlok.id}`, {
        nama_blok: `Blok ${form.nama_blok.trim()}`,
        no_rt: form.no_rt.trim(),
      });
      toast.success("Blok wilayah berhasil diperbarui");
      setShowEditModal(false);
      setSelectedBlok(null);
      setForm({ nama_blok: "", no_rt: "" });
      loadData();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedBlok) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/rw/blok-wilayah/${selectedBlok.id}`);
      toast.success("Blok wilayah berhasil dihapus");
      setShowDeleteModal(false);
      setSelectedBlok(null);
      loadData();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (blok: BlokWilayah) => {
    setSelectedBlok(blok);
    setForm({ nama_blok: blok.nama_blok.replace(/^Blok\s+/i, ''), no_rt: blok.no_rt ?? "" });
    setShowEditModal(true);
  };

  const openDeleteModal = (blok: BlokWilayah) => {
    const rtCount = blok._count?.rt_users ?? 0;
    const masjidCount = blok._count?.pengurus_masjid_users ?? 0;

    if (rtCount > 0 || masjidCount > 0) {
      toast.error("Masih ada akun terdaftar (RT / Pengurus Masjid). Harap hapus akun terdaftar tersebut terlebih dahulu.");
      return;
    }

    setSelectedBlok(blok);
    setShowDeleteModal(true);
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <Map className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Data Blok Wilayah
            </h1>
            <p className="text-sm text-slate-500">
              Kelola pembagian blok dan RT di wilayah RW
            </p>
          </div>
        </div>
      </header>



      {/* ── Approval RT ── */}
      <section className="rounded-3xl border border-amber-200/70 bg-amber-50/60 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-amber-100">
              <ShieldCheck className="size-5 text-amber-600" />
            </span>
            <div>
              <h2 className="text-base font-bold text-amber-900">Persetujuan Akun Ketua RT</h2>
              <p className="text-xs text-amber-700">
                {isLoadingPending ? "Memuat..." : onlyPendingList.length > 0 ? `${onlyPendingList.length} pengajuan menunggu persetujuan` : "Tidak ada pengajuan pending"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={approvalSearch}
              onChange={(e) => setApprovalSearch(e.target.value)}
              placeholder="Cari nama / email / HP..."
              className="h-9 w-52 rounded-xl text-sm"
            />
            {approvalSearch && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setApprovalSearch("")}
                className="h-9 rounded-xl font-semibold border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 px-3 shrink-0 transition-all flex items-center gap-1"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-amber-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-amber-50/80 border-b border-amber-100">
              <tr>
                <th className="px-5 py-3 text-left font-bold text-amber-700 text-xs uppercase tracking-wider">RT / Pemohon</th>
                <th className="px-5 py-3 text-left font-bold text-amber-700 text-xs uppercase tracking-wider hidden sm:table-cell">Target Wilayah</th>
                <th className="px-5 py-3 text-left font-bold text-amber-700 text-xs uppercase tracking-wider hidden lg:table-cell">Diajukan</th>
                <th className="px-5 py-3 text-right font-bold text-amber-700 text-xs uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {isLoadingPending ? (
                <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : onlyPendingList.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <CheckCircle2 className="size-8 text-emerald-400" />
                    <span className="text-sm">Tidak ada pengajuan pending.</span>
                  </div>
                </td></tr>
              ) : (
                paginatedPendingList.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-extrabold text-indigo-600">
                          {(() => {
                            const words = item.nama.trim().split(/\s+/);
                            return words.map((w) => w[0]).join("").substring(0, 2).toUpperCase();
                          })()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{item.nama}</p>
                          <p className="text-xs text-slate-400 truncate">{item.email} • {item.no_hp}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <p className="font-semibold text-slate-800 text-sm">{item.blok_wilayah.nama_blok}</p>
                      <p className="text-xs text-slate-400">{item.blok_wilayah.no_rt ? `RT ${item.blok_wilayah.no_rt}` : "—"}</p>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-slate-400" />
                        {new Date(item.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPendingUser(item);
                            setShowApproveModal(true);
                          }}
                          className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPendingUser(item);
                            setAlasanPenolakan("");
                            setShowRejectModal(true);
                          }}
                          className="h-8 px-3 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs font-semibold gap-1.5"
                        >
                          <XCircle className="size-3.5" />
                          Tolak
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination for Pending Items */}
          {!isLoadingPending && onlyPendingList.length > 0 && (
            <div className="flex items-center justify-between border-t border-amber-100 bg-amber-50/20 px-5 py-3 rounded-b-2xl">
              <span className="text-xs font-semibold text-amber-700">
                Menampilkan {Math.min(onlyPendingList.length, (currentApprovalPage - 1) * approvalsPerPage + 1)} –{" "}
                {Math.min(onlyPendingList.length, currentApprovalPage * approvalsPerPage)} dari{" "}
                {onlyPendingList.length} pengajuan
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentApprovalPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentApprovalPage === 1}
                  className="h-8 w-8 rounded-lg border-amber-200 text-amber-700 hover:bg-amber-100/60 disabled:opacity-50"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs font-bold text-amber-900 px-2 min-w-16 text-center">
                  Hal {currentApprovalPage} dari {Math.max(totalApprovalPages, 1)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentApprovalPage((prev) => Math.min(prev + 1, totalApprovalPages))}
                  disabled={currentApprovalPage === totalApprovalPages || totalApprovalPages === 0}
                  className="h-8 w-8 rounded-lg border-amber-200 text-amber-700 hover:bg-amber-100/60 disabled:opacity-50"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Tabel Data ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Map className="size-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">Daftar Blok Wilayah</h2>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && (
              <span className="text-sm text-slate-500 tabular-nums">
                {filteredList.length} blok ditemukan
              </span>
            )}
            <Button
              onClick={() => {
                setForm({ nama_blok: "", no_rt: "" });
                setShowAddForm((v) => !v);
              }}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-100 transition-all text-xs flex items-center gap-1.5"
            >
              <Plus className="size-3.5" />
              Tambah Blok
            </Button>
          </div>
        </div>

        {/* ── Form Tambah (collapsible) ── */}
        {showAddForm && (
          <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-indigo-100">
                <Plus className="size-5 text-indigo-600" />
              </span>
              <h2 className="text-base font-bold text-indigo-800">Tambah Blok Wilayah Baru</h2>
            </div>
            <form className="space-y-4" onSubmit={handleCreateSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-blok" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Map className="size-4 text-indigo-500" />
                    Nama Blok
                  </Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-500 font-semibold text-sm select-none">Blok</span>
                    <Input
                      id="create-blok"
                      value={form.nama_blok}
                      onChange={(e) => setForm((prev) => ({ ...prev, nama_blok: e.target.value }))}
                      placeholder="Contoh: A, Flamboyan"
                      disabled={isSubmitting}
                      className="h-11 rounded-xl text-sm pl-12"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-rt" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <GitBranch className="size-4 text-indigo-500" />
                    Nomor RT
                  </Label>
                  <Input
                    id="create-rt"
                    value={form.no_rt}
                    onChange={(e) => setForm((prev) => ({ ...prev, no_rt: e.target.value }))}
                    placeholder="Contoh: 001, 002"
                    disabled={isSubmitting}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}
                  className="h-11 px-5 rounded-xl text-sm font-semibold border-slate-200">
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}
                  className="h-11 px-6 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-500/25 hover:bg-blue-700 transition">
                  {isSubmitting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menyimpan...</> : <><Plus className="size-4 mr-2" /> Simpan Blok</>}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Blok Wilayah di bawah label Daftar Blok Wilayah */}
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Search className="size-4 text-indigo-500" />
            Cari & Saring Blok
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama blok atau nomor RT..."
                className="pl-10 h-11 rounded-xl text-sm w-full"
              />
            </div>
            {isFiltering && (
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
                className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-sm transition-all"
              >
                <RotateCcw className="size-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-indigo-200 border-t-indigo-500 mx-auto" />
            <p className="mt-4 text-base font-semibold text-slate-500">Memuat data blok wilayah...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
              <Map className="size-8 text-slate-400" />
            </span>
            <p className="text-lg font-bold text-slate-600">Belum Ada Blok Wilayah</p>
            <p className="text-sm text-slate-400 mt-1">
              {isFiltering
                ? "Tidak ada blok yang cocok dengan pencarian Anda."
                : "Klik tombol \"Tambah Blok\" untuk membuat blok wilayah pertama."}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-12">No</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Nama Blok</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Nomor RT</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Nama Ketua RT</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Nama Pengurus Masjid</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Warga</th>
                  <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBlokList.map((blok, idx) => (
                  <tr key={blok.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4 text-slate-400 font-medium tabular-nums">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                          <Map className="size-4 text-indigo-600" />
                        </span>
                        <span className="font-bold text-slate-900">{blok.nama_blok}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-violet-100">
                        <GitBranch className="size-3.5" />
                        RT {(blok.no_rt ?? "—").padStart(3, "0")}
                      </span>
                    </td>
                    {/* Kolom Akun RT */}
                    <td className="px-6 py-4">
                      {(() => {
                        const rtUsers = blok.users?.filter((u) => u.role === "RT" && u.status_akun === "APPROVED") || [];
                        return rtUsers.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {rtUsers.map((u, i) => (
                              <span key={i} className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 w-fit max-w-[150px] truncate">
                                {u.nama}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 italic">Belum ada</span>
                        );
                      })()}
                    </td>
                    {/* Kolom Akun Pengurus */}
                    <td className="px-6 py-4">
                      {(() => {
                        const pengurusUsers = blok.users?.filter((u) => u.role === "PENGURUS_MASJID" && u.status_akun === "APPROVED") || [];
                        return pengurusUsers.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {pengurusUsers.map((u, i) => (
                              <span key={i} className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 w-fit max-w-[150px] truncate">
                                {u.nama}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 italic">Belum ada</span>
                        );
                      })()}
                    </td>
                    {/* Kolom Warga */}
                    <td className="px-6 py-4">
                      {(() => {
                        const count = blok._count?.warga ?? 0;
                        return count > 0 ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-1 rounded-md border border-emerald-200">
                            <Users className="size-3.5" />
                            {count} Jiwa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-400 font-medium text-xs px-2.5 py-1 rounded-md border border-slate-100 italic">
                            Kosong
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(blok)}
                          className="h-9 px-3 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-semibold"
                        >
                          <Pencil className="size-4 mr-1.5" />
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteModal(blok)}
                          className="h-9 px-3 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 font-semibold"
                        >
                          <Trash2 className="size-4 mr-1.5" />
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination for Blok Wilayah */}
            {filteredList.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 rounded-b-3xl">
                <span className="text-xs font-semibold text-slate-500">
                  Menampilkan {Math.min(filteredList.length, (currentPage - 1) * itemsPerPage + 1)} –{" "}
                  {Math.min(filteredList.length, currentPage * itemsPerPage)} dari{" "}
                  {filteredList.length} blok wilayah
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100/60 disabled:opacity-50"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-xs font-bold text-slate-700 px-2 min-w-16 text-center">
                    Hal {currentPage} dari {Math.max(totalBlokPages, 1)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalBlokPages))}
                    disabled={currentPage === totalBlokPages || totalBlokPages === 0}
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100/60 disabled:opacity-50"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Daftar Ketua RT ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">Daftar Akun Ketua RT</h2>
          </div>
          <div className="flex items-center gap-3">
            {!isLoadingRt && (
              <span className="text-sm text-slate-500 tabular-nums">
                {filteredRtList.length} Ketua RT terdaftar
              </span>
            )}
            <Button
              onClick={() => {
                setEditingRt(null);
                setCreateRtForm(initialRtForm);
                setShowAddRtForm((v) => !v);
              }}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-100 transition-all text-xs flex items-center gap-1.5"
            >
              <Plus className="size-3.5" />
              Tambah Ketua RT
            </Button>
          </div>
        </div>

        {/* ── Form Tambah Ketua RT (collapsible) ── */}
        {showAddRtForm && (
          <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-6 shadow-sm">
            {/* Form header */}
            <div className="flex items-center gap-2.5 mb-5">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-indigo-100">
                <UserPlus className="size-5 text-indigo-600" />
              </span>
              <h2 className="text-base font-bold text-indigo-800">Tambah Ketua RT Baru</h2>
            </div>

            <form onSubmit={handleCreateRtSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">Nama Lengkap</Label>
                <Input
                  placeholder="Contoh: Bapak Taufik"
                  value={createRtForm.nama}
                  onChange={(e) => setCreateRtForm((prev) => ({ ...prev, nama: e.target.value }))}
                  className="h-11 rounded-xl text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">Email</Label>
                <Input
                  type="email"
                  placeholder="Contoh: taufik@mail.com"
                  value={createRtForm.email}
                  onChange={(e) => setCreateRtForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="h-11 rounded-xl text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">Nomor HP</Label>
                <Input
                  placeholder="Contoh: 081234567890"
                  value={createRtForm.no_hp}
                  onChange={(e) => setCreateRtForm((prev) => ({ ...prev, no_hp: e.target.value }))}
                  className="h-11 rounded-xl text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">Password</Label>
                <Input
                  type="password"
                  placeholder="Masukkan password akun"
                  value={createRtForm.password}
                  onChange={(e) => setCreateRtForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="h-11 rounded-xl text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">Blok Wilayah (RT)</Label>
                <Select
                  value={createRtForm.blok_wilayah_id}
                  onValueChange={(value) => setCreateRtForm((prev) => ({ ...prev, blok_wilayah_id: value }))}
                >
                  <SelectTrigger className="!h-11 !rounded-xl w-full text-sm bg-white">
                    <SelectValue placeholder="Pilih blok wilayah (RT) yang akan dipimpin" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                    {blokList.map((b) => {
                      const isOccupied = occupiedBlokIds.has(b.id);
                      return (
                        <SelectItem
                          key={b.id}
                          value={b.id}
                          disabled={isOccupied}
                          className="!text-sm !py-2 !px-3 !rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="flex items-center justify-between w-full">
                            <span>{b.nama_blok} {b.no_rt ? `(RT ${b.no_rt.padStart(3, "0")})` : ""}</span>
                            {isOccupied && <span className="ml-2 text-[10px] bg-slate-100 text-slate-400 font-semibold px-1.5 py-0.5 rounded">RT Aktif</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAddRtForm(false);
                    setCreateRtForm(initialRtForm);
                  }}
                  className="h-11 px-5 rounded-xl font-bold transition-all text-sm text-slate-600"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingRt}
                  className="h-11 px-6 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-500/25 hover:bg-blue-700 transition"
                >
                  {isSubmittingRt ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menambahkan...</> : <><Plus className="size-4" /> Tambah Ketua RT</>}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Filter & Search Ketua RT ── */}
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Search className="size-4 text-indigo-500" />
            Cari & Saring Ketua RT
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={rtSearchTerm}
                onChange={(e) => setRtSearchTerm(e.target.value)}
                placeholder="Cari nama, email, atau no HP..."
                className="pl-10 h-11 rounded-xl text-base w-full"
              />
            </div>
            {/* Filter blok */}
            <Select value={rtFilterBlokId} onValueChange={setRtFilterBlokId}>
              <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[170px] font-medium transition-all ${rtFilterBlokId && rtFilterBlokId !== "ALL"
                ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"
                }`}>
                <Map className={`size-4 mr-1 shrink-0 ${rtFilterBlokId && rtFilterBlokId !== "ALL" ? "text-indigo-500" : "text-slate-400"}`} />
                <SelectValue placeholder="Semua Blok" />
              </SelectTrigger>
              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Blok</SelectItem>
                {blokList.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="!text-sm !py-2 !px-3 !rounded-lg">
                    {b.nama_blok} {b.no_rt ? `(RT ${b.no_rt.padStart(3, "0")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Reset */}
            {(rtSearchTerm || (rtFilterBlokId && rtFilterBlokId !== "ALL")) && (
              <Button
                variant="outline"
                onClick={() => { setRtSearchTerm(""); setRtFilterBlokId("ALL"); }}
                className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-sm transition-all"
              >
                <RotateCcw className="size-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {isLoadingRt ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-indigo-200 border-t-indigo-500 mx-auto" />
            <p className="mt-4 text-base font-semibold text-slate-500">Memuat data Ketua RT...</p>
          </div>
        ) : filteredRtList.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
              <Users className="size-8 text-slate-400" />
            </span>
            <p className="text-lg font-bold text-slate-600">Belum Ada Ketua RT</p>
            <p className="text-sm text-slate-400 mt-1">
              {rtSearchTerm || (rtFilterBlokId && rtFilterBlokId !== "ALL")
                ? "Tidak ada Ketua RT yang cocok dengan filter Anda."
                : "Klik tombol \"Tambah Ketua RT\" untuk mendaftarkan Ketua RT pertama."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">No</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-[35%] min-w-[220px]">Nama Ketua RT</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Kontak</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Blok Kepemimpinan</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs leading-normal">
                    Diajukan/
                    <br />
                    Terdaftar
                  </th>
                  <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRtList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-slate-500 font-medium">{(currentRtPage - 1) * rtItemsPerPage + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-extrabold text-indigo-600">
                          {item.nama.substring(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-extrabold text-slate-900 leading-snug">{item.nama}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{item.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {item.no_hp || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {item.blok_wilayah ? (
                        <>
                          <p className="font-semibold text-slate-800 text-sm">{item.blok_wilayah.nama_blok}</p>
                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 font-semibold text-[10px] px-2 py-0.5 mt-1 rounded border border-slate-200">
                            <GitBranch className="size-3 shrink-0 text-slate-400" />
                            {item.blok_wilayah.no_rt ? `RT ${item.blok_wilayah.no_rt.padStart(3, "0")}` : "-"}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 italic">Belum ditentukan</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.created_at ? (
                        <div className="leading-normal">
                          <p className="font-semibold text-slate-700 text-xs">
                            {new Date(item.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                          </p>
                          <p className="text-xs text-slate-400/80 font-medium mt-0.5">
                            {new Date(item.created_at).toLocaleTimeString("id-ID", { timeStyle: "short" })}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          onClick={() => {
                            setEditingRt(item);
                            setEditRtForm({
                              nama: item.nama,
                              email: item.email,
                              no_hp: item.no_hp,
                              password: "",
                              blok_wilayah_id: item.blok_wilayah?.id || "",
                            });
                          }}
                          variant="ghost"
                          className="h-9 px-3 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors"
                        >
                          <Pencil className="size-4 mr-1.5" />
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setDeletingRt(item);
                            setDeleteRtConfirmText("");
                          }}
                          variant="ghost"
                          className="h-9 px-3 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-semibold transition-colors"
                        >
                          <Trash2 className="size-4 mr-1.5" />
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination for RT */}
            {!isLoadingRt && filteredRtList.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4 rounded-b-3xl">
                <span className="text-xs font-semibold text-slate-500">
                  Menampilkan {Math.min(filteredRtList.length, (currentRtPage - 1) * rtItemsPerPage + 1)} –{" "}
                  {Math.min(filteredRtList.length, currentRtPage * rtItemsPerPage)} dari{" "}
                  {filteredRtList.length} Ketua RT
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentRtPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentRtPage === 1}
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-xs font-bold text-slate-700 px-2 min-w-16 text-center">
                    Hal {currentRtPage} dari {Math.max(totalRtPages, 1)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentRtPage((prev) => Math.min(prev + 1, totalRtPages))}
                    disabled={currentRtPage === totalRtPages || totalRtPages === 0}
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Edit RT Modal ── */}
      <Dialog open={!!editingRt} onOpenChange={(open) => { if (!open) setEditingRt(null); }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
              <Pencil className="size-5 text-indigo-600" />
              Ubah Data Ketua RT
            </DialogTitle>
            <DialogDescription>
              Perbarui informasi Ketua RT sesuai data terbaru.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 mt-2" onSubmit={handleEditRtSubmit}>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Nama Lengkap</Label>
              <Input
                value={editRtForm.nama}
                onChange={(e) => setEditRtForm((prev) => ({ ...prev, nama: e.target.value }))}
                className="h-11 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Email</Label>
              <Input
                type="email"
                value={editRtForm.email}
                onChange={(e) => setEditRtForm((prev) => ({ ...prev, email: e.target.value }))}
                className="h-11 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Nomor HP</Label>
              <Input
                value={editRtForm.no_hp}
                onChange={(e) => setEditRtForm((prev) => ({ ...prev, no_hp: e.target.value }))}
                className="h-11 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Password Baru (Opsional)</Label>
              <Input
                type="password"
                placeholder="Kosongkan jika tidak ingin mengubah"
                value={editRtForm.password}
                onChange={(e) => setEditRtForm((prev) => ({ ...prev, password: e.target.value }))}
                className="h-11 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Blok Wilayah (RT)</Label>
              <Select
                value={editRtForm.blok_wilayah_id}
                onValueChange={(value) => setEditRtForm((prev) => ({ ...prev, blok_wilayah_id: value }))}
              >
                <SelectTrigger className="!h-11 !rounded-xl w-full text-sm">
                  <SelectValue placeholder="Pilih blok wilayah (RT) yang dipimpin" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                  {blokList.map((b) => {
                    const isOccupiedByOther = occupiedBlokIds.has(b.id) && b.id !== editingRt?.blok_wilayah?.id;
                    return (
                      <SelectItem
                        key={b.id}
                        value={b.id}
                        disabled={isOccupiedByOther}
                        className="!text-sm !py-2 !px-3 !rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="flex items-center justify-between w-full">
                          <span>{b.nama_blok} {b.no_rt ? `(RT ${b.no_rt.padStart(3, "0")})` : ""}</span>
                          {isOccupiedByOther && <span className="ml-2 text-[10px] bg-slate-100 text-slate-400 font-semibold px-1.5 py-0.5 rounded">RT Aktif</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingRt(null)} className="rounded-xl h-11 px-5 font-semibold">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmittingRt} className="rounded-xl h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                {isSubmittingRt ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete RT Modal ── */}
      <Dialog open={!!deletingRt} onOpenChange={(open) => { if (!open) { setDeletingRt(null); setDeleteRtConfirmText(""); } }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="size-5 text-rose-500" />
              Hapus Akun Ketua RT
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun Ketua RT ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-600 space-y-1.5">
              <p><strong>Nama:</strong> {deletingRt?.nama}</p>
              <p><strong>Email:</strong> {deletingRt?.email}</p>
              <p><strong>Blok Wilayah:</strong> {deletingRt?.blok_wilayah ? `${deletingRt.blok_wilayah.nama_blok} (RT ${deletingRt.blok_wilayah.no_rt})` : "-"}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delete-rt-confirm" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ketik <span className="font-extrabold text-rose-600 font-mono">HAPUS KETUA RT</span> untuk mengonfirmasi
              </Label>
              <Input
                id="delete-rt-confirm"
                value={deleteRtConfirmText}
                onChange={(e) => setDeleteRtConfirmText(e.target.value)}
                placeholder="Ketik konfirmasi di sini"
                className="h-11 rounded-xl text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletingRt(null);
                setDeleteRtConfirmText("");
              }}
              className="rounded-xl h-11 px-5"
            >
              Batal
            </Button>
            <Button
              onClick={handleDeleteRtSubmit}
              disabled={deleteRtConfirmText !== "HAPUS KETUA RT" || isDeletingRt}
              className="rounded-xl h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeletingRt ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menghapus...</> : "Hapus Akun Ketua RT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md !rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="size-5 text-indigo-600" />
              Ubah Data Blok
            </DialogTitle>
            <DialogDescription>
              Perbarui nama blok atau nomor RT.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit_nama_blok" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Map className="size-4 text-indigo-500" /> Nama Blok
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-500 font-semibold text-sm select-none">Blok</span>
                <Input
                  id="edit_nama_blok"
                  value={form.nama_blok}
                  onChange={(e) => setForm((prev) => ({ ...prev, nama_blok: e.target.value }))}
                  placeholder="Contoh: A, Flamboyan"
                  className="h-11 rounded-xl text-sm pl-12"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_no_rt" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <GitBranch className="size-4 text-indigo-500" /> Nomor RT
              </Label>
              <Input
                id="edit_no_rt"
                value={form.no_rt}
                onChange={(e) => setForm((prev) => ({ ...prev, no_rt: e.target.value }))}
                className="h-11 rounded-xl text-sm"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}
                className="rounded-xl h-11 px-5 font-semibold">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}
                className="rounded-xl h-11 px-6 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-sm">
                {isSubmitting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ── */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md !rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="size-5" />
              Hapus Blok Wilayah
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  Anda akan menghapus blok{" "}
                  <strong className="text-slate-900">{selectedBlok?.nama_blok} (RT {selectedBlok?.no_rt})</strong>.
                  Tindakan ini <strong className="text-red-600">tidak dapat dibatalkan</strong>.
                </p>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-xs font-medium flex gap-2">
                  <span className="shrink-0 text-lg leading-none">⚠️</span>
                  <span>
                    Pastikan semua <strong>akun RT, data warga, dan data masjid</strong> yang
                    terdaftar di blok ini sudah dihapus atau dipindahkan terlebih dahulu.
                    Menghapus blok yang masih memiliki data terkait akan gagal.
                  </span>
                </div>
                <p>Ketik <strong className="text-slate-900">HAPUS</strong> untuk konfirmasi:</p>
                <input
                  type="text"
                  id="delete-confirm-input"
                  placeholder="Ketik HAPUS di sini"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                  onChange={(e) => {
                    const btn = document.getElementById("delete-confirm-btn") as HTMLButtonElement | null;
                    if (btn) btn.disabled = e.target.value !== "HAPUS";
                  }}
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => {
              setShowDeleteModal(false);
              // reset confirm input
              const inp = document.getElementById("delete-confirm-input") as HTMLInputElement | null;
              if (inp) inp.value = "";
            }}
              className="rounded-xl h-11 px-5 font-semibold">
              Batal
            </Button>
            <Button id="delete-confirm-btn" onClick={handleDeleteSubmit} disabled={true}
              className="rounded-xl h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-40">
              {isSubmitting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menghapus...</> : "Ya, Hapus Blok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pending RT Approve Dialog ── */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="sm:max-w-md !rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-700">
              <CheckCircle2 className="size-6" />
              Setujui Akun RT
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Apakah Anda yakin ingin menyetujui <strong className="text-slate-900">{selectedPendingUser?.nama}</strong> sebagai Ketua RT untuk blok <strong className="text-slate-900">{selectedPendingUser?.blok_wilayah.nama_blok}</strong>?
              <br /><br />
              Setelah disetujui, akun ini bisa langsung login ke sistem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setShowApproveModal(false)} className="rounded-xl h-11 px-5">
              Batal
            </Button>
            <Button onClick={handleApprovePending} disabled={isSubmittingApproval} className="rounded-xl h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {isSubmittingApproval ? <Loader2 className="size-4 mr-2 animate-spin" /> : "Ya, Setujui Akun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pending RT Reject Dialog ── */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md !rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
              <XCircle className="size-6" />
              Tolak Pendaftaran RT
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Anda akan menolak pendaftaran dari <strong className="text-slate-900">{selectedPendingUser?.nama}</strong>. Silakan tuliskan alasan penolakan.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 space-y-1.5">
            <Label htmlFor="alasan-tolak-rt" className="text-sm font-bold text-slate-700 mb-2 block">
              Alasan Penolakan <span className="text-red-500">*</span>
            </Label>
            <Input
              id="alasan-tolak-rt"
              value={alasanPenolakan}
              onChange={(e) => setAlasanPenolakan(e.target.value)}
              placeholder="Contoh: Dokumen tidak valid, bukan warga sini, dll."
              className="h-11 rounded-xl text-sm w-full"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setShowRejectModal(false)} className="rounded-xl h-11 px-5">
              Batal
            </Button>
            <Button onClick={handleRejectPending} disabled={isSubmittingApproval || !alasanPenolakan.trim()} className="rounded-xl h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-bold">
              {isSubmittingApproval ? <Loader2 className="size-4 mr-2 animate-spin" /> : "Ya, Tolak Pendaftaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
