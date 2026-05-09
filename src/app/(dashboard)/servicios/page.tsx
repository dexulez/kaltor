import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'

const TIPO_LABEL: Record<string, string> = {
  pantalla: '📱 Pantalla', bateria: '🔋 Batería', placa: '🔬 Placa madre',
  software: '💻 Software', camara: '📷 Cámara', conector: '🔌 Conector', otro: '🔧 Otro',
}

export default async function ServiciosPage() {
  const supabase = await createClient()
  const { data: servicios } = await supabase
    .from('repair_services')
    .select('*, repair_service_items(id, nombre, cantidad, precio_costo)')
    .order('tipo_reparacion')
    .order('nombre')

  const lista = servicios ?? []
  const activos = lista.filter(s => s.activo).length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔩 Servicios</h1>
          <p className="text-gray-500 text-sm mt-0.5">{activos} servicio(s) activo(s) — plantillas para órdenes de trabajo</p>
        </div>
        <Link href="/servicios/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700">+ Nuevo servicio</Button>
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">🔩</span>
          <p className="font-medium text-gray-600">Sin servicios definidos</p>
          <p className="text-sm mt-1">Crea plantillas de servicios para agilizar la creación de OTs</p>
          <Link href="/servicios/nuevo"><Button className="mt-4 bg-blue-600 hover:bg-blue-700">+ Crear primer servicio</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map(s => {
            const items = (s.repair_service_items ?? []) as { id: string; nombre: string; cantidad: number; precio_costo: number }[]
            const costoRep = items.reduce((sum, i) => sum + i.precio_costo * i.cantidad, 0)
            const margen = costoRep > 0 ? Math.round(((s.precio_base - costoRep) / costoRep) * 100) : null
            return (
              <div key={s.id} className={`bg-white rounded-xl border p-4 space-y-3 ${!s.activo ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-xs text-gray-500 font-medium">{TIPO_LABEL[s.tipo_reparacion] ?? s.tipo_reparacion}</span>
                    <p className="font-bold text-gray-900 leading-tight mt-0.5">{s.nombre}</p>
                    {s.descripcion && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.descripcion}</p>}
                  </div>
                  {!s.activo && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">Inactivo</span>}
                </div>

                {/* Repuestos */}
                {items.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Repuestos incluidos</p>
                    {items.slice(0, 3).map(i => (
                      <div key={i.id} className="flex justify-between text-xs text-gray-600">
                        <span>{i.cantidad > 1 ? `${i.cantidad}× ` : ''}{i.nombre}</span>
                        <span className="text-gray-400">{formatCLP(i.precio_costo * i.cantidad)}</span>
                      </div>
                    ))}
                    {items.length > 3 && <p className="text-xs text-gray-400">+{items.length - 3} más</p>}
                  </div>
                )}

                {/* Precios */}
                <div className="border-t pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Precio al cliente</p>
                    <p className="text-lg font-bold text-blue-700">{formatCLP(s.precio_base)}</p>
                  </div>
                  <div className="text-right">
                    {costoRep > 0 && <p className="text-xs text-gray-400">Costo repuestos: {formatCLP(costoRep)}</p>}
                    {margen !== null && (
                      <p className={`text-sm font-semibold ${margen >= 50 ? 'text-green-700' : margen >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                        Margen {margen}%
                      </p>
                    )}
                    {s.tiempo_estimado_min && <p className="text-xs text-gray-400">⏱ {s.tiempo_estimado_min} min</p>}
                  </div>
                </div>

                <Link href={`/servicios/${s.id}/editar`}>
                  <Button variant="outline" size="sm" className="w-full text-xs">✏️ Editar</Button>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
