"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, downloadApiFile, getApiError } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MiniBarChart } from "@/components/dashboard/MiniBarChart";
import { FileDown, RefreshCcw, BarChart3, FileText } from "lucide-react";

type ReportFormat = "PDF" | "XLSX";

interface RwReportResponse {
  data: {
    scope: "RW";
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
    periode: {
      tahun: number;
      bulan: number | null;
      label: string;
    };
    summary: {
      total_warga: number;
      total_iuran_lunas_count: number;
      total_iuran_belum_count: number;
      total_iuran_lunas_nominal: number;
      total_iuran_belum_nominal: number;
      total_kas_masuk: number;
      total_kas_keluar: number;
      saldo_kas: number;
    };
    series: Array<{
      bulan: number;
      label: string;
      iuran_lunas_count: number;
      iuran_belum_count: number;
      iuran_lunas_nominal: number;
      iuran_belum_nominal: number;
      kas_masuk: number;
      kas_keluar: number;
      kas_saldo: number;
      zis_uang_zakat: number;
      zis_uang_infaq: number;
      zis_beras_kg: number;
    }>;
  };
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - index);
const monthOptions = [
  { value: "", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function RwReportPage() {
  const { user } = useAuth();
  const defaultRwId = useMemo(() => user?.wilayah_rw_id ?? "", [user]);

  const [tahun, setTahun] = useState(String(currentYear));
  const [bulan, setBulan] = useState("");
  const [report, setReport] = useState<RwReportResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadReport = useCallback(async () => {
    if (!defaultRwId) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get<RwReportResponse>("/rw/report", {
        params: {
          wilayah_rw_id: defaultRwId,
          tahun: Number(tahun),
          ...(bulan ? { bulan: Number(bulan) } : {}),
        },
      });

      setReport(response.data.data);
      toast.success("Laporan RW berhasil dimuat.");
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [bulan, defaultRwId, tahun]);

  useEffect(() => {
    if (defaultRwId) {
      loadReport().catch(() => undefined);
    }
  }, [defaultRwId, loadReport]);

  const handleExport = async (format: ReportFormat) => {
    if (!defaultRwId) {
      return;
    }

    const filename = `laporan-rw-${tahun}${bulan ? `-${String(bulan).padStart(2, "0")}` : ""}.${format === "PDF" ? "pdf" : "xlsx"}`;

    try {
      await downloadApiFile("/rw/report/export", filename, {
        wilayah_rw_id: defaultRwId,
        tahun: Number(tahun),
        ...(bulan ? { bulan: Number(bulan) } : {}),
        format,
      });
      toast.success(`Laporan RW berhasil diunduh (${format}).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh laporan RW.");
    }
  };

  const chartItems = report
    ? report.series.map((item) => ({
      label: item.label,
      value: item.kas_saldo,
      hint: formatCurrency(item.kas_saldo),
    }))
    : [];

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="rw">Laporan RW</Badge>
            <span className="text-sm text-slate-500 dark:text-muted-foreground">
              Ringkasan iuran, kas, dan saldo berjalan
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
            Laporan RW Bulanan
          </h1>
          <p className="text-base text-slate-500 dark:text-muted-foreground">
            Pilih periode lalu unduh hasilnya dalam PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => loadReport()} disabled={isLoading}>
            <RefreshCcw className="size-4" />
            Muat Ulang
          </Button>
          <Button variant="rw" className="gap-2 px-10" onClick={() => handleExport("PDF")} disabled={isLoading}>
            <FileText className="size-4 " />
            PDF
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="text-lg text-slate-900 dark:text-foreground">Filter Periode</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="tahun" className="text-md text-slate-900 dark:text-foreground">Tahun</Label>
              <select
                id="tahun"
                value={tahun}
                onChange={(event) => setTahun(event.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-white dark:bg-card px-3 text-base font-bold focus:ring-2 focus:ring-ring/25"
                disabled={isLoading}
              >
                {yearOptions.map((item) => (
                  <option key={item} value={String(item)}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulan" className="text-md text-slate-900 dark:text-foreground">Bulan</Label>
              <select
                id="bulan"
                value={bulan}
                onChange={(event) => setBulan(event.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-white dark:bg-card px-3 text-base font-bold focus:ring-2 focus:ring-ring/25"
                disabled={isLoading}
              >
                {monthOptions.map((item) => (
                  <option key={item.value || "all"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end lg:col-span-2">
              <Button variant="rw" className="h-12 w-full gap-2 text-base font-black" onClick={() => loadReport()} disabled={isLoading}>
                <BarChart3 className="size-5" />
                Tampilkan Laporan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Total Warga</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-extrabold text-slate-900 dark:text-foreground">
                {report.summary.total_warga}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Iuran Lunas</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-300">
                {report.summary.total_iuran_lunas_count}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Kas Masuk</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-extrabold text-slate-900 dark:text-foreground">
                {formatCurrency(report.summary.total_kas_masuk)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Saldo Kas</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-300">
                {formatCurrency(report.summary.saldo_kas)}
              </CardContent>
            </Card>
          </div>

          <MiniBarChart
            title="Grafik Saldo Bulanan"
            description="Nilai positif menandakan saldo berjalan per bulan."
            items={chartItems}
          />

          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
              <CardTitle>Rincian Bulanan</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead>Iuran Lunas</TableHead>
                    <TableHead>Iuran Belum</TableHead>
                    <TableHead>Kas Masuk</TableHead>
                    <TableHead>Kas Keluar</TableHead>
                    <TableHead>Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.series.map((item) => (
                    <TableRow key={item.bulan}>
                      <TableCell className="font-semibold">{item.label}</TableCell>
                      <TableCell>{item.iuran_lunas_count}</TableCell>
                      <TableCell>{item.iuran_belum_count}</TableCell>
                      <TableCell>{formatCurrency(item.kas_masuk)}</TableCell>
                      <TableCell>{formatCurrency(item.kas_keluar)}</TableCell>
                      <TableCell className={item.kas_saldo >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {formatCurrency(item.kas_saldo)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-slate-500 dark:text-muted-foreground">
            {isLoading ? "Memuat laporan..." : "Belum ada laporan yang ditampilkan."}
          </CardContent>
        </Card>
      )}
    </main>
  );
}