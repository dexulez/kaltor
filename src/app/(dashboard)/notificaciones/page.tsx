'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { NOTIF_ICONS, NOTIF_COLORS, NOTIF_LABELS, TipoNotificacion } from '@/lib/notifications'
import { Button } from '@/components/ui/button'
import MultiSelectDropdown from '@/components/ui/multi-select-dropdown'

interface Notificacion {
  id: string
  created_at: string
  tipo: TipoNotificacion
  titulo: string
  mensaje: string | null
  url: string | null
  leida: boolean
  guardado: boolean
}

const TZ = 'America/Santiago'
const PAGINA = 100

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
  const [hayMas, setHayMas] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'no_leidas' | 'guardadas'>('todas')
  const [tiposSel, setTiposSel] = useState<Set<string>>(new Set())
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async (limite: number) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, created_at, tipo, titulo, mensaje, url, leida, guardado')
      .order('created_at', { ascending: false })
      .limit(limite)
    if (error) {
      // Fallback si la columna guardado aún no existe
      const { data: data2 } = await supabase
        .from('notifications')
        .select('id, created_at, tipo, titulo, mensaje, url, leida')
        .order('created_at', { ascending: false })
        .limit(limite)
      setNotifs(((data2 ?? []) as Omit<Notificacion, 'guardado'>[]).map(n => ({ ...n, guardado: false })))
      setHayMas(false)
      setLoading(false)
      return
    }
    setNotifs((data ?? []) as Notificacion[])
    setHayMas((data ?? []).length >= limite)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(PAGINA) }, [cargar])

  async function cargarMas() {
    await cargar(notifs.length + PAGINA)
  }

  const tiposPresentes = useMemo(() => [...new Set(notifs.map(n => n.tipo))], [notifs])
  const tiposOpciones = useMemo(() => tiposPresentes.map(t => ({ value: t, label: NOTIF_LABELS[t] ?? t })), [tiposPresentes])

  const noLeidas = notifs.filter(n => !n.leida).length
  const guardadas = notifs.filter(n => n.guardado).length

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return notifs.filter(n => {
      if (filtro === 'no_leidas' && n.leida) return false
      if (filtro === 'guardadas' && !n.guardado) return false
      if (tiposSel.size > 0 && !tiposSel.has(n.tipo)) return false
      if (q && !n.titulo.toLowerCase().includes(q) && !(n.mensaje ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [notifs, filtro, tiposSel, busqueda])

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

  async function toggleGuardado(n: Notificacion, e: React.MouseEvent) {
    e.stopPropagation()
    const nuevoValor = !n.guardado
    const { error } = await supabase.from('notifications').update({ guardado: nuevoValor }).eq('id', n.id)
    if (error) { toast.error('No se pudo guardar — corre la migración de notificaciones guardadas'); return }
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, guardado: nuevoValor } : x))
    toast.success(nuevoValor ? 'Notificación guardada' : 'Quitada de guardadas')
  }

  async function eliminar(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const hayFiltros = filtro !== 'todas' || tiposSel.size > 0 || busqueda.trim() !== ''
  function limpiarFiltros() {
    setFiltro('todas')
    setTiposSel(new Set())
    setBusqueda('')
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔔 Notificaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Todo lo enviado, solicitado o recibido por el sistema ({notifs.length}{hayMas ? '+' : ''})
          </p>
        </div>
        {noLeidas > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodasLeidas}>
            Marcar todas leídas ({noLeidas})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { key: 'todas' as const, label: 'Todas' },
            { key: 'no_leidas' as const, label: `No leídas${noLeidas > 0 ? ` (${noLeidas})` : ''}` },
            { key: 'guardadas' as const, label: `⭐ Guardadas${guardadas > 0 ? ` (${guardadas})` : ''}` },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro === f.key ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <MultiSelectDropdown label="🗂️ Tipo" opciones={tiposOpciones} seleccion={tiposSel} onChange={setTiposSel} />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar..."
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 w-44"
        />
        {hayFiltros && (
          <button onClick={limpiarFiltros} className="text-xs text-blue-600 hover:underline font-medium">
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-12 text-sm">Cargando...</p>
        ) : visibles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">🔔</p>
            <p className="text-gray-400 text-sm">
              {notifs.length === 0 ? 'Sin notificaciones' : 'Ninguna notificación coincide con los filtros'}
            </p>
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
                    <div>
                      <p className={`text-sm leading-tight ${!n.leida ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.titulo}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{NOTIF_LABELS[n.tipo] ?? n.tipo}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.leida && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                      <button onClick={e => toggleGuardado(n, e)} className={n.guardado ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'} title={n.guardado ? 'Quitar de guardadas' : 'Guardar'}>
                        {n.guardado ? '⭐' : '☆'}
                      </button>
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

      {!loading && hayMas && filtro === 'todas' && !hayFiltros && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={cargarMas}>Cargar más</Button>
        </div>
      )}
    </div>
  )
}
