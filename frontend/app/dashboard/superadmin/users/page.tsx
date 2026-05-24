"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  UserPlus, 
  Loader2, 
  Search, 
  Trash2, 
  Edit, 
  KeyRound, 
  CheckCircle,
  XCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  nama: string;
  email: string;
  no_hp: string;
  role: string;
  status_akun: string;
  created_at: string;
  blok_wilayah_id: string | null;
  blok_wilayah?: {
    nama_blok: string;
    no_rt: string | null;
  } | null;
  pengurus_masjid?: {
    masjid_id: string;
    masjid: {
      nama_masjid: string;
    };
  }[];
}

interface PasswordReset {
  id: string;
  user_id: string;
  alasan: string;
  status: string;
  created_at: string;
  user: {
    nama: string;
    email: string;
    role: string;
  };
}

export default function SuperadminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [resets, setResets] = useState<PasswordReset[]>([]);
  const [loading, setLoading] = useState(true);

  // Dropdown options
  const [blokOptions, setBlokOptions] = useState<{ id: string; label: string }[]>([]);
  const [masjidOptions, setMasjidOptions] = useState<{ id: string; label: string }[]>([]);

  // Pagination states
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(10);
  const [resetPage, setResetPage] = useState(1);
  const [resetLimit, setResetLimit] = useState(10);

  const [activeTab, setActiveTab] = useState("rw");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);

  // Form states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    password: "",
    no_hp: "",
    role: "RW",
    status_akun: "APPROVED",
    blok_wilayah_id: "",
    masjid_id: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setUserPage(1);
  }, [searchQuery, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, resetsRes] = await Promise.all([
        api.get("/superadmin/users"),
        api.get("/superadmin/password-resets"),
      ]);
      setUsers(usersRes.data.data);
      setResets(resetsRes.data.data);
    } catch (error) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownOptions = async () => {
    try {
      const [wilayahRes, masjidRes] = await Promise.all([
        api.get("/public/wilayah-list"),
        api.get("/public/masjid-list"),
      ]);

      const flatBloks: { id: string; label: string }[] = [];
      wilayahRes.data.data.forEach((rw: any) => {
        rw.blok_wilayah.forEach((b: any) => {
          flatBloks.push({
            id: b.id,
            label: `${rw.nama_kompleks} (RW ${rw.no_rw}) - ${b.nama_blok} (RT ${b.no_rt || "-"})`,
          });
        });
      });
      setBlokOptions(flatBloks);

      const flatMasjids = masjidRes.data.data.masjid.map((m: any) => ({
        id: m.id,
        label: `${m.nama_masjid} (${m.nama_kompleks})`,
      }));
      setMasjidOptions(flatMasjids);
    } catch (error) {
      console.error("Gagal memuat opsi wilayah/masjid", error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchDropdownOptions();
  }, []);

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      await api.post("/superadmin/users", {
        ...formData,
        blok_wilayah_id: formData.role === "RT" ? formData.blok_wilayah_id : undefined,
        masjid_id: formData.role === "PENGURUS_MASJID" ? formData.masjid_id : undefined,
      });
      toast.success("User berhasil dibuat");
      setIsCreateOpen(false);
      setFormData({
        nama: "",
        email: "",
        password: "",
        no_hp: "",
        role: "RW",
        status_akun: "APPROVED",
        blok_wilayah_id: "",
        masjid_id: "",
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal membuat user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      await api.put(`/superadmin/users/${selectedUser.id}`, {
        nama: formData.nama,
        no_hp: formData.no_hp,
        role: formData.role,
        status_akun: formData.status_akun,
        blok_wilayah_id: formData.role === "RT" ? formData.blok_wilayah_id : undefined,
        masjid_id: formData.role === "PENGURUS_MASJID" ? formData.masjid_id : undefined,
      });
      toast.success("User berhasil diperbarui");
      setIsEditOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memperbarui user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus user ini?")) return;
    try {
      await api.delete(`/superadmin/users/${id}`);
      toast.success("User berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menghapus user");
    }
  };

  const handleDirectReset = async () => {
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      await api.post(`/superadmin/users/${selectedUser.id}/reset-password`, {
        new_password: newPassword,
      });
      toast.success("Password berhasil di-reset");
      setIsResetPassOpen(false);
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal mereset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveReset = async (id: string) => {
    try {
      await api.post(`/superadmin/password-resets/${id}/approve`);
      toast.success("Reset password disetujui");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menyetujui reset password");
    }
  };

  const handleRejectReset = async (id: string) => {
    if (!window.confirm("Tolak permintaan reset password ini?")) return;
    try {
      await api.post(`/superadmin/password-resets/${id}/reject`);
      toast.success("Reset password ditolak");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menolak reset password");
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    const linkedMasjidId = user.pengurus_masjid?.[0]?.masjid_id || "";
    setFormData({
      nama: user.nama,
      email: user.email,
      password: "",
      no_hp: user.no_hp,
      role: user.role,
      status_akun: user.status_akun,
      blok_wilayah_id: user.blok_wilayah_id || "",
      masjid_id: linkedMasjidId,
    });
    setIsEditOpen(true);
  };

  const openResetModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setIsResetPassOpen(true);
  };

  const filteredUsers = users.filter((u) => 
    u.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const rwUsers = filteredUsers.filter((u) => u.role === "RW");
  const rtUsers = filteredUsers.filter((u) => u.role === "RT");
  const masjidUsers = filteredUsers.filter((u) => u.role === "PENGURUS_MASJID");

  const renderPagination = (page: number, limit: number, total: number, setPage: (p: number) => void, setLimit: (l: number) => void) => {
    const totalPages = Math.ceil(total / limit);
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t bg-white dark:bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Tampilkan</span>
          <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={limit.toString()} />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50, 100].map((v) => (
                <SelectItem key={v} value={v.toString()}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-500">data</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-500 mr-4">
            Halaman {page} dari {totalPages || 1}
          </p>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderUserTable = (data: User[]) => {
    const total = data.length;
    const paginatedData = data.slice((userPage - 1) * userLimit, userPage * userLimit);

    return (
      <div className="rounded-xl border bg-white dark:bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>No HP</TableHead>
              <TableHead>Keterangan Wilayah / Masjid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Tidak ada data user.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((u) => {
                let linkedInfo = "-";
                if (u.role === "RT" && u.blok_wilayah) {
                  linkedInfo = `${u.blok_wilayah.nama_blok} (RT ${u.blok_wilayah.no_rt || "-"})`;
                } else if (u.role === "PENGURUS_MASJID" && u.pengurus_masjid?.[0]) {
                  linkedInfo = u.pengurus_masjid[0].masjid.nama_masjid;
                } else if (u.role === "RW") {
                  linkedInfo = "Rukun Warga (RW)";
                }

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nama}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.no_hp}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-700">
                        {linkedInfo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status_akun === "APPROVED" ? "default" : u.status_akun === "PENDING" ? "secondary" : "destructive"}>
                        {u.status_akun}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(u)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Akun
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openResetModal(u)}>
                            <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(u.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {renderPagination(userPage, userLimit, total, setUserPage, setUserLimit)}
      </div>
    );
  };

  const renderPasswordTable = () => {
    const total = resets.length;
    const paginatedData = resets.slice((resetPage - 1) * resetLimit, resetPage * resetLimit);

    return (
      <div className="rounded-xl border bg-white dark:bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Alasan Reset</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Tidak ada permintaan reset password.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.user.email}</TableCell>
                  <TableCell>{r.user.nama}</TableCell>
                  <TableCell><Badge variant="outline">{r.user.role}</Badge></TableCell>
                  <TableCell className="max-w-[250px] truncate" title={r.alasan}>{r.alasan}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => handleApproveReset(r.id)} className="bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRejectReset(r.id)}>
                        <XCircle className="h-4 w-4 mr-1" /> Tolak
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {renderPagination(resetPage, resetLimit, total, setResetPage, setResetLimit)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dummy off-screen inputs to absorb Chrome's aggressive credential autofill */}
      <input 
        type="text" 
        name="chrome-autofill-prevent-username" 
        style={{ position: "absolute", top: "-1000px", left: "-1000px", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none", zIndex: -9999 }} 
        tabIndex={-1} 
        autoComplete="off" 
      />
      <input 
        type="password" 
        name="chrome-autofill-prevent-password" 
        style={{ position: "absolute", top: "-1000px", left: "-1000px", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none", zIndex: -9999 }} 
        tabIndex={-1} 
        autoComplete="off" 
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen User</h2>
          <p className="text-muted-foreground">Kelola pengguna RW, RT, Masjid, dan persetujuan password.</p>
        </div>
        <Button onClick={() => {
          setFormData({ nama: "", email: "", password: "", no_hp: "", role: "RW", status_akun: "APPROVED", blok_wilayah_id: "", masjid_id: "" });
          setIsCreateOpen(true);
        }} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Tambah User
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center space-x-2 bg-white dark:bg-card p-2 rounded-xl border max-w-sm flex-1">
          <Search className="h-4 w-4 text-slate-400 ml-2" />
          <Input 
            placeholder="Cari nama atau email..." 
            className="border-0 focus-visible:ring-0 shadow-none h-8 text-sm w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            name="superadmin-search-query-filter"
          />
        </div>
        {searchQuery && (
          <Button 
            variant="ghost" 
            onClick={() => setSearchQuery("")} 
            className="text-slate-500 hover:text-slate-700 h-10 px-4 rounded-xl hover:bg-slate-100 flex items-center gap-2 border border-dashed border-slate-200"
          >
            <RotateCcw className="h-4 w-4" /> Reset Filter
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-12">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto border-b rounded-none bg-transparent p-0 mb-6 h-auto">
              <TabsTrigger value="rw" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-3 px-6">User RW</TabsTrigger>
              <TabsTrigger value="rt" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-3 px-6">User RT</TabsTrigger>
              <TabsTrigger value="masjid" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-3 px-6">User Masjid</TabsTrigger>
            </TabsList>

            <TabsContent value="rw">{renderUserTable(rwUsers)}</TabsContent>
            <TabsContent value="rt">{renderUserTable(rtUsers)}</TabsContent>
            <TabsContent value="masjid">{renderUserTable(masjidUsers)}</TabsContent>
          </Tabs>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Approval Password</h3>
                <p className="text-sm text-muted-foreground">Persetujuan permintaan ganti password user</p>
              </div>
              {resets.length > 0 && (
                <Badge variant="destructive">{resets.length} Menunggu</Badge>
              )}
            </div>
            {renderPasswordTable()}
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          {/* Dummy off-screen inputs to catch modal-level autofill */}
          <input 
            type="text" 
            name="chrome-create-prevent-username" 
            style={{ position: "absolute", top: "-1000px", left: "-1000px", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none", zIndex: -9999 }} 
            tabIndex={-1} 
            autoComplete="off" 
          />
          <input 
            type="password" 
            name="chrome-create-prevent-password" 
            style={{ position: "absolute", top: "-1000px", left: "-1000px", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none", zIndex: -9999 }} 
            tabIndex={-1} 
            autoComplete="off" 
          />
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
            <DialogDescription>User yang dibuat akan otomatis berstatus APPROVED.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} autoComplete="off" name="superadmin-create-fullname" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} autoComplete="new-email" name="superadmin-create-email" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} autoComplete="new-password" name="superadmin-create-password" />
            </div>
            <div className="space-y-2">
              <Label>No HP</Label>
              <Input value={formData.no_hp} onChange={(e) => setFormData({...formData, no_hp: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v, blok_wilayah_id: "", masjid_id: ""})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RW">RW</SelectItem>
                  <SelectItem value="RT">RT</SelectItem>
                  <SelectItem value="PENGURUS_MASJID">Pengurus Masjid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === "RT" && (
              <div className="space-y-2">
                <Label>Blok Wilayah (RT)</Label>
                <Select value={formData.blok_wilayah_id} onValueChange={(v) => setFormData({...formData, blok_wilayah_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Blok Wilayah" />
                  </SelectTrigger>
                  <SelectContent>
                    {blokOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.role === "PENGURUS_MASJID" && (
              <div className="space-y-2">
                <Label>Masjid</Label>
                <Select value={formData.masjid_id} onValueChange={(v) => setFormData({...formData, masjid_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Masjid" />
                  </SelectTrigger>
                  <SelectContent>
                    {masjidOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          {/* Dummy off-screen inputs to catch modal-level autofill */}
          <input 
            type="text" 
            name="chrome-edit-prevent-username" 
            style={{ position: "absolute", top: "-1000px", left: "-1000px", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none", zIndex: -9999 }} 
            tabIndex={-1} 
            autoComplete="off" 
          />
          <input 
            type="password" 
            name="chrome-edit-prevent-password" 
            style={{ position: "absolute", top: "-1000px", left: "-1000px", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none", zIndex: -9999 }} 
            tabIndex={-1} 
            autoComplete="off" 
          />
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>No HP</Label>
              <Input value={formData.no_hp} onChange={(e) => setFormData({...formData, no_hp: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v, blok_wilayah_id: "", masjid_id: ""})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RW">RW</SelectItem>
                  <SelectItem value="RT">RT</SelectItem>
                  <SelectItem value="PENGURUS_MASJID">Pengurus Masjid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === "RT" && (
              <div className="space-y-2">
                <Label>Blok Wilayah (RT)</Label>
                <Select value={formData.blok_wilayah_id} onValueChange={(v) => setFormData({...formData, blok_wilayah_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Blok Wilayah" />
                  </SelectTrigger>
                  <SelectContent>
                    {blokOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.role === "PENGURUS_MASJID" && (
              <div className="space-y-2">
                <Label>Masjid</Label>
                <Select value={formData.masjid_id} onValueChange={(v) => setFormData({...formData, masjid_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Masjid" />
                  </SelectTrigger>
                  <SelectContent>
                    {masjidOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Status Akun</Label>
              <Select value={formData.status_akun} onValueChange={(v) => setFormData({...formData, status_akun: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">APPROVED</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESET PASSWORD MODAL */}
      <Dialog open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
        <DialogContent>
          {/* Dummy off-screen inputs to catch modal-level autofill */}
          <input 
            type="text" 
            name="chrome-reset-prevent-username" 
            style={{ position: "absolute", top: "-1000px", left: "-1000px", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none", zIndex: -9999 }} 
            tabIndex={-1} 
            autoComplete="off" 
          />
          <input 
            type="password" 
            name="chrome-reset-prevent-password" 
            style={{ position: "absolute", top: "-1000px", left: "-1000px", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none", zIndex: -9999 }} 
            tabIndex={-1} 
            autoComplete="off" 
          />
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Reset password untuk {selectedUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Password Baru</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPassOpen(false)}>Batal</Button>
            <Button onClick={handleDirectReset} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
