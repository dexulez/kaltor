import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

const ESTADO_INFO: Record<string, { label: string; color: string; bg: string; icono: string }> = {
  recibido:           { label: 'Recibido en taller',        color: 'text-gray-700',    bg: 'bg-gray-100',    icono: '📥' },
  en_diagnostico:     { label: 'En diagnóstico',            color: 'text-yellow-700',  bg: 'bg-yellow-100',  icono: '🔍' },
  presupuestado:      { label: 'Presupuesto en proceso',     color: 'text-blue-700',    bg: 'bg-blue-100',    icono: '📋' },
  aprobado:           { label: 'Presupuesto aceptado',       color: 'text-indigo-700',  bg: 'bg-indigo-100',  icono: '✅' },
  rechazado:          { label: 'Presupuesto rechazado',      color: 'text-red-700',     bg: 'bg-red-100',     icono: '❌' },
  esperando_repuesto: { label: 'Esperando repuesto',         color: 'text-orange-700',  bg: 'bg-orange-100',  icono: '📦' },
  en_reparacion:      { label: 'En reparación',              color: 'text-purple-700',  bg: 'bg-purple-100',  icono: '🔧' },
  listo:              { label: '¡Reparación finalizada!',    color: 'text-green-700',   bg: 'bg-green-100',   icono: '🎉' },
  para_entrega:       { label: '¡Listo para retirar!',       color: 'text-cyan-700',    bg: 'bg-cyan-100',    icono: '📬' },
  entregado:          { label: 'Entregado al cliente',       color: 'text-emerald-700', bg: 'bg-emerald-100', icono: '✅' },
  en_garantia:        { label: 'En garantía',                color: 'text-teal-700',    bg: 'bg-teal-100',    icono: '🛡️' },
  cancelado:          { label: 'Cancelado',                  color: 'text-gray-500',    bg: 'bg-gray-100',    icono: '🚫' },
}

