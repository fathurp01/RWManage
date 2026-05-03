"use client";

import { useEffect, useState } from "react";
import { getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { rtClient, type RtWargaRecord } from "@/lib/api/rt";

export default function RtWargaPage() {
  const [loading, setLoading] = useState(true);
  const [warga, setWarga] = useState<RtWargaRecord[]>([]);
  const [nama, setNama] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setWarga(await rtClient.listWarga());
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      await rtClient.createWarga({ nama_kk: nama });
      toast.success("Warga ditambahkan");
      setNama("");
      load();
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RT</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Pendataan warga RT</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Kelola Warga</h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">Data iuran mengikuti pengaturan RW, RT hanya mendata warga.</p>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Tambah Warga</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input placeholder="Nama KK" value={nama} onChange={(e) => setNama(e.target.value)} />
            <Button onClick={create}>Tambah</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Daftar Warga</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="text-sm text-slate-500">Memuat...</div>
          ) : warga.length === 0 ? (
            <div className="text-sm text-slate-500">Belum ada warga</div>
          ) : (
            <ul className="space-y-2">
              {warga.map((w) => (
                <li key={w.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="font-medium">{w.nama_kk}</div>
                    <div className="text-sm text-slate-500">Tarif mengikuti pengaturan RW</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
