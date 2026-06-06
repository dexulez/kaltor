'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NOTIF_ICONS, TipoNotificacion } from '@/lib/notifications'

interface NotifOC {
  id: string
  titulo: string
  mensaje: string | null
  tipo: TipoNotificacion
  url: string | null
  created_at: string
}

export default function AlertaOCDetalle({ ordenId }: { ordenId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [alertas, setAlertas] = useState<NotifOC[]>([])

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, titulo, mensaje, tipo, url, created_at')
      .eq('leida', false)
      .like('url', `%/compras/orden/${ordenId}%`)
      .order('created_at', { ascending: false })
      .limit(5)
    setAlertas((data ?? []) as NotifOC[])
  }, [ordenId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cargar()
    const channel = supabase
      .channel(`alerta-oc-${ordenId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cargar, ordenId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function marcarLeida(id: string) {
    await supabase.from('notifications').update({ leida: true }).eq('id', id)
    setAlertas(prev => prev.filter(a => a.id !== id))
  }

  if (alertas.length === 0) return null

  return (
    <div className="space-y-2">
      {alertas.map(n => (
        <div key={n.id} className="flex items-center gap-3 bg-blue-50 border border-blue-300 rounded-xl px-4 py-3">
          <span className="text-2xl shrink-0">{NOTIF_ICONS[n.tipo] ?? '🔔'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">{n.titulo}</p>
            {n.mensaje && <p className="text-xs text-blue-700 mt-0.5">{n.mensaje}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {n.tipo === 'envio_proveedor' && (
              <button
                onClick={() => { router.refresh(); marcarLeida(n.id) }}
                className="text-xs bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                📦 Registrar recepción
              </button>
            )}
            <button onClick={() => marcarLeida(n.id)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
