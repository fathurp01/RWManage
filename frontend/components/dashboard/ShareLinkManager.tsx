"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Link2, ShieldCheck, Trash2, Check } from "lucide-react";

type Scope = "RW" | "MASJID";

interface ShareLinkItem {
  id: string;
  token: string;
  scope: Scope;
  scope_id: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  public_url: string;
}

interface ShareLinkListResponse {
  data: {
    scope: Scope;
    scope_id: string;
    items: ShareLinkItem[];
  };
}

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "Tidak ada batas waktu";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

export default function ShareLinkManager({
  scope,
  scopeId,
}: {
  scope: Scope;
  scopeId: string;
}) {
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [links, setLinks] = useState<ShareLinkItem[]>([]);

  const endpointBase = useMemo(() => {
    return scope === "RW" ? "/rw/share-links" : "/masjid/share-links";
  }, [scope]);

  const loadLinks = useCallback(async () => {
    if (!scopeId) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get<ShareLinkListResponse>(endpointBase);
      setLinks(response.data.data.items ?? []);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  }, [endpointBase, scopeId]);

  useEffect(() => {
    if (scopeId) {
      loadLinks().catch(() => undefined);
    }
  }, [loadLinks, scopeId]);

  const handleCreate = async () => {
    if (!scopeId) {
      return;
    }

    const parsedDays = Number(expiresInDays);
    if (!Number.isInteger(parsedDays) || parsedDays <= 0 || parsedDays > 365) {
      toast.error("Masa aktif link harus 1 sampai 365 hari.");
      return;
    }

    setIsCreating(true);
    try {
      await api.post(endpointBase, {
        expires_in_days: parsedDays,
      });
      toast.success("Share link berhasil dibuat.");
      await loadLinks();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (token: string) => {
    try {
      await api.patch(`${endpointBase}/${token}/revoke`);
      toast.success("Share link berhasil dinonaktifkan.");
      await loadLinks();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    }
  };

  const handleActivate = async (token: string) => {
    try {
      await api.patch(`${endpointBase}/${token}/activate`);
      toast.success("Share link berhasil diaktifkan kembali.");
      await loadLinks();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    }
  };

  const handleDelete = async (token: string) => {
    try {
      await api.delete(`${endpointBase}/${token}`);
      toast.success("Share link berhasil dihapus secara permanen.");
      await loadLinks();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    }
  };

  const handleCopy = async (publicUrl: string) => {
    try {
      const absoluteUrl = `${window.location.origin}${publicUrl}`;
      await navigator.clipboard.writeText(absoluteUrl);
      toast.success("Link publik berhasil disalin.");
    } catch {
      toast.error("Gagal menyalin link.");
    }
  };

  const activeLinksCount = links.filter((item) => !item.revoked_at).length;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={scope === "RW" ? "rw" : "masjid"}>Share Link {scope}</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Transparansi publik berbasis token</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
          Kelola Share Link Transparansi
        </h1>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-5 text-slate-400" />
            Buat Link Baru
          </CardTitle>
          <CardDescription>Setiap link menggunakan token unik dan bisa dinonaktifkan kapan saja.</CardDescription>
        </CardHeader>
        <CardContent >
          <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="expires" className="text-md">Masa aktif (hari)</Label>
              <Input
                id="expires"
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
                disabled={isCreating}
              />
            </div>
            <Button
              type="button"
              onClick={() => handleCreate()}
              disabled={isCreating}
              variant={scope === "RW" ? "rw" : "masjid"}
            >
              {isCreating ? "Membuat..." : "Buat Share Link"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="text-lg px-1 py-0">Daftar Share Link</span>
            <span className="text-sm px-6 py-0 font-semibold text-slate-500 dark:text-muted-foreground">
              Link Aktif: {activeLinksCount}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-slate-500 dark:text-muted-foreground">Memuat share link...</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-muted-foreground">Belum ada share link.</p>
          ) : (
            links.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {item.revoked_at ? (
                        <Badge variant="destructive">Nonaktif</Badge>
                      ) : (
                        <Badge variant="success">Aktif</Badge>
                      )}
                      <Badge variant="outline">{scope}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground break-all pt-2">
                      Token: {item.token}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground">
                      Dibuat: {formatDateTime(item.created_at)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground">
                      Kedaluwarsa: {formatDateTime(item.expires_at)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {item.revoked_at ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="success"
                          className="rounded-xl h-9 px-4 flex items-center gap-1.5 font-bold shadow-md shadow-emerald-500/10 hover:shadow-lg"
                          onClick={() => handleActivate(item.token)}
                        >
                          <Check className="size-4" />
                          Aktifkan
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="rounded-xl h-9 px-4 flex items-center gap-1.5 font-bold shadow-md shadow-rose-500/10 hover:shadow-lg"
                          onClick={() => handleDelete(item.token)}
                        >
                          <Trash2 className="size-4" />
                          Hapus Link
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl h-9 px-4 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 shadow-xs"
                          onClick={() => handleCopy(item.public_url)}
                        >
                          <Copy className="size-4" />
                          Copy Link
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="rounded-xl h-9 px-4 flex items-center gap-1.5 font-bold shadow-md shadow-rose-500/10 hover:shadow-lg"
                          onClick={() => handleRevoke(item.token)}
                        >
                          <Trash2 className="size-4" />
                          Nonaktifkan
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2">
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">URL Publik</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-foreground break-all">
                    {typeof window === "undefined" ? item.public_url : `${window.location.origin}${item.public_url}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/35 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-4" />
          Data publik dari share-link selalu berupa agregat tanpa identitas warga.
        </div>
      </div>
    </main>
  );
}
