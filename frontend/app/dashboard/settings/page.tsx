"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api, getApiError } from "@/lib/axios";
import { useTheme } from "@/context/ThemeContext";

interface UserPreferenceResponse {
  data: {
    dark_mode: boolean;
    tema_warna: string;
    bahasa: string;
    notifikasi_email: boolean;
    notifikasi_sms: boolean;
    notifikasi_push: boolean;
  };
}

export default function SettingsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [preference, setPreference] = useState<UserPreferenceResponse["data"] | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get<UserPreferenceResponse>("/user/preference");
        setPreference(response.data.data);
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    load().catch(() => undefined);
  }, []);

  const toggleDarkMode = async (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
    setPreference((current) =>
      current
        ? {
            ...current,
            dark_mode: checked,
          }
        : current
    );
    toast.success("Preferensi tema berhasil disimpan.");
  };

  const updateGeneralPreference = async (patch: Partial<NonNullable<typeof preference>>) => {
    try {
      const response = await api.patch<UserPreferenceResponse>("/user/preference", patch);
      setPreference(response.data.data);
      if (typeof patch.dark_mode === "boolean") {
        setTheme(patch.dark_mode ? "dark" : "light");
      }
      toast.success("Preferensi berhasil diperbarui.");
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-muted-foreground">
          Pengaturan Akun
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
          Preferensi Tampilan dan Notifikasi
        </h1>
        <p className="max-w-2xl text-base text-slate-500 dark:text-muted-foreground">
          Kelola tema, bahasa, dan preferensi notifikasi yang dipakai di seluruh dashboard.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tampilan</CardTitle>
            <CardDescription>Atur mode tampilan aplikasi dan sinkronkan ke server.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-white/8 dark:bg-white/5">
              <div>
                <Label className="text-base font-semibold">Mode Gelap</Label>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">
                  Saat ini: {resolvedTheme === "dark" ? "Dark" : "Light"} {theme === "system" ? "(system)" : ""}
                </p>
              </div>
              <Button variant={resolvedTheme === "dark" ? "rw" : "outline"} onClick={() => toggleDarkMode(resolvedTheme !== "dark")} disabled={loading}>
                {resolvedTheme === "dark" ? "Matikan Dark" : "Aktifkan Dark"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Bahasa</Label>
              <Select
                value={preference?.bahasa ?? "id"}
                onValueChange={(value) => updateGeneralPreference({ bahasa: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bahasa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">Bahasa Indonesia</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={() => updateGeneralPreference({ bahasa: preference?.bahasa ?? "id" })} disabled={loading}>
              Simpan Tampilan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifikasi</CardTitle>
            <CardDescription>Kelola preferensi notifikasi yang tersimpan di backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-white/8 dark:bg-white/5">
              <div>
                <Label className="text-base font-semibold">Notifikasi Email</Label>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">Aktifkan notifikasi via email.</p>
              </div>
              <Button variant={(preference?.notifikasi_email ?? true) ? "rw" : "outline"} onClick={() => updateGeneralPreference({ notifikasi_email: !(preference?.notifikasi_email ?? true) })} disabled={loading}>
                {(preference?.notifikasi_email ?? true) ? "Aktif" : "Nonaktif"}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-white/8 dark:bg-white/5">
              <div>
                <Label className="text-base font-semibold">Notifikasi Push</Label>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">Aktifkan notifikasi di aplikasi.</p>
              </div>
              <Button variant={(preference?.notifikasi_push ?? true) ? "rw" : "outline"} onClick={() => updateGeneralPreference({ notifikasi_push: !(preference?.notifikasi_push ?? true) })} disabled={loading}>
                {(preference?.notifikasi_push ?? true) ? "Aktif" : "Nonaktif"}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-white/8 dark:bg-white/5">
              <div>
                <Label className="text-base font-semibold">Notifikasi SMS</Label>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">Aktifkan notifikasi via SMS.</p>
              </div>
              <Button variant={(preference?.notifikasi_sms ?? false) ? "rw" : "outline"} onClick={() => updateGeneralPreference({ notifikasi_sms: !(preference?.notifikasi_sms ?? false) })} disabled={loading}>
                {(preference?.notifikasi_sms ?? false) ? "Aktif" : "Nonaktif"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}