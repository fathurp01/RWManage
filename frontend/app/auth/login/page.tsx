"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import type { AppRole, AuthStoragePayload } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  Landmark,
  HandCoins,
  ChevronLeft,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface FormState {
  message: string;
  fieldErrors: FieldErrors;
}

const initialState: FormState = {
  message: "",
  fieldErrors: {},
};

// "masjid" | "rwrt" — which system was chosen on the first screen
type SystemChoice = "masjid" | "rwrt";

const parseRole = (value: string | null): AppRole | null => {
  if (value === "RW" || value === "RT" || value === "PENGURUS_MASJID" || value === "SUPERADMIN") {
    return value;
  }
  return null;
};

const inferRoleFromNextPath = (nextPath: string | null): AppRole | null => {
  if (!nextPath) return null;
  if (nextPath.startsWith("/dashboard/rw")) return "RW";
  if (nextPath.startsWith("/dashboard/masjid")) return "PENGURUS_MASJID";
  return null;
};

const toRedirectPath = (role: AuthStoragePayload["user"]["role"], nextPath: string | null): string => {
  if (nextPath && nextPath.startsWith("/")) return nextPath;
  return role === "RW" || role === "RT" || role === "SUPERADMIN"
    ? "/dashboard/rw"
    : "/dashboard/masjid";
};



