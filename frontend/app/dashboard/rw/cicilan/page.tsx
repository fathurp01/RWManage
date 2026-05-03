"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { cicilanIuranClient, type CicilanIuranRecord } from "@/lib/api/cicilanIuran";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type IuranStatus = "BELUM" | "LUNAS";

interface IuranItem {
  id: string | null;
  bulan: number;
  tahun: number;
  nominal: number | string;
  status: IuranStatus;
}

interface WargaItem {
  id: string;
  nama_kk: string;
  iuran: IuranItem[];
}

interface BlokItem {
  id: string;
  nama_blok: string;
}

const currentYear = new Date().getFullYear();

export default function CicilanIuranPage() {
  const [blokList, setBlokList] = useState<BlokItem[]>([]);
  const [wargaList, setWargaList] = useState<WargaItem[]>([]);
  const [selectedBlok, setSelectedBlok] = useState("");
  const [selectedWarga, setSelectedWarga] = useState("");
  const [selectedIuran, setSelectedIuran] = useState("");
  const [jumlahBulan, setJumlahBulan] = useState("3");
  const [bulanMulai, setBulanMulai] = useState(String(new Date().getMonth() + 1));
  const [tahunMulai, setTahunMulai] = useState(String(currentYear));
  const [cicilanList, setCicilanList] = useState<CicilanIuranRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBlok = useCallback(async () => {
    try {
      const res = await api.get<{ data: { blok_list: BlokItem[] } }>("/rw/blok-wilayah");
      setBlokList(res.data.data.blok_list ?? []);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  }, []);

  const loadWarga = useCallback(async (blokId: string) => {
    if (!blokId) {
      setWargaList([]);
      return;
    }

    try {
      const res = await api.get<{ data: { warga: WargaItem[] } }>("/rw/iuran-warga", {
        params: { blok_wilayah_id: blokId, tahun: currentYear },
      });
      setWargaList(res.data.data.warga ?? []);
    } catch (error) {
      toast.error(getApiError(error).message);
      setWargaList([]);
    }
  }, []);

  const loadCicilan = useCallback(async (wargaId: string) => {
    if (!wargaId) {
      setCicilanList([]);
      return;
    }

    try {
      const rows = await cicilanIuranClient.listByWarga(wargaId);
      setCicilanList(rows);
    } catch (error) {
      toast.error(getApiError(error).message);
      setCicilanList([]);
    }
  }, []);

  useEffect(() => {
    loadBlok().catch(() => undefined);
  }, [loadBlok]);

  useEffect(() => {
    setSelectedWarga("");
    setSelectedIuran("");
    loadWarga(selectedBlok).catch(() => undefined);
  }, [loadWarga, selectedBlok]);

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

    setLoading(true);
    try {
      await cicilanIuranClient.create({
        iuran_id: selectedIuran,
        jumlah_bulan: Number(jumlahBulan),
        bulan_mulai: Number(bulanMulai),
        tahun_mulai: Number(tahunMulai),
      });
      toast.success("Cicilan berhasil dibuat.");
      await loadCicilan(selectedWarga);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await cicilanIuranClient.markAsPaid(id);
      toast.success("Cicilan ditandai lunas.");
      await loadCicilan(selectedWarga);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await cicilanIuranClient.remove(id);
      toast.success("Cicilan dihapus.");
      await loadCicilan(selectedWarga);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Cicilan Iuran</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Buat dan kelola cicilan dari tagihan iuran warga yang belum lunas.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Buat Cicilan Baru</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <select className="h-10 rounded-md border bg-background px-3 w-full" value={selectedIuran} onChange={(e) => setSelectedIuran(e.target.value)}>
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
            <Button className="w-full" variant="rw" onClick={handleCreate} disabled={loading || !selectedIuran}>
              {loading ? "Menyimpan..." : "Buat Cicilan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Cicilan</CardTitle>
        </CardHeader>
        <CardContent>
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
