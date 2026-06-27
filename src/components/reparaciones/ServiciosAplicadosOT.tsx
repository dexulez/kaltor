'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'
import { soundAdd, soundRemove, soundError } from '@/lib/sounds'

type RSRaw = { nombre: string; precio_base: number }
interface ServicioAplicado {
  id: string
  service_id: string
  repair_services: RSRaw | RSRaw[] | null
}

function getRS(s: ServicioAplicado): RSRaw | null {
  if (!s.repair_services) return null
  return Array.isArray(s.repair_services) ? s.repair_services[0] ?? null : s.repair_services
}

interface Servicio {
  id: string; nombre: string; tipo_reparacion: string; precio_base: number; tiempo_estimado_min: number | null
  repair_service_items: { product_id: string | null; nombre: string; cantidad: number; precio_costo: number }[]
}

export default function ServiciosAplicadosOT({ otId }: { otId: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [aplicados, setAplicados] = useState<ServicioAplicado[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [open, setOpen] = useState(false)
  const [aplicando, setAplicando] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const cargar = useCallback(async () => {
    const { data: rows } = await supabase
      .from('repair_order_services')
      .select('id, service_id')
      .eq('repair_order_id', otId)
      .order('applied_at')

    if (!rows?.length) { setAplicados([]); setLoading(false); return }

    const ids = rows.map(r => r.service_id)
    const { data: services } = await supabase
      .from('repair_services')
      .select('id, nombre, precio_base')
      .in('id', ids)

    const map: Record<string, RSRaw> = {}
    ;(services ?? []).forEach(s => { map[s.id] = s as RSRaw })

    setAplicados(rows.map(r => ({ id: r.id, service_id: r.service_id, repair_services: map[r.service_id] ?? null })))
    setLoading(false)
  }, [otId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!open) return
    supabase.from('repair_services')
      .select('*, repair_service_items(*)')
      .eq('activo', true)
      .order('tipo_reparacion').order('nombre')
      .then(({ data }) => setServicios((data ?? []) as Servicio[]))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function recalcularPrecioOT(nuevosAplicados: ServicioAplicado[]) {
    const totalServicios = nuevosAplicados.reduce((s, a) => s + (getRS(a)?.precio_base ?? 0), 0)
    const { data: items } = await supabase
      .from('repair_items')
      .select('precio_venta, precio_costo, cantidad')
      .eq('repair_order_id', otId)
    const totalItems = (items ?? []).reduce((s: number, r: { precio_venta?: number; precio_costo: number; cantidad: number }) =>
      s + (r.precio_venta ?? r.precio_costo) * r.cantidad, 0)
    await supabase.from('repair_orders')
      .update({ precio_servicio: totalServicios + totalItems })
      .eq('id', otId)
    router.refresh()
  }

  async function aplicar(s: Servicio) {
    setAplicando(s.id)
    await supabase.from('repair_orders').update({
      tipo_reparacion: s.tipo_reparacion,
    }).eq('id', otId)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: nuevo, error } = await supabase.from('repair_order_services').insert({
      repair_order_id: otId,
      service_id: s.id,
      applied_by: user?.id ?? null,
    }).select('id, service_id, repair_services(nombre, precio_base)').single()

    let nuevosAplicados = aplicados
    if (!error && nuevo) {
      nuevosAplicados = [...aplicados, nuevo as ServicioAplicado]
      setAplicados(nuevosAplicados)
      soundAdd()
    } else if (error) {
      soundError()
    }

    if (s.repair_service_items?.length) {
      await supabase.from('repair_items').insert(
        s.repair_service_items.map(i => ({
          repair_order_id: otId,
          product_id: i.product_id || null,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio_costo: i.precio_costo,
          precio_venta: i.precio_costo,
          costo_envio: 0,
        }))
      )
    }

    toast.success(`Servicio "${s.nombre}" aplicado`)
    setOpen(false)
    setAplicando(null)
    await recalcularPrecioOT(nuevosAplicados)
  }

  async function quitar(id: string) {
    const { error } = await supabase.from('repair_order_services').delete().eq('id', id)
    if (error) { soundError(); toast.error('Error al quitar servicio'); return }
    const nuevos = aplicados.filter(a => a.id !== id)
    setAplicados(nuevos)
    soundRemove()
    toast.success('Servicio quitado')
    await recalcularPrecioOT(nuevos)
  }

  const totalServicios = aplicados.reduce((s, a) => s + (getRS(a)?.precio_base ?? 0), 0)

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div>
          <p className="font-semibold text-gray-800">Servicios aplicados</p>
          <p className="text-xs text-gray-400">Plantillas de servicio usadas en esta OT</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/servicios/nuevo?returnTo=/reparaciones/${otId}`}>
            <Button variant="outline" size="sm" className="gap-1 text-green-700 border-green-300 hover:bg-green-50">
              ➕ Crear servicio
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setOpen(s => !s)} className="gap-1 text-indigo-700 border-indigo-300 hover:bg-indigo-50">
            {open ? '✕ Cerrar' : '🔩 Aplicar servicio'}
          </Button>
        </div>
      </div>

      {/* Selector de servicios */}
      {open && (
        <div className="border-b bg-gray-50 p-3 space-y-2">
          {/* Búsqueda y filtro */}
          <div className="flex gap-2">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar servicio..."
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-600"
            >
              <option value="">Todos los tipos</option>
              {[...new Set(servicios.map(s => s.tipo_reparacion))].sort().map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          {/* Lista filtrada */}
          <div className="max-h-52 overflow-y-auto space-y-1.5">
            {(() => {
              const q = busqueda.toLowerCase().trim()
              const filtrados = servicios.filter(s =>
                (!q || s.nombre.toLowerCase().includes(q)) &&
                (!filtroTipo || s.tipo_reparacion === filtroTipo)
              )
              if (filtrados.length === 0) return <p className="text-sm text-gray-400 text-center py-4">Sin servicios que coincidan</p>
              return filtrados.map(s => {
                const costoRep = (s.repair_service_items ?? []).reduce((sum, i) => sum + i.precio_costo * i.cantidad, 0)
                return (
                  <button key={s.id} onClick={() => aplicar(s)} disabled={aplicando === s.id}
                    className="w-full flex items-center justify-between bg-white hover:bg-blue-50 border hover:border-blue-400 rounded-xl px-4 py-3 text-left transition-all">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{s.nombre}</p>
                      <p className="text-xs text-gray-400">{s.tipo_reparacion}{costoRep > 0 ? ` · ${s.repair_service_items?.length} rep. · Costo: ${formatCLP(costoRep)}` : ''}</p>
                    </div>
                    <span className="font-bold text-blue-700 text-sm ml-3 shrink-0">{formatCLP(s.precio_base)}</span>
                  </button>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Lista de aplicados */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-6">Cargando...</p>
      ) : aplicados.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Sin servicios aplicados</p>
      ) : (
        <div className="divide-y">
          {aplicados.map(a => {
            const rs = getRS(a)
            return (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium text-gray-800">{rs?.nombre ?? '—'}</span>
                <div className="flex items-center gap-3">
                  {rs?.precio_base != null && (
                    <span className="text-sm font-bold text-blue-700">{formatCLP(rs.precio_base)}</span>
                  )}
                  <Link
                    href={`/servicios/${a.service_id}/editar?returnTo=/reparaciones/${otId}`}
                    className="text-gray-400 hover:text-blue-600 text-sm"
                    title="Editar este servicio"
                  >
                    ✏️
                  </Link>
                  <button onClick={() => quitar(a.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                </div>
              </div>
            )
          })}
          {totalServicios > 0 && (
            <div className="flex justify-between items-center px-5 py-3 bg-gray-50 text-sm font-semibold text-gray-700">
              <span>Total servicios</span>
              <span>{formatCLP(totalServicios)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
