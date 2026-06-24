'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { NOTIF_ICONS, NOTIF_COLORS, TipoNotificacion } from '@/lib/notifications'
import { playNotificationSound } from '@/lib/sounds'

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
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', timeZone: TZ })
}

function LiveToast({ n, onIr }: { n: Notificacion; onIr: () => void }) {
  return (
    <div className="flex items-start gap-3 w-full">
      <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg ${NOTIF_COLORS[n.tipo] ?? 'bg-gray-100'}`}>
        {NOTIF_ICONS[n.tipo] ?? '🔔'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-tight">{n.titulo}</p>
        {n.mensaje && <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.mensaje}</p>}
        {n.url && (
          <button
            onClick={onIr}
            className="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Ver ahora →
          </button>
        )}
      </div>
    </div>
  )
}

// Devuelve true si la página actual debe refrescarse al llegar la notificación
function debeRefrescar(currentPath: string, notifUrl: string): boolean {
  const notifBase = notifUrl.split('?')[0]
  if (currentPath === '/dashboard') return true
  if (currentPath === notifBase) return true
  // Sección padre: /compras para /compras/orden/abc, /reparaciones para /reparaciones/abc
  const seccion = '/' + notifBase.split('/').filter(Boolean)[0]
  if (seccion && currentPath === seccion) return true
  return false
}

export default function NotificacionesBell({ collapsed }: { collapsed?: boolean }) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const isFirstLoad = useRef(true)

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, created_at, tipo, titulo, mensaje, url, leida')
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifs((data ?? []) as Notificacion[])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cargar()

    // Suscripción real-time
    const channel = supabase
      .channel('notif-bell')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (isFirstLoad.current) return
          const n = payload.new as Notificacion
          setNotifs(prev => [n, ...prev])
          // Reproducir sonido según tipo
          playNotificationSound(n.tipo)

          // Refrescar la página actual si corresponde a esta notificación
          if (n.url && debeRefrescar(pathname, n.url)) {
            router.refresh()
          }

          // Mostrar toast con acción directa a la OC/URL
          toast.custom(
            (toastId) => (
              <div
                className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 max-w-sm w-full cursor-pointer"
                onClick={() => {
                  toast.dismiss(toastId)
                  if (n.url) router.push(n.url)
                }}
              >
                <LiveToast n={n} onIr={() => { toast.dismiss(toastId); if (n.url) router.push(n.url) }} />
              </div>
            ),
            { duration: 10000, position: 'top-right' }
          )
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => cargar()
      )
      .subscribe(() => { isFirstLoad.current = false })

    return () => { supabase.removeChannel(channel) }
  }, [cargar, router]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const noLeidas = notifs.filter(n => !n.leida).length

  async function marcarLeida(n: Notificacion) {
    if (!n.leida) {
      await supabase.from('notifications').update({ leida: true }).eq('id', n.id)
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, leida: true } : x))
    }
    setOpen(false)
    if (n.url) router.push(n.url)
  }

  async function marcarTodasLeidas() {
    const ids = notifs.filter(n => !n.leida).map(n => n.id)
    if (!ids.length) return
    await supabase.from('notifications').update({ leida: true }).in('id', ids)
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
  }

  async function eliminar(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-blue-200 hover:bg-blue-800 hover:text-white transition-colors w-full ${open ? 'bg-blue-800 text-white' : ''}`}
        title="Notificaciones"
      >
        <span className="text-lg relative shrink-0">
          🔔
          {noLeidas > 0 && (
            <span className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white font-bold animate-pulse"
              style={{ fontSize: '9px' }}>
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </span>
        {!collapsed && <span className="text-sm font-medium flex-1 text-left">Notificaciones</span>}
        {!collapsed && noLeidas > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-[100] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden
            ${collapsed ? 'left-14 bottom-0' : 'left-0 bottom-full mb-1'}`}
          style={{ width: '360px', maxHeight: '480px' }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 text-sm">Notificaciones</span>
              {noLeidas > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{noLeidas}</span>
              )}
            </div>
            {noLeidas > 0 && (
              <button onClick={marcarTodasLeidas} className="text-xs text-blue-600 hover:underline font-medium">
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
            {loading ? (
              <p className="text-center text-gray-400 py-8 text-sm">Cargando...</p>
            ) : notifs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-gray-400 text-sm">Sin notificaciones</p>
              </div>
            ) : notifs.map(n => (
              <div
                key={n.id}
                onClick={() => marcarLeida(n)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${!n.leida ? 'bg-blue-50/60' : ''}`}
              >
                <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg ${NOTIF_COLORS[n.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                  {NOTIF_ICONS[n.tipo] ?? '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${!n.leida ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.titulo}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!n.leida && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                      <button onClick={e => eliminar(n.id, e)} className="text-gray-300 hover:text-red-400 text-xs" title="Eliminar">✕</button>
                    </div>
                  </div>
                  {n.mensaje && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400">{fmtFecha(n.created_at)}</p>
                    {n.url && (
                      <span className="text-xs text-blue-600 font-medium">Ver →</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setOpen(false); router.push('/notificaciones') }}
            className="w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2.5 border-t bg-gray-50 transition-colors"
          >
            🔔 Ver centro de notificaciones →
          </button>
        </div>
      )}
    </div>
  )
}
