"use client";

import { useEffect, useState } from "react";
import { getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { rtClient, type RtWargaRecord } from "@/lib/api/rt";

export default function RtWargaPage() {
  const [loading, setLoading] = useState(true);
  const [warga, setWarga] = useState<RtWargaRecord[]>([]);
  const [nama, setNama] = useState("");
  const [tarif, setTarif] = useState<number>(0);

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
      await rtClient.createWarga({ nama_kk: nama, tarif_iuran_bulanan: tarif });
      toast.success("Warga ditambahkan");
      setNama("");
      setTarif(0);
      load();
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Kelola Warga (RT)</h1>
        <p className="text-sm text-gray-600">Tambah, lihat, dan kelola warga untuk RT Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Warga</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input placeholder="Nama KK" value={nama} onChange={(e) => setNama(e.target.value)} />
            <Input
              type="number"
              placeholder="Tarif iuran bulanan"
              value={tarif}
              onChange={(e) => setTarif(Number(e.target.value))}
            />
            <Button onClick={create}>Tambah</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Warga</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Memuat...</div>
          ) : warga.length === 0 ? (
            <div className="text-gray-500">Belum ada warga</div>
          ) : (
            <ul className="space-y-2">
              {warga.map((w) => (
                <li key={w.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{w.nama_kk}</div>
                    <div className="text-sm text-gray-500">Rp {w.tarif_iuran_bulanan.toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
