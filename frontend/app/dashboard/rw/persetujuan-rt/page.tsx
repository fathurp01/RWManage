"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckSquare,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  MapPin,
  Clock,
  Phone,
  Mail,
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
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
  };
}

interface PendingRTResponse {
  success: boolean;
  message: string;
  data: PendingRT[];
}

export default function PersetujuanRTPage() {
  const [pendingList, setPendingList] = useState<PendingRT[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedUser, setSelectedUser] = useState<PendingRT | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [alasanPenolakan, setAlasanPenolakan] = useState("");

  const loadData = useCallback(async (search?: string) => {
    setIsLoading(true);
    try {
      const url = search 
        ? `/auth/pending-rt?search=${encodeURIComponent(search)}` 
        : `/auth/pending-rt`;
      const res = await api.get<PendingRTResponse>(url);
      setPendingList(res.data.data || []);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Basic debounce for search
    const timer = setTimeout(() => {
      loadData(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, loadData]);

  const handleApprove = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await api.patch("/auth/approve-rt", {
        user_id: selectedUser.id,
        status_akun: "APPROVED",
      });
      toast.success(`Akun RT untuk ${selectedUser.nama} berhasil disetujui`);
      setShowApproveModal(false);
      setSelectedUser(null);
      loadData(searchTerm);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    if (!alasanPenolakan.trim()) {
      return toast.error("Alasan penolakan wajib diisi");
    }
    
    setIsSubmitting(true);
    try {
      await api.patch("/auth/approve-rt", {
        user_id: selectedUser.id,
        status_akun: "REJECTED",
        alasan_penolakan: alasanPenolakan,
      });
      toast.success(`Pendaftaran akun RT untuk ${selectedUser.nama} telah ditolak`);
      setShowRejectModal(false);
      setSelectedUser(null);
      setAlasanPenolakan("");
      loadData(searchTerm);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <CheckSquare className="w-32 h-32" />
        </div>
        <div className="flex items-center gap-4 relative">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <CheckSquare className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Persetujuan Akun RT
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Verifikasi pendaftaran Ketua RT baru di wilayah Anda
            </p>
          </div>
        </div>
        
        <div className="relative w-full sm:w-72 z-10">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, email, atau HP..."
            className="h-12 w-full rounded-xl pl-10 pr-4 bg-slate-50 border-slate-200 focus:bg-white text-sm"
          />
        </div>
      </header>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
          <Loader2 className="size-8 animate-spin text-indigo-500 mb-4" />
          <p className="text-slate-500 font-medium">Memuat data pendaftar...</p>
        </div>
      ) : pendingList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-slate-100 text-slate-400 mb-4">
            <CheckSquare className="size-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">
            {searchTerm ? "Pendaftar Tidak Ditemukan" : "Belum Ada Pendaftar Baru"}
          </h3>
          <p className="text-slate-500">
            {searchTerm 
              ? "Coba gunakan kata kunci pencarian yang lain." 
              : "Semua pendaftaran RT telah diproses atau belum ada yang mendaftar."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {pendingList.map((user) => (
            <div
              key={user.id}
              className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 hover:shadow-md hover:border-indigo-200 transition-all flex flex-col h-full"
            >
              {/* User Info Header */}
              <div className="flex gap-4 items-start mb-4">
                <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
                  <User className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-slate-900 truncate">
                    {user.nama}
                  </h3>
                  <div className="flex flex-col gap-1 mt-1.5">
                    <p className="text-sm text-slate-600 flex items-center gap-1.5 truncate">
                      <Mail className="size-3.5 text-slate-400" /> {user.email}
                    </p>
                    <p className="text-sm text-slate-600 flex items-center gap-1.5 truncate">
                      <Phone className="size-3.5 text-slate-400" /> {user.no_hp}
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Location */}
              <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100 flex items-start gap-2.5">
                <MapPin className="size-4 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Target Wilayah</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {user.blok_wilayah.nama_blok} (RT {user.blok_wilayah.no_rt || "—"})
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <Clock className="size-3.5" />
                  {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUser(user);
                      setAlasanPenolakan("");
                      setShowRejectModal(true);
                    }}
                    className="h-9 px-3 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <XCircle className="size-4 mr-1.5" />
                    Tolak
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowApproveModal(true);
                    }}
                    className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    <CheckCircle2 className="size-4 mr-1.5" />
                    Setujui
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="sm:max-w-md !rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-700">
              <CheckCircle2 className="size-6" />
              Setujui Akun RT
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Apakah Anda yakin ingin menyetujui <strong className="text-slate-900">{selectedUser?.nama}</strong> sebagai Ketua RT untuk blok <strong className="text-slate-900">{selectedUser?.blok_wilayah.nama_blok}</strong>? 
              <br/><br/>
              Setelah disetujui, akun ini bisa langsung login ke sistem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setShowApproveModal(false)} className="rounded-xl h-11 px-5">
              Batal
            </Button>
            <Button onClick={handleApprove} disabled={isSubmitting} className="rounded-xl h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSubmitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : "Ya, Setujui Akun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md !rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
              <XCircle className="size-6" />
              Tolak Pendaftaran RT
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Anda akan menolak pendaftaran dari <strong className="text-slate-900">{selectedUser?.nama}</strong>. Silakan tuliskan alasan penolakan.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <Label htmlFor="alasan" className="text-sm font-bold text-slate-700 mb-2 block">
              Alasan Penolakan <span className="text-red-500">*</span>
            </Label>
            <Input
              id="alasan"
              value={alasanPenolakan}
              onChange={(e) => setAlasanPenolakan(e.target.value)}
              placeholder="Contoh: Dokumen tidak valid, bukan warga sini, dll."
              className="h-11 rounded-xl text-base"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setShowRejectModal(false)} className="rounded-xl h-11 px-5">
              Batal
            </Button>
            <Button onClick={handleReject} disabled={isSubmitting || !alasanPenolakan.trim()} className="rounded-xl h-11 px-6 bg-red-600 hover:bg-red-700 text-white">
              {isSubmitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : "Ya, Tolak Pendaftaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
