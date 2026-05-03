"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { cicilanIuranClient, type CicilanIuranRecord } from "@/lib/api/cicilanIuran";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type IuranStatus = "BELUM" | "LUNAS";

interface RtIuranItem {
  id: string | null;
  bulan: number;
  tahun: number;
  nominal: number | string;
  status: IuranStatus;
}

interface RtWargaItem {
  id: string;
  nama_kk: string;
  iuran: RtIuranItem[];
}

interface RtIuranResponse {
  data: {
    tahun: number;
    bulan: number | null;
    warga: RtWargaItem[];
  };
}

const currentYear = new Date().getFullYear();

export default function RtCicilanPage() {
  const [loading, setLoading] = useState(true);
  const [wargaList, setWargaList] = useState<RtWargaItem[]>([]);
  const [selectedWarga, setSelectedWarga] = useState("");
  const [selectedIuran, setSelectedIuran] = useState("");
  const [jumlahBulan, setJumlahBulan] = useState("3");
  const [bulanMulai, setBulanMulai] = useState(String(new Date().getMonth() + 1));
  const [tahunMulai, setTahunMulai] = useState(String(currentYear));
  const [cicilanList, setCicilanList] = useState<CicilanIuranRecord[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<RtIuranResponse>("/rt/iuran", {
        params: { tahun: currentYear },
      });
      setWargaList(res.data.data.warga ?? []);
    } catch (error) {
      toast.error(getApiError(error).message);
      setWargaList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCicilan = useCallback(async (wargaId: string) => {
    if (!wargaId) {
      setCicilanList([]);
      return;
    }

    try {
      const rows = await cicilanIuranClient.listByWarga(wargaId, "rt");
      setCicilanList(rows);
    } catch (error) {
      toast.error(getApiError(error).message);
      setCicilanList([]);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  useEffect(() => {
    setSelectedIuran("");
    loadCicilan(selectedWarga).catch(() => undefined);
  }, [loadCicilan, selectedWarga]);

  const selectedWargaData = useMemo(
    () => wargaList.find((item) => item.id === selectedWarga) ?? null,
    [selectedWarga, wargaList]
  );

  const unpaidIuran = useMemo(() => {
    if (!selectedWargaData) return [];
    return selectedWargaData.iuran.filter((item) => item.status === "BELUM" && !!item.id);
  }, [selectedWargaData]);

  const handleCreate = async () => {
    if (!selectedIuran) {
      toast.error("Pilih iuran dulu.");
      return;
    }

    setSaving(true);
    try {
      await cicilanIuranClient.create(
        {
          iuran_id: selectedIuran,
          jumlah_bulan: Number(jumlahBulan),
          bulan_mulai: Number(bulanMulai),
          tahun_mulai: Number(tahunMulai),
        },
        "rt"
      );
      toast.success("Cicilan berhasil dibuat.");
      await loadCicilan(selectedWarga);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await cicilanIuranClient.markAsPaid(id, "rt");
      toast.success("Cicilan ditandai lunas.");
      await loadCicilan(selectedWarga);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await cicilanIuranClient.remove(id, "rt");
      toast.success("Cicilan dihapus.");
      await loadCicilan(selectedWarga);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-slate-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RT</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Pengaturan cicilan iuran warga</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Cicilan Iuran</h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">
          Buat, pantau, dan tandai lunas cicilan dari iuran warga di RT Anda.
        </p>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Buat Cicilan Baru</CardTitle>
          <CardDescription>Pilih warga dan iuran yang masih belum lunas.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Warga</Label>
            <select className="h-10 rounded-md border bg-background px-3" value={selectedWarga} onChange={(e) => setSelectedWarga(e.target.value)}>
              <option value="">Pilih warga</option>
              {wargaList.map((warga) => (
                <option key={warga.id} value={warga.id}>{warga.nama_kk}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label>Iuran Belum Lunas</Label>
            <select className="h-10 w-full rounded-md border bg-background px-3" value={selectedIuran} onChange={(e) => setSelectedIuran(e.target.value)}>
              <option value="">Pilih iuran</option>
              {unpaidIuran.map((item) => (
                <option key={item.id} value={item.id ?? ""}>
                  Bulan {item.bulan}/{item.tahun} - Rp {Number(item.nominal).toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Jumlah Bulan</Label>
            <Input type="number" min={1} value={jumlahBulan} onChange={(e) => setJumlahBulan(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Bulan Mulai</Label>
            <Input type="number" min={1} max={12} value={bulanMulai} onChange={(e) => setBulanMulai(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Tahun Mulai</Label>
            <Input type="number" min={2000} max={3000} value={tahunMulai} onChange={(e) => setTahunMulai(e.target.value)} />
          </div>

          <div className="flex items-end">
            <Button className="w-full" variant="rw" onClick={handleCreate} disabled={saving || !selectedIuran}>
              {saving ? "Menyimpan..." : "Buat Cicilan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Daftar Cicilan</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Total</TableHead>
                <TableHead>Nominal/Bulan</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cicilanList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>Rp {Number(item.total_cicilan).toLocaleString("id-ID")}</TableCell>
                  <TableCell>Rp {Number(item.nominal_per_bulan).toLocaleString("id-ID")}</TableCell>
                  <TableCell>{item.bulan_mulai}/{item.tahun_mulai} - {item.jumlah_bulan} bulan</TableCell>
                  <TableCell>
                    <Badge variant={item.sudah_lunas ? "success" : "pending"}>{item.sudah_lunas ? "LUNAS" : "BELUM"}</Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    {!item.sudah_lunas && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkPaid(item.id)}>Tandai Lunas</Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>Hapus</Button>
                  </TableCell>
                </TableRow>
              ))}
              {cicilanList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada data cicilan.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}