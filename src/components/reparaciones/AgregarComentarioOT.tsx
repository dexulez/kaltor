'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { RepairStatus } from '@/types'

interface Props {
  otId: string
  estadoActual: RepairStatus
}

export default function AgregarComentarioOT({ otId, estadoActual }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)

  async function guardar() {
    const trimmed = texto.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('repair_status_history').insert({
        repair_order_id: otId,
        estado_anterior: estadoActual,
        estado_nuevo: estadoActual,
        comentario: trimmed,
        usuario_id: user?.id ?? null,
      })
      if (error) throw error
      toast.success('Comentario agregado')
      setTexto('')
      setAbierto(false)
      router.refresh()
    } catch {
      toast.error('Error al guardar el comentario')
    } finally {
      setLoading(false)
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
      >
        💬 Agregar comentario
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <textarea
        autoFocus
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder="Escribe un comentario interno o para el cliente..."
        rows={3}
        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => { setAbierto(false); setTexto('') }}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={loading || !texto.trim()}
          className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
