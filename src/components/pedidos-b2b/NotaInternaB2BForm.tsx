'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  pedidoId: string
  notaInicial: string | null
}

export default function NotaInternaB2BForm({ pedidoId, notaInicial }: Props) {
  const router = useRouter()
  const [nota, setNota] = useState(notaInicial ?? '')
  const [loading, setLoading] = useState(false)

  async function guardar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/nota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nota }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al guardar la nota'); return }
      toast.success('Nota guardada')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={nota}
        onChange={e => setNota(e.target.value)}
        placeholder="Agregar una observación interna sobre este pedido..."
        rows={2}
        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        type="button" onClick={guardar} disabled={loading || nota === (notaInicial ?? '')}
        className="text-xs bg-gray-700 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {loading ? 'Guardando...' : '💾 Guardar nota'}
      </button>
    </div>
  )
}
