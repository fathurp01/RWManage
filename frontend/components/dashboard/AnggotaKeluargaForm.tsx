"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { anggotaKeluargaClient, AnggotaKeluargaPayload } from "@/lib/api/anggotaKeluarga";

interface Props {
  wargaId: string;
  onCreated?: (created: any) => void;
}

export default function AnggotaKeluargaForm({ wargaId, onCreated }: Props) {
  const [nama, setNama] = useState("");
  const [hubungan, setHubungan] = useState("");
  const [nik, setNik] = useState("");
  const [tanggal_lahir, setTanggalLahir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: AnggotaKeluargaPayload = {
      warga_id: wargaId,
      nama,
      hubungan,
      nik: nik || undefined,
      tanggal_lahir: tanggal_lahir || undefined,
    };

    try {
      const created = await anggotaKeluargaClient.create(payload);
      setNama("");
      setHubungan("");
      setNik("");
      setTanggalLahir("");
      onCreated?.(created);
    } catch (err: any) {
      setError(err?.message || "Gagal membuat anggota keluarga.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      {error && <div className="text-red-600">{error}</div>}
      <div>
        <Label>Nama</Label>
        <Input value={nama} onChange={(e) => setNama(e.target.value)} required />
      </div>
      <div>
        <Label>Hubungan</Label>
        <Input value={hubungan} onChange={(e) => setHubungan(e.target.value)} required />
      </div>
      <div>
        <Label>NIK (optional)</Label>
        <Input value={nik} onChange={(e) => setNik(e.target.value)} />
      </div>
      <div>
        <Label>Tanggal Lahir (optional)</Label>
        <Input type="date" value={tanggal_lahir} onChange={(e) => setTanggalLahir(e.target.value)} />
      </div>
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Menyimpan..." : "Tambah"}
        </Button>
      </div>
    </form>
  );
}