export default function LoginPage() {
  const router = useRouter();
  const { setSession, isAuthenticated, user } = useAuth();
  const hasShownReasonRef = useRef(false);

  const [searchParamsState] = useState(() => {
    if (typeof window === "undefined") {
      return {
        nextPath: null as string | null,
        reason: null as string | null,
        role: null as AppRole | null,
      };
    }
    const params = new URLSearchParams(window.location.search);
    const nextPathFromQuery = params.get("next");
    return {
      nextPath: nextPathFromQuery,
      reason: params.get("reason"),
      role: parseRole(params.get("role")) ?? inferRoleFromNextPath(nextPathFromQuery),
    };
  });

  const nextPath = searchParamsState.nextPath;
  const reason = searchParamsState.reason;

  // --- UI state machine ---
  // Always start in safe server-renderable state (null / "idle").
  // After hydration, a useEffect will restore from URL params if needed.
  const [systemChoice, setSystemChoice] = useState<SystemChoice | null>(null);
  const [animState, setAnimState] = useState<"idle" | "expanding-masjid" | "expanding-rwrt" | "expanded">("idle");

  // Restore state from URL on first client render (avoids SSR/hydration mismatch)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (hydrated) return;
    setHydrated(true);
    const params = new URLSearchParams(window.location.search);
    const nextPathFromQuery = params.get("next");
    const role =
      parseRole(params.get("role")) ??
      inferRoleFromNextPath(nextPathFromQuery);
    if (role === "PENGURUS_MASJID") {
      setSystemChoice("masjid");
      setAnimState("expanded");
    } else if (role === "RW" || role === "RT" || role === "SUPERADMIN") {
      setSystemChoice("rwrt");
      setAnimState("expanded");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSystemSelect = (choice: SystemChoice) => {
    setAnimState(choice === "masjid" ? "expanding-masjid" : "expanding-rwrt");
    setTimeout(() => {
      setSystemChoice(choice);
      setAnimState("expanded");
    }, 420);
  };

  const handleBack = () => {
    setAnimState("idle");
    setSystemChoice(null);
  };

  // Sync system choice to URL (for deep-link restore)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (systemChoice === "masjid") {
      url.searchParams.set("role", "PENGURUS_MASJID");
    } else if (systemChoice === "rwrt") {
      url.searchParams.set("role", "RW");
    } else {
      url.searchParams.delete("role");
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [systemChoice]);

  // Show redirect reasons
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const sessionExpired = params.get("session-expired");
    
    if (sessionExpired === "true" && !hasShownReasonRef.current) {
      hasShownReasonRef.current = true;
      toast.error("Sesi login Anda sudah habis. Silakan login kembali.");
      return;
    }
    
    if (!reason || hasShownReasonRef.current) return;
    hasShownReasonRef.current = true;
    if (reason === "approval_required") {
      toast.error("Akun Anda belum APPROVED. Silakan hubungi pengurus RW.");
      return;
    }
    if (reason === "unauthorized") {
      toast.error("Silakan login untuk mengakses dashboard.");
    }
  }, [reason, hydrated]);

  // Redirect if already logged in
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    router.replace(toRedirectPath(user.role, nextPath));
  }, [isAuthenticated, user, nextPath, router]);

  const [formState, formAction, isPending] = useActionState<FormState, FormData>(
    async (_previousState, formData) => {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");
      // For masjid system, role is always fixed. For rwrt, role auto-detected by backend.
      const system = String(formData.get("system") ?? "") as SystemChoice;

      const fieldErrors: FieldErrors = {};

      if (!email) {
        fieldErrors.email = "Email wajib diisi.";
      }
      if (!password) {
        fieldErrors.password = "Password wajib diisi.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Periksa kembali input login.", fieldErrors };
      }

      // Build payload — only include role for masjid system
      const payload: Record<string, string> = { email, password };
      if (system === "masjid") {
        payload.role = "PENGURUS_MASJID";
      }

      try {
        const response = await api.post<{ data: AuthStoragePayload }>("/auth/login", payload);

        const session = response.data?.data;

        if (!session?.token || !session?.user) {
          toast.error("Respons login tidak valid dari server.");
          return { message: "Respons login tidak valid.", fieldErrors: {} };
        }

        // Guard: masjid system should not let RW/RT/SUPERADMIN in
        if (system === "masjid" && session.user.role !== "PENGURUS_MASJID") {
          toast.error("Akun ini bukan Pengurus Masjid. Gunakan login Sistem RW & RT.");
          return {
            message: "Akun ini bukan Pengurus Masjid.",
            fieldErrors: {},
          };
        }

        // Guard: rwrt system should not let PENGURUS_MASJID in
        if (system === "rwrt" && session.user.role === "PENGURUS_MASJID") {
          toast.error("Akun ini adalah Pengurus Masjid. Gunakan login Sistem Masjid.");
          return {
            message: "Akun ini adalah Pengurus Masjid.",
            fieldErrors: {},
          };
        }

        setSession(session);
        toast.success("Login berhasil.");
        router.push(toRedirectPath(session.user.role, nextPath));

        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  // ─── Helpers ─────────────────────────────────────────────
  const isMasjidExpanding = animState === "expanding-masjid";
  const isRwrtExpanding = animState === "expanding-rwrt";
  const isExpanded = animState === "expanded";

  const systemLabel: Record<SystemChoice, { title: string; subtitle: string; icon: React.ReactNode }> = {
    masjid: {
      title: "Sistem Masjid",
      subtitle: "Masukkan email dan kata sandi Anda",
      icon: <HandCoins className="size-8" />,
    },
    rwrt: {
      title: "Sistem RW & RT",
      subtitle: "Masukkan email dan kata sandi Anda",
      icon: <Landmark className="size-8" />,
    },
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <main className="flex flex-1 min-h-screen items-center justify-center px-4 py-12 hero-gradient overflow-hidden">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none fixed -top-40 -left-40 size-125 rounded-full bg-indigo-400/8 blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -bottom-40 -right-40 size-100 rounded-full bg-emerald-400/8 blur-3xl" />

      {/* ──── PHASE 1: System Selection ──── */}
      {!isExpanded && (
        <div
          className="w-full max-w-2xl"
          style={{
            animation: animState === "idle" ? "fadeSlideUp 0.5s ease-out both" : undefined,
          }}
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
                Selamat Datang
              </h1>
              <p className="text-base text-slate-500 dark:text-muted-foreground mt-1">
                Pilih sistem yang ingin Anda masuki
              </p>
            </div>
          </div>

          {/* Two system cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Masjid Card */}
            <button
              type="button"
              id="btn-select-masjid"
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
                <span
                  className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/30 group-hover:shadow-lg group-hover:shadow-emerald-500/40 transition-all duration-300"
                  aria-hidden
                >
                  <HandCoins className="size-7" />
                </span>

                <div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-foreground">
                    Sistem Masjid
                  </p>
                  <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
                    Kelola kas masjid, transaksi ZIS, laporan keuangan, dan aktivitas masjid.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 group-hover:gap-2.5 transition-all duration-200">
                  Login sebagai Pengurus Masjid
                  <ArrowRight className="size-4" />
                </span>
              </div>

              {/* Subtle corner glow on hover */}
              <div
                className="absolute bottom-0 right-0 size-32 rounded-full bg-emerald-400/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                aria-hidden
              />
            </button>

            {/* RW & RT Card */}
            <button
              type="button"
              id="btn-select-rwrt"
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
                <span
                  className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 group-hover:shadow-lg group-hover:shadow-indigo-500/40 transition-all duration-300"
                  aria-hidden
                >
                  <Landmark className="size-7" />
                </span>

                <div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-foreground">
                    Sistem RW & RT
                  </p>
                  <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
                    Kelola warga, iuran, kas RW/RT, persetujuan pengurus, dan administrasi wilayah.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:gap-2.5 transition-all duration-200">
                  Login sebagai RW, RT, atau Superadmin
                  <ArrowRight className="size-4" />
                </span>
              </div>

              <div
                className="absolute bottom-0 right-0 size-32 rounded-full bg-indigo-400/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                aria-hidden
              />
            </button>
          </div>

          {/* Footer links */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Belum punya akun?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline hover:underline-offset-4"
              >
                Daftar sekarang
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

      {/* ──── PHASE 2: Login Form ──── */}
      {isExpanded && systemChoice && (
        <div
          className="w-full max-w-md"
          style={{ animation: "formFadeIn 0.35s ease-out both" }}
        >
          <div
            className={`rounded-3xl border backdrop-blur-xl shadow-2xl p-8 sm:p-10 ${
              systemChoice === "masjid"
                ? "border-emerald-200/60 dark:border-emerald-500/20 bg-white/92 dark:bg-card/92 shadow-emerald-900/10 dark:shadow-emerald-900/30"
                : "border-indigo-200/60 dark:border-indigo-500/20 bg-white/92 dark:bg-card/92 shadow-indigo-900/10 dark:shadow-indigo-900/30"
            }`}
          >
            {/* Back button */}
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
                className={`inline-flex size-16 items-center justify-center rounded-2xl text-white shadow-md transition-all duration-200 ${
                  systemChoice === "masjid"
                    ? "bg-linear-to-br from-emerald-400 to-teal-600 shadow-emerald-500/30"
                    : "bg-linear-to-br from-indigo-500 to-violet-600 shadow-indigo-500/30"
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
              {/* Pass the chosen system so the action knows which guard to apply */}
              <input type="hidden" name="system" value={systemChoice ?? ""} />

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                  Alamat Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 dark:text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    aria-invalid={Boolean(formState.fieldErrors.email)}
                    disabled={isPending}
                    className="pl-11 h-12 text-base rounded-2xl"
                  />
                </div>
                {formState.fieldErrors.email ? (
                  <p className="text-sm text-destructive font-medium">{formState.fieldErrors.email}</p>
                ) : null}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                  Kata Sandi
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 dark:text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(formState.fieldErrors.password)}
                    disabled={isPending}
                    className="pl-11 h-12 text-base rounded-2xl"
                  />
                </div>
                {formState.fieldErrors.password ? (
                  <p className="text-sm text-destructive font-medium">{formState.fieldErrors.password}</p>
                ) : null}
              </div>

              {/* Global error */}
              {formState.message ? (
                <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/8 px-5 py-4">
                  <p className="text-sm font-medium text-destructive">⚠️ {formState.message}</p>
                </div>
              ) : null}

              {/* Submit */}
              <Button
                type="submit"
                id="btn-login-submit"
                disabled={isPending}
                className={`w-full justify-center gap-2.5 h-12 text-base font-bold rounded-2xl text-white shadow-lg transition-all duration-200 ${
                  systemChoice === "masjid"
                    ? "bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/30 hover:shadow-emerald-500/40"
                    : "bg-linear-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-indigo-500/30 hover:shadow-indigo-500/40"
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/8">
              <p className="text-center text-sm text-slate-500 dark:text-muted-foreground">
                Belum punya akun?{" "}
                <Link
                  href="/auth/register"
                  className={`font-semibold hover:underline hover:underline-offset-4 ${
                    systemChoice === "masjid"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  Daftar sekarang
                </Link>
              </p>
              <p className="text-center text-sm text-slate-500 dark:text-muted-foreground mt-2">
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
        </div>
      )}

      {/* Inline keyframes */}
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
