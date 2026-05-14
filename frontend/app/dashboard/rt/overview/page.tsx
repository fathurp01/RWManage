"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Building2, Coins, HandCoins, Users, Wallet } from "lucide-react";

interface RtOverviewResponse {
  data: {
    nama_blok: string;
    no_rt: string;
    tahun: number;
    summary: {
      total_warga: number;
      total_iuran_terjadwal: number;
      total_iuran_terbayar: number;
      total_iuran_belum: number;
      total_iuran_lunas_count: number;
      total_iuran_belum_count: number;
      persentase_bayar: number;
    };
    warga: Array<{
      id: string;
      nama_kk: string;
      iuran: Array<{
        id: string | null;
        bulan: number;
        tahun: number;
        nominal: number | string;
        status: "BELUM" | "LUNAS";
        kode_unik: string | null;
        tanggal_bayar: string | null;
      }>;
    }>;
  };
}

interface KasRtResponse {
  data: {
    transaksi: Array<{
      id: string;
      jenis_transaksi: "MASUK" | "KELUAR";
      tanggal: string;
      keterangan: string;
      nominal: number | string;
      kode_unik: string;
    }>;
    saldo: number;
    pemasukan: number;
    pengeluaran: number;
  };
}

interface SetoranRtResponse {
  data: {
    history: Array<{
      id: string;
      nominal: number | string;
      status: "BELUM" | "PENDING" | "TERKONFIRMASI";
      tanggal_setor: string;
      tanggal_konfirmasi: string | null;
    }>;
    titipan_belum_setor: number | string;
  };
}

interface HistoryItem {
  id: string;
  warga_id: string;
  bulan: number;
  tahun: number;
  nominal: number | string;
  nominal_kas_rt: number | string | null;
  nominal_kas_rw: number | string | null;
  status: "BELUM" | "LUNAS";
  kode_unik: string | null;
  tanggal_bayar: string | null;
  warga: { nama_kk: string };
}

const monthLabel = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const formatCurrency = (value: number | string | null | undefined) =>
  `Rp ${(Number(value ?? 0)).toLocaleString("id-ID")}`;

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
};

export default function RtOverviewPage() {
  const [overview, setOverview] = useState<RtOverviewResponse["data"] | null>(null);
  const [kas, setKas] = useState<KasRtResponse["data"] | null>(null);
  const [setoran, setSetoran] = useState<SetoranRtResponse["data"] | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewRes, kasRes, setoranRes, historyRes] = await Promise.all([
        api.get<RtOverviewResponse>("/rt/iuran"),
        api.get<KasRtResponse>("/rt/kas"),
        api.get<SetoranRtResponse>("/rt/setoran"),
        api.get<{ data: HistoryItem[] }>("/rt/iuran/history"),
      ]);

      setOverview(overviewRes.data.data);
      setKas(kasRes.data.data);
      setSetoran(setoranRes.data.data);
      setHistory(historyRes.data.data ?? []);
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const pendingSetoran = useMemo(() => setoran?.history.filter((item) => item.status !== "TERKONFIRMASI").length ?? 0, [setoran]);

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><div className="size-10 animate-spin rounded-full border-4 border-slate-500 border-t-transparent" /></div>;
  }

  const summary = overview?.summary;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RT</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Overview operasional RT</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Overview RT</h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">
          Ringkasan warga, target iuran, pembayaran yang terkumpul, status lunas/belum, dan riwayat transaksi kas.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="size-5 text-slate-500" /><div><p className="text-xs text-slate-500">Total Warga</p><p className="text-xl font-bold">{summary?.total_warga ?? 0}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Coins className="size-5 text-slate-500" /><div><p className="text-xs text-slate-500">Target Iuran</p><p className="text-xl font-bold">{formatCurrency(summary?.total_iuran_terjadwal)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Wallet className="size-5 text-slate-500" /><div><p className="text-xs text-slate-500">Iuran Terkumpul</p><p className="text-xl font-bold">{formatCurrency(summary?.total_iuran_terbayar)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Building2 className="size-5 text-slate-500" /><div><p className="text-xs text-slate-500">Saldo Kas RT</p><p className="text-xl font-bold">{formatCurrency(kas?.saldo)}</p></div></div></CardContent></Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-slate-500">Belum Bayar</p><p className="text-xl font-bold text-rose-600">{summary?.total_iuran_belum_count ?? 0}</p><p className="text-sm text-slate-500">{formatCurrency(summary?.total_iuran_belum)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-slate-500">Iuran Lunas</p><p className="text-xl font-bold text-emerald-600">{summary?.total_iuran_lunas_count ?? 0}</p><p className="text-sm text-slate-500">{summary?.persentase_bayar ?? 0}% terselesaikan</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-slate-500">Titipan Setoran</p><p className="text-xl font-bold text-indigo-600">{formatCurrency(setoran?.titipan_belum_setor)}</p><p className="text-sm text-slate-500">{pendingSetoran} setoran menunggu konfirmasi</p></CardContent></Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi Kas</CardTitle>
          <CardDescription>Transaksi terbaru pemasukan dan pengeluaran kas RT.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Tanggal</TableHead><TableHead>Keterangan</TableHead><TableHead>Jenis</TableHead><TableHead>Nominal</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(kas?.transaksi ?? []).slice(0, 8).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{formatDate(item.tanggal)}</TableCell>
                  <TableCell>{item.keterangan}</TableCell>
                  <TableCell>{item.jenis_transaksi}</TableCell>
                  <TableCell>{formatCurrency(item.nominal)}</TableCell>
                </TableRow>
              ))}
              {(kas?.transaksi ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada transaksi kas.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pembayaran Iuran</CardTitle>
          <CardDescription>Histori lengkap pembayaran iuran yang sudah lunas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Warga</TableHead><TableHead>Bulan</TableHead><TableHead>Tanggal Bayar</TableHead><TableHead>Nominal</TableHead><TableHead>Kode</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {history.slice(0, 10).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.warga.nama_kk}</TableCell>
                  <TableCell>{monthLabel[item.bulan - 1]} {item.tahun}</TableCell>
                  <TableCell>{formatDate(item.tanggal_bayar)}</TableCell>
                  <TableCell>{formatCurrency(item.nominal)}</TableCell>
                  <TableCell>{item.kode_unik ?? "-"}</TableCell>
                </TableRow>
              ))}
              {history.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada pembayaran iuran.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
