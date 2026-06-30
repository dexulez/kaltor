'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  pedidoId: string
}

export default function RevisarPagoB2BBtn({ pedidoId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'confirmar' | 'rechazar' | null>(null)

  async function confirmar() {
    if (!window.confirm('¿Confirmar este pago como recibido?')) return
    setLoading('confirmar')
    try {
      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/confirmar-pago`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al confirmar el pago'); return }
      toast.success('Pago confirmado')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(null)
    }
  }

  async function rechazar() {
    const motivo = window.prompt('Motivo del rechazo (se enviará al comprador):') ?? ''
    if (motivo === null) return
    setLoading('rechazar')
    try {
      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/rechazar-pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al rechazar el pago'); return }
      toast.success('Pago rechazado')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button onClick={confirmar} disabled={loading !== null} size="sm" className="bg-green-600 hover:bg-green-700">
        {loading === 'confirmar' ? 'Confirmando...' : '✅ Confirmar pago'}
      </Button>
      <Button onClick={rechazar} disabled={loading !== null} size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
        {loading === 'rechazar' ? 'Rechazando...' : '✕ Rechazar'}
      </Button>
    </div>
  )
}
