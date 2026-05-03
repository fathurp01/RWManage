"use client";

import React from "react";
import { Button } from "../ui/button";
import { AnggotaKeluargaRecord, anggotaKeluargaClient } from "@/lib/api/anggotaKeluarga";

interface Props {
  data: AnggotaKeluargaRecord[];
  onDeleted?: (id: string) => void;
}

export default function AnggotaKeluargaTable({ data, onDeleted }: Props) {
  const handleDelete = async (id: string) => {
    if (!confirm("Hapus anggota keluarga ini?")) return;
    try {
      await anggotaKeluargaClient.remove(id);
      onDeleted?.(id);
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus");
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead>
          <tr>
            <th className="text-left">Nama</th>
            <th className="text-left">Hubungan</th>
            <th className="text-left">NIK</th>
            <th className="text-left">Tanggal Lahir</th>
            <th className="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t">
              <td>{row.nama}</td>
              <td>{row.hubungan}</td>
              <td>{row.nik || "-"}</td>
              <td>{row.tanggal_lahir || "-"}</td>
              <td className="text-right">
                <Button variant="destructive" size="sm" onClick={() => handleDelete(row.id)}>
                  Hapus
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
