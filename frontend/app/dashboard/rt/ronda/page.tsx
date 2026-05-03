"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Performa Ronda (RT)</h1>
        <p className="text-sm text-gray-600">Catat kegiatan ronda RT Anda dan lihat riwayat.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Performa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
        <CardHeader>
          <CardTitle>Filter Bulan</CardTitle>
        </CardHeader>
        <CardContent>
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
          <Button className="ml-3" variant="outline" onClick={load}>Terapkan</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Performa</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Memuat...</div>
          ) : list.length === 0 ? (
            <div className="text-gray-500">Belum ada catatan</div>
          ) : (
            <ul className="space-y-2">
              {list.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{new Date(p.tanggal).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-500">Petugas: {p.nama_petugas ?? "-"}</div>
                  </div>
                  <div className="text-sm text-gray-700">Status: {p.status_kehadiran}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
