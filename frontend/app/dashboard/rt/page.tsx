"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, TrendingUp, Calendar } from "lucide-react";

interface IuranItem {
  id: string;
  warga_id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: "BELUM" | "LUNAS";
  kode_unik: string | null;
  tanggal_bayar: string | null;
}

interface WargaIuran {
  id: string;
  nama_kk: string;
  tarif_iuran_bulanan: number;
  iuran: IuranItem[];
}

interface RtIuranResponse {
  data: {
    blok_wilayah_id: string;
    no_rt: string;
    nama_blok: string;
    tahun: number;
    bulan: number | null;
    status: "BELUM" | "LUNAS" | null;
    warga: WargaIuran[];
    summary: {
      total_warga: number;
      total_iuran_terjadwal: number;
      total_iuran_terbayar: number;
      persentase_bayar: number;
    };
  };
}

const months = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function RtDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RtIuranResponse["data"] | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(currentMonth);
  const [filterStatus, setFilterStatus] = useState<"BELUM" | "LUNAS" | null>(null);
  const [searchNama, setSearchNama] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterMonth) params.append("bulan", filterMonth.toString());
      if (filterStatus) params.append("status", filterStatus);

      const res = await api.get<RtIuranResponse>(`/rt/iuran?${params.toString()}`);
      setData(res.data.data);
    } catch (err: any) {
      const apiError = getApiError(err);
      setError(apiError.message);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredWarga = useMemo(() => {
    if (!data) return [];
    return data.warga.filter((w) => w.nama_kk.toLowerCase().includes(searchNama.toLowerCase()));
  }, [data, searchNama]);

  const statsCards = [
    {
      label: "Total Warga",
      value: data?.summary?.total_warga ?? 0,
      icon: Users,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Total Iuran Terjadwal",
      value: `Rp ${(data?.summary?.total_iuran_terjadwal ?? 0).toLocaleString("id-ID")}`,
      icon: DollarSign,
      color: "bg-purple-100 text-purple-700",
    },
    {
      label: "Total Iuran Terbayar",
      value: `Rp ${(data?.summary?.total_iuran_terbayar ?? 0).toLocaleString("id-ID")}`,
      icon: TrendingUp,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Persentase Pembayaran",
      value: `${(data?.summary?.persentase_bayar ?? 0).toFixed(1)}%`,
      icon: Calendar,
      color: "bg-orange-100 text-orange-700",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Error memuat data</p>
        <p className="text-sm">{error}</p>
        <Button onClick={loadData} className="mt-4" variant="outline">
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard RT</h1>
        <p className="mt-2 text-gray-600">
          {data?.nama_blok} (RT {data?.no_rt}) - Tahun {data?.tahun}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <div className={`rounded-lg p-2 ${card.color}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bulan">Bulan</Label>
              <Select value={filterMonth?.toString() ?? "all"} onValueChange={(v) => setFilterMonth(v === "all" ? null : parseInt(v))}>
                <SelectTrigger id="bulan">
                  <SelectValue placeholder="Semua bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua bulan</SelectItem>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Bayar</Label>
              <Select value={filterStatus ?? "all"} onValueChange={(v) => setFilterStatus(v === "all" ? null : (v as "BELUM" | "LUNAS"))}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="LUNAS">Lunas</SelectItem>
                  <SelectItem value="BELUM">Belum Bayar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cari-nama">Cari Nama Warga</Label>
              <Input
                id="cari-nama"
                placeholder="Cari nama KK..."
                value={searchNama}
                onChange={(e) => setSearchNama(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warga Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Iuran Warga ({filteredWarga.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWarga.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
              <p>Tidak ada data warga yang sesuai filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama KK</TableHead>
                    <TableHead>Tarif Bulanan</TableHead>
                    <TableHead>Nominal Iuran</TableHead>
                    <TableHead>Status Bayar</TableHead>
                    <TableHead>Kode Unik</TableHead>
                    <TableHead>Tanggal Bayar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarga.flatMap((warga) =>
                    warga.iuran.length > 0 ? (
                      warga.iuran.map((iuran, idx) => (
                        <TableRow key={`${warga.id}-${idx}`}>
                          {idx === 0 && (
                            <>
                              <TableCell rowSpan={warga.iuran.length} className="font-medium">
                                {warga.nama_kk}
                              </TableCell>
                              <TableCell rowSpan={warga.iuran.length}>
                                Rp {warga.tarif_iuran_bulanan.toLocaleString("id-ID")}
                              </TableCell>
                            </>
                          )}
                          <TableCell>Rp {iuran.nominal.toLocaleString("id-ID")}</TableCell>
                          <TableCell>
                            <Badge variant={iuran.status === "LUNAS" ? "default" : "secondary"}>
                              {iuran.status === "LUNAS" ? "✓ Lunas" : "Belum Bayar"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{iuran.kode_unik || "-"}</TableCell>
                          <TableCell className="text-sm">
                            {iuran.tanggal_bayar
                              ? new Date(iuran.tanggal_bayar).toLocaleDateString("id-ID")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow key={`${warga.id}-empty`}>
                        <TableCell>{warga.nama_kk}</TableCell>
                        <TableCell>Rp {warga.tarif_iuran_bulanan.toLocaleString("id-ID")}</TableCell>
                        <TableCell colSpan={4} className="text-center text-gray-500">
                          Tidak ada data iuran
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
