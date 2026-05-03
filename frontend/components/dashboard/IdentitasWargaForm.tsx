"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { identitasWargaClient } from '@/lib/api/identitasWarga'

export default function IdentitasWargaForm({ wargaId, onCreated }: { wargaId: string; onCreated?: (c: any) => void }) {
  const [tipe, setTipe] = useState('KTP')
  const [nomor, setNomor] = useState('')
  const [tanggal, setTanggal] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const created = await identitasWargaClient.create({ warga_id: wargaId, tipe_dokumen: tipe, nomor_dokumen: nomor || undefined, tanggal_terbit: tanggal || undefined, dokumen: file || undefined })
      onCreated?.(created)
      setNomor('')
      setTanggal('')
      setFile(null)
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat identitas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <div className="text-red-600">{error}</div>}
      <div>
        <Label>Tipe Dokumen</Label>
        <select value={tipe} onChange={(e) => setTipe(e.target.value)} className="w-full h-10 rounded-md">
          <option value="KTP">KTP</option>
          <option value="SIM">SIM</option>
          <option value="PASPOR">PASPOR</option>
        </select>
      </div>
      <div>
        <Label>Nomor Dokumen</Label>
        <Input value={nomor} onChange={(e) => setNomor(e.target.value)} />
      </div>
      <div>
        <Label>Tanggal Terbit</Label>
        <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
      </div>
      <div>
        <Label>Upload Dokumen (PDF/IMG)</Label>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div>
        <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Tambah'}</Button>
      </div>
    </form>
  )
}
