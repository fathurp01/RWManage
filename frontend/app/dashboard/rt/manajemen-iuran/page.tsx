"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { cicilanIuranClient, type CicilanIuranRecord } from "@/lib/api/cicilanIuran";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, CreditCard, HandCoins, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface IuranItem {
  id: string | null;
  warga_id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: "BELUM LUNAS" | "LUNAS";
  kode_unik: string | null;
  tanggal_bayar: string | null;
  cicilan: CicilanItem[];
}

interface CicilanItem {
  id: string;
  total_cicilan: string | number;
  nominal_per_bulan: string | number;
  jumlah_bulan: number;
  bulan_mulai: number;
  tahun_mulai: number;
  sudah_lunas: boolean;
  created_at: string;
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
    status: "BELUM LUNAS" | "LUNAS" | null;
    warga: WargaIuran[];
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
  status: "BELUM LUNAS" | "LUNAS";
  kode_unik: string | null;
  tanggal_bayar: string | null;
  warga: { nama_kk: string };
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

type MonthTone = "danger" | "warning" | "success";

const toneClasses: Record<MonthTone, string> = {
  danger: "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-300 dark:hover:bg-rose-950/40",
  warning: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-300 dark:hover:bg-amber-950/40",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-300 dark:hover:bg-emerald-950/40",
};

const badgeToneClasses: Record<MonthTone, string> = {
  danger: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-300",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-300",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-300",
};

const formatCurrency = (value: number | string | null | undefined) =>
  `Rp ${(Number(value ?? 0)).toLocaleString("id-ID")}`;

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
};

const getMonthLabel = (month: number) => months.find((item) => item.value === month)?.label ?? `Bulan ${month}`;

const getIuranTone = (
  iuran: IuranItem
): { tone: MonthTone; label: string; hint: string; cicilan: CicilanItem | null } => {
  const activeCicilan = iuran.cicilan.find((item) => !item.sudah_lunas) ?? null;

  if (iuran.status === "LUNAS") {
    return {
      tone: "success",
      label: "Lunas",
      hint: "Klik untuk melihat detail transaksi dan kode transparansi.",
      cicilan: activeCicilan,
    };
  }

  if (activeCicilan) {
    return {
      tone: "warning",
      label: "Lunasi",
      hint: "Klik untuk melihat sisa cicilan yang perlu diselesaikan.",
      cicilan: activeCicilan,
    };
  }

  return {
    tone: "danger",
    label: "Bayar",
    hint: "Klik untuk melihat rincian nominal yang harus dibayar.",
    cicilan: null,
  };
};

