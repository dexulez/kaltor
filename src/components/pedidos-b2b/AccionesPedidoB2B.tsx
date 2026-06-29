'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  pedidoId: string
  estado: string
}

export default function AccionesPedidoB2B({ pedidoId, estado }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<'preparar' | 'entrega' | null>(null)

  async function empezarAPreparar() {
    setLoading('preparar')
    const { error } = await supabase.from('sales_orders').update({ estado: 'preparando' }).eq('id', pedidoId)
    setLoading(null)
    if (error) { toast.error('Error al actualizar el pedido'); return }
    toast.success('Pedido en preparación')
    router.refresh()
  }

  async function marcarEntregado() {
    setLoading('entrega')
    try {
      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/entregar`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al marcar como entregado'); return }
      toast.success('Pedido marcado como entregado')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(null)
    }
  }

  if (estado === 'confirmado') {
    return (
      <button
        type="button" onClick={empezarAPreparar} disabled={loading !== null}
        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {loading === 'preparar' ? 'Guardando...' : '📦 Empezar a preparar'}
      </button>
    )
  }

  if (estado === 'en_camino') {
    return (
      <button
        type="button" onClick={marcarEntregado} disabled={loading !== null}
        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {loading === 'entrega' ? 'Guardando...' : '✅ Marcar como entregado'}
      </button>
    )
  }

  return null
}
