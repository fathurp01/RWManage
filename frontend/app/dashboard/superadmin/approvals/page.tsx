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

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Pencarian</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama / email / no hp" />
          </div>
          <div className="flex items-end">
            <Button className="w-full" variant="rw" onClick={() => loadRows()} disabled={loading}>{loading ? "Memuat..." : "Terapkan"}</Button>
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
