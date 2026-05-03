"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { IdentitasWargaRecord, identitasWargaClient } from '@/lib/api/identitasWarga'

export default function IdentitasWargaTable({ data, onDeleted }: { data: IdentitasWargaRecord[]; onDeleted?: (id: string) => void }) {
  const handleDelete = async (id: string) => {
    if (!confirm('Hapus identitas ini?')) return
    try {
      await identitasWargaClient.remove(id)
      onDeleted?.(id)
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th>Jenis</th>
            <th>Nomor</th>
            <th>Tanggal</th>
            <th>Status</th>
            <th className="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t">
              <td>{row.tipe_dokumen}</td>
              <td>{row.nomor_dokumen || '-'}</td>
              <td>{row.tanggal_terbit || '-'}</td>
              <td>{row.status_verifikasi || 'MENUNGGU'}</td>
              <td className="text-right">
                {row.dokumen_url ? (
                  <a href={row.dokumen_url} target="_blank" rel="noreferrer" className="mr-2">Lihat</a>
                ) : null}
                <Button variant="destructive" size="sm" onClick={() => handleDelete(row.id)}>Hapus</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
