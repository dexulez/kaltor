import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import CambiarEstadoOT from '@/components/reparaciones/CambiarEstadoOT'
import { Customer, Equipment, RepairOrder, RepairStatusHistory, UserProfile } from '@/types'

const ESTADO_INFO: Record<string, { label: string; color: string }> = {
  recibido:           { label: 'Recibido',           color: 'bg-gray-100 text-gray-700' },
  en_diagnostico:     { label: 'En diagnóstico',     color: 'bg-yellow-100 text-yellow-700' },
  presupuestado:      { label: 'Presupuestado',       color: 'bg-blue-100 text-blue-700' },
  aprobado:           { label: 'Aprobado',            color: 'bg-indigo-100 text-indigo-700' },
  rechazado:          { label: 'Rechazado',           color: 'bg-red-100 text-red-700' },
  esperando_repuesto: { label: 'Esperando repuesto',  color: 'bg-orange-100 text-orange-700' },
  en_reparacion:      { label: 'En reparación',       color: 'bg-purple-100 text-purple-700' },
  listo:              { label: 'Listo',               color: 'bg-green-100 text-green-700' },
  entregado:          { label: 'Entregado',           color: 'bg-emerald-100 text-emerald-700' },
  en_garantia:        { label: 'En garantía',         color: 'bg-teal-100 text-teal-700' },
  cancelado:          { label: 'Cancelado',           color: 'bg-gray-200 text-gray-500' },
}

type OTDetalle = RepairOrder & {
  customers: Customer | null
  equipment: Equipment | null
  user_profiles: Pick<UserProfile, 'nombre_completo'> | null
}

type HistorialItem = RepairStatusHistory & {
  user_profiles: Pick<UserProfile, 'nombre_completo'> | null
}

export default async function OTDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: ot }, { data: historial }] = await Promise.all([
    supabase.from('repair_orders')
      .select('*, customers(*), equipment(*), user_profiles(nombre_completo)')
      .eq('id', id)
      .single(),
    supabase.from('repair_status_history')
      .select('*, user_profiles(nombre_completo)')
      .eq('repair_order_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!ot) notFound()

  const otDetalle = ot as OTDetalle
  const historialItems: HistorialItem[] = (historial ?? []) as HistorialItem[]

  const estado = ESTADO_INFO[otDetalle.estado] ?? { label: otDetalle.estado, color: 'bg-gray-100 text-gray-700' }
  const equipo = otDetalle.equipment
  const cliente = otDetalle.customers

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/reparaciones" className="text-sm text-blue-600 hover:underline">← Volver</Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{otDetalle.numero_ot}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${estado.color}`}>{estado.label}</span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Creada el {new Date(otDetalle.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <CambiarEstadoOT otId={otDetalle.id} estadoActual={otDetalle.estado} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cliente */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cliente</h2>
          <p className="font-semibold text-gray-900">{cliente?.nombre}</p>
          <p className="text-gray-600 text-sm">{cliente?.telefono}</p>
          {cliente?.email && <p className="text-gray-500 text-sm">{cliente.email}</p>}
          {cliente?.rut && <p className="text-gray-400 text-xs mt-1">RUT: {cliente.rut}</p>}
          <Link href={`/clientes/${otDetalle.customer_id}`}>
            <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-blue-600">Ver cliente →</Button>
          </Link>
        </div>

        {/* Equipo */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Equipo</h2>
          <p className="font-semibold text-gray-900">{equipo?.marca} {equipo?.modelo}</p>
          {equipo?.color && <p className="text-gray-500 text-sm">{equipo.color}{equipo?.capacidad ? ` · ${equipo.capacidad}` : ''}</p>}
          {equipo?.imei && <p className="text-gray-400 text-xs mt-1">IMEI: {equipo.imei}</p>}
          {equipo?.accesorios?.length > 0 && (
            <p className="text-gray-500 text-xs mt-2">Accesorios: {equipo.accesorios.join(', ')}</p>
          )}
          {equipo?.condicion_visual?.length > 0 && (
            <p className="text-gray-500 text-xs mt-1">Condición: {equipo.condicion_visual.join(', ')}</p>
          )}
        </div>

        {/* OT info */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Orden de trabajo</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Técnico</span>
              <span className="font-medium">{otDetalle.user_profiles?.nombre_completo ?? 'Sin asignar'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tipo</span>
              <span className="font-medium capitalize">{otDetalle.tipo_reparacion ?? '—'}</span>
            </div>
            {otDetalle.presupuesto_estimado && (
              <div className="flex justify-between">
                <span className="text-gray-500">Presupuesto</span>
                <span className="font-medium">${otDetalle.presupuesto_estimado.toLocaleString('es-CL')}</span>
              </div>
            )}
            {otDetalle.precio_servicio && (
              <div className="flex justify-between">
                <span className="text-gray-500">Precio final</span>
                <span className="font-bold text-green-700">${otDetalle.precio_servicio.toLocaleString('es-CL')}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-400 mb-1">QR de seguimiento:</p>
            <a
              href={`/seguimiento/${otDetalle.codigo_seguimiento}`}
              target="_blank"
              className="text-xs text-blue-600 hover:underline break-all"
            >
              /seguimiento/{otDetalle.codigo_seguimiento}
            </a>
          </div>
        </div>
      </div>

      {/* Falla reportada */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Falla reportada por el cliente</p>
        <p className="text-gray-800">{equipo?.falla_reportada}</p>
        {equipo?.observaciones && (
          <p className="text-gray-600 text-sm mt-2">Obs: {equipo.observaciones}</p>
        )}
      </div>

      {/* Historial */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Historial de estados</h2>
        <div className="space-y-2">
          {historialItems.map((h) => {
            const est = ESTADO_INFO[h.estado_nuevo]
            return (
              <div key={h.id} className="bg-white rounded-lg border px-4 py-3 flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${est?.color ?? 'bg-gray-100'}`}>
                  {est?.label ?? h.estado_nuevo}
                </span>
                <div className="flex-1 min-w-0">
                  {h.comentario && <p className="text-sm text-gray-700">{h.comentario}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(h.created_at).toLocaleString('es-CL')}
                    {h.user_profiles?.nombre_completo && ` · ${h.user_profiles.nombre_completo}`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
