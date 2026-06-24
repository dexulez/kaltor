'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { NOTIF_ICONS, NOTIF_COLORS, TipoNotificacion } from '@/lib/notifications'
import { Button } from '@/components/ui/button'

interface Notificacion {
  id: string
  created_at: string
  tipo: TipoNotificacion
  titulo: string
  mensaje: string | null
  url: string | null
  leida: boolean
}

const TZ = 'America/Santiago'
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function NotificacionesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'no_leidas'>('todas')

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, created_at, tipo, titulo, mensaje, url, leida')
      .order('created_at', { ascending: false })
      .limit(100)
    setNotifs((data ?? []) as Notificacion[])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar() }, [cargar])

  const noLeidas = notifs.filter(n => !n.leida).length
  const visibles = filtro === 'no_leidas' ? notifs.filter(n => !n.leida) : notifs

  async function marcarLeida(n: Notificacion) {
    if (!n.leida) {
      await supabase.from('notifications').update({ leida: true }).eq('id', n.id)
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, leida: true } : x))
    }
    if (n.url) router.push(n.url)
  }

  async function marcarTodasLeidas() {
    const ids = notifs.filter(n => !n.leida).map(n => n.id)
    if (!ids.length) return
    await supabase.from('notifications').update({ leida: true }).in('id', ids)
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
    toast.success('Todas marcadas como leídas')
  }

  async function eliminar(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔔 Notificaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">Últimas {notifs.length} notificaciones del sistema</p>
        </div>
        {noLeidas > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodasLeidas}>
            Marcar todas leídas ({noLeidas})
          </Button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'todas' as const, label: 'Todas' },
          { key: 'no_leidas' as const, label: `No leídas${noLeidas > 0 ? ` (${noLeidas})` : ''}` },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro === f.key ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-12 text-sm">Cargando...</p>
        ) : visibles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">🔔</p>
            <p className="text-gray-400 text-sm">{filtro === 'no_leidas' ? 'No tienes notificaciones sin leer' : 'Sin notificaciones'}</p>
          </div>
        ) : (
          <div className="divide-y">
            {visibles.map(n => (
              <div
                key={n.id}
                onClick={() => marcarLeida(n)}
                className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 ${!n.leida ? 'bg-blue-50/60' : ''}`}
              >
                <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${NOTIF_COLORS[n.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                  {NOTIF_ICONS[n.tipo] ?? '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${!n.leida ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.titulo}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.leida && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                      <button onClick={e => eliminar(n.id, e)} className="text-gray-300 hover:text-red-400 text-sm" title="Eliminar">✕</button>
                    </div>
                  </div>
                  {n.mensaje && <p className="text-sm text-gray-500 mt-0.5">{n.mensaje}</p>}
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-gray-400">{fmtFecha(n.created_at)}</p>
                    {n.url && <span className="text-xs text-blue-600 font-medium">Ver →</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
