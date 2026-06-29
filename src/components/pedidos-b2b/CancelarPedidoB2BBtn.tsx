'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  pedidoId: string
  numero: string
  estado: string
  puedeCancelar: boolean
}

const ESTADOS_CANCELABLES = ['confirmado', 'preparando', 'en_camino']

export default function CancelarPedidoB2BBtn({ pedidoId, numero, estado, puedeCancelar }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!puedeCancelar || !ESTADOS_CANCELABLES.includes(estado)) return null

  async function cancelar() {
    if (!window.confirm(`¿Cancelar el pedido ${numero}? Se repondrá el stock descontado y se anulará la venta asociada. Esta acción no se puede deshacer.`)) return
    const motivo = window.prompt('Motivo de la cancelación (opcional):') ?? ''

    setLoading(true)
    try {
      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al cancelar el pedido'); return }
      toast.success(`${numero} cancelado`)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button" onClick={cancelar} disabled={loading}
      className="text-xs border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
    >
      {loading ? 'Cancelando...' : '🚫 Cancelar pedido'}
    </button>
  )
}
