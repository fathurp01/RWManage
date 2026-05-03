"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { rtClient, type RtInsidenRecord, type RtStatusInsiden } from "@/lib/api/rt";

export default function RtInsidenPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RtInsidenRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | RtStatusInsiden>("ALL");
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [pelaporNama, setPelaporNama] = useState("");
  const [pelaporNoHp, setPelaporNoHp] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setRows(await rtClient.listInsiden(statusFilter === "ALL" ? undefined : { status: statusFilter }));
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    try {
      await rtClient.createInsiden({
        tipe_insiden: judul || "Insiden RT",
        tanggal_insiden: new Date().toISOString(),
        lokasi,
        deskripsi,
        pelapor_nama: pelaporNama,
        pelapor_no_hp: pelaporNoHp || undefined,
        foto_bukti: file,
      });
      toast.success("Laporan dikirim");
      setJudul("");
      setDeskripsi("");
      setLokasi("");
      setPelaporNama("");
      setPelaporNoHp("");
      setFile(null);
      load();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleClose = async (id: string) => {
    try {
      await rtClient.closeInsiden(id);
      toast.success("Laporan ditutup");
      load();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await rtClient.removeInsiden(id);
      toast.success("Laporan dihapus");
      load();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RT</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Manajemen laporan insiden</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Laporan Insiden</h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">Catat laporan dan kelola status tindak lanjut.</p>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Buat Laporan</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input placeholder="Judul/Tipe Insiden" value={judul} onChange={(e) => setJudul(e.target.value)} />
            <Input placeholder="Lokasi" value={lokasi} onChange={(e) => setLokasi(e.target.value)} />
            <Input placeholder="Nama Pelapor" value={pelaporNama} onChange={(e) => setPelaporNama(e.target.value)} />
            <Input placeholder="No HP Pelapor (opsional)" value={pelaporNoHp} onChange={(e) => setPelaporNoHp(e.target.value)} />
            <textarea
              className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"
              placeholder="Deskripsi"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
            />
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <div className="flex items-end">
              <Button onClick={submit}>Kirim Laporan</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Daftar Laporan</CardTitle>
            <select className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | RtStatusInsiden)}>
              <option value="ALL">Semua Status</option>
              <option value="LAPORAN">LAPORAN</option>
              <option value="PROSES">PROSES</option>
              <option value="SELESAI">SELESAI</option>
              <option value="DITUTUP">DITUTUP</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="text-sm text-slate-500">Memuat...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-500">Belum ada laporan</div>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="font-medium">{row.tipe_insiden}</div>
                    <div className="text-sm text-slate-500">{row.lokasi}</div>
                    <div className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString("id-ID")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={row.status === "DITUTUP" ? "success" : "pending"}>{row.status}</Badge>
                    {row.status !== "DITUTUP" && (
                      <Button size="sm" variant="outline" onClick={() => handleClose(row.id)}>Tutup</Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(row.id)}>Hapus</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
