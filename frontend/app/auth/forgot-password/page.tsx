"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, Lock, ArrowLeft, Send, CheckCircle2 } from "lucide-react";

interface FormState {
  message: string;
  fieldErrors: FieldErrors;
}

const initialState: FormState = {
  message: "",
  fieldErrors: {},
};

export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);

  const [formState, formAction, isPending] = useActionState<FormState, FormData>(
    async (_previousState, formData) => {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const new_password = String(formData.get("new_password") ?? "");
      const confirm_password = String(formData.get("confirm_password") ?? "");
      const alasan = String(formData.get("alasan") ?? "").trim();

      const fieldErrors: FieldErrors = {};

      if (!email) fieldErrors.email = "Email wajib diisi.";
      if (!new_password) fieldErrors.new_password = "Password baru wajib diisi.";
      if (!confirm_password) fieldErrors.confirm_password = "Konfirmasi password wajib diisi.";
      if (!alasan) fieldErrors.alasan = "Alasan wajib diisi.";

      if (new_password && confirm_password && new_password !== confirm_password) {
        fieldErrors.confirm_password = "Password tidak cocok.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Periksa kembali input Anda.", fieldErrors };
      }

      try {
        await api.post("/auth/forgot-password", {
          email,
          new_password,
          confirm_password,
          alasan,
        });

        setIsSuccess(true);
        toast.success("Permintaan berhasil dikirim.");
        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  return (
    <main className="flex flex-1 min-h-screen items-center justify-center px-4 py-12 hero-gradient overflow-hidden">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none fixed -top-40 -left-40 size-125 rounded-full bg-indigo-400/8 blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -bottom-40 -right-40 size-100 rounded-full bg-emerald-400/8 blur-3xl" />

      <div className="w-full max-w-md" style={{ animation: "fadeSlideUp 0.5s ease-out both" }}>
        <div className="rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/92 dark:bg-card/92 backdrop-blur-xl shadow-2xl p-8 sm:p-10">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
              <Lock className="size-7" />
            </span>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
                Lupa Password
              </h1>
              <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
                Kirim permintaan reset password ke admin.
              </p>
            </div>
          </div>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-4">
              <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-500/20">
                <CheckCircle2 className="size-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-foreground">
                  Permintaan Terkirim
                </h3>
                <p className="text-slate-500 dark:text-muted-foreground text-sm leading-relaxed">
                  Update password sedang di-review oleh admin. Silakan tunggu beberapa waktu hingga permintaan Anda disetujui.
                </p>
              </div>
              <Button asChild className="w-full h-12 rounded-2xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30">
                <Link href="/auth/login">
                  Kembali ke Login
                </Link>
              </Button>
            </div>
          ) : (
            <form action={formAction} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nama@email.com"
                    aria-invalid={Boolean(formState.fieldErrors.email)}
                    disabled={isPending}
                    className="pl-11 h-12 text-base rounded-2xl"
                  />
                </div>
                {formState.fieldErrors.email && (
                  <p className="text-sm text-destructive font-medium">{formState.fieldErrors.email}</p>
                )}
              </div>

              {/* Password Baru */}
              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                  Password Baru
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
                  <Input
                    id="new_password"
                    name="new_password"
                    type="password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(formState.fieldErrors.new_password)}
                    disabled={isPending}
                    className="pl-11 h-12 text-base rounded-2xl"
                  />
                </div>
                {formState.fieldErrors.new_password && (
                  <p className="text-sm text-destructive font-medium">{formState.fieldErrors.new_password}</p>
                )}
              </div>

              {/* Konfirmasi Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                  Konfirmasi Password Baru
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(formState.fieldErrors.confirm_password)}
                    disabled={isPending}
                    className="pl-11 h-12 text-base rounded-2xl"
                  />
                </div>
                {formState.fieldErrors.confirm_password && (
                  <p className="text-sm text-destructive font-medium">{formState.fieldErrors.confirm_password}</p>
                )}
              </div>

              {/* Alasan */}
              <div className="space-y-2">
                <Label htmlFor="alasan" className="text-sm font-bold text-slate-700 dark:text-foreground/90">
                  Alasan Perubahan Password
                </Label>
                <Textarea
                  id="alasan"
                  name="alasan"
                  placeholder="Misal: Lupa kata sandi lama, akun diretas, dll."
                  aria-invalid={Boolean(formState.fieldErrors.alasan)}
                  disabled={isPending}
                  className="resize-none h-24 rounded-2xl"
                />
                {formState.fieldErrors.alasan && (
                  <p className="text-sm text-destructive font-medium">{formState.fieldErrors.alasan}</p>
                )}
              </div>

              {/* Global Error */}
              {formState.message && (
                <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/8 px-5 py-4">
                  <p className="text-sm font-medium text-destructive">⚠️ {formState.message}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full justify-center gap-2.5 h-12 text-base font-bold rounded-2xl text-white shadow-lg transition-all duration-200 bg-linear-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-indigo-500/30 hover:shadow-indigo-500/40"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Kirim Permintaan
                    <Send className="size-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Footer Back Link */}
          {!isSuccess && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/8 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-4" />
                Kembali ke halaman login
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
