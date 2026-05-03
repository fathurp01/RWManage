"use client"

import React, { useEffect, useState } from 'react'
import IdentitasWargaForm from '@/components/dashboard/IdentitasWargaForm'
import IdentitasWargaTable from '@/components/dashboard/IdentitasWargaTable'
import { identitasWargaClient, IdentitasWargaRecord } from '@/lib/api/identitasWarga'
import { useRouter } from 'next/navigation'

interface Props { params: { wargaId: string } }

export default function Page({ params }: Props) {
  const { wargaId } = params
  const [data, setData] = useState<IdentitasWargaRecord[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const load = async () => {
    setLoading(true)
    try {
      const list = await identitasWargaClient.list(wargaId)
      setData(list)
    } catch (err: any) {
      console.error(err)
      if (err?.status === 401) router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [wargaId])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Identitas Warga</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <IdentitasWargaForm wargaId={wargaId} onCreated={(c) => setData((s) => [c, ...s])} />
        </div>
        <div>
          {loading ? <div>Memuat...</div> : <IdentitasWargaTable data={data} onDeleted={(id) => setData((s) => s.filter(x => x.id !== id))} />}
        </div>
      </div>
    </div>
  )
}
