"use client";

import { FormEvent, useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  MapPin,
  RotateCcw,
  Loader2,
  GitBranch,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
  AlertTriangle,
} from "lucide-react";

interface BlokWilayah {
  id: string;
  nama_blok: string;
  no_rt: string | null;
}

interface BlokListResponse {
  data: {
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
    blok_list: BlokWilayah[];
  };
}

interface RwMasjidItem {
  id: string;
  nama_masjid: string;
  alamat: string;
  blok_wilayah_id: string;
  blok_wilayah: {
    id: string;
    nama_blok: string;
    no_rt: string | null;
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
  };
  pengurus_masjid?: {
    user: { nama: string };
  }[];
}

interface RwMasjidListResponse {
  data: RwMasjidItem[];
}

interface PendingPengurusItem {
  user_id: string;
  nama: string;
  email: string;
  no_hp: string;
  status_akun: "PENDING";
  created_at: string;
  masjid: {
    id: string;
    nama_masjid: string;
    alamat: string;
    nama_blok: string;
    nama_kompleks: string;
    no_rw: string;
  };
}

interface PendingPengurusResponse {
  data: PendingPengurusItem[];
}

interface ActionState {
  message: string;
  fieldErrors: FieldErrors;
}

interface MasjidFormState {
  blok_wilayah_id: string;
  nama_masjid: string;
  alamat: string;
}

const initialFormState: MasjidFormState = {
  blok_wilayah_id: "",
  nama_masjid: "",
  alamat: "",
};

interface RwPengurusItem {
  id: string;
  user_id: string;
  masjid_id: string;
  nama: string;
  email: string;
  no_hp: string;
  status_akun: string;
  created_at: string;
  masjid: {
    id: string;
    nama_masjid: string;
    alamat: string;
    nama_blok: string;
    no_rt: string | null;
  };
}

interface PengurusFormState {
  nama: string;
  email: string;
  no_hp: string;
  password?: string;
  masjid_id: string;
}

const initialPengurusForm: PengurusFormState = {
  nama: "",
  email: "",
  no_hp: "",
  password: "",
  masjid_id: "",
};

const initialActionState: ActionState = { message: "", fieldErrors: {} };

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
};

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

const formatBlokLabel = (blok: BlokWilayah, rwCode: string) => {
  const rtPart = blok.no_rt ? `RT ${formatAreaCode(blok.no_rt)}` : "Tanpa RT";
  return `${formatBlokName(blok.nama_blok)} — ${rtPart}`;
};

