import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Customer, Equipment, RepairOrder, RepairStatusHistory, SystemConfig } from '@/types'

const ESTADO_INFO: Record<string, { label: string; color: string; bg: string; icono: string }> = {
  recibido:           { label: 'Recibido en taller',     color: 'text-gray-700',   bg: 'bg-gray-100',    icono: '📥' },
  en_diagnostico:     { label: 'En diagnóstico',         color: 'text-yellow-700', bg: 'bg-yellow-100',  icono: '🔍' },
  presupuestado:      { label: 'Presupuesto enviado',     color: 'text-blue-700',   bg: 'bg-blue-100',    icono: '📋' },
  aprobado:           { label: 'Presupuesto aprobado',    color: 'text-indigo-700', bg: 'bg-indigo-100',  icono: '✅' },
  rechazado:          { label: 'Presupuesto rechazado',   color: 'text-red-700',    bg: 'bg-red-100',     icono: '❌' },
  esperando_repuesto: { label: 'Esperando repuesto',      color: 'text-orange-700', bg: 'bg-orange-100',  icono: '📦' },
  en_reparacion:      { label: 'En reparación',           color: 'text-purple-700', bg: 'bg-purple-100',  icono: '🔧' },
  listo:              { label: '¡Listo para retirar!',    color: 'text-green-700',  bg: 'bg-green-100',   icono: '🎉' },
  entregado:          { label: 'Entregado al cliente',    color: 'text-emerald-700',bg: 'bg-emerald-100', icono: '✅' },
  en_garantia:        { label: 'En garantía',             color: 'text-teal-700',   bg: 'bg-teal-100',    icono: '🛡️' },
  cancelado:          { label: 'Cancelado',               color: 'text-gray-500',   bg: 'bg-gray-100',    icono: '🚫' },
}

type SeguimientoOTRaw = RepairOrder & {
  customers: Pick<Customer, 'nombre' | 'telefono'>[] | null
  equipment: Pick<Equipment, 'marca' | 'modelo' | 'color' | 'capacidad'>[] | null
}

type SeguimientoHistorial = Pick<RepairStatusHistory, 'estado_nuevo' | 'comentario' | 'created_at'>

type SeguimientoConfig = Pick<SystemConfig, 'nombre_local' | 'telefono' | 'whatsapp'>

export default async function SeguimientoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const supabase = await createClient()

  const { data: ot } = await supabase
    .from('repair_orders')
    .select('*, customers(nombre, telefono), equipment(marca, modelo, color, capacidad)')
    .eq('codigo_seguimiento', codigo)
    .single()

  if (!ot) notFound()

  const [{ data: historial }, { data: config }] = await Promise.all([
    supabase.from('repair_status_history')
      .select('estado_nuevo, comentario, created_at')
      .eq('repair_order_id', ot.id)
      .order('created_at', { ascending: true }),
    supabase.from('system_config').select('nombre_local, telefono, whatsapp').single(),
  ])

  const seguimientoOt = ot as SeguimientoOTRaw
  const historialList = (historial ?? []) as SeguimientoHistorial[]
  const configData = config as SeguimientoConfig | null

  const estadoActual = ESTADO_INFO[seguimientoOt.estado] ?? { label: seguimientoOt.estado, color: 'text-gray-700', bg: 'bg-gray-100', icono: '📋' }
  const equipo = seguimientoOt.equipment?.[0] ?? null
  const esListo = seguimientoOt.estado === 'listo'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between max-w-lg mx-auto">
        <div>
          <p className="font-bold text-gray-900">{configData?.nombre_local ?? 'TechRepair Pro'}</p>
          <p className="text-xs text-gray-400">Seguimiento de reparación</p>
        </div>
        {configData?.whatsapp && (
          <a
            href={`https://wa.me/${configData.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-green-500 text-white text-xs px-3 py-2 rounded-full font-medium"
          >
            <span>WhatsApp</span>
          </a>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Estado principal */}
        <div className={`rounded-2xl p-6 text-center ${estadoActual.bg}`}>
          <p className="text-4xl mb-2">{estadoActual.icono}</p>
          <p className={`text-xl font-bold ${estadoActual.color}`}>{estadoActual.label}</p>
          <p className="text-sm text-gray-500 mt-1">OT {seguimientoOt.numero_ot}</p>
          {esListo && configData?.telefono && (
            <p className="mt-3 text-sm font-medium text-green-700">
              Llámanos al {configData.telefono} para coordinar la entrega
            </p>
          )}
        </div>

        {/* Info del equipo */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Tu equipo</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Marca y modelo</p>
              <p className="font-medium text-gray-800">{equipo?.marca} {equipo?.modelo}</p>
            </div>
            {equipo?.color && (
              <div>
                <p className="text-xs text-gray-400">Color</p>
                <p className="font-medium text-gray-800">{equipo.color}{equipo?.capacidad ? ` · ${equipo.capacidad}` : ''}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Ingresado el</p>
              <p className="font-medium text-gray-800">
                {new Date(seguimientoOt.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
              </p>
            </div>
            {seguimientoOt.precio_servicio && (
              <div>
                <p className="text-xs text-gray-400">Precio acordado</p>
                <p className="font-bold text-green-700">
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(seguimientoOt.precio_servicio)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        {historialList.length > 0 && (
          <div className="bg-white rounded-xl border p-5 space-y-1">
            <h2 className="font-semibold text-gray-800 mb-4">Historial</h2>
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {historialList.map((h, i) => {
                  const info = ESTADO_INFO[h.estado_nuevo]
                  const esActual = i === historialList.length - 1
                  return (
                    <div key={i} className="relative flex items-start gap-3 pl-10">
                      <div className={`absolute left-0 w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0
                        ${esActual ? 'bg-blue-600 text-white' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                        {esActual ? '●' : '○'}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className={`text-sm font-medium ${esActual ? 'text-gray-900' : 'text-gray-600'}`}>
                          {info?.label ?? h.estado_nuevo}
                        </p>
                        {h.comentario && (
                          <p className="text-xs text-gray-500 mt-0.5">{h.comentario}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(h.created_at).toLocaleString('es-CL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Código de seguimiento: <span className="font-mono">{codigo}</span>
        </p>
      </div>
    </div>
  )
}
