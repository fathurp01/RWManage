"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Users, FileCheck } from "lucide-react";

interface ApprovableUser {
  id: string;
  nama: string;
  email: string;
  no_hp: string;
  role: string;
  status_akun: "PENDING" | "APPROVED" | "REJECTED";
  blok_wilayah_id?: string;
  nama_blok?: string;
  created_at: string;
  alasan_penolakan?: string;
}

interface ApprovalResponse {
  data: {
    pending: ApprovableUser[];
    approved: ApprovableUser[];
    rejected: ApprovableUser[];
    summary: {
      total_pending: number;
      total_approved: number;
      total_rejected: number;
    };
  };
}

export default function SuperadminDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApprovalResponse["data"] | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [searchNama, setSearchNama] = useState("");
  const [selectedUser, setSelectedUser] = useState<ApprovableUser | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ApprovalResponse>("/superadmin/approvals");
      setData(res.data.data);
    } catch (err: any) {
      const apiError = getApiError(err);
      setError(apiError.message);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentList = useMemo(() => {
    if (!data) return [];
    const list = data[activeTab] || [];
    return list.filter((user) => user.nama.toLowerCase().includes(searchNama.toLowerCase()));
  }, [data, activeTab, searchNama]);

  const handleApprove = async (userId: string) => {
    try {
      setActionLoading(true);
      await api.post(`/superadmin/approvals/${userId}/approve`);
      toast.success("User berhasil disetujui");
      await loadData();
      setShowDetailModal(false);
    } catch (err: any) {
      const apiError = getApiError(err);
      toast.error(apiError.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (userId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Alasan penolakan harus diisi");
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/superadmin/approvals/${userId}/reject`, {
        alasan_penolakan: rejectionReason,
      });
      toast.success("User berhasil ditolak");
      await loadData();
      setShowDetailModal(false);
      setRejectionReason("");
    } catch (err: any) {
      const apiError = getApiError(err);
      toast.error(apiError.message);
    } finally {
      setActionLoading(false);
    }
  };

  const statsCards = [
    {
      label: "Menunggu Persetujuan",
      value: data?.summary.total_pending ?? 0,
      icon: Clock,
      color: "bg-yellow-100 text-yellow-700",
    },
    {
      label: "Sudah Disetujui",
      value: data?.summary.total_approved ?? 0,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Ditolak",
      value: data?.summary.total_rejected ?? 0,
      icon: XCircle,
      color: "bg-red-100 text-red-700",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Error memuat data</p>
        <p className="text-sm">{error}</p>
        <Button onClick={loadData} className="mt-4" variant="outline">
          Coba Lagi
        </Button>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      RW: "Ketua RW",
      RT: "Ketua RT",
      PENGURUS_MASJID: "Pengurus Masjid",
      SUPERADMIN: "Superadmin",
    };
    return roleMap[role] || role;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Superadmin</h1>
        <p className="mt-2 text-gray-600">Kelola persetujuan akun pengguna sistem</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statsCards.map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <div className={`rounded-lg p-2 ${card.color}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["pending", "approved", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSearchNama("");
            }}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab === "pending" && "Menunggu Persetujuan"}
            {tab === "approved" && "Disetujui"}
            {tab === "rejected" && "Ditolak"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="cari-nama">Cari Nama atau Email</Label>
        <Input
          id="cari-nama"
          placeholder="Cari nama atau email pengguna..."
          value={searchNama}
          onChange={(e) => setSearchNama(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daftar Pengguna ({currentList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {currentList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
              <p>Tidak ada data pengguna</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>No HP</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Tanggal Daftar</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentList.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell className="font-medium">{userItem.nama}</TableCell>
                      <TableCell className="text-sm">{userItem.email}</TableCell>
                      <TableCell className="text-sm">{userItem.no_hp}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRoleLabel(userItem.role)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{userItem.nama_blok || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(userItem.created_at).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(userItem);
                            setRejectionReason(userItem.alasan_penolakan || "");
                            setShowDetailModal(true);
                          }}
                        >
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Pengguna</DialogTitle>
            <DialogDescription>Informasi lengkap dan aksi persetujuan</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Nama</p>
                <p className="text-base font-semibold">{selectedUser.nama}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-sm">{selectedUser.email}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">No HP</p>
                <p className="text-sm">{selectedUser.no_hp}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Role</p>
                <p className="text-sm">{getRoleLabel(selectedUser.role)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Lokasi</p>
                <p className="text-sm">{selectedUser.nama_blok || "Tidak ada lokasi"}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge className="mt-1">
                  {selectedUser.status_akun === "PENDING"
                    ? "Menunggu Persetujuan"
                    : selectedUser.status_akun === "APPROVED"
                      ? "Disetujui"
                      : "Ditolak"}
                </Badge>
              </div>

              {activeTab === "rejected" && selectedUser.alasan_penolakan && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Alasan Penolakan</p>
                  <p className="text-sm text-red-600">{selectedUser.alasan_penolakan}</p>
                </div>
              )}

              {activeTab === "pending" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="alasan">Alasan Penolakan (jika ditolak)</Label>
                    <Input
                      id="alasan"
                      placeholder="Isi jika ingin menolak..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleApprove(selectedUser.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Setujui
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedUser.id)}
                      disabled={actionLoading || !rejectionReason.trim()}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Tolak
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
