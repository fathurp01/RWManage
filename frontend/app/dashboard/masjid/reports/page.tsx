"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, downloadApiFile, getApiError } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MiniBarChart } from "@/components/dashboard/MiniBarChart";
import { BarChart3, FileDown, FileText, RefreshCcw } from "lucide-react";

type ReportFormat = "PDF" | "XLSX";

interface MasjidReportResponse {
  data: {
    scope: "MASJID";
    masjid: {
      id: string;
      nama_masjid: string;
      alamat: string;
      blok_wilayah: {
        nama_blok: string;
        no_rt: string | null;
        nama_kompleks: string;
        no_rw: string;
      };
    };
    periode: {
      tahun: number;
      bulan: number | null;
      label: string;
    };
    summary: {
      total_kas_masuk: number;
      total_kas_keluar: number;
      saldo_kas: number;
      total_zis_uang_zakat: number;
      total_zis_uang_infaq: number;
      total_zis_beras_kg: number;
      total_transaksi_zis: number;
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

export default function MasjidReportPage() {
  const { user } = useAuth();
  const defaultMasjidId = useMemo(() => user?.masjid_ids?.[0] ?? "", [user]);

  const [tahun, setTahun] = useState(String(currentYear));
  const [bulan, setBulan] = useState("");
  const [report, setReport] = useState<MasjidReportResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadReport = useCallback(async () => {
    if (!defaultMasjidId) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get<MasjidReportResponse>("/masjid/report", {
        params: {
          masjid_id: defaultMasjidId,
          tahun: Number(tahun),
          ...(bulan ? { bulan: Number(bulan) } : {}),
        },
      });

      setReport(response.data.data);
      toast.success("Laporan masjid berhasil dimuat.");
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [bulan, defaultMasjidId, tahun]);

  useEffect(() => {
    if (defaultMasjidId) {
      loadReport().catch(() => undefined);
    }
  }, [defaultMasjidId, loadReport]);

  const handleExport = async (format: ReportFormat) => {
    if (!defaultMasjidId) {
      return;
    }

    const filename = `laporan-masjid-${tahun}${bulan ? `-${String(bulan).padStart(2, "0")}` : ""}.${format === "PDF" ? "pdf" : "xlsx"}`;

    try {
      await downloadApiFile("/masjid/report/export", filename, {
        masjid_id: defaultMasjidId,
        tahun: Number(tahun),
        ...(bulan ? { bulan: Number(bulan) } : {}),
        format,
      });
      toast.success(`Laporan masjid berhasil diunduh (${format}).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh laporan masjid.");
    }
  };

  const chartItems = report
    ? report.series
      .filter((item) => item.kas_masuk !== 0 || item.kas_keluar !== 0)
      .map((item) => ({
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
            <Badge variant="masjid">Laporan Masjid</Badge>
            <span className="text-sm text-slate-500 dark:text-muted-foreground">
              Ringkasan kas dan transaksi ZIS
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
            Laporan Masjid Bulanan
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
          <Button variant="masjid" className="gap-2" onClick={() => handleExport("PDF")} disabled={isLoading}>
            <FileText className="size-4" />
            PDF
          </Button>
          {/* <Button variant="masjid" className="gap-2" onClick={() => handleExport("XLSX")} disabled={isLoading}>
            <FileDown className="size-4" />
            Excel
          </Button> */}
        </div>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Filter Periode</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="tahun">Tahun</Label>
              <select
                id="tahun"
                value={tahun}
                onChange={(event) => setTahun(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
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
              <Label htmlFor="bulan">Bulan</Label>
              <select
                id="bulan"
                value={bulan}
                onChange={(event) => setBulan(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
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
              <Button variant="masjid" className="w-full gap-2" onClick={() => loadReport()} disabled={isLoading}>
                <BarChart3 className="size-4" />
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
                <CardTitle>ZIS Beras</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">
                {report.summary.total_zis_beras_kg} <span className="text-sm font-medium text-slate-500">kg</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>ZIS Zakat</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">
                {formatCurrency(report.summary.total_zis_uang_zakat)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>ZIS Infaq</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">
                {formatCurrency(report.summary.total_zis_uang_infaq)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Saldo Kas</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-extrabold text-slate-900 dark:text-foreground">
                {formatCurrency(report.summary.saldo_kas)}
              </CardContent>
            </Card>
          </div>

          <MiniBarChart
            title={`Grafik Saldo Kas Bulanan Tahun ${tahun}`}
            description="Hanya bulan dengan transaksi kas yang ditampilkan."
            items={chartItems}
          />

          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
              <CardTitle>Rincian Bulanan Tahun {tahun}</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead>Kas Masuk</TableHead>
                    <TableHead>Kas Keluar</TableHead>
                    <TableHead>Saldo Kas</TableHead>
                    <TableHead>ZIS Zakat</TableHead>
                    <TableHead>ZIS Infaq</TableHead>
                    <TableHead>ZIS Beras (Kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.series.map((item) => (
                    <TableRow key={item.bulan}>
                      <TableCell className="font-semibold">{item.label}</TableCell>
                      <TableCell>{formatCurrency(item.kas_masuk)}</TableCell>
                      <TableCell>{formatCurrency(item.kas_keluar)}</TableCell>
                      <TableCell className={item.kas_saldo >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {formatCurrency(item.kas_saldo)}
                      </TableCell>
                      <TableCell>{formatCurrency(item.zis_uang_zakat)}</TableCell>
                      <TableCell>{formatCurrency(item.zis_uang_infaq)}</TableCell>
                      <TableCell>{item.zis_beras_kg.toFixed(2)}</TableCell>
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