export default function RwMasjidManagementPage() {
  const [blokList, setBlokList] = useState<BlokWilayah[]>([]);
  const [rwCode, setRwCode] = useState("");
  const [masjidList, setMasjidList] = useState<RwMasjidItem[]>([]);
  const [filteredMasjidList, setFilteredMasjidList] = useState<RwMasjidItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBlokId, setFilterBlokId] = useState("ALL");
  const [filterRt, setFilterRt] = useState("ALL");
  const [isLoadingBlok, setIsLoadingBlok] = useState(true);
  const [isLoadingMasjid, setIsLoadingMasjid] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [createForm, setCreateForm] = useState<MasjidFormState>(initialFormState);
  const [editingMasjid, setEditingMasjid] = useState<RwMasjidItem | null>(null);
  const [editForm, setEditForm] = useState<MasjidFormState>(initialFormState);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingMasjid, setDeletingMasjid] = useState<RwMasjidItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Approval state
  const [pendingItems, setPendingItems] = useState<PendingPengurusItem[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [activeSearch, setActiveSearch] = useState("");
  const [approvalSearch, setApprovalSearch] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [currentApprovalPage, setCurrentApprovalPage] = useState(1);
  const approvalsPerPage = 5;

  // Approved Pengurus States
  const [pengurusList, setPengurusList] = useState<RwPengurusItem[]>([]);
  const [filteredPengurusList, setFilteredPengurusList] = useState<RwPengurusItem[]>([]);
  const [isLoadingPengurus, setIsLoadingPengurus] = useState(false);
  const [pengurusSearchTerm, setPengurusSearchTerm] = useState("");
  const [pengurusFilterBlokId, setPengurusFilterBlokId] = useState("");
  const [pengurusFilterRt, setPengurusFilterRt] = useState("");
  const [pengurusFilterMasjidId, setPengurusFilterMasjidId] = useState("");

  const [showAddPengurusForm, setShowAddPengurusForm] = useState(false);
  const [createPengurusForm, setCreatePengurusForm] = useState<PengurusFormState>(initialPengurusForm);
  const [editingPengurus, setEditingPengurus] = useState<RwPengurusItem | null>(null);
  const [editPengurusForm, setEditPengurusForm] = useState<PengurusFormState>(initialPengurusForm);
  const [deletingPengurus, setDeletingPengurus] = useState<RwPengurusItem | null>(null);
  const [isDeletingPengurus, setIsDeletingPengurus] = useState(false);
  const [deletePengurusConfirmText, setDeletePengurusConfirmText] = useState("");

  // Pagination for Pengurus
  const [currentPengurusPage, setCurrentPengurusPage] = useState(1);
  const pengurusItemsPerPage = 10;

  const hasBlok = blokList.length > 0;

  const loadBlok = useCallback(async () => {
    setIsLoadingBlok(true);
    try {
      const response = await api.get<BlokListResponse>("/rw/blok-wilayah");
      const list = response.data.data.blok_list ?? [];
      setBlokList(list);
      setRwCode(response.data.data.wilayah_rw.no_rw ?? "");
      if (list.length > 0) {
        setCreateForm((prev) => ({
          ...prev,
          blok_wilayah_id: prev.blok_wilayah_id || list[0].id,
        }));
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setBlokList([]);
    } finally {
      setIsLoadingBlok(false);
    }
  }, []);

  const fetchPending = useCallback(async (search: string) => {
    setIsLoadingPending(true);
    try {
      const response = await api.get<PendingPengurusResponse>("/auth/pending-pengurus", {
        params: search.trim() ? { search: search.trim() } : {},
      });
      setPendingItems(response.data.data ?? []);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setPendingItems([]);
    } finally {
      setIsLoadingPending(false);
    }
  }, []);

  const [approveState, approveAction, isSubmittingApproval] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      const userId = String(formData.get("user_id") ?? "").trim();
      const statusAkun = String(formData.get("status_akun") ?? "").trim();
      if (!userId) return { message: "user_id wajib.", fieldErrors: {} };
      try {
        await api.patch("/auth/approve-pengurus", { user_id: userId, status_akun: statusAkun });
        toast.success(statusAkun === "APPROVED" ? "Pengurus berhasil di-approve." : "Pengurus berhasil di-reject.");
        await fetchPending(activeSearch);
        await fetchMasjid();
        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialActionState
  );

  const fetchMasjid = useCallback(async () => {
    setIsLoadingMasjid(true);
    try {
      const response = await api.get<RwMasjidListResponse>("/rw/masjid");
      setMasjidList(response.data.data ?? []);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setMasjidList([]);
    } finally {
      setIsLoadingMasjid(false);
    }
  }, []);

  const fetchPengurus = useCallback(async () => {
    setIsLoadingPengurus(true);
    try {
      const response = await api.get<{ data: RwPengurusItem[] }>("/rw/pengurus-masjid");
      setPengurusList(response.data.data ?? []);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setPengurusList([]);
    } finally {
      setIsLoadingPengurus(false);
    }
  }, []);

  useEffect(() => { loadBlok(); }, [loadBlok]);

  useEffect(() => {
    fetchMasjid().catch(() => {
      toast.error("Gagal memuat daftar masjid.");
      setMasjidList([]);
      setIsLoadingMasjid(false);
    });
    fetchPengurus().catch(() => {
      toast.error("Gagal memuat daftar pengurus masjid.");
      setPengurusList([]);
      setIsLoadingPengurus(false);
    });
  }, [fetchMasjid, fetchPengurus]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPending(approvalSearch).catch(() => {
        toast.error("Gagal memuat daftar approval.");
        setIsLoadingPending(false);
      });
      setActiveSearch(approvalSearch);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [approvalSearch, fetchPending]);

  // Frontend filtering
  useEffect(() => {
    let result = masjidList;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.nama_masjid.toLowerCase().includes(q) ||
          m.alamat.toLowerCase().includes(q)
      );
    }

    if (filterBlokId !== "ALL") {
      result = result.filter((m) => m.blok_wilayah_id === filterBlokId);
    }

    if (filterRt !== "ALL") {
      result = result.filter((m) => String(m.blok_wilayah.no_rt) === filterRt);
    }

    setFilteredMasjidList(result);
  }, [searchTerm, filterBlokId, filterRt, masjidList]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBlokId, filterRt]);

  const totalPages = Math.ceil(filteredMasjidList.length / itemsPerPage);

  const paginatedMasjidList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMasjidList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMasjidList, currentPage, itemsPerPage]);

  // Reset approval page when search changes
  useEffect(() => {
    setCurrentApprovalPage(1);
  }, [approvalSearch]);

  const totalApprovalPages = Math.ceil(pendingItems.length / approvalsPerPage);

  const paginatedPendingItems = useMemo(() => {
    const startIndex = (currentApprovalPage - 1) * approvalsPerPage;
    return pendingItems.slice(startIndex, startIndex + approvalsPerPage);
  }, [pendingItems, currentApprovalPage, approvalsPerPage]);

  // Frontend filtering for Pengurus
  useEffect(() => {
    let result = pengurusList;

    if (pengurusSearchTerm.trim()) {
      const q = pengurusSearchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.nama.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.no_hp.toLowerCase().includes(q)
      );
    }

    if (pengurusFilterBlokId && pengurusFilterBlokId !== "ALL") {
      const selectedBlok = blokList.find((b) => b.id === pengurusFilterBlokId);
      if (selectedBlok) {
        result = result.filter((p) => p.masjid.nama_blok === selectedBlok.nama_blok);
      }
    }

    if (pengurusFilterRt && pengurusFilterRt !== "ALL") {
      result = result.filter((p) => String(p.masjid.no_rt) === pengurusFilterRt);
    }

    setFilteredPengurusList(result);
  }, [pengurusSearchTerm, pengurusFilterBlokId, pengurusFilterRt, pengurusList, blokList]);

  // Reset page when pengurus filter changes
  useEffect(() => {
    setCurrentPengurusPage(1);
  }, [pengurusSearchTerm, pengurusFilterBlokId, pengurusFilterRt]);

  const totalPengurusPages = Math.ceil(filteredPengurusList.length / pengurusItemsPerPage);

  const paginatedPengurusList = useMemo(() => {
    const startIndex = (currentPengurusPage - 1) * pengurusItemsPerPage;
    return filteredPengurusList.slice(startIndex, startIndex + pengurusItemsPerPage);
  }, [filteredPengurusList, currentPengurusPage, pengurusItemsPerPage]);

  const handleCreatePengurusSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !createPengurusForm.nama.trim() ||
      !createPengurusForm.email.trim() ||
      !createPengurusForm.no_hp.trim() ||
      !createPengurusForm.password ||
      !createPengurusForm.masjid_id
    ) {
      toast.error("Semua kolom wajib diisi.");
      return;
    }

    try {
      await api.post("/rw/pengurus-masjid", createPengurusForm);
      toast.success("Pengurus masjid berhasil ditambahkan.");
      setShowAddPengurusForm(false);
      setCreatePengurusForm(initialPengurusForm);
      await fetchPengurus();
      await fetchMasjid();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    }
  };

  const handleEditPengurusSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPengurus) return;

    if (
      !editPengurusForm.nama.trim() ||
      !editPengurusForm.email.trim() ||
      !editPengurusForm.no_hp.trim() ||
      !editPengurusForm.masjid_id
    ) {
      toast.error("Nama, email, nomor HP, dan masjid wajib diisi.");
      return;
    }

    try {
      await api.patch(`/rw/pengurus-masjid/${editingPengurus.user_id}`, editPengurusForm);
      toast.success("Pengurus masjid berhasil diperbarui.");
      setEditingPengurus(null);
      setEditPengurusForm(initialPengurusForm);
      await fetchPengurus();
      await fetchMasjid();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    }
  };

  const handleDeletePengurus = async () => {
    if (!deletingPengurus) return;
    setIsDeletingPengurus(true);

    try {
      await api.delete(`/rw/pengurus-masjid/${deletingPengurus.user_id}`);
      toast.success("Pengurus masjid berhasil dihapus.");
      setDeletingPengurus(null);
      setDeletePengurusConfirmText("");
      await fetchPengurus();
      await fetchMasjid();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsDeletingPengurus(false);
    }
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.blok_wilayah_id || !createForm.nama_masjid.trim() || !createForm.alamat.trim()) {
      toast.error("Semua kolom wajib diisi.");
      return;
    }
    setIsSubmittingCreate(true);
    try {
      await api.post("/rw/masjid", {
        blok_wilayah_id: createForm.blok_wilayah_id,
        nama_masjid: createForm.nama_masjid.trim(),
        alamat: createForm.alamat.trim(),
      });
      toast.success("Masjid berhasil ditambahkan!");
      setCreateForm((prev) => ({ ...prev, nama_masjid: "", alamat: "" }));
      setShowAddForm(false);
      await fetchMasjid();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const openEditDialog = (item: RwMasjidItem) => {
    setEditingMasjid(item);
    setEditForm({ blok_wilayah_id: item.blok_wilayah_id, nama_masjid: item.nama_masjid, alamat: item.alamat });
  };

  const handleUpdateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMasjid) return;
    if (!editForm.blok_wilayah_id || !editForm.nama_masjid.trim() || !editForm.alamat.trim()) {
      toast.error("Semua kolom wajib diisi.");
      return;
    }
    setIsSubmittingUpdate(true);
    try {
      await api.patch(`/rw/masjid/${editingMasjid.id}`, {
        blok_wilayah_id: editForm.blok_wilayah_id,
        nama_masjid: editForm.nama_masjid.trim(),
        alamat: editForm.alamat.trim(),
      });
      toast.success("Data masjid berhasil diperbarui!");
      setEditingMasjid(null);
      await fetchMasjid();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const openDeleteDialog = (item: RwMasjidItem) => {
    const pengurusCount = item.pengurus_masjid?.length ?? 0;
    if (pengurusCount > 0) {
      toast.error("Masjid masih memiliki pengurus yang terdaftar. Harap hapus akun pengurus terlebih dahulu.");
      return;
    }
    setDeletingMasjid(item);
    setDeleteConfirmText("");
  };

  const handleDeleteMasjid = async () => {
    if (!deletingMasjid) return;
    setIsDeleting(true);
    try {
      await api.delete(`/rw/masjid/${deletingMasjid.id}`);
      toast.success("Masjid berhasil dihapus.");
      setDeletingMasjid(null);
      await fetchMasjid();
      await fetchPending(activeSearch);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const blokOptions = useMemo(() => blokList.map((blok) => ({
    value: blok.id,
    label: formatBlokLabel(blok, rwCode),
  })), [blokList, rwCode]);

  const rtOptions = useMemo(() => {
    const rts = Array.from(new Set(blokList.map((b) => b.no_rt).filter(Boolean)));
    return rts.sort((a, b) => Number(a) - Number(b));
  }, [blokList]);

  const isFiltering = searchTerm || filterBlokId !== "ALL" || filterRt !== "ALL";

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <Building2 className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Data Masjid
            </h1>
            <p className="text-sm text-slate-500">
              Data masjid di seluruh wilayah RW
            </p>
          </div>
        </div>
      </header>



      {/* ── Approval Pengurus Masjid ── */}
      <section className="rounded-3xl border border-amber-200/70 bg-amber-50/60 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-amber-100">
              <ShieldCheck className="size-5 text-amber-600" />
            </span>
            <div>
              <h2 className="text-base font-bold text-amber-900">Persetujuan Pengurus Masjid</h2>
              <p className="text-xs text-amber-700">
                {isLoadingPending ? "Memuat..." : pendingItems.length > 0 ? `${pendingItems.length} pengajuan menunggu persetujuan` : "Tidak ada pengajuan pending"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={approvalSearch}
              onChange={(e) => setApprovalSearch(e.target.value)}
              placeholder="Cari nama / email..."
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
                <th className="px-5 py-3 text-left font-bold text-amber-700 text-xs uppercase tracking-wider">Pengurus</th>
                <th className="px-5 py-3 text-left font-bold text-amber-700 text-xs uppercase tracking-wider hidden sm:table-cell">Masjid</th>
                <th className="px-5 py-3 text-left font-bold text-amber-700 text-xs uppercase tracking-wider hidden lg:table-cell">Diajukan</th>
                <th className="px-5 py-3 text-right font-bold text-amber-700 text-xs uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {isLoadingPending ? (
                <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : pendingItems.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <CheckCircle2 className="size-8 text-emerald-400" />
                    <span className="text-sm">Tidak ada pengajuan pending.</span>
                  </div>
                </td></tr>
              ) : (
                paginatedPendingItems.map((item) => (
                  <tr key={item.user_id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-extrabold text-indigo-600">
                          {getInitials(item.nama)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{item.nama}</p>
                          <p className="text-xs text-slate-400 truncate">{item.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <p className="font-semibold text-slate-800 text-sm">{item.masjid.nama_masjid}</p>
                      <p className="text-xs text-slate-400">{item.masjid.nama_blok}</p>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-slate-400" />
                        {formatDateTime(item.created_at)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <form action={approveAction}>
                          <input type="hidden" name="user_id" value={item.user_id} />
                          <input type="hidden" name="status_akun" value="APPROVED" />
                          <Button type="submit" size="sm" disabled={isSubmittingApproval} className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5">
                            <CheckCircle2 className="size-3.5" />
                            Approve
                          </Button>
                        </form>
                        <RejectDialog
                          userId={item.user_id}
                          disabled={isSubmittingApproval}
                          onRejected={() => { fetchPending(activeSearch); fetchMasjid(); }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination for Pending Items */}
          {!isLoadingPending && pendingItems.length > 0 && (
            <div className="flex items-center justify-between border-t border-amber-100 bg-amber-50/20 px-5 py-3 rounded-b-2xl">
              <span className="text-xs font-semibold text-amber-700">
                Menampilkan {Math.min(pendingItems.length, (currentApprovalPage - 1) * approvalsPerPage + 1)} –{" "}
                {Math.min(pendingItems.length, currentApprovalPage * approvalsPerPage)} dari{" "}
                {pendingItems.length} pengajuan
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

      {/* ── Daftar Masjid ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">Daftar Masjid</h2>
          </div>
          <div className="flex items-center gap-3">
            {!isLoadingMasjid && (
              <span className="text-sm text-slate-500 tabular-nums">
                {filteredMasjidList.length} masjid ditemukan
              </span>
            )}
            <Button
              onClick={() => {
                setEditingMasjid(null);
                setCreateForm(initialFormState);
                setShowAddForm((v) => !v);
              }}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-100 transition-all text-xs flex items-center gap-1.5"
            >
              <Plus className="size-3.5" />
              Tambah Masjid
            </Button>
          </div>
        </div>

        {/* ── Form Tambah (collapsible) ── */}
        {showAddForm && (
          <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-6 shadow-sm">
            {/* Form header */}
            <div className="flex items-center gap-2.5 mb-5">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-indigo-100">
                <Plus className="size-5 text-indigo-600" />
              </span>
              <h2 className="text-base font-bold text-indigo-800">Tambah Masjid Baru</h2>
            </div>

            <form className="space-y-4" onSubmit={handleCreateSubmit}>
              {/* Blok Wilayah — full width */}
              <div className="space-y-1.5">
                <Label htmlFor="create-blok" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <MapPin className="size-4 text-indigo-500" />
                  Blok Wilayah
                </Label>
                <Select
                  value={createForm.blok_wilayah_id}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, blok_wilayah_id: value }))}
                  disabled={isLoadingBlok || !hasBlok || isSubmittingCreate}
                >
                  <SelectTrigger id="create-blok" className="!h-11 !rounded-xl w-full text-sm">
                    <SelectValue placeholder="Pilih blok wilayah" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                    {blokOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="!text-sm !py-2 !px-3 !rounded-lg">{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nama Masjid + Alamat — side by side */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-nama" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Building2 className="size-4 text-indigo-500" />
                    Nama Masjid
                  </Label>
                  <Input
                    id="create-nama"
                    value={createForm.nama_masjid}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, nama_masjid: e.target.value }))}
                    placeholder="Contoh: Masjid Al-Ikhlas"
                    disabled={isSubmittingCreate || !hasBlok}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-alamat" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <MapPin className="size-4 text-indigo-500" />
                    Alamat
                  </Label>
                  <Input
                    id="create-alamat"
                    value={createForm.alamat}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, alamat: e.target.value }))}
                    placeholder="Contoh: Jl. Melati Blok B2"
                    disabled={isSubmittingCreate || !hasBlok}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="h-11 px-5 rounded-xl text-sm font-semibold border-slate-200"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingCreate || !hasBlok}
                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-sm text-sm"
                >
                  {isSubmittingCreate ? (
                    <><Loader2 className="size-4 mr-2 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Plus className="size-4 mr-2" /> Simpan Masjid</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Filter & Search ── */}
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Search className="size-4 text-indigo-500" />
            Cari & Saring Masjid
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama masjid atau alamat..."
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
                <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Blok</SelectItem>
                {blokOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="!text-sm !py-2 !px-3 !rounded-lg">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Filter RT */}
            <Select value={filterRt} onValueChange={setFilterRt}>
              <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[140px] font-medium transition-all ${filterRt !== "ALL"
                ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"
                }`}>
                <GitBranch className={`size-4 mr-1 shrink-0 ${filterRt !== "ALL" ? "text-indigo-500" : "text-slate-400"}`} />
                <SelectValue placeholder="Semua RT" />
              </SelectTrigger>
              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua RT</SelectItem>
                {rtOptions.map((rt) => (
                  <SelectItem key={rt!} value={rt!} className="!text-sm !py-2 !px-3 !rounded-lg">
                    RT {rt!.padStart(3, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Reset */}
            {isFiltering && (
              <Button
                variant="outline"
                onClick={() => { setSearchTerm(""); setFilterBlokId("ALL"); setFilterRt("ALL"); }}
                className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-sm transition-all"
              >
                <RotateCcw className="size-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {isLoadingMasjid ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-indigo-200 border-t-indigo-500 mx-auto" />
            <p className="mt-4 text-base font-semibold text-slate-500">Memuat data masjid...</p>
          </div>
        ) : filteredMasjidList.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
              <Building2 className="size-8 text-slate-400" />
            </span>
            <p className="text-lg font-bold text-slate-600">Belum Ada Masjid</p>
            <p className="text-sm text-slate-400 mt-1">
              {isFiltering ? "Tidak ada masjid yang cocok dengan filter Anda." : "Klik tombol \"Tambah Masjid\" untuk mendaftarkan masjid pertama."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">No</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Nama Masjid</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Alamat</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Lokasi</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Pengurus</th>
                  <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMasjidList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                          <Building2 className="size-4 text-indigo-600" />
                        </span>
                        <span className="font-extrabold text-slate-900 leading-snug line-clamp-2">{item.nama_masjid}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[250px] whitespace-normal break-words">
                      <span className="leading-snug">{item.alamat}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-200">
                        <MapPin className="size-3.5 shrink-0 text-slate-400" />
                        {formatBlokName(item.blok_wilayah.nama_blok)}
                        {item.blok_wilayah.no_rt ? ` · RT ${formatAreaCode(item.blok_wilayah.no_rt)}` : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.pengurus_masjid && item.pengurus_masjid.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {item.pengurus_masjid.map((p, i) => (
                            <span key={i} className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 w-fit">
                              {p.user.nama}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 italic">Belum ada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Dialog
                          open={editingMasjid?.id === item.id}
                          onOpenChange={(open) => { if (!open) setEditingMasjid(null); }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              onClick={() => openEditDialog(item)}
                              variant="ghost"
                              className="h-9 px-3 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors"
                            >
                              <Pencil className="size-4 mr-1.5" />
                              Ubah
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-3xl">
                            <DialogHeader>
                              <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                                <Pencil className="size-5 text-indigo-600" />
                                Ubah Data Masjid
                              </DialogTitle>
                              <DialogDescription>
                                Perbarui informasi masjid sesuai data terbaru.
                              </DialogDescription>
                            </DialogHeader>

                            <form className="space-y-4 mt-2" onSubmit={handleUpdateSubmit}>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-blok" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                  <MapPin className="size-4 text-indigo-500" /> Blok Wilayah
                                </Label>
                                <Select
                                  value={editForm.blok_wilayah_id}
                                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, blok_wilayah_id: value }))}
                                  disabled={isSubmittingUpdate}
                                >
                                  <SelectTrigger id="edit-blok" className="!h-11 !rounded-xl w-full text-sm">
                                    <SelectValue placeholder="Pilih blok wilayah" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                                    {blokOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value} className="!text-sm !py-2 !px-3 !rounded-lg">{option.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <Label htmlFor="edit-nama" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                  <Building2 className="size-4 text-indigo-500" /> Nama Masjid
                                </Label>
                                <Input
                                  id="edit-nama"
                                  value={editForm.nama_masjid}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, nama_masjid: e.target.value }))}
                                  disabled={isSubmittingUpdate}
                                  className="h-11 rounded-xl text-sm"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label htmlFor="edit-alamat" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                  <MapPin className="size-4 text-indigo-500" /> Alamat
                                </Label>
                                <Input
                                  id="edit-alamat"
                                  value={editForm.alamat}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, alamat: e.target.value }))}
                                  disabled={isSubmittingUpdate}
                                  className="h-11 rounded-xl text-sm"
                                />
                              </div>

                              <DialogFooter className="pt-2">
                                <Button
                                  type="submit"
                                  disabled={isSubmittingUpdate}
                                  className="h-11 px-6 rounded-xl w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-sm text-sm"
                                >
                                  {isSubmittingUpdate ? (
                                    <><Loader2 className="size-4 mr-2 animate-spin" /> Menyimpan...</>
                                  ) : (
                                    "Simpan Perubahan"
                                  )}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => openDeleteDialog(item)}
                          className="h-9 px-3 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 font-semibold transition-colors"
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

            {/* Pagination */}
            {filteredMasjidList.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 rounded-b-3xl">
                <span className="text-xs font-semibold text-slate-500">
                  Menampilkan {Math.min(filteredMasjidList.length, (currentPage - 1) * itemsPerPage + 1)} –{" "}
                  {Math.min(filteredMasjidList.length, currentPage * itemsPerPage)} dari{" "}
                  {filteredMasjidList.length} masjid
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-xs font-bold text-slate-700 px-2 min-w-16 text-center">
                    Hal {currentPage} dari {Math.max(totalPages, 1)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
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

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deletingMasjid} onOpenChange={(open) => { if (!open) setDeletingMasjid(null); }}>
        <DialogContent className="sm:max-w-md !rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" />
              Hapus Masjid
            </DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data masjid{" "}
              <span className="font-bold text-slate-700">{deletingMasjid?.nama_masjid}</span>{" "}
              beserta seluruh data terkait akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-slate-600">Ketik <span className="font-bold text-red-600">HAPUS</span> untuk mengkonfirmasi:</p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Ketik HAPUS di sini"
              className="h-11 rounded-xl"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDeletingMasjid(null)}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleDeleteMasjid}
              disabled={deleteConfirmText !== "HAPUS" || isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeleting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menghapus...</> : <><Trash2 className="size-4 mr-2" /> Hapus Permanen</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* ── Daftar Pengurus Masjid ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">Daftar Akun Pengurus Masjid</h2>
          </div>
          <div className="flex items-center gap-3">
            {!isLoadingPengurus && (
              <span className="text-sm text-slate-500 tabular-nums">
                {filteredPengurusList.length} pengurus terdaftar
              </span>
            )}
            <Button
              onClick={() => {
                setEditingPengurus(null);
                setCreatePengurusForm(initialPengurusForm);
                setShowAddPengurusForm((v) => !v);
              }}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-100 transition-all text-xs flex items-center gap-1.5"
            >
              <Plus className="size-3.5" />
              Tambah Pengurus
            </Button>
          </div>
        </div>

        {/* ── Form Tambah Pengurus (collapsible) ── */}
        {showAddPengurusForm && (
          <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-6 shadow-sm">
            {/* Form header */}
            <div className="flex items-center gap-2.5 mb-5">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-indigo-100">
                <UserPlus className="size-5 text-indigo-600" />
              </span>
              <h2 className="text-base font-bold text-indigo-800">Tambah Pengurus Masjid Baru</h2>
            </div>

            <form onSubmit={handleCreatePengurusSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">Nama Lengkap</Label>
                <Input
                  placeholder="Contoh: Bapak Taufik"
                  value={createPengurusForm.nama}
                  onChange={(e) => setCreatePengurusForm((prev) => ({ ...prev, nama: e.target.value }))}
                  className="h-11 rounded-xl text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">Email</Label>
                <Input
                  type="email"
                  placeholder="Contoh: taufik@mail.com"
                  value={createPengurusForm.email}
                  onChange={(e) => setCreatePengurusForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="h-11 rounded-xl text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">Nomor HP</Label>
                <Input
                  placeholder="Contoh: 081234567890"
                  value={createPengurusForm.no_hp}
                  onChange={(e) => setCreatePengurusForm((prev) => ({ ...prev, no_hp: e.target.value }))}
                  className="h-11 rounded-xl text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">Password</Label>
                <Input
                  type="password"
                  placeholder="Masukkan password akun"
                  value={createPengurusForm.password}
                  onChange={(e) => setCreatePengurusForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="h-11 rounded-xl text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">Masjid Dikelola</Label>
                <Select
                  value={createPengurusForm.masjid_id}
                  onValueChange={(value) => setCreatePengurusForm((prev) => ({ ...prev, masjid_id: value }))}
                >
                  <SelectTrigger className="!h-11 !rounded-xl w-full text-sm bg-white">
                    <SelectValue placeholder="Pilih masjid yang akan dikelola" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                    {masjidList.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="!text-sm !py-2 !px-3 !rounded-lg">
                        {m.nama_masjid} ({formatBlokName(m.blok_wilayah.nama_blok)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAddPengurusForm(false);
                    setCreatePengurusForm(initialPengurusForm);
                  }}
                  className="h-11 px-5 rounded-xl font-bold transition-all text-sm text-slate-600"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all text-sm flex items-center gap-2 shadow-md shadow-indigo-200"
                >
                  <Plus className="size-4" /> Tambah Pengurus
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Filter & Search Pengurus ── */}
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Search className="size-4 text-indigo-500" />
            Cari & Saring Pengurus
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={pengurusSearchTerm}
                onChange={(e) => setPengurusSearchTerm(e.target.value)}
                placeholder="Cari nama, email, atau no HP..."
                className="pl-10 h-11 rounded-xl text-base w-full"
              />
            </div>
            {/* Filter blok */}
            <Select value={pengurusFilterBlokId} onValueChange={setPengurusFilterBlokId}>
              <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[170px] font-medium transition-all ${pengurusFilterBlokId && pengurusFilterBlokId !== "ALL"
                ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"
                }`}>
                <MapPin className={`size-4 mr-1 shrink-0 ${pengurusFilterBlokId && pengurusFilterBlokId !== "ALL" ? "text-indigo-500" : "text-slate-400"}`} />
                <SelectValue placeholder="Semua Blok" />
              </SelectTrigger>
              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua Blok</SelectItem>
                {blokOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="!text-sm !py-2 !px-3 !rounded-lg">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Filter RT */}
            <Select value={pengurusFilterRt} onValueChange={setPengurusFilterRt}>
              <SelectTrigger className={`!h-11 !rounded-xl text-sm !w-auto min-w-[140px] font-medium transition-all ${pengurusFilterRt && pengurusFilterRt !== "ALL"
                ? "!bg-indigo-50 !border-indigo-400 !text-indigo-700 shadow-sm"
                : "!bg-white !border-slate-200 !text-slate-600 hover:!border-indigo-300"
                }`}>
                <GitBranch className={`size-4 mr-1 shrink-0 ${pengurusFilterRt && pengurusFilterRt !== "ALL" ? "text-indigo-500" : "text-slate-400"}`} />
                <SelectValue placeholder="Semua RT" />
              </SelectTrigger>
              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                <SelectItem value="ALL" className="!text-sm !py-2 !px-3 !rounded-lg">Semua RT</SelectItem>
                {rtOptions.map((rt) => (
                  <SelectItem key={rt!} value={rt!} className="!text-sm !py-2 !px-3 !rounded-lg">
                    RT {rt!.padStart(3, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Reset */}
            {(pengurusSearchTerm || (pengurusFilterBlokId && pengurusFilterBlokId !== "ALL") || (pengurusFilterRt && pengurusFilterRt !== "ALL")) && (
              <Button
                variant="outline"
                onClick={() => { setPengurusSearchTerm(""); setPengurusFilterBlokId("ALL"); setPengurusFilterRt("ALL"); }}
                className="h-11 px-4 rounded-xl text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 shrink-0 font-semibold shadow-sm transition-all"
              >
                <RotateCcw className="size-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {isLoadingPengurus ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <div className="inline-flex size-14 animate-spin items-center justify-center rounded-full border-4 border-indigo-200 border-t-indigo-500 mx-auto" />
            <p className="mt-4 text-base font-semibold text-slate-500">Memuat data pengurus...</p>
          </div>
        ) : filteredPengurusList.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-16 text-center shadow-sm">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
              <Users className="size-8 text-slate-400" />
            </span>
            <p className="text-lg font-bold text-slate-600">Belum Ada Pengurus Masjid</p>
            <p className="text-sm text-slate-400 mt-1">
              {pengurusSearchTerm || (pengurusFilterBlokId && pengurusFilterBlokId !== "ALL") || (pengurusFilterRt && pengurusFilterRt !== "ALL")
                ? "Tidak ada pengurus yang cocok dengan filter Anda."
                : "Klik tombol \"Tambah Pengurus\" untuk mendaftarkan pengurus masjid pertama."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">No</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Nama Pengurus</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Kontak</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Masjid Dikelola</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Diajukan/Terdaftar</th>
                  <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPengurusList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-slate-500 font-medium">{(currentPengurusPage - 1) * pengurusItemsPerPage + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-extrabold text-indigo-600">
                          {getInitials(item.nama)}
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
                      <p className="font-semibold text-slate-800 text-sm">{item.masjid.nama_masjid}</p>
                      <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 font-semibold text-[10px] px-2 py-0.5 mt-1 rounded border border-slate-200">
                        <MapPin className="size-3 shrink-0 text-slate-400" />
                        {formatBlokName(item.masjid.nama_blok)}
                        {item.masjid.no_rt ? ` · RT ${formatAreaCode(item.masjid.no_rt)}` : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Dialog
                          open={editingPengurus?.id === item.id}
                          onOpenChange={(open) => {
                            if (!open) setEditingPengurus(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              onClick={() => {
                                setEditingPengurus(item);
                                setEditPengurusForm({
                                  nama: item.nama,
                                  email: item.email,
                                  no_hp: item.no_hp,
                                  password: "",
                                  masjid_id: item.masjid_id,
                                });
                              }}
                              variant="ghost"
                              className="h-9 px-3 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors"
                            >
                              <Pencil className="size-4 mr-1.5" />
                              Ubah
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-3xl">
                            <DialogHeader>
                              <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                                <Pencil className="size-5 text-indigo-600" />
                                Ubah Data Pengurus
                              </DialogTitle>
                              <DialogDescription>
                                Perbarui informasi pengurus masjid sesuai data terbaru.
                              </DialogDescription>
                            </DialogHeader>

                            <form className="space-y-4 mt-2" onSubmit={handleEditPengurusSubmit}>
                              <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-slate-700">Nama Lengkap</Label>
                                <Input
                                  value={editPengurusForm.nama}
                                  onChange={(e) => setEditPengurusForm((prev) => ({ ...prev, nama: e.target.value }))}
                                  className="h-11 rounded-xl text-sm"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-slate-700">Email</Label>
                                <Input
                                  type="email"
                                  value={editPengurusForm.email}
                                  onChange={(e) => setEditPengurusForm((prev) => ({ ...prev, email: e.target.value }))}
                                  className="h-11 rounded-xl text-sm"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-slate-700">Nomor HP</Label>
                                <Input
                                  value={editPengurusForm.no_hp}
                                  onChange={(e) => setEditPengurusForm((prev) => ({ ...prev, no_hp: e.target.value }))}
                                  className="h-11 rounded-xl text-sm"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-slate-700">Password Baru (Opsional)</Label>
                                <Input
                                  type="password"
                                  placeholder="Kosongkan jika tidak ingin mengubah"
                                  value={editPengurusForm.password}
                                  onChange={(e) => setEditPengurusForm((prev) => ({ ...prev, password: e.target.value }))}
                                  className="h-11 rounded-xl text-sm"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-slate-700">Masjid Dikelola</Label>
                                <Select
                                  value={editPengurusForm.masjid_id}
                                  onValueChange={(value) => setEditPengurusForm((prev) => ({ ...prev, masjid_id: value }))}
                                >
                                  <SelectTrigger className="!h-11 !rounded-xl w-full text-sm">
                                    <SelectValue placeholder="Pilih masjid yang dikelola" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] !rounded-xl !p-1.5 shadow-lg border border-slate-100">
                                    {masjidList.map((m) => (
                                      <SelectItem key={m.id} value={m.id} className="!text-sm !py-2 !px-3 !rounded-lg">
                                        {m.nama_masjid} ({formatBlokName(m.blok_wilayah.nama_blok)})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setEditingPengurus(null)} className="rounded-xl">Batal</Button>
                                <Button type="submit" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                  Simpan Perubahan
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={deletingPengurus?.id === item.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setDeletingPengurus(null);
                              setDeletePengurusConfirmText("");
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              onClick={() => {
                                setDeletingPengurus(item);
                                setDeletePengurusConfirmText("");
                              }}
                              variant="ghost"
                              className="h-9 px-3 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-semibold transition-colors"
                            >
                              <Trash2 className="size-4 mr-1.5" />
                              Hapus
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-3xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-rose-600">
                                <AlertTriangle className="size-5 text-rose-500" />
                                Hapus Akun Pengurus
                              </DialogTitle>
                              <DialogDescription>
                                Apakah Anda yakin ingin menghapus akun pengurus masjid ini? Tindakan ini tidak dapat dibatalkan.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-3 py-2">
                              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-600 space-y-1.5">
                                <p><strong>Nama:</strong> {item.nama}</p>
                                <p><strong>Email:</strong> {item.email}</p>
                                <p><strong>Masjid Dikelola:</strong> {item.masjid.nama_masjid}</p>
                              </div>

                              <div className="space-y-1.5">
                                <Label htmlFor="delete-pengurus-confirm" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  Ketik <span className="font-extrabold text-rose-600 font-mono">HAPUS PENGURUS</span> untuk mengonfirmasi
                                </Label>
                                <Input
                                  id="delete-pengurus-confirm"
                                  value={deletePengurusConfirmText}
                                  onChange={(e) => setDeletePengurusConfirmText(e.target.value)}
                                  placeholder="Ketik konfirmasi di sini"
                                  className="h-11 rounded-xl text-sm"
                                />
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setDeletingPengurus(null);
                                  setDeletePengurusConfirmText("");
                                }}
                                className="rounded-xl"
                              >
                                Batal
                              </Button>
                              <Button
                                onClick={handleDeletePengurus}
                                disabled={deletePengurusConfirmText !== "HAPUS PENGURUS" || isDeletingPengurus}
                                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                              >
                                {isDeletingPengurus ? <><Loader2 className="size-4 mr-2 animate-spin" /> Menghapus...</> : "Hapus Akun Pengurus"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination for Pengurus */}
            {!isLoadingPengurus && filteredPengurusList.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4 rounded-b-3xl">
                <span className="text-xs font-semibold text-slate-500">
                  Menampilkan {Math.min(filteredPengurusList.length, (currentPengurusPage - 1) * pengurusItemsPerPage + 1)} –{" "}
                  {Math.min(filteredPengurusList.length, currentPengurusPage * pengurusItemsPerPage)} dari{" "}
                  {filteredPengurusList.length} pengurus masjid
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPengurusPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPengurusPage === 1}
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-xs font-bold text-slate-700 px-2 min-w-16 text-center">
                    Hal {currentPengurusPage} dari {Math.max(totalPengurusPages, 1)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPengurusPage((prev) => Math.min(prev + 1, totalPengurusPages))}
                    disabled={currentPengurusPage === totalPengurusPages || totalPengurusPages === 0}
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function RejectDialog({
  userId,
  disabled,
  onRejected,
}: {
  userId: string;
  disabled: boolean;
  onRejected: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReject = async () => {
    if (!alasan.trim()) {
      toast.error("Alasan penolakan wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch("/auth/approve-pengurus", {
        user_id: userId,
        status_akun: "REJECTED",
        alasan_penolakan: alasan.trim(),
      });
      toast.success("Pengurus berhasil di-reject.");
      setOpen(false);
      setAlasan("");
      onRejected();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" disabled={disabled || isSubmitting} className="h-8 px-3 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold gap-1.5 border border-red-200">
          <XCircle className="size-3.5" />
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="size-5 text-red-500" />
            Tolak Pengajuan
          </DialogTitle>
          <DialogDescription>
            Masukkan alasan penolakan agar pengurus dapat memahami tindak lanjutnya.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 mt-2">
          <Label className="text-sm font-semibold text-slate-700">Alasan Penolakan</Label>
          <textarea
            rows={4}
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-input bg-white px-3.5 py-2.5 text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50 resize-none"
            placeholder="Contoh: Data administrasi belum lengkap atau tidak sesuai"
          />
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Batal</Button>
          <Button onClick={handleReject} disabled={isSubmitting || !alasan.trim()} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
            {isSubmitting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Memproses...</> : "Konfirmasi Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
