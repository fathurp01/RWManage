"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { rtClient, type RtPerformaRecord } from "@/lib/api/rt";

export default function RtRondaPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<RtPerformaRecord[]>([]);
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [petugas, setPetugas] = useState<string>("");
  const [statusKehadiran, setStatusKehadiran] = useState<"HADIR" | "LIBUR" | "IZIN" | "ALFA">("HADIR");
  const [catatan, setCatatan] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const tahun = new Date().getFullYear();
      const bulan = Number(filterMonth);
      const start = new Date(Date.UTC(tahun, bulan - 1, 1)).toISOString();
      const end = new Date(Date.UTC(tahun, bulan, 0, 23, 59, 59)).toISOString();
      setList(await rtClient.listPerforma({ tanggal_mulai: start, tanggal_akhir: end }));
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [filterMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      await rtClient.createPerforma({
        tanggal,
        nama_petugas: petugas,
        status_kehadiran: statusKehadiran,
        catatan: catatan || undefined,
      });
      toast.success("Performa ronda dicatat");
      setPetugas("");
      setCatatan("");
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
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Operasional ronda</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Performa Ronda</h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">Catat dan pantau kehadiran ronda bulanan.</p>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Tambah Performa</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            <Input placeholder="Nama Petugas" value={petugas} onChange={(e) => setPetugas(e.target.value)} />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusKehadiran}
              onChange={(e) => setStatusKehadiran(e.target.value as typeof statusKehadiran)}
            >
              <option value="HADIR">Hadir</option>
              <option value="LIBUR">Libur</option>
              <option value="IZIN">Izin</option>
              <option value="ALFA">Alfa</option>
            </select>
            <Input placeholder="Catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            <Button onClick={create}>Simpan</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Filter Bulan</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={String(month)}>
                  Bulan {month}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={load}>Terapkan</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Riwayat Performa</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="text-sm text-slate-500">Memuat...</div>
          ) : list.length === 0 ? (
            <div className="text-sm text-slate-500">Belum ada catatan</div>
          ) : (
            <ul className="space-y-2">
              {list.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="font-medium">{new Date(p.tanggal).toLocaleDateString()}</div>
                    <div className="text-sm text-slate-500">Petugas: {p.nama_petugas ?? "-"}</div>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">Status: {p.status_kehadiran}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
