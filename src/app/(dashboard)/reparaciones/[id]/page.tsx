import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import CambiarEstadoOT from '@/components/reparaciones/CambiarEstadoOT'
import AgregarFotosOT from '@/components/reparaciones/AgregarFotosOT'
import AgregarComentarioOT from '@/components/reparaciones/AgregarComentarioOT'
import OTBotonesCompartir from '@/components/reparaciones/OTBotonesCompartir'
import RepuestosOT from '@/components/reparaciones/RepuestosOT'
import ServiciosAplicadosOT from '@/components/reparaciones/ServiciosAplicadosOT'
import AbonoOTForm from '@/components/reparaciones/AbonoOTForm'
import ClaveDispositivoOT from '@/components/reparaciones/ClaveDispositivoOT'
import DescuentoOT from '@/components/reparaciones/DescuentoOT'
import { Customer, Equipment, RepairOrder, RepairStatusHistory, UserProfile } from '@/types'
import { labelTipoEquipo } from '@/lib/tipoEquipo'
import EtiquetaTermica from '@/components/reparaciones/EtiquetaTermica'
import { tieneSubPermiso } from '@/lib/modulos'

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
  fecha_estimada_entrega?: string | null
  customers: Customer | null
  equipment: (Equipment & { tipo_equipo?: string | null; imei2?: string | null; numero_serie?: string | null }) | null
  user_profiles: Pick<UserProfile, 'nombre_completo'> | null
}

const descEquipo = (eq: OTDetalle['equipment']) =>
  [labelTipoEquipo(eq?.tipo_equipo), eq?.marca, eq?.modelo].filter(Boolean).join(' ')

type HistorialItem = RepairStatusHistory & {
  user_profiles: Pick<UserProfile, 'nombre_completo'> | null
  foto_url?: string | null
}

interface RepuestoItem {
  id: string; nombre: string; cantidad: number
  precio_costo: number; costo_envio: number; product_id: string | null
}

