import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'
import ServicioAcciones from '@/components/servicios/ServicioAcciones'

const TIPO_LABEL: Record<string, string> = {
  pantalla: '📱 Pantalla', bateria: '🔋 Batería', placa: '🔬 Placa madre',
  software: '💻 Software', camara: '📷 Cámara', conector: '🔌 Conector', otro: '🔧 Otro',
}

export default async function ServicioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: servicio }, { data: usos }] = await Promise.all([
    supabase.from('repair_services')
      .select('*, repair_service_items(*)')
      .eq('id', id)
      .single(),
    supabase.from('repair_order_services')
      .select('applied_at, repair_orders(numero_ot, estado, precio_servicio, customers(nombre))')
      .eq('service_id', id)
      .order('applied_at', { ascending: false })
      .limit(50)
      .then(r => r.error ? { data: [] } : r),
  ])

  if (!servicio) notFound()

  const items = (servicio.repair_service_items ?? []) as { id: string; nombre: string; cantidad: number; precio_costo: number }[]
  const costoRep = items.reduce((s, i) => s + i.precio_costo * i.cantidad, 0)
  const margen = costoRep > 0 ? Math.round(((servicio.precio_base - costoRep) / costoRep) * 100) : null

  type UsoItem = {
    applied_at: string
    repair_orders: { numero_ot: string; estado: string; precio_servicio: number | null; customers: { nombre: string } | null } | null
  }
  const usosList = (usos ?? []) as unknown as UsoItem[]
  const totalUsos = usosList.length
  const totalIngresos = usosList.reduce((s, u) => s + (u.repair_orders?.precio_servicio ?? 0), 0)

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/servicios" className="text-sm text-blue-600 hover:underline">← Volver a servicios</Link>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-2xl font-bold text-gray-900">{servicio.nombre}</h1>
            {!servicio.activo && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{TIPO_LABEL[servicio.tipo_reparacion] ?? servicio.tipo_reparacion}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/servicios/${id}/editar`}>
            <Button variant="outline" size="sm">✏️ Editar</Button>
          </Link>
          <ServicioAcciones serviceId={id} nombre={servicio.nombre} activo={servicio.activo} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xs text-gray-400 uppercase">Precio base</p>
          <p className="text-lg font-bold text-blue-700 mt-0.5">{formatCLP(servicio.precio_base)}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xs text-gray-400 uppercase">Costo repuestos</p>
          <p className="text-lg font-bold text-gray-700 mt-0.5">{formatCLP(costoRep)}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xs text-gray-400 uppercase">Margen</p>
          <p className={`text-lg font-bold mt-0.5 ${margen === null ? 'text-gray-400' : margen >= 50 ? 'text-green-700' : margen >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
            {margen !== null ? `${margen}%` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xs text-gray-400 uppercase">Veces aplicado</p>
          <p className="text-lg font-bold text-purple-700 mt-0.5">{totalUsos}</p>
        </div>
      </div>

      {/* Datos del servicio */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Datos del servicio</h2>
        {servicio.descripcion && <p className="text-sm text-gray-600">{servicio.descripcion}</p>}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Tipo</p>
            <p className="font-medium">{TIPO_LABEL[servicio.tipo_reparacion]}</p>
          </div>
          {servicio.tiempo_estimado_min && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">Tiempo estimado</p>
              <p className="font-medium">⏱ {servicio.tiempo_estimado_min} min</p>
            </div>
          )}
        </div>

        {/* Repuestos incluidos */}
        {items.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase mb-2">Repuestos incluidos</p>
            <div className="space-y-1.5">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-800">{item.cantidad > 1 ? `${item.cantidad}× ` : ''}{item.nombre}</span>
                  <span className="text-gray-500 font-medium">{formatCLP(item.precio_costo * item.cantidad)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold text-gray-700 pt-1 border-t px-3">
                <span>Total repuestos</span>
                <span>{formatCLP(costoRep)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historial de uso */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <p className="font-semibold text-gray-800">Historial de uso ({totalUsos} OT{totalUsos !== 1 ? 's' : ''})</p>
          {totalIngresos > 0 && (
            <p className="text-sm text-green-700 font-medium">Ingresos generados: {formatCLP(totalIngresos)}</p>
          )}
        </div>
        {usosList.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>Este servicio aún no ha sido aplicado a ninguna OT</p>
            <p className="text-xs mt-1 text-gray-300">El historial se registra desde que se activó el rastreo</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">OT</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Cliente</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Estado</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Ingreso</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usosList.map((u, i) => {
                const ot = u.repair_orders
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-medium text-blue-700">
                      {ot ? <Link href={`/reparaciones/${ot.numero_ot}`} className="hover:underline">{ot.numero_ot}</Link> : '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{ot?.customers?.nombre ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-500 capitalize text-xs">{ot?.estado?.replace(/_/g, ' ') ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-medium text-green-700">
                      {ot?.precio_servicio ? formatCLP(ot.precio_servicio) : '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{new Date(u.applied_at).toLocaleDateString('es-CL')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
