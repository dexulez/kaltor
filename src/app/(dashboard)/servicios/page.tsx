import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'
import { Suspense } from 'react'
import BuscadorServicios from '@/components/servicios/BuscadorServicios'
import BorrarServicioBtn from '@/components/servicios/BorrarServicioBtn'

const TIPO_LABEL: Record<string, string> = {
  pantalla: '📱 Pantalla', bateria: '🔋 Batería', placa: '🔬 Placa madre',
  software: '💻 Software', camara: '📷 Cámara', conector: '🔌 Conector', otro: '🔧 Otro',
}

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; todos?: string }>
}) {
  const { q, tipo, todos } = await searchParams
  const supabase = await createClient()

  // Servicios con items y conteo de uso
  const [{ data: servicios }, { data: usos }] = await Promise.all([
    supabase.from('repair_services')
      .select('*, repair_service_items(id, nombre, cantidad, precio_costo)')
      .order('activo', { ascending: false })
      .order('nombre'),
    supabase.from('repair_order_services')
      .select('service_id')
      .then(r => r.error ? { data: [] } : r),
  ])

  // Conteo de usos por service_id
  const usosMap: Record<string, number> = {}
  ;(usos ?? []).forEach(u => { usosMap[u.service_id] = (usosMap[u.service_id] ?? 0) + 1 })

  // Filtrar
  let lista = servicios ?? []
  if (q) lista = lista.filter(s => s.nombre.toLowerCase().includes(q.toLowerCase()) || (s.descripcion ?? '').toLowerCase().includes(q.toLowerCase()))
  if (tipo) lista = lista.filter(s => s.tipo_reparacion === tipo)

  // Sin filtros activos: mostrar top 6 más usados
  const hayFiltro = !!(q || tipo || todos)
  const listaCompleta = lista
  if (!hayFiltro) {
    lista = [...lista]
      .sort((a, b) => (usosMap[b.id] ?? 0) - (usosMap[a.id] ?? 0))
      .slice(0, 6)
  }

  const activos = listaCompleta.filter(s => s.activo).length
  const tipos = [...new Set((servicios ?? []).map(s => s.tipo_reparacion))]
  const hayMas = !hayFiltro && listaCompleta.length > 6

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔩 Servicios</h1>
          <p className="text-gray-500 text-sm mt-0.5">{activos} activo(s) · {listaCompleta.length} en total{!hayFiltro ? ' · mostrando top 6' : ''}</p>
        </div>
        <Link href="/servicios/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700">+ Nuevo servicio</Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Suspense>
          <BuscadorServicios defaultQ={q} />
        </Suspense>
        <Link href="/servicios">
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border ${!tipo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
            Todos
          </span>
        </Link>
        {tipos.map(t => (
          <Link key={t} href={`/servicios?tipo=${t}${q ? `&q=${q}` : ''}`}>
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border ${tipo === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
              {TIPO_LABEL[t] ?? t}
            </span>
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">🔩</span>
          <p className="font-medium text-gray-600">{q ? `Sin resultados para "${q}"` : 'Sin servicios definidos'}</p>
          <Link href="/servicios/nuevo"><Button className="mt-4 bg-blue-600 hover:bg-blue-700">+ Crear primer servicio</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map(s => {
            const items = (s.repair_service_items ?? []) as { id: string; nombre: string; cantidad: number; precio_costo: number }[]
            const costoRep = items.reduce((sum, i) => sum + i.precio_costo * i.cantidad, 0)
            const margen = costoRep > 0 ? Math.round(((s.precio_base - costoRep) / costoRep) * 100) : null
            const vecesUsado = usosMap[s.id] ?? 0

            return (
              <div key={s.id} className={`bg-white rounded-xl border p-4 space-y-3 ${!s.activo ? 'opacity-50' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-gray-500 font-medium">{TIPO_LABEL[s.tipo_reparacion] ?? s.tipo_reparacion}</span>
                      {!s.activo && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Inactivo</span>}
                      {vecesUsado > 0 && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                          {vecesUsado}× usado
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 leading-tight mt-0.5">{s.nombre}</p>
                    {s.descripcion && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.descripcion}</p>}
                  </div>
                </div>

                {/* Repuestos */}
                {items.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Repuestos</p>
                    {items.slice(0, 3).map(i => (
                      <div key={i.id} className="flex justify-between text-xs text-gray-600">
                        <span>{i.cantidad > 1 ? `${i.cantidad}× ` : ''}{i.nombre}</span>
                        <span className="text-gray-400">{formatCLP(i.precio_costo * i.cantidad)}</span>
                      </div>
                    ))}
                    {items.length > 3 && <p className="text-xs text-gray-400">+{items.length - 3} más</p>}
                  </div>
                )}

                {/* Precio y margen */}
                <div className="border-t pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Precio al cliente</p>
                    <p className="text-lg font-bold text-blue-700">{formatCLP(s.precio_base)}</p>
                  </div>
                  <div className="text-right">
                    {costoRep > 0 && <p className="text-xs text-gray-400">Costo: {formatCLP(costoRep)}</p>}
                    {margen !== null && (
                      <p className={`text-sm font-semibold ${margen >= 50 ? 'text-green-700' : margen >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                        {margen}% margen
                      </p>
                    )}
                    {s.tiempo_estimado_min && <p className="text-xs text-gray-400">⏱ {s.tiempo_estimado_min} min</p>}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-1.5 flex-wrap">
                  <Link href={`/servicios/${s.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">Ver detalle</Button>
                  </Link>
                  <Link href={`/servicios/${s.id}/editar`}>
                    <Button variant="outline" size="sm" className="text-xs">✏️</Button>
                  </Link>
                  <BorrarServicioBtn id={s.id} nombre={s.nombre} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ver todos / colapsar */}
      {hayMas && (
        <div className="text-center">
          <Link href="/servicios?todos=1">
            <Button variant="outline" className="text-gray-600">Ver todos los servicios ({listaCompleta.length})</Button>
          </Link>
        </div>
      )}
      {todos && !q && !tipo && listaCompleta.length > 6 && (
        <div className="text-center">
          <Link href="/servicios">
            <Button variant="outline" className="text-gray-600">Mostrar solo top 6</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