export default async function OTDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfilUsuario } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesData = perfilUsuario?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = perfilUsuario?.permisos_modulos as Record<string, boolean> | null
  const puedeDescuento = tieneSubPermiso('reparaciones.descuento', rolNombre, permisos)

  // Obtener host para construir la URL de seguimiento
  const headersList = await headers()
  const host = headersList.get('host') ?? 'techrepair-pro.vercel.app'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  const [{ data: ot }, { data: historial }, { data: config }, { data: repuestos }, { data: depositos }] = await Promise.all([
    supabase.from('repair_orders')
      .select('*, customers(*), equipment(*), user_profiles(nombre_completo), clave_dispositivo')
      .eq('id', id)
      .single(),
    supabase.from('repair_status_history')
      .select('*, user_profiles(nombre_completo)')
      .eq('repair_order_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('system_config').select('*').single(),
    supabase.from('repair_items')
      .select('id, nombre, cantidad, precio_costo, precio_venta, costo_envio, product_id')
      .eq('repair_order_id', id)
      .order('created_at'),
    supabase.from('repair_deposits')
      .select('id, monto, metodo_pago, nota, created_at')
      .eq('repair_order_id', id)
      .order('created_at'),
  ])

  if (!ot) notFound()

  const otDetalle = ot as OTDetalle
  const historialItems: HistorialItem[] = (historial ?? []) as HistorialItem[]

  const resultadoOT = (otDetalle as RepairOrder & { resultado?: string }).resultado
  const noReparado = resultadoOT === 'no_exitosa' && (otDetalle.estado === 'listo' || otDetalle.estado === 'entregado')
  const estado = noReparado
    ? { label: 'Listo — sin reparación', color: 'bg-orange-100 text-orange-700' }
    : (ESTADO_INFO[otDetalle.estado] ?? { label: otDetalle.estado, color: 'bg-gray-100 text-gray-700' })
  const equipo = otDetalle.equipment
  const cliente = otDetalle.customers

  const configRaw = config as Record<string, unknown> | null
  const mostrarTecnico = configRaw?.mostrar_tecnico_pdf !== false  // default true

  const configShare = {
    nombre_local: config?.nombre_local ?? 'TechRepair Pro',
    rut_local: config?.rut_local ?? null,
    direccion: config?.direccion ?? null,
    telefono: config?.telefono ?? null,
    whatsapp: config?.whatsapp ?? null,
    email: config?.email ?? null,
    logo_url: configRaw?.logo_url as string | null ?? null,
    terminos_condiciones: configRaw?.terminos_condiciones as string | null ?? null,
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header con acciones */}
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

        <div className="flex flex-col gap-2 items-end">
          {/* Cobrar en caja (solo cuando está listo) */}
          {(otDetalle.estado === 'listo' || otDetalle.estado === 'para_entrega') && (
            <Link href={`/caja/venta-directa?ot=${otDetalle.id}`}>
              <Button className="bg-green-600 hover:bg-green-700 gap-1.5">
                💰 Cobrar en caja →
              </Button>
            </Link>
          )}
          {/* Editar OT + Cambiar estado en la misma fila */}
          <div className="flex items-center gap-2">
            <Link href={`/reparaciones/${otDetalle.id}/editar`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-gray-600 border-gray-300 hover:bg-gray-50">
                ✏️ Editar OT
              </Button>
            </Link>
            <CambiarEstadoOT
              otId={otDetalle.id}
              estadoActual={otDetalle.estado}
              fechaEntrega={otDetalle.fecha_entrega ?? null}
              otNumero={otDetalle.numero_ot}
              clienteTelefono={otDetalle.customers?.telefono}
              clienteNombre={otDetalle.customers?.nombre}
              equipoDesc={descEquipo(otDetalle.equipment)}
              nombreLocal={(config as unknown as Record<string,unknown>)?.nombre_local as string ?? undefined}
            />
          </div>
        </div>
      </div>

      {/* Banner de advertencia: equipo sin reparar */}
      {noReparado && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl shrink-0">⚠️</span>
          <div>
            <p className="font-bold text-orange-800">Equipo sin reparación</p>
            <p className="text-sm text-orange-700">Este equipo está listo para retiro pero NO fue reparado. Informar al cliente antes de la entrega.</p>
          </div>
        </div>
      )}

      {/* Banner de vencimiento */}
      {(() => {
        const estadosFinales = new Set(['entregado', 'cancelado', 'en_garantia', 'rechazado'])
        const fe = otDetalle.fecha_estimada_entrega
        if (!fe || estadosFinales.has(otDetalle.estado)) return null
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
        const fEntrega = new Date(fe + 'T00:00:00')
        const diffDias = Math.ceil((fEntrega.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDias > 1) return null
        const vencida = diffDias < 0
        return (
          <div className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${vencida ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
            <span className="text-2xl shrink-0">{vencida ? '🔴' : '🟡'}</span>
            <div>
              <p className={`font-bold ${vencida ? 'text-red-800' : 'text-amber-800'}`}>
                {vencida ? `⏰ Entrega vencida hace ${Math.abs(diffDias)} día(s)` : 'Entrega prometida: HOY'}
              </p>
              <p className={`text-sm ${vencida ? 'text-red-700' : 'text-amber-700'}`}>
                Fecha prometida: {fEntrega.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}.
                {' '}Considera actualizar la fecha o notificar al cliente.
              </p>
            </div>
          </div>
        )
      })()}

      {/* Links a manuales del equipo */}
      {equipo && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/manuales?marca=${encodeURIComponent(equipo.marca)}&q=${encodeURIComponent(equipo.modelo)}`}
            className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-sm text-indigo-700 hover:bg-indigo-100 transition-colors w-fit"
          >
            <span className="text-lg">🧠</span>
            <span>Ver manuales y fallas para <strong>{descEquipo(equipo)}</strong></span>
            <span className="text-xs text-indigo-400 ml-1">→</span>
          </Link>
          <Link
            href={`/manuales/ifixit?marca=${encodeURIComponent(equipo.marca)}&modelo=${encodeURIComponent(equipo.modelo)}`}
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors w-fit"
          >
            <span className="text-lg">🌐</span>
            <span>Buscar guías en iFixit</span>
            <span className="text-xs text-gray-400 ml-1">→</span>
          </Link>
        </div>
      )}

      {/* Botones compartir / imprimir */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Compartir con el cliente</p>
            <p className="text-xs text-gray-400">
              Link de seguimiento: <span className="font-mono">/seguimiento/{otDetalle.codigo_seguimiento}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <EtiquetaTermica
              ot={otDetalle}
              cliente={{ nombre: cliente?.nombre ?? '', telefono: cliente?.telefono ?? '' }}
              equipo={{
                tipo_equipo: equipo?.tipo_equipo ?? null,
                marca: equipo?.marca ?? '',
                modelo: equipo?.modelo ?? '',
                falla_reportada: equipo?.falla_reportada ?? null,
              }}
              config={{ nombre_local: config?.nombre_local ?? 'TechRepair Pro', telefono: config?.telefono ?? null }}
              baseUrl={baseUrl}
            />
            <OTBotonesCompartir
              ot={otDetalle as Parameters<typeof OTBotonesCompartir>[0]['ot']}
              config={configShare}
              baseUrl={baseUrl}
              mostrarTecnico={mostrarTecnico}
            />
          </div>
        </div>
      </div>

      {/* Datos principales */}
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
          <p className="font-semibold text-gray-900">{descEquipo(equipo)}</p>
          {equipo?.color && <p className="text-gray-500 text-sm">{equipo.color}{equipo?.capacidad ? ` · ${equipo.capacidad}` : ''}</p>}
          {equipo?.imei && <p className="text-gray-400 text-xs mt-1">IMEI: {equipo.imei}</p>}
          {equipo?.accesorios?.length > 0 && (
            <p className="text-gray-500 text-xs mt-2">Accesorios: {equipo.accesorios.join(', ')}</p>
          )}
          {equipo?.condicion_visual?.length > 0 && (
            <p className="text-gray-500 text-xs mt-1">Condición: {[...new Map(equipo.condicion_visual.map(c => [c.toLowerCase(), c])).values()].join(', ')}</p>
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
            {otDetalle.fecha_estimada_entrega && (
              <div className="flex justify-between">
                <span className="text-gray-500">Entrega prometida</span>
                <span className="font-medium text-blue-700">
                  {new Date(otDetalle.fecha_estimada_entrega + 'T00:00:00').toLocaleDateString('es-CL')}
                </span>
              </div>
            )}
            {otDetalle.presupuesto_estimado ? (
              <div className="flex justify-between">
                <span className="text-gray-500">Presupuesto</span>
                <span className="font-medium">${otDetalle.presupuesto_estimado.toLocaleString('es-CL')}</span>
              </div>
            ) : null}
            {otDetalle.precio_servicio ? (
              <div className="flex justify-between">
                <span className="text-gray-500">Precio final</span>
                <span className="font-bold text-green-700">${otDetalle.precio_servicio.toLocaleString('es-CL')}</span>
              </div>
            ) : null}
            {(otDetalle as RepairOrder & { resultado?: string }).resultado && (
              <div className="flex justify-between">
                <span className="text-gray-500">Resultado</span>
                <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${(otDetalle as RepairOrder & { resultado?: string }).resultado === 'exitosa' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {(otDetalle as RepairOrder & { resultado?: string }).resultado === 'exitosa' ? '✅ Reparado' : '🔧 Sin reparación'}
                </span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-400 mb-1">Link de seguimiento:</p>
            <a
              href={`/seguimiento/${otDetalle.codigo_seguimiento}`}
              target="_blank"
              className="text-xs text-blue-600 hover:underline break-all"
            >
              {baseUrl}/seguimiento/{otDetalle.codigo_seguimiento}
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
        {otDetalle.diagnostico_tecnico && (
          <div className="mt-2 pt-2 border-t border-amber-200">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Diagnóstico técnico</p>
            <p className="text-gray-700 text-sm">{otDetalle.diagnostico_tecnico}</p>
          </div>
        )}
      </div>

      {/* Clave del dispositivo */}
      <ClaveDispositivoOT
        otId={otDetalle.id}
        claveInicial={(otDetalle as RepairOrder & { clave_dispositivo?: { tipo: 'patron' | 'pin' | 'texto'; valor: string; notas?: string } | null }).clave_dispositivo}
      />

      {/* Descuento */}
      {puedeDescuento && (
        <DescuentoOT
          otId={otDetalle.id}
          precioServicio={otDetalle.precio_servicio ?? null}
          descuentoInicial={(otDetalle as RepairOrder & { descuento?: number }).descuento ?? 0}
        />
      )}

      {/* Abonos */}
      <AbonoOTForm
        otId={otDetalle.id}
        numeroOt={otDetalle.numero_ot}
        precioServicio={otDetalle.precio_servicio ?? null}
        depositos={(depositos ?? []) as { id: string; monto: number; metodo_pago: string; nota: string | null; created_at: string }[]}
      />

      {/* Servicios aplicados */}
      <ServiciosAplicadosOT otId={otDetalle.id} />

      {/* Repuestos */}
      <RepuestosOT
        otId={otDetalle.id}
        otNumero={otDetalle.numero_ot}
        repuestosIniciales={(repuestos ?? []) as RepuestoItem[]}
      />

      {/* Fotos del equipo — se adjuntan al estado actual y el cliente las ve en su seguimiento */}
      <div className="bg-white rounded-xl border px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">📷 Fotos del equipo</p>
          <p className="text-xs text-gray-400">
            Se adjuntan al estado actual (<span className="font-medium text-gray-500">{estado.label}</span>) — el cliente las verá en su seguimiento
          </p>
        </div>
        <AgregarFotosOT otId={otDetalle.id} estadoActual={otDetalle.estado} />
      </div>

      {/* Comentario libre — visible en el historial y en el seguimiento del cliente */}
      <div className="bg-white rounded-xl border px-4 py-3 flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">💬 Comentarios</p>
          <p className="text-xs text-gray-400">Agrega una nota al historial — el cliente la verá en su seguimiento</p>
        </div>
        <AgregarComentarioOT otId={otDetalle.id} estadoActual={otDetalle.estado} />
      </div>

      {/* Historial */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Historial de estados</h2>
        <div className="space-y-2">
          {historialItems.map((h) => {
            const esMeta = h.estado_anterior === h.estado_nuevo
            const esFoto = esMeta && h.comentario === 'Foto agregada al estado actual'
            const esComentario = esMeta && !esFoto

            const badge = esComentario
              ? <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-amber-100 text-amber-700">💬 Comentario</span>
              : esFoto
                ? <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-blue-100 text-blue-700">📷 Foto</span>
                : (() => { const est = ESTADO_INFO[h.estado_nuevo]; return <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${est?.color ?? 'bg-gray-100'}`}>{est?.label ?? h.estado_nuevo}</span> })()

            return (
              <div key={h.id} className="bg-white rounded-lg border px-4 py-3 flex items-start gap-3">
                {badge}
                <div className="flex-1 min-w-0">
                  {h.comentario && !esFoto && <p className="text-sm text-gray-700">{h.comentario}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(h.created_at).toLocaleString('es-CL')}
                    {h.user_profiles?.nombre_completo && ` · ${h.user_profiles.nombre_completo}`}
                  </p>
                  {h.foto_url && (
                    <a href={h.foto_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={h.foto_url} alt="Foto estado" className="h-24 rounded-lg border object-cover hover:opacity-90 transition-opacity" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
