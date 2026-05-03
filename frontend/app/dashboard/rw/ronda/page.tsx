"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { performaRondaClient, type PerformaRondaRecord, type StatusKehadiran } from "@/lib/api/performaRonda";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface BlokItem {
  id: string;
  nama_blok: string;
}

const statusOptions: StatusKehadiran[] = ["HADIR", "LIBUR", "IZIN", "ALFA"];

export default function PerformaRondaPage() {
  const [blokList, setBlokList] = useState<BlokItem[]>([]);
  const [selectedBlok, setSelectedBlok] = useState("");
  const [namaPetugas, setNamaPetugas] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString());
  const [status, setStatus] = useState<StatusKehadiran>("HADIR");
  const [catatan, setCatatan] = useState("");
  const [rows, setRows] = useState<PerformaRondaRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBlok = useCallback(async () => {
    try {
      const res = await api.get<{ data: { blok_list: BlokItem[] } }>("/rw/blok-wilayah");
      setBlokList(res.data.data.blok_list ?? []);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  }, []);

  const loadRows = useCallback(async (blokId: string) => {
    if (!blokId) {
      setRows([]);
      return;
    }

    try {
      const data = await performaRondaClient.list({ blok_wilayah_id: blokId });
      setRows(data);
    } catch (error) {
      toast.error(getApiError(error).message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    loadBlok().catch(() => undefined);
  }, [loadBlok]);

  useEffect(() => {
    loadRows(selectedBlok).catch(() => undefined);
  }, [loadRows, selectedBlok]);

  const handleCreate = async () => {
    if (!selectedBlok || !namaPetugas.trim()) {
      toast.error("Blok dan nama petugas wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      await performaRondaClient.create({
        blok_wilayah_id: selectedBlok,
        tanggal,
        nama_petugas: namaPetugas,
        status_kehadiran: status,
        catatan,
      });
      toast.success("Performa ronda berhasil ditambahkan.");
      setNamaPetugas("");
      setCatatan("");
      await loadRows(selectedBlok);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await performaRondaClient.remove(id);
      toast.success("Data performa dihapus.");
      await loadRows(selectedBlok);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Performa Ronda</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Pantau kehadiran petugas ronda per blok wilayah.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Input Performa Ronda</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Blok Wilayah</Label>
            <select className="h-10 rounded-md border bg-background px-3" value={selectedBlok} onChange={(e) => setSelectedBlok(e.target.value)}>
              <option value="">Pilih blok</option>
              {blokList.map((blok) => (
                <option key={blok.id} value={blok.id}>{blok.nama_blok}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Nama Petugas</Label>
            <Input value={namaPetugas} onChange={(e) => setNamaPetugas(e.target.value)} placeholder="Nama petugas ronda" />
          </div>
          <div className="space-y-2">
            <Label>Status Kehadiran</Label>
            <select className="h-10 rounded-md border bg-background px-3" value={status} onChange={(e) => setStatus(e.target.value as StatusKehadiran)}>
              {statusOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input value={tanggal} onChange={(e) => setTanggal(e.target.value)} placeholder="ISO datetime" />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>Catatan</Label>
            <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan" />
          </div>
          <div className="flex items-end">
            <Button className="w-full" variant="rw" onClick={handleCreate} disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Performa</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Petugas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.tanggal).toLocaleString("id-ID")}</TableCell>
                  <TableCell>{row.nama_petugas}</TableCell>
                  <TableCell>
                    <Badge variant={row.status_kehadiran === "HADIR" ? "success" : "secondary"}>{row.status_kehadiran}</Badge>
                  </TableCell>
                  <TableCell>{row.catatan ?? "-"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(row.id)}>Hapus</Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada data performa ronda.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
