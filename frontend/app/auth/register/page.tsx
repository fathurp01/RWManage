"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { isUuid, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Loader2,
  HandCoins,
  Landmark,
  ArrowRight,
  ChevronLeft,
  User,
  Mail,
  Phone,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface FormState {
  message: string;
  fieldErrors: FieldErrors;
}

interface WilayahRwOption {
  id: string;
  nama_kompleks: string;
  no_rw: string;
}

interface MasjidOption {
  id: string;
  nama_masjid: string;
  alamat: string;
  blok_wilayah_id: string;
  nama_blok: string;
  wilayah_rw_id: string;
  nama_kompleks: string;
  no_rw: string;
}

interface MasjidListResponse {
  data: {
    wilayah_rw: WilayahRwOption[];
    masjid: MasjidOption[];
  };
}

const initialState: FormState = {
  message: "",
  fieldErrors: {},
};

type SystemChoice = "masjid" | "rwrt";

export default function RegisterPage() {
  const router = useRouter();

  // --- Phase 1 state ---
  const [systemChoice, setSystemChoice] = useState<SystemChoice | null>(null);
  const [animState, setAnimState] = useState<"idle" | "expanding-masjid" | "expanding-rwrt" | "expanded">("idle");

  // --- Phase 2 state (inside form) ---
  const [role, setRole] = useState<AppRole>("RW");
  const [wilayahRwOptions, setWilayahRwOptions] = useState<WilayahRwOption[]>([]);
  const [masjidOptions, setMasjidOptions] = useState<MasjidOption[]>([]);
  const [selectedRwId, setSelectedRwId] = useState<string>("");
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  const handleSystemSelect = (choice: SystemChoice) => {
    setAnimState(choice === "masjid" ? "expanding-masjid" : "expanding-rwrt");
    setTimeout(() => {
      setSystemChoice(choice);
      setAnimState("expanded");
      // Pre-select appropriate role
      if (choice === "masjid") {
        setRole("PENGURUS_MASJID");
      } else {
        setRole("RW");
      }
    }, 420);
  };

  const handleBack = () => {
    setAnimState("idle");
    setSystemChoice(null);
    setRole("RW");
    setSelectedRwId("");
  };

  // Fetch masjid catalog when entering masjid form
  useEffect(() => {
    if (role !== "PENGURUS_MASJID") return;
    if (masjidOptions.length > 0 || isCatalogLoading) return;

    const fetchCatalog = async () => {
      setIsCatalogLoading(true);
      try {
        const response = await api.get<MasjidListResponse>("/public/masjid-list");
        setWilayahRwOptions(response.data.data.wilayah_rw);
        setMasjidOptions(response.data.data.masjid);
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
      } finally {
        setIsCatalogLoading(false);
      }
    };

    fetchCatalog().catch(() => {
      toast.error("Gagal memuat daftar masjid.");
      setIsCatalogLoading(false);
    });
  }, [role, masjidOptions.length, isCatalogLoading]);

  const filteredMasjid = useMemo(() => {
    if (!selectedRwId) return masjidOptions;
    return masjidOptions.filter((masjid) => masjid.wilayah_rw_id === selectedRwId);
  }, [masjidOptions, selectedRwId]);

  const [formState, formAction, isPending] = useActionState<FormState, FormData>(
    async (_previousState, formData) => {
      const nama = String(formData.get("nama") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const noHp = String(formData.get("no_hp") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const selectedRole = String(formData.get("role") ?? "RW") as AppRole;
      const masjidId = String(formData.get("masjid_id") ?? "").trim();
      const blokWilayahIdInput = String(formData.get("blok_wilayah_id") ?? "").trim();

      const fieldErrors: FieldErrors = {};

      if (!nama) fieldErrors.nama = "Nama wajib diisi.";
      if (!email) fieldErrors.email = "Email wajib diisi.";
      if (!noHp) fieldErrors.no_hp = "No HP wajib diisi.";
      if (password.length < 8) fieldErrors.password = "Password minimal 8 karakter.";
      if (selectedRole !== "RW" && selectedRole !== "RT" && selectedRole !== "PENGURUS_MASJID") {
        fieldErrors.role = "Role tidak valid.";
      }

      const payload: Record<string, string> = {
        nama,
        email,
        no_hp: noHp,
        password,
        role: selectedRole,
      };

      if (selectedRole === "PENGURUS_MASJID") {
        if (!masjidId) {
          fieldErrors.masjid_id = "Masjid wajib dipilih untuk role Pengurus Masjid.";
        }
        if (masjidId && !isUuid(masjidId)) {
          fieldErrors.masjid_id = "masjid_id harus UUID valid.";
        }
        const matchedMasjid = masjidOptions.find((item) => item.id === masjidId);
        if (masjidId && matchedMasjid?.blok_wilayah_id) {
          payload.blok_wilayah_id = matchedMasjid.blok_wilayah_id;
        }
        if (masjidId) {
          payload.masjid_id = masjidId;
        }
      }

      if ((selectedRole === "RW" || selectedRole === "RT") && blokWilayahIdInput) {
        if (!isUuid(blokWilayahIdInput)) {
          fieldErrors.blok_wilayah_id = "blok_wilayah_id harus UUID valid.";
        } else {
          payload.blok_wilayah_id = blokWilayahIdInput;
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Periksa kembali input registrasi.", fieldErrors };
      }

      try {
        await api.post("/auth/register", payload);
        toast.success("Registrasi berhasil. Silakan login.");
        router.push("/auth/login");
        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  const isExpanded = animState === "expanded";
  const isMasjidExpanding = animState === "expanding-masjid";
  const isRwrtExpanding = animState === "expanding-rwrt";

  const systemLabel = {
    masjid: {
      title: "Daftar — Sistem Masjid",
      subtitle: "Buat akun Pengurus Masjid",
      icon: <HandCoins className="size-8" />,
      colorExpand: "emerald",
    },
    rwrt: {
      title: "Daftar — Sistem RW & RT",
      subtitle: "Buat akun Pengurus RW atau RT",
      icon: <Landmark className="size-8" />,
      colorExpand: "indigo",
    },
  } as const;

  const selectClass = "h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 dark:text-foreground";

  return (
    <main className="flex flex-1 min-h-screen items-center justify-center px-4 py-12 hero-gradient overflow-hidden">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none fixed -top-40 -left-40 size-125 rounded-full bg-indigo-400/8 blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -bottom-40 -right-40 size-100 rounded-full bg-emerald-400/8 blur-3xl" />

      {/* ──── PHASE 1 ──── */}
      {!isExpanded && (
        <div
          className="w-full max-w-2xl"
          style={{ animation: animState === "idle" ? "fadeSlideUp 0.5s ease-out both" : undefined }}
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-10">
            <Link href="/" className="group">
              <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 group-hover:shadow-lg group-hover:shadow-indigo-500/40 transition-all duration-200">
                <Building2 className="size-8" />
              </span>
            </Link>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
                Buat Akun Baru
              </h1>
              <p className="text-base text-slate-500 dark:text-muted-foreground mt-1">
                Pilih sistem yang ingin Anda daftarkan
              </p>
            </div>
          </div>

          {/* System cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Masjid */}
            <button
              type="button"
              id="btn-register-masjid"
              onClick={() => handleSystemSelect("masjid")}
              disabled={isMasjidExpanding || isRwrtExpanding}
              className="group relative rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/90 dark:bg-card/90 backdrop-blur-xl shadow-xl shadow-slate-900/8 dark:shadow-black/30 p-8 text-left transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-emerald-300 dark:hover:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              style={{
                animation: isMasjidExpanding
                  ? "cardExpand 0.42s cubic-bezier(0.4, 0, 0.2, 1) both"
                  : isRwrtExpanding
                  ? "cardFadeOut 0.3s ease-out both"
                  : undefined,
              }}
            >
              <div className="flex flex-col gap-5">
                <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/30 group-hover:shadow-lg group-hover:shadow-emerald-500/40 transition-all duration-300" aria-hidden>
                  <HandCoins className="size-7" />
                </span>
                <div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-foreground">Sistem Masjid</p>
                  <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
                    Daftar sebagai Pengurus Masjid untuk mengelola kas dan transaksi ZIS.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 group-hover:gap-2.5 transition-all duration-200">
                  Daftar sebagai Pengurus Masjid
                  <ArrowRight className="size-4" />
                </span>
              </div>
              <div className="absolute bottom-0 right-0 size-32 rounded-full bg-emerald-400/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" aria-hidden />
            </button>

            {/* RW & RT */}
            <button
              type="button"
              id="btn-register-rwrt"
              onClick={() => handleSystemSelect("rwrt")}
              disabled={isMasjidExpanding || isRwrtExpanding}
              className="group relative rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/90 dark:bg-card/90 backdrop-blur-xl shadow-xl shadow-slate-900/8 dark:shadow-black/30 p-8 text-left transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              style={{
                animation: isRwrtExpanding
                  ? "cardExpand 0.42s cubic-bezier(0.4, 0, 0.2, 1) both"
                  : isMasjidExpanding
                  ? "cardFadeOut 0.3s ease-out both"
                  : undefined,
              }}
            >
              <div className="flex flex-col gap-5">
                <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 group-hover:shadow-lg group-hover:shadow-indigo-500/40 transition-all duration-300" aria-hidden>
                  <Landmark className="size-7" />
                </span>
                <div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-foreground">Sistem RW & RT</p>
                  <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
                    Daftar sebagai Pengurus RW atau RT untuk mengelola administrasi wilayah.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:gap-2.5 transition-all duration-200">
                  Daftar sebagai RW atau RT
                  <ArrowRight className="size-4" />
                </span>
              </div>
              <div className="absolute bottom-0 right-0 size-32 rounded-full bg-indigo-400/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" aria-hidden />
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Sudah punya akun?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline hover:underline-offset-4"
              >
                Login sekarang
              </Link>
            </p>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              atau{" "}
              <Link
                href="/"
                className="font-medium text-slate-700 dark:text-foreground hover:underline hover:underline-offset-4"
              >
                kembali ke beranda
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ──── PHASE 2: Register form ──── */}
      {isExpanded && systemChoice && (
        <div
          className="w-full max-w-lg"
          style={{ animation: "formFadeIn 0.35s ease-out both" }}
        >
          <div
            className={`rounded-3xl border backdrop-blur-xl shadow-2xl p-8 sm:p-10 ${
              systemChoice === "masjid"
                ? "border-emerald-200/60 dark:border-emerald-500/20 bg-white/92 dark:bg-card/92 shadow-emerald-900/10 dark:shadow-emerald-900/30"
                : "border-indigo-200/60 dark:border-indigo-500/20 bg-white/92 dark:bg-card/92 shadow-indigo-900/10 dark:shadow-indigo-900/30"
            }`}
          >
            {/* Back */}
            <button
              type="button"
              onClick={handleBack}
              className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform duration-150" />
              Pilih sistem lain
            </button>

            {/* Icon + Title */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <span
                className={`inline-flex size-16 items-center justify-center rounded-2xl text-white shadow-md ${
                  systemChoice === "masjid"
                    ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/30"
                    : "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/30"
                }`}
              >
                {systemLabel[systemChoice].icon}
              </span>
              <div className="text-center">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
                  {systemLabel[systemChoice].title}
                </h1>
                <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
                  {systemLabel[systemChoice].subtitle}
                </p>
              </div>
            </div>

            <form action={formAction} className="space-y-5">
              <input type="hidden" name="role" value={role} />

              {/* Role picker — only for rwrt */}
              {systemChoice === "rwrt" && (
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                    Daftar sebagai
                  </Label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(["RW", "RT"] as AppRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        disabled={isPending}
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all duration-150 ${
                          role === r
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20"
                        }`}
                      >
                        Pengurus {r}
                      </button>
                    ))}
                  </div>
                  {formState.fieldErrors.role ? (
                    <p className="text-xs text-destructive font-medium">{formState.fieldErrors.role}</p>
                  ) : null}
                </div>
              )}

              {/* Personal info grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Nama */}
                <div className="space-y-1.5">
                  <Label htmlFor="nama" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                    Nama Lengkap
                  </Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="nama"
                      name="nama"
                      placeholder="Nama lengkap"
                      aria-invalid={Boolean(formState.fieldErrors.nama)}
                      disabled={isPending}
                      className="pl-10 h-10 rounded-xl"
                    />
                  </div>
                  {formState.fieldErrors.nama ? (
                    <p className="text-xs text-destructive">{formState.fieldErrors.nama}</p>
                  ) : null}
                </div>

                {/* No HP */}
                <div className="space-y-1.5">
                  <Label htmlFor="no_hp" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                    No HP
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="no_hp"
                      name="no_hp"
                      placeholder="08xxxxxxxxxx"
                      aria-invalid={Boolean(formState.fieldErrors.no_hp)}
                      disabled={isPending}
                      className="pl-10 h-10 rounded-xl"
                    />
                  </div>
                  {formState.fieldErrors.no_hp ? (
                    <p className="text-xs text-destructive">{formState.fieldErrors.no_hp}</p>
                  ) : null}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="nama@email.com"
                      aria-invalid={Boolean(formState.fieldErrors.email)}
                      disabled={isPending}
                      className="pl-10 h-10 rounded-xl"
                    />
                  </div>
                  {formState.fieldErrors.email ? (
                    <p className="text-xs text-destructive">{formState.fieldErrors.email}</p>
                  ) : null}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Min. 8 karakter"
                      aria-invalid={Boolean(formState.fieldErrors.password)}
                      disabled={isPending}
                      className="pl-10 h-10 rounded-xl"
                    />
                  </div>
                  {formState.fieldErrors.password ? (
                    <p className="text-xs text-destructive">{formState.fieldErrors.password}</p>
                  ) : null}
                </div>
              </div>

              {/* RW system: optional blok wilayah ID */}
              {systemChoice === "rwrt" && (
                <div className="space-y-1.5">
                  <Label htmlFor="blok_wilayah_id" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                    Blok Wilayah ID{" "}
                    <span className="font-normal text-slate-400">(opsional, UUID)</span>
                  </Label>
                  <Input
                    id="blok_wilayah_id"
                    name="blok_wilayah_id"
                    placeholder="550e8400-e29b-41d4-a716-446655440011"
                    aria-invalid={Boolean(formState.fieldErrors.blok_wilayah_id)}
                    disabled={isPending}
                    className="h-10 rounded-xl font-mono text-xs"
                  />
                  {formState.fieldErrors.blok_wilayah_id ? (
                    <p className="text-xs text-destructive">{formState.fieldErrors.blok_wilayah_id}</p>
                  ) : null}
                </div>
              )}

              {/* Masjid system: pick RW + mosque */}
              {systemChoice === "masjid" && (
                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-500/15 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-4">
                  <p className="text-sm font-bold text-slate-700 dark:text-foreground/90">Pilih RW & Masjid</p>

                  {/* RW filter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="rw_picker" className="text-xs font-semibold text-slate-600 dark:text-muted-foreground">
                      Filter Wilayah RW
                    </Label>
                    {isCatalogLoading ? (
                      <Skeleton className="h-10 w-full rounded-xl" />
                    ) : (
                      <select
                        id="rw_picker"
                        value={selectedRwId}
                        onChange={(e) => setSelectedRwId(e.target.value)}
                        className={selectClass}
                        disabled={isPending}
                      >
                        <option value="">Semua RW</option>
                        {wilayahRwOptions.map((rw) => (
                          <option key={rw.id} value={rw.id}>
                            {rw.nama_kompleks} - RW {rw.no_rw}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Masjid picker */}
                  <div className="space-y-1.5">
                    <Label htmlFor="masjid_id" className="text-xs font-semibold text-slate-600 dark:text-muted-foreground">
                      Masjid
                    </Label>
                    {isCatalogLoading ? (
                      <Skeleton className="h-10 w-full rounded-xl" />
                    ) : (
                      <select
                        id="masjid_id"
                        name="masjid_id"
                        className={selectClass}
                        disabled={isPending}
                        aria-invalid={Boolean(formState.fieldErrors.masjid_id)}
                      >
                        <option value="">Pilih masjid</option>
                        {filteredMasjid.map((masjid) => (
                          <option key={masjid.id} value={masjid.id}>
                            {masjid.nama_masjid} — {masjid.nama_kompleks} RW {masjid.no_rw} ({masjid.nama_blok})
                          </option>
                        ))}
                      </select>
                    )}
                    {formState.fieldErrors.masjid_id ? (
                      <p className="text-xs text-destructive">{formState.fieldErrors.masjid_id}</p>
                    ) : null}
                    {isCatalogLoading && (
                      <p className="text-xs text-slate-500 dark:text-muted-foreground">Memuat daftar RW dan masjid...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Global error */}
              {formState.message ? (
                <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/8 px-4 py-3">
                  <p className="text-sm font-medium text-destructive">⚠️ {formState.message}</p>
                </div>
              ) : null}

              {/* Submit */}
              <Button
                type="submit"
                id="btn-register-submit"
                disabled={isPending}
                className={`w-full justify-center gap-2.5 h-12 text-base font-bold rounded-2xl text-white shadow-lg transition-all duration-200 ${
                  systemChoice === "masjid"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/30 hover:shadow-emerald-500/40"
                    : "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-indigo-500/30 hover:shadow-indigo-500/40"
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Daftar Sekarang
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/8">
              <p className="text-center text-sm text-slate-500 dark:text-muted-foreground">
                Sudah punya akun?{" "}
                <Link
                  href="/auth/login"
                  className={`font-semibold hover:underline hover:underline-offset-4 ${
                    systemChoice === "masjid"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  Login sekarang
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardExpand {
          0%   { transform: scale(1); opacity: 1; }
          60%  { transform: scale(1.04); }
          100% { transform: scale(1.06); opacity: 0.7; }
        }
        @keyframes cardFadeOut {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.96); }
        }
        @keyframes formFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </main>
  );
}
