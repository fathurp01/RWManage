"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnggotaKeluargaForm from "@/components/dashboard/AnggotaKeluargaForm";
import AnggotaKeluargaTable from "@/components/dashboard/AnggotaKeluargaTable";
import { anggotaKeluargaClient, AnggotaKeluargaRecord } from "@/lib/api/anggotaKeluarga";

interface Props {
  params: { wargaId: string };
}

export default function Page({ params }: Props) {
  const { wargaId } = params;
  const [data, setData] = useState<AnggotaKeluargaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    try {
      const list = await anggotaKeluargaClient.list(wargaId);
      setData(list);
    } catch (err: any) {
      console.error(err);
      // if unauthorized, redirect to login
      if (err?.status === 401) {
        router.push("/auth/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [wargaId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Anggota Keluarga</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
          <AnggotaKeluargaForm wargaId={wargaId} onCreated={(c) => setData((s) => [c, ...s])} />
        </div>
        <div className="col-span-1">
          {loading ? <div>Memuat...</div> : <AnggotaKeluargaTable data={data} onDeleted={(id) => setData((s) => s.filter((x) => x.id !== id))} />}
        </div>
      </div>
    </div>
  );
}
