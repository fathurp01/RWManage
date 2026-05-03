"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { laporanInsidenClient, type LaporanInsidenRecord, type StatusInsiden } from "@/lib/api/laporanInsiden";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function LaporanInsidenPage() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | StatusInsiden>("ALL");
  const [rows, setRows] = useState<LaporanInsidenRecord[]>([]);
  const [tipe, setTipe] = useState("Keamanan");
  const [lokasi, setLokasi] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [pelaporNama, setPelaporNama] = useState("");
  const [pelaporNoHp, setPelaporNoHp] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString());
  const [fotoBukti, setFotoBukti] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRows = useCallback(async () => {
    try {
      const list = await laporanInsidenClient.list(statusFilter === "ALL" ? undefined : { status: statusFilter });
      setRows(list);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRows().catch(() => undefined);
  }, [loadRows]);

  const handleCreate = async () => {
    if (!tipe.trim() || !lokasi.trim() || !deskripsi.trim() || !pelaporNama.trim()) {
      toast.error("Field wajib belum lengkap.");
      return;
    }

    setLoading(true);
    try {
      await laporanInsidenClient.create({
        tipe_insiden: tipe,
        lokasi,
        deskripsi,
        pelapor_nama: pelaporNama,
        pelapor_no_hp: pelaporNoHp || undefined,
        tanggal_insiden: tanggal,
        foto_bukti: fotoBukti,
      });
      toast.success("Laporan insiden berhasil dibuat.");
      setLokasi("");
      setDeskripsi("");
      setPelaporNama("");
      setPelaporNoHp("");
      setFotoBukti(null);
      await loadRows();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: string) => {
    try {
      await laporanInsidenClient.close(id);
      toast.success("Laporan ditutup.");
      await loadRows();
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await laporanInsidenClient.remove(id);
      toast.success("Laporan dihapus.");
      await loadRows();
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Laporan Insiden</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Kelola laporan kejadian lingkungan dan tindak lanjutnya.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Buat Laporan Baru</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Tipe Insiden</Label>
            <Input value={tipe} onChange={(e) => setTipe(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Insiden</Label>
            <Input value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Lokasi</Label>
            <Input value={lokasi} onChange={(e) => setLokasi(e.target.value)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>Deskripsi</Label>
            <Input value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nama Pelapor</Label>
            <Input value={pelaporNama} onChange={(e) => setPelaporNama(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>No HP Pelapor (opsional)</Label>
            <Input value={pelaporNoHp} onChange={(e) => setPelaporNoHp(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Foto Bukti (opsional)</Label>
            <Input type="file" onChange={(e) => setFotoBukti(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" variant="rw" onClick={handleCreate} disabled={loading}>{loading ? "Menyimpan..." : "Simpan Laporan"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Laporan</CardTitle>
          <select className="h-9 rounded-md border bg-background px-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | StatusInsiden)}>
            <option value="ALL">Semua Status</option>
            <option value="LAPORAN">LAPORAN</option>
            <option value="PROSES">PROSES</option>
            <option value="SELESAI">SELESAI</option>
            <option value="DITUTUP">DITUTUP</option>
          </select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Pelapor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.tanggal_insiden).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell>{row.tipe_insiden}</TableCell>
                  <TableCell>{row.lokasi}</TableCell>
                  <TableCell>{row.pelapor_nama}</TableCell>
                  <TableCell><Badge variant={row.status === "DITUTUP" ? "success" : "pending"}>{row.status}</Badge></TableCell>
                  <TableCell className="space-x-2">
                    {row.status !== "DITUTUP" && (
                      <Button size="sm" variant="outline" onClick={() => handleClose(row.id)}>Tutup</Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(row.id)}>Hapus</Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada laporan insiden.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