export default async function SeguimientoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const supabase = createServiceClient()

  const { data: ot } = await supabase
    .from('repair_orders')
    .select(`
      id, numero_ot, estado, created_at, precio_servicio, presupuesto_estimado,
      diagnostico_tecnico, codigo_seguimiento,
      customers(nombre, telefono),
      equipment(tipo_equipo, marca, modelo, color, capacidad, falla_reportada, observaciones,
                imei, imei2, numero_serie, accesorios, condicion_visual)
    `)
    .eq('codigo_seguimiento', codigo)
    .single()

  if (!ot) notFound()

  const [{ data: historial }, { data: config }, { data: depositos }] = await Promise.all([
    supabase.from('repair_status_history')
      .select('estado_nuevo, comentario, created_at, foto_url')
      .eq('repair_order_id', ot.id as string)
      .order('created_at', { ascending: true })
      .then(async r => {
        if (!r.error) return r
        // foto_url columna no existe aún → reintentar sin ella
        const r2 = await supabase.from('repair_status_history')
          .select('estado_nuevo, comentario, created_at')
          .eq('repair_order_id', ot.id as string)
          .order('created_at', { ascending: true })
        return r2.error ? { data: [] } : { data: (r2.data ?? []).map(h => ({ ...h, foto_url: null })) }
      }),
    supabase.from('system_config')
      .select('nombre_local, rut_local, direccion, telefono, whatsapp, email, logo_url')
      .maybeSingle(),
    supabase.from('repair_deposits')
      .select('monto, metodo_pago, nota, created_at')
      .eq('repair_order_id', ot.id)
      .order('created_at')
      .then((r: { data: unknown[] | null; error: { message: string } | null }) =>
        r.error?.message.includes('repair_deposits') ? { data: [] } : r
      ),
  ])

  type OTData = typeof ot & {
    customers: { nombre: string; telefono: string } | null
    equipment: {
      tipo_equipo?: string | null; marca: string; modelo: string; color?: string; capacidad?: string
      falla_reportada: string; observaciones?: string
      imei?: string | null; imei2?: string | null; numero_serie?: string | null
      accesorios?: string[]; condicion_visual?: string[]
    } | null
  }
  type DepositoItem = { monto: number; metodo_pago: string; nota: string | null; created_at: string }
  const depositosList = (depositos ?? []) as DepositoItem[]
  const totalAbonado = depositosList.reduce((s, d) => s + d.monto, 0)

  const otData = ot as unknown as OTData
  const historialList = historial ?? []
  // Supabase puede devolver el join como array o como objeto según dirección de FK
  const rawEq = (ot as Record<string, unknown>).equipment
  const equipo = (Array.isArray(rawEq) ? rawEq[0] : rawEq) as OTData['equipment']
  const rawCl = (ot as Record<string, unknown>).customers
  const cliente = (Array.isArray(rawCl) ? rawCl[0] : rawCl) as OTData['customers']

  const estadoActual = ESTADO_INFO[otData.estado] ?? {
    label: otData.estado, color: 'text-gray-700', bg: 'bg-gray-100', icono: '📋',
  }
  const esListo = otData.estado === 'listo' || otData.estado === 'para_entrega'
  const esEntregado = otData.estado === 'entregado'

  const TZ = 'America/Santiago'
  const fecha = new Date(otData.created_at).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">

      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(config as { logo_url?: string } | null)?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(config as { logo_url: string }).logo_url} alt="Logo" className="h-10 max-w-24 object-contain" />
            )}
            <div>
              <p className="font-bold text-gray-900 text-sm">{config?.nombre_local ?? 'TechRepair Pro'}</p>
              <p className="text-xs text-gray-400">Seguimiento de reparación</p>
            </div>
          </div>
          {config?.whatsapp && (
            <a
              href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-2 rounded-full font-medium transition-colors"
            >
              📲 Contactar
            </a>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Estado principal */}
        <div className={`rounded-2xl p-6 text-center shadow-sm ${estadoActual.bg}`}>
          <p className="text-5xl mb-3">{estadoActual.icono}</p>
          <p className={`text-xl font-bold ${estadoActual.color}`}>{estadoActual.label}</p>
          <p className="text-sm text-gray-600 mt-1 font-mono font-semibold">{otData.numero_ot}</p>

          {esListo && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-green-700">
                ¡Tu equipo está listo! Puedes venir a retirarlo.
              </p>
              <div className="flex flex-col gap-2 mt-3">
                {config?.telefono && (
                  <a href={`tel:${config.telefono}`}
                    className="inline-flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl">
                    📞 Llamar al taller
                  </a>
                )}
                {config?.whatsapp && (
                  <a href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vengo a retirar mi equipo OT ${otData.numero_ot}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-green-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl">
                    📲 WhatsApp para coordinar retiro
                  </a>
                )}
              </div>
            </div>
          )}

          {esEntregado && (
            <p className="mt-3 text-sm text-emerald-700 font-medium">
              Gracias por confiar en nosotros. ¡Hasta la próxima!
            </p>
          )}
        </div>

        {/* Info del cliente */}
        {cliente && (
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cliente</h2>
            <p className="font-semibold text-gray-900">{cliente.nombre}</p>
            <p className="text-gray-600 text-sm">{cliente.telefono}</p>
          </div>
        )}

        {/* Info del equipo */}
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tu equipo</h2>
            {equipo?.tipo_equipo && (
              <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-full capitalize">
                {equipo.tipo_equipo}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Marca y modelo</p>
              <p className="font-semibold text-gray-800">
                {[equipo?.marca, equipo?.modelo].filter(Boolean).join(' ') || 'Sin especificar'}
              </p>
            </div>
            {(equipo?.color || equipo?.capacidad) && (
              <div>
                <p className="text-xs text-gray-400">Características</p>
                <p className="font-medium text-gray-700">{[equipo?.color, equipo?.capacidad].filter(Boolean).join(' · ')}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Ingresado el</p>
              <p className="font-medium text-gray-700">{fecha}</p>
            </div>
            {otData.precio_servicio ? (
              <div>
                <p className="text-xs text-gray-400">Precio del servicio</p>
                <p className="font-extrabold text-green-700" style={{ fontSize: '1.2em' }}>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(otData.precio_servicio)}
                </p>
              </div>
            ) : otData.presupuesto_estimado ? (
              <div>
                <p className="text-xs text-gray-400">Presupuesto estimado</p>
                <p className="font-extrabold text-gray-800" style={{ fontSize: '1.2em' }}>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(otData.presupuesto_estimado)}
                </p>
              </div>
            ) : null}
          </div>

          {equipo?.falla_reportada && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-0.5">Falla reportada</p>
              <p className="text-sm text-gray-700">{equipo.falla_reportada}</p>
            </div>
          )}

          {otData.diagnostico_tecnico && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-0.5">Diagnóstico técnico</p>
              <p className="text-sm text-gray-700">{otData.diagnostico_tecnico}</p>
            </div>
          )}

          {/* IMEI / SN */}
          {(equipo?.imei || equipo?.imei2 || equipo?.numero_serie) && (
            <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
              {equipo.imei && (
                <div>
                  <p className="text-xs text-gray-400">IMEI{equipo.imei2 ? ' 1' : ''}</p>
                  <p className="text-xs font-mono text-gray-700">{equipo.imei}</p>
                </div>
              )}
              {equipo.imei2 && (
                <div>
                  <p className="text-xs text-gray-400">IMEI 2</p>
                  <p className="text-xs font-mono text-gray-700">{equipo.imei2}</p>
                </div>
              )}
              {equipo.numero_serie && (
                <div>
                  <p className="text-xs text-gray-400">N° Serie</p>
                  <p className="text-xs font-mono text-gray-700">{equipo.numero_serie}</p>
                </div>
              )}
            </div>
          )}

          {/* Accesorios */}
          {equipo?.accesorios && equipo.accesorios.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1.5">Accesorios entregados</p>
              <div className="flex flex-wrap gap-1.5">
                {equipo.accesorios.map((a: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Condición visual y física */}
          {equipo?.condicion_visual && equipo.condicion_visual.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1.5">Condición visual y física</p>
              <div className="flex flex-wrap gap-1.5">
                {equipo.condicion_visual.map((c: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Abonos recibidos */}
        {(depositosList.length > 0 || (otData.precio_servicio && totalAbonado > 0)) && (
          <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Pagos recibidos</h2>
            {otData.precio_servicio && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400">Total servicio</p>
                  <p className="font-bold text-gray-800 mt-0.5">{new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP'}).format(otData.precio_servicio)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-gray-400">Abonado</p>
                  <p className="font-bold text-green-700 mt-0.5">{new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP'}).format(totalAbonado)}</p>
                </div>
                <div className={`rounded-lg p-2 ${otData.precio_servicio - totalAbonado > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-gray-400">Saldo</p>
                  <p className={`font-bold mt-0.5 ${otData.precio_servicio - totalAbonado > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {otData.precio_servicio - totalAbonado > 0
                      ? new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP'}).format(otData.precio_servicio - totalAbonado)
                      : '✓ Al día'}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {depositosList.map((d, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 text-xs">
                  <span className="font-semibold text-gray-800">{new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP'}).format(d.monto)}</span>
                  <span className="text-gray-400">{d.metodo_pago} · {new Date(d.created_at).toLocaleDateString('es-CL', { timeZone: TZ })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Seguimiento estilo courier ──────────────────────────────── */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b px-5 py-3">
            <h2 className="font-bold text-gray-800 text-sm">📍 Seguimiento del servicio</h2>
          </div>

          {historialList.length === 0 ? (
            <div className="p-6 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${estadoActual.bg} ${estadoActual.color} mb-2`}>
                <span className="text-lg">{estadoActual.icono}</span>
                {estadoActual.label}
              </div>
              <p className="text-xs text-gray-400 mt-2">Las actualizaciones aparecerán aquí</p>
            </div>
          ) : (
            <div className="p-5 space-y-0">
              {historialList.map((h: { estado_nuevo: unknown; comentario: unknown; created_at: unknown; foto_url?: unknown }, i: number) => {
                const info = ESTADO_INFO[h.estado_nuevo as string]
                const esActual = i === historialList.length - 1
                const esPasado = !esActual
                const fecha = new Date(h.created_at as string).toLocaleString('es-CL', {
                  timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })

                return (
                  <div key={i} className="flex gap-4">
                    {/* Línea vertical + nodo */}
                    <div className="flex flex-col items-center shrink-0">
                      {/* Nodo */}
                      <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 shadow-sm border-2 z-10
                        ${esActual
                          ? `${info?.bg ?? 'bg-blue-100'} border-blue-400`
                          : 'bg-gray-50 border-gray-200'}`}>
                        {esActual && (
                          <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-blue-400" />
                        )}
                        <span className={esActual ? '' : 'grayscale opacity-60'}>{info?.icono ?? '📋'}</span>
                      </div>
                      {/* Conector hacia abajo */}
                      {i < historialList.length - 1 && (
                        <div className="w-0.5 flex-1 min-h-[24px] bg-gray-200 my-1" />
                      )}
                    </div>

                    {/* Contenido del evento */}
                    <div className={`flex-1 pb-5 min-w-0 ${i < historialList.length - 1 ? '' : ''}`}>
                      <div className={`rounded-xl border p-3.5 ${esActual ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                        {/* Encabezado */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p className={`font-bold text-sm ${esActual ? 'text-blue-900' : 'text-gray-700'}`}>
                            {info?.label ?? (h.estado_nuevo as string)}
                            {esActual && <span className="ml-2 text-xs font-normal bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Actual</span>}
                          </p>
                          <p className="text-xs text-gray-400 shrink-0 capitalize">{fecha}</p>
                        </div>

                        {/* Comentario */}
                        {(h.comentario as string) && (
                          <p className={`text-xs mt-2 leading-relaxed ${esActual ? 'text-blue-800' : 'text-gray-600'}`}>
                            {h.comentario as string}
                          </p>
                        )}

                        {/* Foto */}
                        {!!h.foto_url && (
                          <a href={h.foto_url as string} target="_blank" rel="noopener noreferrer"
                            className="mt-3 block group relative overflow-hidden rounded-lg border border-gray-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={h.foto_url as string} alt="Evidencia" className="w-full max-h-48 object-cover group-hover:opacity-95 transition-opacity" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end">
                              <p className="w-full text-center text-xs text-white bg-black/40 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                📷 Ver foto completa
                              </p>
                            </div>
                          </a>
                        )}
                      </div>

                      {esPasado && (
                        <div className="flex items-center gap-1.5 mt-1.5 ml-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs text-green-700 font-medium">Completado</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white rounded-xl border shadow-sm p-4 text-center space-y-1">
          <p className="font-semibold text-gray-800 text-sm">{config?.nombre_local}</p>
          {config?.direccion && <p className="text-xs text-gray-500">{config.direccion}</p>}
          <div className="flex items-center justify-center gap-3 text-xs text-gray-500 flex-wrap">
            {config?.telefono && <span>📞 {config.telefono}</span>}
            {config?.email && <span>✉️ {config.email}</span>}
          </div>
          <p className="text-xs text-gray-300 pt-1 font-mono">{codigo}</p>
        </div>

      </div>
    </div>
  )
}
