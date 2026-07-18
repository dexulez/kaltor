'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function ComisionRow({ vendedorId, comisionId, monto, estado, fecha }: {
  vendedorId: string
  comisionId: string
  monto: number
  estado: string
  fecha: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function marcarPagada() {
    setBusy(true)
    try {
      const res = await fetch(`/api/superadmin/vendedores/${vendedorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'marcar_comision_pagada', comision_id: comisionId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); return }
      toast.success('Comisión marcada como pagada')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
      <div>
        <p className="font-medium text-gray-800">${monto.toLocaleString('es-CL')}</p>
        <p className="text-xs text-gray-400">{new Date(fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      {estado === 'pagada' ? (
        <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">Pagada</span>
      ) : (
        <button
          onClick={marcarPagada}
          disabled={busy}
          className="text-xs bg-[#FF7A1A]/10 hover:bg-[#FF7A1A]/20 text-[#C05010] border border-[#FF7A1A]/25 px-2.5 py-1 rounded-full font-semibold transition-colors disabled:opacity-50"
        >
          {busy ? '...' : 'Marcar pagada'}
        </button>
      )}
    </div>
  )
}
