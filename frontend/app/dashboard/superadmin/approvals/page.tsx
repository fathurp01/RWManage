"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { superadminClient, type PendingRegistrationItem } from "@/lib/api/superadmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RotateCcw } from "lucide-react";

export default function SuperadminApprovalsPage() {
  const [rows, setRows] = useState<PendingRegistrationItem[]>([]);
  const [search, setSearch] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await superadminClient.listPendingRegistrations({
        search: search || undefined,
        role: "RW",
      });
      setRows(data);
    } catch (error) {
      toast.error(getApiError(error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadRows().catch(() => undefined);
  }, [loadRows]);

  const handleDecision = async (userId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await superadminClient.decideRegistration({
        user_id: userId,
        status_akun: status,
        alasan_penolakan: status === "REJECTED" ? rejectReason : undefined,
      });
      toast.success(status === "APPROVED" ? "Pendaftaran disetujui." : "Pendaftaran ditolak.");
      if (status === "REJECTED") {
        setRejectReason("");
      }
      await loadRows();
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Persetujuan User</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Proses pendaftaran RW yang masih pending.</p>
      </header>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-slate-800">Filter Pencarian</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-end gap-4">
          <div className="space-y-1.5 flex-1 w-full">
            <Label className="text-slate-600 font-semibold text-xs">Pencarian</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Cari Nama / Email / No HP" 
                className="pl-9 rounded-xl border-slate-200 text-sm h-11 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            {search && (
              <Button 
                variant="outline" 
                onClick={() => setSearch("")} 
                className="h-11 px-5 font-semibold text-slate-600 rounded-xl hover:bg-slate-100 flex items-center gap-2 border border-slate-200"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            )}
            <Button 
              className="h-11 px-6 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex-1 sm:flex-initial"
              onClick={() => loadRows()} 
              disabled={loading}
            >
              {loading ? "Memuat..." : "Terapkan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Alasan Penolakan Default</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Contoh: Data wilayah belum lengkap" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>No HP</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.nama}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.no_hp}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleDecision(row.id, "APPROVED")}>Setujui</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDecision(row.id, "REJECTED")}>Tolak</Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Tidak ada user pending.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
