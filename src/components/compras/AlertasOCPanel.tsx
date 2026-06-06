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
  leida: boolean
}

export default function AlertasOCPanel() {
  const supabase = createClient()
  const router = useRouter()
  const [alertas, setAlertas] = useState<NotifOC[]>([])

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, titulo, mensaje, tipo, url, created_at, leida')
      .in('tipo', ['envio_proveedor', 'solicitud_compra', 'mercancia_recibida'])
      .eq('leida', false)
      .order('created_at', { ascending: false })
      .limit(10)
    setAlertas((data ?? []) as NotifOC[])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cargar()
    const channel = supabase
      .channel('alertas-oc')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cargar]) // eslint-disable-line react-hooks/exhaustive-deps

  async function irA(n: NotifOC) {
    await supabase.from('notifications').update({ leida: true }).eq('id', n.id)
    setAlertas(prev => prev.filter(a => a.id !== n.id))
    if (n.url) router.push(n.url)
  }

  async function cerrar(id: string) {
    await supabase.from('notifications').update({ leida: true }).eq('id', id)
    setAlertas(prev => prev.filter(a => a.id !== id))
  }

  if (alertas.length === 0) return null

  return (
    <div className="space-y-2">
      {alertas.map(n => (
        <div key={n.id} className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
          <span className="text-2xl shrink-0">{NOTIF_ICONS[n.tipo] ?? '🔔'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 truncate">{n.titulo}</p>
            {n.mensaje && <p className="text-xs text-amber-700 truncate">{n.mensaje}</p>}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => irA(n)}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors"
            >
              📋 Ir a la OC →
            </button>
            <button
              onClick={() => cerrar(n.id)}
              className="text-xs bg-white hover:bg-gray-100 text-amber-800 font-semibold px-2.5 py-1.5 rounded-lg border border-amber-300 whitespace-nowrap transition-colors"
              title="Marcar como visto"
            >
              ✓ OK
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