export default function ManajemenIuranPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RtIuranResponse["data"] | null>(null);
  const [searchNama, setSearchNama] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<{ wargaName: string; iuran: IuranItem } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const [selectedWarga, setSelectedWarga] = useState("");
  const [selectedIuran, setSelectedIuran] = useState("");
  const [jumlahBulan, setJumlahBulan] = useState("3");
  const [bulanMulai, setBulanMulai] = useState(String(new Date().getMonth() + 1));
  const [tahunMulai, setTahunMulai] = useState(String(currentYear));
  const [tambahanNominal, setTambahanNominal] = useState("0");
  const [saving, setSaving] = useState(false);

  const [cicilanList, setCicilanList] = useState<CicilanIuranRecord[]>([]);
  const [editingCicilan, setEditingCicilan] = useState<CicilanIuranRecord | null>(null);
  const [editJumlahBulan, setEditJumlahBulan] = useState("3");
  const [editBulanMulai, setEditBulanMulai] = useState(String(new Date().getMonth() + 1));
  const [editTahunMulai, setEditTahunMulai] = useState(String(currentYear));

  const [historyYear, setHistoryYear] = useState(String(currentYear));
  const [historyRows, setHistoryRows] = useState<HistoryItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<RtIuranResponse>("/rt/iuran", { params: { tahun: currentYear } });
      setData(res.data.data);
    } catch (err: any) {
      const apiError = getApiError(err);
      setError(apiError.message);
      toast.error(apiError.message);
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

  const loadHistory = useCallback(async (tahun?: string) => {
    try {
      const res = await api.get<{ data: HistoryItem[] }>("/rt/iuran/history", { params: { tahun: tahun ? Number(tahun) : undefined } });
      setHistoryRows(res.data.data ?? []);
    } catch (error) {
      toast.error(getApiError(error).message);
      setHistoryRows([]);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadHistory(historyYear);
  }, [historyYear, loadData, loadHistory]);

  useEffect(() => {
    setSelectedIuran("");
    loadCicilan(selectedWarga);
  }, [loadCicilan, selectedWarga]);

  const openDetail = (wargaName: string, iuran: IuranItem) => {
    setSelectedDetail({ wargaName, iuran });
    setDetailOpen(true);
  };

  const handlePrimaryAction = async () => {
    if (!selectedDetail?.iuran?.id) return;

    try {
      setIsProcessing(selectedDetail.iuran.id);
      setDetailOpen(false);
      const meta = getIuranTone(selectedDetail.iuran);
      if (meta.tone === "warning" && meta.cicilan) {
        await cicilanIuranClient.markAsPaid(meta.cicilan.id, "rt");
        toast.success("Cicilan berhasil dilunasi.");
      } else {
        const res = await api.post("/rt/iuran/bayar", { iuran_id: selectedDetail.iuran.id });
        if (res.data.success) {
          toast.success("Pembayaran berhasil. Saldo otomatis dibagi ke Kas RT & Setoran RW.");
        }
      }
      await loadData();
      await loadHistory(historyYear);
    } catch (err) {
      const apiError = getApiError(err);
      toast.error(apiError.message);
    } finally {
      setIsProcessing(null);
      setSelectedDetail(null);
    }
  };

  const selectedWargaData = useMemo(
    () => data?.warga.find((item) => item.id === selectedWarga) ?? null,
    [data, selectedWarga]
  );

  const unpaidIuran = useMemo(() => {
    if (!selectedWargaData) return [];
    return selectedWargaData.iuran.filter((item) => item.status === "BELUM LUNAS" && !!item.id);
  }, [selectedWargaData]);

  const handleCreate = async () => {
    if (!selectedIuran) {
      toast.error("Pilih tagihan iuran dulu.");
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
          tambahan_nominal: Number(tambahanNominal),
        },
        "rt"
      );
      toast.success("Cicilan berhasil dibuat.");
      await loadCicilan(selectedWarga);
      await loadData();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCicilan) return;
    try {
      await cicilanIuranClient.update(
        editingCicilan.id,
        {
          jumlah_bulan: Number(editJumlahBulan),
          bulan_mulai: Number(editBulanMulai),
          tahun_mulai: Number(editTahunMulai),
        },
        "rt"
      );
      toast.success("Cicilan berhasil diperbarui.");
      setEditingCicilan(null);
      await loadCicilan(selectedWarga);
    } catch (error) {
      toast.error(getApiError(error).message);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await cicilanIuranClient.markAsPaid(id, "rt");
      toast.success("Cicilan ditandai lunas.");
      await loadCicilan(selectedWarga);
      await loadHistory(historyYear);
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

  const exportHistory = () => {
    if (historyRows.length === 0) {
      toast.error("Belum ada histori untuk diekspor.");
      return;
    }

    const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Warga", "Bulan", "Tahun", "Tanggal Bayar", "Nominal", "Kas RT", "Kas RW", "Kode"],
      ...historyRows.map((item) => [
        item.warga.nama_kk,
        String(item.bulan),
        String(item.tahun),
        formatDate(item.tanggal_bayar),
        String(item.nominal),
        String(item.nominal_kas_rt ?? ""),
        String(item.nominal_kas_rw ?? ""),
        item.kode_unik ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `histori-iuran-rt-${historyYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredWarga = useMemo(() => {
    if (!data) return [];
    return data.warga.filter((w) => w.nama_kk.toLowerCase().includes(searchNama.toLowerCase()));
  }, [data, searchNama]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-slate-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gagal Memuat Manajemen Iuran</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadData} variant="outline">Coba Lagi</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RT</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Manajemen iuran warga</span>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Manajemen Iuran</h1>
            <p className="text-base text-slate-500 dark:text-muted-foreground">
              Daftar tagihan, create cicilan, CRUD cicilan, dan histori pembayaran iuran.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={historyYear} onChange={(e) => setHistoryYear(e.target.value)} className="h-10 rounded-md border bg-background px-3">
              {Array.from({ length: 5 }, (_, idx) => currentYear - idx).map((year) => (
                <option key={year} value={String(year)}>{year}</option>
              ))}
            </select>
            <Button variant="outline" onClick={() => loadHistory(historyYear)}>Muat Histori</Button>
            <Button variant="outline" onClick={exportHistory}>Export CSV</Button>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4 text-slate-500" />
            Cari Warga
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="space-y-2">
            <Label htmlFor="cari-nama">Cari Warga</Label>
            <Input id="cari-nama" placeholder="Nama kepala keluarga" value={searchNama} onChange={(e) => setSearchNama(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Tagihan Iuran</CardTitle>
            <Badge variant="outline">{filteredWarga.length} warga</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warga</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarga.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-sm text-slate-500">Data tidak ditemukan.</TableCell>
                  </TableRow>
                ) : (
                  filteredWarga.flatMap((warga) => {
                    if (warga.iuran.length === 0) {
                      return [
                        <TableRow key={`${warga.id}-empty`}>
                          <TableCell>{warga.nama_kk}</TableCell>
                          <TableCell colSpan={3} className="text-sm text-slate-500">Tidak ada data iuran aktif.</TableCell>
                        </TableRow>,
                      ];
                    }

                    const nominalBulanan = warga.iuran[0]?.nominal ?? 0;

                    return [
                      <TableRow key={warga.id} className="align-top">
                        <TableCell className="align-top">
                          <p className="font-semibold">{warga.nama_kk}</p>
                          <p className="text-xs text-slate-500">Blok {data?.nama_blok}</p>
                        </TableCell>
                        <TableCell className="align-top">
                          <p className="font-semibold">{formatCurrency(nominalBulanan)}</p>
                          <p className="text-xs text-slate-500">Nominal per bulan</p>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-2 min-w-245">
                            <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                              {months.map((month) => (
                                <div key={`${warga.id}-${month.value}-label`} className="px-1">
                                  {month.label}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-12 gap-2">
                              {warga.iuran.map((iuran) => {
                                const meta = getIuranTone(iuran);
                                return (
                                  <button
                                    key={`${warga.id}-${iuran.id ?? iuran.bulan}`}
                                    type="button"
                                    onClick={() => openDetail(warga.nama_kk, iuran)}
                                    className={`group flex min-h-18 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center text-xs font-medium shadow-sm transition ${toneClasses[meta.tone]}`}
                                    title={`${getMonthLabel(iuran.bulan)} - ${meta.label}`}
                                  >
                                    <span className="text-[10px] opacity-70">{getMonthLabel(iuran.bulan)}</span>
                                    <span className="mt-2 size-3 rounded-full bg-current shadow-[0_0_0_4px_rgba(255,255,255,0.35)] dark:shadow-[0_0_0_4px_rgba(15,23,42,0.35)]" />
                                    <span className="mt-2 leading-none">{meta.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <Button variant="outline" className="gap-2" onClick={() => setSelectedWarga(warga.id)}>
                            Pilih Warga
                          </Button>
                        </TableCell>
                      </TableRow>,
                    ];
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Cicilan</CardTitle>
          <CardDescription>
            Iuran wajib RW ditetapkan pusat. Tambahan iuran mandiri dapat ditambahkan per warga di sini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Warga</Label>
              <select value={selectedWarga} onChange={(e) => setSelectedWarga(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
                <option value="">Pilih warga</option>
                {data?.warga.map((warga) => (
                  <option key={warga.id} value={warga.id}>{warga.nama_kk}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Iuran Belum Lunas</Label>
              <select value={selectedIuran} onChange={(e) => setSelectedIuran(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
                <option value="">Pilih iuran</option>
                {unpaidIuran.map((item) => (
                  <option key={item.id} value={item.id ?? ""}>Bulan {item.bulan}/{item.tahun} - {formatCurrency(item.nominal)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
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
            <div className="space-y-2">
              <Label>Tambahan Iuran Mandiri</Label>
              <Input type="number" min={0} value={tambahanNominal} onChange={(e) => setTambahanNominal(e.target.value)} />
            </div>
          </div>
          <Button variant="rw" onClick={handleCreate} disabled={saving || !selectedIuran}>
            {saving ? "Menyimpan..." : "Buat Cicilan"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CRUD Daftar Cicilan</CardTitle>
          <CardDescription>Ubah periode, tandai lunas, atau hapus cicilan untuk warga terpilih.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {cicilanList.map((item) => (
            <div key={item.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{formatCurrency(item.total_cicilan)}</div>
                  <div className="text-xs text-slate-500">{item.bulan_mulai}/{item.tahun_mulai} · {item.jumlah_bulan} bulan</div>
                </div>
                <Badge variant={item.sudah_lunas ? "success" : "pending"}>{item.sudah_lunas ? "LUNAS" : "BELUM LUNAS"}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {!item.sudah_lunas && <Button size="sm" variant="outline" onClick={() => handleMarkPaid(item.id)}>Tandai Lunas</Button>}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingCicilan(item);
                    setEditJumlahBulan(String(item.jumlah_bulan));
                    setEditBulanMulai(String(item.bulan_mulai));
                    setEditTahunMulai(String(item.tahun_mulai));
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>Hapus</Button>
              </div>
            </div>
          ))}
          {cicilanList.length === 0 && <p className="text-sm text-slate-500">Belum ada cicilan untuk warga ini.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histori Pembayaran</CardTitle>
          <CardDescription>Pembayaran iuran yang sudah lunas pada tahun terpilih.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warga</TableHead>
                <TableHead>Bulan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Kas RT</TableHead>
                <TableHead>Kas RW</TableHead>
                <TableHead>Kode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyRows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.warga.nama_kk}</TableCell>
                  <TableCell>{item.bulan}/{item.tahun}</TableCell>
                  <TableCell>{formatDate(item.tanggal_bayar)}</TableCell>
                  <TableCell>{formatCurrency(item.nominal)}</TableCell>
                  <TableCell>{formatCurrency(item.nominal_kas_rt ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(item.nominal_kas_rw ?? 0)}</TableCell>
                  <TableCell className="font-mono text-xs">{item.kode_unik ?? "-"}</TableCell>
                </TableRow>
              ))}
              {historyRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Belum ada histori pembayaran.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Pembayaran</DialogTitle>
            <DialogDescription>Detail per bulan, termasuk status, nominal, dan kode transparansi.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500 dark:text-muted-foreground">Warga</p>
                  <p className="text-lg font-semibold">{selectedDetail?.wargaName}</p>
                </div>
                {selectedDetail?.iuran && (() => {
                  const meta = getIuranTone(selectedDetail.iuran);
                  return (
                    <Badge className={badgeToneClasses[meta.tone]} variant="outline">
                      {meta.label}
                    </Badge>
                  );
                })()}
              </div>

              <Separator className="my-4" />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/70 bg-white/90 p-3 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Periode</p>
                  <p className="mt-1 font-semibold">
                    {selectedDetail ? `${getMonthLabel(selectedDetail.iuran.bulan)} ${selectedDetail.iuran.tahun}` : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/90 p-3 dark:border-white/10 dark:bg-slate-950/40">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Nominal</p>
                  <p className="mt-1 font-semibold">
                    {selectedDetail ? formatCurrency(selectedDetail.iuran.nominal) : "-"}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              {selectedDetail?.iuran && (() => {
                const meta = getIuranTone(selectedDetail.iuran);
                const activeCicilan = selectedDetail.iuran.cicilan.find((item) => !item.sudah_lunas) ?? selectedDetail.iuran.cicilan[0] ?? null;

                return meta.tone === "success" ? (
                  <div className="space-y-3 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tanggal Bayar</p>
                        <p className="mt-1 font-semibold">{formatDate(selectedDetail.iuran.tanggal_bayar)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Kode Transparansi</p>
                        <p className="mt-1 font-mono text-sm font-semibold">{selectedDetail.iuran.kode_unik ?? "-"}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div className="rounded-xl border p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Kas RT</p>
                        <p className="mt-1 font-semibold">{formatCurrency(selectedDetail.iuran.nominal * 0.7)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Setoran RW</p>
                        <p className="mt-1 font-semibold">{formatCurrency(selectedDetail.iuran.nominal * 0.3)}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200">
                      Sudah lunas. Klik detail ini untuk melihat kode transaksi dan informasi pembayaran.
                    </div>
                  </div>
                ) : meta.tone === "warning" && activeCicilan ? (
                  <div className="space-y-3 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Cicilan</p>
                        <p className="mt-1 font-semibold">{formatCurrency(activeCicilan.total_cicilan)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Nominal per Bulan</p>
                        <p className="mt-1 font-semibold">{formatCurrency(activeCicilan.nominal_per_bulan)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Jumlah Bulan</p>
                        <p className="mt-1 font-semibold">{activeCicilan.jumlah_bulan} bulan</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mulai</p>
                        <p className="mt-1 font-semibold">{getMonthLabel(activeCicilan.bulan_mulai)} {activeCicilan.tahun_mulai}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200">
                      Masih ada cicilan yang belum lunas. Klik lunasi untuk melanjutkan pembayaran.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Kas RT</p>
                        <p className="mt-1 font-semibold">{selectedDetail ? formatCurrency(selectedDetail.iuran.nominal * 0.7) : "-"}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Setoran RW</p>
                        <p className="mt-1 font-semibold">{selectedDetail ? formatCurrency(selectedDetail.iuran.nominal * 0.3) : "-"}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200">
                      Belum ada pembayaran. Klik bayar untuk memunculkan detail nominal yang harus disetor.
                    </div>
                  </div>
                );
              })()}

              {selectedDetail?.iuran?.cicilan?.length ? (
                <div className="mt-4 rounded-xl border p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Riwayat Cicilan</p>
                  <div className="mt-3 space-y-2">
                    {selectedDetail.iuran.cicilan.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
                        <div>
                          <p className="font-medium">{item.jumlah_bulan} bulan - {getMonthLabel(item.bulan_mulai)} {item.tahun_mulai}</p>
                          <p className="text-xs text-slate-500">Dibuat {formatDate(item.created_at)}</p>
                        </div>
                        <Badge variant={item.sudah_lunas ? "success" : "pending"}>{item.sudah_lunas ? "LUNAS" : "BELUM LUNAS"}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Tutup</Button>
            {selectedDetail?.iuran && (() => {
              const meta = getIuranTone(selectedDetail.iuran);
              return (
                <Button onClick={handlePrimaryAction} disabled={isProcessing === selectedDetail.iuran.id} className="gap-2">
                  {meta.tone === "success" ? <CheckCircle2 className="size-4" /> : meta.tone === "warning" ? <HandCoins className="size-4" /> : <CreditCard className="size-4" />}
                  {isProcessing === selectedDetail.iuran.id
                    ? "Memproses"
                    : meta.tone === "success"
                      ? "Lihat Detail"
                      : meta.tone === "warning"
                        ? "Lunasi Cicilan"
                        : "Bayar"}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCicilan} onOpenChange={(open) => !open && setEditingCicilan(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Cicilan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Jumlah Bulan</Label><Input type="number" min={1} value={editJumlahBulan} onChange={(e) => setEditJumlahBulan(e.target.value)} /></div>
            <div className="space-y-2"><Label>Bulan Mulai</Label><Input type="number" min={1} max={12} value={editBulanMulai} onChange={(e) => setEditBulanMulai(e.target.value)} /></div>
            <div className="space-y-2"><Label>Tahun Mulai</Label><Input type="number" min={2000} max={3000} value={editTahunMulai} onChange={(e) => setEditTahunMulai(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCicilan(null)}>Batal</Button>
            <Button onClick={handleUpdate}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
