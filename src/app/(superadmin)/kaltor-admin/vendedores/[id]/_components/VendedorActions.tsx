'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function VendedorActions({ vendedorId, estado, tienePendientes }: {
  vendedorId: string
  estado: string
  tienePendientes: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(action)
    try {
      const res = await fetch(`/api/superadmin/vendedores/${vendedorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); return }
      toast.success('Actualizado')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setBusy(null)
    }
  }

  const is = (a: string) => busy === a

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <h2 className="font-semibold text-gray-800">Acciones</h2>

      {estado === 'pendiente' && (
        <div className="flex gap-2">
          <button
            onClick={() => act('aprobar')}
            disabled={!!busy}
            className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {is('aprobar') ? '...' : '✓ Aprobar'}
          </button>
          <button
            onClick={() => act('rechazar')}
            disabled={!!busy}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {is('rechazar') ? '...' : '✕ Rechazar'}
          </button>
        </div>
      )}

      {estado === 'activo' && (
        <button
          onClick={() => act('suspender')}
          disabled={!!busy}
          className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {is('suspender') ? '...' : '⏸ Suspender vendedor'}
        </button>
      )}

      {(estado === 'suspendido' || estado === 'rechazado') && (
        <button
          onClick={() => act('reactivar')}
          disabled={!!busy}
          className="w-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {is('reactivar') ? '...' : '▶ Reactivar vendedor'}
        </button>
      )}

      {tienePendientes && (
        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={() => act('marcar_todas_pagadas')}
            disabled={!!busy}
            className="w-full bg-[#FF7A1A]/10 hover:bg-[#FF7A1A]/20 text-[#C05010] border border-[#FF7A1A]/25 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {is('marcar_todas_pagadas') ? '...' : 'Marcar todas las comisiones pendientes como pagadas'}
          </button>
        </div>
      )}
    </div>
  )
}
