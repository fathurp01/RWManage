"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banknote,
  Wheat,
  Users,
  MapPin,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Calculator,
  HandCoins,
} from "lucide-react";

interface ActionState {
  message: string;
  fieldErrors: FieldErrors;
  kodeUnik?: string;
}

interface TransaksiZisResponse {
  data: {
    kode_unik: string;
  };
}

const initialState: ActionState = { message: "", fieldErrors: {} };

type Step = 1 | 2 | 3;

function formatCurrencyId(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ZisInputPage() {
  const { user } = useAuth();
  const defaultMasjidId = useMemo(() => user?.masjid_ids?.[0] ?? "", [user]);

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [namaKk, setNamaKk] = useState("");
  const [alamat, setAlamat] = useState("");
  const [waktuTransaksi, setWaktuTransaksi] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  const [jumlahJiwa, setJumlahJiwa] = useState(1);
  const [jenisBayar, setJenisBayar] = useState<"UANG" | "BERAS">("UANG");
  const [jenisZakat, setJenisZakat] = useState<"FITRAH" | "MAAL">("FITRAH");
  const [nilaiHarta, setNilaiHarta] = useState("");
  const [manualNominalMaal, setManualNominalMaal] = useState("");
  const [nominalInfaq, setNominalInfaq] = useState("");

  const [step1Errors, setStep1Errors] = useState<{ nama?: string; alamat?: string; waktu?: string }>({});

  const [hargaBeras, setHargaBeras] = useState(15000);

  const [successCode, setSuccessCode] = useState("");
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  useEffect(() => {
    if (!defaultMasjidId) return;
    api
      .get(`/zis/dashboard?masjid_id=${defaultMasjidId}`)
      .then((res) => {
        if (res.data.data?.pengaturan?.harga_beras_per_kg) {
          setHargaBeras(Number(res.data.data.pengaturan.harga_beras_per_kg));
        }
      })
      .catch(() => undefined);
  }, [defaultMasjidId]);

  const [formState, formAction, isSubmitting] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const masjidId = String(formData.get("masjid_id") ?? "").trim();
      const namaKkVal = String(formData.get("nama_kk") ?? "").trim();
      const alamatVal = String(formData.get("alamat_muzaqi") ?? "").trim();
      const wktVal = String(formData.get("waktu_transaksi") ?? "").trim();
      const jiwaVal = String(formData.get("jumlah_jiwa") ?? "").trim();
      const jenisVal = String(formData.get("jenis_bayar") ?? "").trim();
      const jenisZakatVal = String(formData.get("jenis_zakat") ?? "FITRAH").trim();
      const nilaiHartaVal = String(formData.get("nilai_harta") ?? "").trim();
      const nominalZakatVal = String(formData.get("nominal_zakat") ?? "").trim();
      const infaqVal = String(formData.get("nominal_infaq") ?? "0").trim();

      const fieldErrors: FieldErrors = {};
      if (!masjidId) fieldErrors.masjid_id = "Data masjid tidak ditemukan. Coba login ulang ya.";
      if (!namaKkVal) fieldErrors.nama_kk = "Nama wajib diisi.";
      if (!alamatVal) fieldErrors.alamat_muzaqi = "Alamat wajib diisi.";
      if (!wktVal) fieldErrors.waktu_transaksi = "Waktu transaksi wajib diisi.";
      if (!jiwaVal || Number(jiwaVal) <= 0) fieldErrors.jumlah_jiwa = "Jumlah jiwa harus lebih dari 0.";
      if (jenisVal !== "UANG" && jenisVal !== "BERAS") fieldErrors.jenis_bayar = "Pilih jenis bayar.";
      if (jenisZakatVal !== "FITRAH" && jenisZakatVal !== "MAAL") fieldErrors.jenis_zakat = "Pilih jenis zakat.";
      if (jenisZakatVal === "MAAL" && !nominalZakatVal && !nilaiHartaVal) {
        fieldErrors.nominal_zakat = "Isi nominal zakat maal atau nilai harta.";
      }
      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Ada isian yang belum lengkap / tidak valid.", fieldErrors };
      }

      try {
        const response = await api.post<TransaksiZisResponse>("/zis/transaksi", {
          masjid_id: masjidId,
          nama_kk: namaKkVal,
          alamat_muzaqi: alamatVal,
          waktu_transaksi: new Date(wktVal).toISOString(),
          jumlah_jiwa: Number(jiwaVal),
          jenis_bayar: jenisVal,
          jenis_zakat: jenisZakatVal,
          ...(nilaiHartaVal ? { nilai_harta: Number(nilaiHartaVal) } : {}),
          ...(nominalZakatVal ? { nominal_zakat: Number(nominalZakatVal) } : {}),
          nominal_infaq: Number(infaqVal || 0),
        });

        const kode = response.data.data.kode_unik;
        setSuccessCode(kode);
        setIsSuccessOpen(true);
        toast.success("Transaksi ZIS berhasil disimpan ✅");

        setStep(1);
        setNamaKk("");
        setAlamat("");
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setWaktuTransaksi(now.toISOString().slice(0, 16));
        setJumlahJiwa(1);
        setJenisBayar("UANG");
        setJenisZakat("FITRAH");
        setNilaiHarta("");
        setManualNominalMaal("");
        setNominalInfaq("");

        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  if (!defaultMasjidId) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center py-20">
        <span className="text-5xl">🕌</span>
        <h1 className="text-xl font-bold">Data masjid tidak ditemukan</h1>
        <p className="text-sm text-slate-500">Silakan login ulang sebagai Pengurus Masjid.</p>
      </main>
    );
  }

  const autoTotalBeras = jumlahJiwa * 2.5;
  const autoTotalUang = autoTotalBeras * hargaBeras;

  const stepLabels = ["Data Warga", "Rincian", "Konfirmasi"];

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
            <HandCoins className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Catat ZIS Baru
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Zakat dihitung otomatis per jiwa
            </p>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex flex-1 items-center">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border transition-all ${
                step === s
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : step > s
                  ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300"
                  : "bg-white border-slate-300 text-slate-400 dark:bg-white/5 dark:border-white/15"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded-full ${
                  step > s ? "bg-emerald-400" : "bg-slate-200 dark:bg-white/10"
                }`}
              />
            )}
          </div>
        ))}
        <p className="ml-2 w-28 shrink-0 text-sm font-semibold text-right text-slate-500 dark:text-muted-foreground">
          {stepLabels[step - 1]}
        </p>
      </div>

      {/* Form */}
      <form action={formAction}>
        <input type="hidden" name="masjid_id" value={defaultMasjidId} />
        <input type="hidden" name="nama_kk" value={namaKk} />
        <input type="hidden" name="alamat_muzaqi" value={alamat} />
        <input type="hidden" name="waktu_transaksi" value={waktuTransaksi} />
        <input type="hidden" name="jumlah_jiwa" value={String(jumlahJiwa)} />
        <input type="hidden" name="jenis_bayar" value={jenisBayar} />
        <input type="hidden" name="jenis_zakat" value={jenisZakat} />
        <input type="hidden" name="nilai_harta" value={nilaiHarta} />
        <input type="hidden" name="nominal_zakat" value={manualNominalMaal} />
        <input type="hidden" name="nominal_infaq" value={nominalInfaq || "0"} />

        {/* STEP 1: Data Dasar */}
        {step === 1 && (
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
              <CardTitle>Langkah 1: Data Warga &amp; Waktu</CardTitle>
              <CardDescription>Isi data identitas muzaqi dan waktu transaksi.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="step1_nama">Nama Kepala Keluarga</Label>
                <Input
                  id="step1_nama"
                  value={namaKk}
                  onChange={(e) => {
                    setNamaKk(e.target.value);
                    if (step1Errors.nama) setStep1Errors({ ...step1Errors, nama: undefined });
                  }}
                  placeholder="Contoh: Bapak Ahmad Santoso"
                  className={step1Errors.nama ? "border-destructive/50" : ""}
                  autoFocus
                />
                {step1Errors.nama && (
                  <p className="text-sm font-medium text-destructive">{step1Errors.nama}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="step1_alamat">
                  <MapPin className="size-3.5 inline mr-1" />
                  Alamat Lengkap
                </Label>
                <Input
                  id="step1_alamat"
                  value={alamat}
                  onChange={(e) => {
                    setAlamat(e.target.value);
                    if (step1Errors.alamat) setStep1Errors({ ...step1Errors, alamat: undefined });
                  }}
                  placeholder="Contoh: Blok A No. 3"
                  className={step1Errors.alamat ? "border-destructive/50" : ""}
                />
                {step1Errors.alamat && (
                  <p className="text-sm font-medium text-destructive">{step1Errors.alamat}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="step1_waktu">
                  <CalendarDays className="size-3.5 inline mr-1" />
                  Tanggal &amp; Jam Transaksi
                </Label>
                <Input
                  id="step1_waktu"
                  type="datetime-local"
                  value={waktuTransaksi}
                  onChange={(e) => {
                    setWaktuTransaksi(e.target.value);
                    if (step1Errors.waktu) setStep1Errors({ ...step1Errors, waktu: undefined });
                  }}
                  className={step1Errors.waktu ? "border-destructive/50" : ""}
                />
                {step1Errors.waktu && (
                  <p className="text-sm font-medium text-destructive">{step1Errors.waktu}</p>
                )}
              </div>

              <Button
                type="button"
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                onClick={() => {
                  const err: Record<string, string> = {};
                  const namaTrimmed = namaKk.trim();
                  const alamatTrimmed = alamat.trim();

                  if (!namaTrimmed) err.nama = "Nama Kepala Keluarga wajib diisi.";
                  else if (namaTrimmed.length < 2) err.nama = "Nama minimal 2 karakter.";

                  if (!alamatTrimmed) err.alamat = "Alamat wajib diisi.";
                  else if (alamatTrimmed.length < 3) err.alamat = "Alamat minimal 3 karakter.";

                  if (!waktuTransaksi) err.waktu = "Waktu transaksi wajib diisi.";

                  if (Object.keys(err).length > 0) {
                    setStep1Errors(err);
                    toast.error("Ada data yang belum lengkap.");
                    return;
                  }

                  setStep1Errors({});
                  setStep(2);
                }}
              >
                Lanjut Isi Rincian <ChevronRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Rincian */}
        {step === 2 && (
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
              <CardTitle>Langkah 2: Rincian Zakat &amp; Infaq</CardTitle>
              <CardDescription>Tentukan jumlah jiwa, jenis bayar, dan infaq.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {/* Jumlah Jiwa */}
              <div className="space-y-2">
                <Label>
                  <Users className="size-3.5 inline mr-1" />
                  Jumlah Jiwa
                </Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setJumlahJiwa((j) => Math.max(1, j - 1))}
                    className="size-9 rounded-lg bg-slate-100 dark:bg-white/10 text-lg font-bold hover:bg-slate-200 dark:hover:bg-white/15 transition-colors border border-slate-200 dark:border-white/10"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-2xl font-black text-slate-900 dark:text-foreground tabular-nums">
                    {jumlahJiwa}
                  </span>
                  <button
                    type="button"
                    onClick={() => setJumlahJiwa((j) => j + 1)}
                    className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-lg font-bold hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors border border-emerald-200 dark:border-emerald-700"
                  >
                    +
                  </button>
                  <span className="text-sm text-slate-500 dark:text-muted-foreground">jiwa / anggota keluarga</span>
                </div>
              </div>

              {/* Jenis Bayar */}
              <div className="space-y-2">
                <Label>Bayar Menggunakan</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setJenisBayar("UANG")}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-semibold ${
                      jenisBayar === "UANG"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-card text-slate-600 dark:text-slate-400 hover:border-emerald-300"
                    }`}
                  >
                    <Banknote className={`size-5 ${jenisBayar === "UANG" ? "text-emerald-500" : "text-slate-400"}`} />
                    Uang Tunai
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenisBayar("BERAS")}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-semibold ${
                      jenisBayar === "BERAS"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-card text-slate-600 dark:text-slate-400 hover:border-emerald-300"
                    }`}
                  >
                    <Wheat className={`size-5 ${jenisBayar === "BERAS" ? "text-emerald-500" : "text-slate-400"}`} />
                    Beras (Kg)
                  </button>
                </div>
              </div>

              {/* Jenis Zakat (Fitrah / Maal) */}
              <div className="space-y-2">
                <Label>Jenis Zakat</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setJenisZakat("FITRAH")}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-semibold ${
                      jenisZakat === "FITRAH"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-card text-slate-600 dark:text-slate-400 hover:border-emerald-300"
                    }`}
                  >
                    Zakat Fitrah
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenisZakat("MAAL")}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-semibold ${
                      jenisZakat === "MAAL"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-card text-slate-600 dark:text-slate-400 hover:border-emerald-300"
                    }`}
                  >
                    Zakat Maal
                  </button>
                </div>
              </div>

              {jenisZakat === "MAAL" && (
                <div className="space-y-2">
                  <Label htmlFor="s2_nilai_harta">Nilai Harta (IDR)</Label>
                  <Input
                    id="s2_nilai_harta"
                    type="number"
                    min={0}
                    step={1000}
                    value={nilaiHarta}
                    onChange={(e) => setNilaiHarta(e.target.value)}
                    placeholder="Total nilai harta yang dizakatkan"
                  />
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">
                    Jika diisi, sistem akan menghitung 2.5% dari nilai harta bila nominal manual tidak diisi.
                  </p>

                  <Label htmlFor="s2_nominal_maal">Nominal Zakat Maal</Label>
                  <Input
                    id="s2_nominal_maal"
                    type="number"
                    min={0}
                    step={1000}
                    value={manualNominalMaal}
                    onChange={(e) => setManualNominalMaal(e.target.value)}
                    placeholder="Override nominal otomatis jika perlu"
                  />
                </div>
              )}

              {/* Infaq */}
              <div className="space-y-1.5">
                <Label htmlFor="s2_infaq">
                  Nominal Infaq{" "}
                  <span className="text-slate-400 text-xs font-normal">(opsional)</span>
                </Label>
                <Input
                  id="s2_infaq"
                  type="number"
                  min={0}
                  step={1000}
                  value={nominalInfaq}
                  onChange={(e) => setNominalInfaq(e.target.value)}
                  placeholder="Misal: 50000"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft className="size-4" /> Kembali
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    if (jumlahJiwa < 1) return toast.error("Jumlah jiwa minimal 1.");
                    setStep(3);
                  }}
                >
                  Konfirmasi <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Konfirmasi */}
        {step === 3 && (
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
              <CardTitle>Langkah 3: Konfirmasi Data</CardTitle>
              <CardDescription>Periksa kembali sebelum transaksi dikunci.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* Ringkasan biodata */}
              <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-foreground">{namaKk}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400"> Alamat: {alamat}</p>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">
                  Tanggal: {new Date(waktuTransaksi).toLocaleString("id-ID")}
                </p>
              </div>

              {/* Kalkulasi otomatis */}
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calculator className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                    Kalkulasi Zakat Otomatis
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-emerald-900 dark:text-emerald-100 text-xs font-semibold mb-0.5">
                      Total Jiwa
                    </p>
                    <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums">
                      {jumlahJiwa} <span className="text-sm font-semibold">orang</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-900 dark:text-emerald-100 text-xs font-semibold mb-0.5">
                      Jenis Bayar
                    </p>
                    <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
                      {jenisBayar === "BERAS" ? (
                        <Wheat className={`size-5 ${jenisBayar === "BERAS" ? "text-emerald-500" : "text-slate-400"}`} />
                      ) : (
                        <Banknote className={`size-5 ${jenisBayar === "UANG" ? "text-emerald-500" : "text-slate-400"}`} />
                      )}
                      <span>{jenisBayar === "UANG" ? "Uang" : "Beras"}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-emerald-200 dark:bg-emerald-800/60 rounded" />

                <div className="flex justify-between items-center text-sm">
                  {jenisZakat === "FITRAH" ? (
                    <>
                      <div>
                        <p className="font-semibold text-emerald-800 dark:text-emerald-200">Zakat Fitrah</p>
                        <p className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
                          /jiwa = {jenisBayar === "UANG" ? formatCurrencyId(2.5 * hargaBeras) : "2.5 Kg"}
                        </p>
                      </div>
                      <p className="text-lg font-black text-slate-800 dark:text-white">
                        {jenisBayar === "UANG" ? formatCurrencyId(autoTotalUang) : `${autoTotalBeras.toFixed(1)} Kg`}
                      </p>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="font-semibold text-emerald-800 dark:text-emerald-200">Zakat Maal</p>
                        <p className="text-sm text-slate-600 dark:text-foreground/70">
                          {manualNominalMaal
                            ? `Nominal (manual): ${formatCurrencyId(Number(manualNominalMaal))}`
                            : nilaiHarta
                            ? `Perkiraan (2.5% dari nilai harta): ${formatCurrencyId(
                                Math.round(Number(nilaiHarta) * 0.025)
                              )}`
                            : `Masukkan nilai harta atau nominal untuk menghitung.`}
                        </p>
                      </div>
                      <p className="text-lg font-black text-slate-800 dark:text-white">
                        {manualNominalMaal
                          ? formatCurrencyId(Number(manualNominalMaal))
                          : nilaiHarta
                          ? formatCurrencyId(Math.round(Number(nilaiHarta) * 0.025))
                          : formatCurrencyId(0)}
                      </p>
                    </>
                  )}
                </div>

                {Number(nominalInfaq) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">Infaq</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-300">
                      {formatCurrencyId(Number(nominalInfaq))}
                    </p>
                  </div>
                )}
              </div>

              {formState.message && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-sm font-semibold text-center">
                  {formState.message}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 border-2"
                  disabled={isSubmitting}
                  onClick={() => setStep(2)}
                >
                  <ChevronLeft className="size-4" /> Revisi
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" /> Simpan &amp; Cetak Resi
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

      {/* Dialog Sukses */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="sr-only">Transaksi Berhasil</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="text-5xl">✅</span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-foreground">Transaksi Tersimpan!</h2>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Catat <strong>Nomor Resi</strong> berikut sebagai bukti:
            </p>
            <div className="w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                No. Bukti Resmi
              </p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 break-all leading-tight">
                {successCode}
              </p>
            </div>
            <Button
              type="button"
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setIsSuccessOpen(false)}
            >
              Kembali ke Awal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
