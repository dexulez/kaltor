'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  pedidoId: string
  pagado: boolean
  metodoPago: string | null
  fechaEntregado: string | null
}

export default function AccionesPedidoB2B({ pedidoId, pagado, metodoPago, fechaEntregado }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<'pago' | 'entrega' | null>(null)

  async function marcarPagado() {
    setLoading('pago')
    const { error } = await supabase.from('sales_orders')
      .update({ pagado: true, fecha_pago: new Date().toISOString() })
      .eq('id', pedidoId)
    setLoading(null)
    if (error) { toast.error('Error al marcar como pagado'); return }
    toast.success('Pedido marcado como pagado')
    router.refresh()
  }

  async function marcarEntregado() {
    setLoading('entrega')
    const { error } = await supabase.from('sales_orders')
      .update({ fecha_entregado: new Date().toISOString() })
      .eq('id', pedidoId)
    setLoading(null)
    if (error) { toast.error('Error al marcar como entregado'); return }
    toast.success('Pedido marcado como entregado')
    router.refresh()
  }

  if (pagado && fechaEntregado) return null

  return (
    <div className="flex gap-2 flex-wrap">
      {!pagado && metodoPago === 'credito' && (
        <button
          type="button" onClick={marcarPagado} disabled={loading !== null}
          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
        >
          {loading === 'pago' ? 'Guardando...' : '💰 Marcar como pagado'}
        </button>
      )}
      {!fechaEntregado && (
        <button
          type="button" onClick={marcarEntregado} disabled={loading !== null}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
        >
          {loading === 'entrega' ? 'Guardando...' : '📦 Marcar como entregado'}
        </button>
      )}
    </div>
  )
}
