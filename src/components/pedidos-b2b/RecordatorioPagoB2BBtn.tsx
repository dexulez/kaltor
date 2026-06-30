'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  pedidoId: string
  saldoPendiente: number
  telefono: string | null | undefined
  recordatorioEnviadoAt: string | null | undefined
}

function formatCLP(v: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)
}

export default function RecordatorioPagoB2BBtn({ pedidoId, saldoPendiente, telefono, recordatorioEnviadoAt }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function enviar() {
    if (!telefono) { toast.error('El comprador no tiene teléfono registrado'); return }
    if (!window.confirm(`¿Enviar recordatorio de pago por ${formatCLP(saldoPendiente)} vía WhatsApp?`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/recordatorio`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al enviar'); return }
      toast.success('Recordatorio enviado por WhatsApp')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const ultimoEnvio = recordatorioEnviadoAt
    ? new Date(recordatorioEnviadoAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-blue-300 text-blue-700 hover:bg-blue-50"
        onClick={enviar}
        disabled={loading || !telefono}
      >
        {loading ? 'Enviando...' : '📲 Enviar recordatorio WA'}
      </Button>
      {ultimoEnvio && (
        <p className="text-xs text-gray-400">Último recordatorio: {ultimoEnvio}</p>
      )}
      {!telefono && (
        <p className="text-xs text-amber-600">Sin teléfono registrado</p>
      )}
    </div>
  )
}
