import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ConfirmarPedidoForm from './ConfirmarPedidoForm'
import { formatCLP } from '@/lib/calculations'

const TZ = 'America/Santiago'

const ESTADO_INFO: Record<string, { label: string; color: string; icon: string }> = {
  pendiente:           { label: 'Pendiente',          color: 'bg-yellow-100 text-yellow-800', icon: '🕐' },
  enviada:             { label: 'Enviado a ti',        color: 'bg-purple-100 text-purple-800', icon: '📤' },
  proveedor_respondio: { label: 'Cotización enviada',  color: 'bg-teal-100 text-teal-800',    icon: '💬' },
  confirmada:          { label: 'Confirmado',          color: 'bg-indigo-100 text-indigo-800', icon: '✅' },
  preparando:          { label: 'Preparando pedido',  color: 'bg-violet-100 text-violet-800', icon: '📦' },
  en_transito:         { label: 'En camino',           color: 'bg-blue-100 text-blue-800',    icon: '🚚' },
  recibida_parcial:    { label: 'Recibido parcial',    color: 'bg-orange-100 text-orange-800', icon: '📦' },
  recibida_completa:   { label: 'Recibido completo',   color: 'bg-green-100 text-green-800',  icon: '✅' },
  cancelada:           { label: 'Cancelado',           color: 'bg-red-100 text-red-800',      icon: '❌' },
}

export default async function PedidoProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: orden }, itemsResult, { data: cfg }] = await Promise.all([
    supabase.from('purchase_orders')
      .select('id, numero_oc, estado, created_at, confirmado_proveedor_at, comprobante_envio_url, notas, supplier_id, suppliers(nombre, telefono, email, whatsapp)')
      .eq('id', id).single(),
    supabase.from('purchase_order_items')
      .select('id, nombre, cantidad_solicitada, cantidad_recibida, precio_unitario, disponible_proveedor, cantidad_disponible_proveedor, precio_cotizado, precio_aceptado, nota_proveedor, alternativa, descuento_tipo, descuento_valor, descuento_desde_cantidad')
      .eq('purchase_order_id', id)
      .order('nombre'),
    supabase.from('system_config')
      .select('nombre_local, rut_local, direccion, telefono, logo_url')
      .maybeSingle(),
  ])

  if (!orden) notFound()

  // Fallback si columnas nuevas no existen aún
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let items: any[] | null = itemsResult.data
  if (!items && itemsResult.error) {
    const { data: itemsFallback } = await supabase
      .from('purchase_order_items')
      .select('id, nombre, cantidad_solicitada, precio_unitario, disponible_proveedor')
      .eq('purchase_order_id', id)
      .order('nombre')
    items = itemsFallback
  }

  // Historial completo del proveedor (todas las OCs con este supplier)
  const supplierId = (orden as Record<string, unknown>).supplier_id as string | null
  let historial: HistorialOC[] = []

  if (supplierId) {
    const { data: hData } = await supabase
      .from('purchase_orders')
      .select(`
        id, numero_oc, estado, total, created_at, fecha_recepcion, costo_envio_total, comprobante_pago_urls,
        purchase_order_items(
          id, nombre, cantidad_solicitada, cantidad_recibida,
          precio_unitario, precio_aceptado, precio_cotizado, disponible_proveedor
        )
      `)
      .eq('supplier_id', supplierId)
      .neq('estado', 'cancelada')
      .order('created_at', { ascending: false })
      .limit(50)

    historial = (hData ?? []) as HistorialOC[]
  }

  const local = cfg as { nombre_local?: string; rut_local?: string | null; direccion?: string | null; telefono?: string | null; logo_url?: string | null } | null
  const ya_confirmado = !!(orden as Record<string, unknown>).confirmado_proveedor_at
  const supplierNombre = Array.isArray((orden as Record<string, unknown>).suppliers)
    ? ((orden as Record<string, unknown>).suppliers as { nombre: string }[])[0]?.nombre
    : ((orden as Record<string, unknown>).suppliers as { nombre: string } | null)?.nombre ?? 'Proveedor'

  type Item = { id: string; nombre: string; cantidad_solicitada: number; cantidad_recibida?: number; precio_unitario: number; disponible_proveedor: boolean | null; cantidad_disponible_proveedor?: number | null; precio_cotizado?: number | null; precio_aceptado?: number | null; nota_proveedor?: string | null; alternativa?: string | null; descuento_tipo?: string | null; descuento_valor?: number | null; descuento_desde_cantidad?: number | null }

  // Estadísticas del historial
  const totalEnviados  = historial.filter(o => ['en_transito','recibida_parcial','recibida_completa'].includes(o.estado)).length
  const totalCompletos = historial.filter(o => o.estado === 'recibida_completa').length
  const totalMonto     = historial
    .filter(o => ['en_transito','recibida_parcial','recibida_completa'].includes(o.estado))
    .reduce((s, o) => s + (o.total ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          {local?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={local.logo_url} alt="Logo" className="h-10 max-w-24 object-contain" />
          )}
          <div>
            <p className="font-bold text-gray-900">{local?.nombre_local ?? 'TechRepair'}</p>
            {local?.telefono && <p className="text-xs text-gray-500">Tel: {local.telefono}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Encabezado pedido actual */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Solicitud de pedido</p>
              <p className="text-2xl font-bold font-mono text-blue-700">{(orden as Record<string, unknown>).numero_oc as string}</p>
              <p className="text-sm text-gray-600 mt-0.5">
                {new Date((orden as Record<string, unknown>).created_at as string)
                  .toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {ya_confirmado && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                ✓ Confirmado
              </span>
            )}
          </div>
          {typeof (orden as Record<string, unknown>).notas === 'string' && (
            <p className="text-xs text-gray-400 mt-2 italic">
              {((orden as Record<string, unknown>).notas as string).replace('[SOLICITUD] ', '')}
            </p>
          )}
        </div>

        {/* Formulario de confirmación / estado */}
        <ConfirmarPedidoForm
          ordenId={id}
          items={(items ?? []) as Item[]}
          yaConfirmado={ya_confirmado}
          comprobanteUrl={(orden as Record<string, unknown>).comprobante_envio_url as string | null}
          estado={(orden as Record<string, unknown>).estado as string}
        />

        {/* ── Historial completo del proveedor ── */}
        {historial.length > 0 && (
          <div className="space-y-3 pt-2">
            {/* Título + stats */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <p className="font-bold text-gray-800 text-base">📋 Tu historial con {local?.nombre_local ?? 'nosotros'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Hola <strong>{supplierNombre}</strong>, aquí tienes todas tus órdenes desde la primera hasta la más reciente.</p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-700">{historial.length}</p>
                  <p className="text-[10px] text-blue-600">Total pedidos</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-700">{totalCompletos}</p>
                  <p className="text-[10px] text-green-600">Completados</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-gray-700">{formatCLP(totalMonto)}</p>
                  <p className="text-[10px] text-gray-500">Monto total</p>
                </div>
              </div>
            </div>

            {/* Lista de OCs */}
            <div className="space-y-2">
              {historial.map(oc => {
                const esActual   = oc.id === id
                const estadoInfo = ESTADO_INFO[oc.estado] ?? { label: oc.estado, color: 'bg-gray-100 text-gray-700', icon: '•' }
                const confirmado  = ['confirmada','preparando','en_transito','recibida_parcial','recibida_completa'].includes(oc.estado)
                const itemsVisibles = (oc.purchase_order_items ?? []).filter((i: HistorialItem) =>
                  i.cantidad_solicitada > 0 && !(confirmado && i.disponible_proveedor === false)
                )
                const totalItems = itemsVisibles.length
                const recibidos  = itemsVisibles.filter((i: HistorialItem) => (i.cantidad_recibida ?? 0) > 0).length
                // El total guardado en la OC puede quedar desactualizado si se agregan
                // o editan ítems después; se recalcula en vivo a partir de los ítems visibles.
                const totalCalculado = itemsVisibles.reduce((s: number, i: HistorialItem) =>
                  s + i.cantidad_solicitada * (i.precio_aceptado ?? i.precio_cotizado ?? i.precio_unitario), 0)
                const fechaStr   = new Intl.DateTimeFormat('es-CL', {
                  timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
                }).format(new Date(oc.created_at))

                return (
                  <div key={oc.id}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden ${esActual ? 'border-blue-400 ring-2 ring-blue-200' : ''}`}>
                    {/* Header */}
                    <div className={`px-4 py-3 flex items-center justify-between gap-2 border-b ${esActual ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-blue-700 text-sm shrink-0">{oc.numero_oc}</span>
                        {esActual && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold shrink-0">ACTUAL</span>}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${estadoInfo.color}`}>
                          {estadoInfo.icon} {estadoInfo.label}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatCLP(totalCalculado || (oc.total ?? 0))}</p>
                        <p className="text-[10px] text-gray-400">{fechaStr}</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="px-4 py-2 space-y-1">
                      {(oc.purchase_order_items ?? []).filter((item: HistorialItem) => {
                        if (item.cantidad_solicitada <= 0) return false
                        // En órdenes confirmadas o más avanzadas, ocultar ítems rechazados
                        const confirmado = ['confirmada','preparando','en_transito','recibida_parcial','recibida_completa'].includes(oc.estado)
                        if (confirmado && item.disponible_proveedor === false) return false
                        return true
                      }).map((item: HistorialItem) => {
                        const precioFinal = item.precio_aceptado ?? item.precio_cotizado ?? item.precio_unitario
                        const recibida = item.cantidad_recibida ?? 0
                        const completo = recibida >= item.cantidad_solicitada
                        return (
                          <div key={item.id} className="flex items-center gap-2 py-0.5">
                            <span className={`text-xs w-4 shrink-0 ${completo ? 'text-green-500' : recibida > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                              {completo ? '✓' : recibida > 0 ? '◑' : '○'}
                            </span>
                            <p className="text-xs text-gray-700 flex-1 truncate">{item.nombre}</p>
                            <div className="text-right shrink-0">
                              <span className="text-xs text-gray-500">
                                {recibida > 0
                                  ? `${recibida}/${item.cantidad_solicitada}`
                                  : `×${item.cantidad_solicitada}`
                                }
                              </span>
                              {precioFinal > 0 && (
                                <span className="text-[10px] text-gray-400 ml-1.5">{formatCLP(precioFinal)}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between text-[10px] text-gray-400">
                      <span>{recibidos}/{totalItems} ítems recibidos</span>
                      {oc.costo_envio_total > 0 && <span>Envío: {formatCLP(oc.costo_envio_total)}</span>}
                      {oc.fecha_recepcion && (
                        <span>Recibido: {new Date(oc.fecha_recepcion).toLocaleDateString('es-CL', { timeZone: TZ, day: '2-digit', month: 'short' })}</span>
                      )}
                    </div>

                    {/* Comprobantes de pago */}
                    {(oc.comprobante_pago_urls ?? []).filter(Boolean).length > 0 && (
                      <div className="px-4 py-3 border-t">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">🧾 Comprobantes de pago</p>
                        <div className="flex flex-wrap gap-2">
                          {(oc.comprobante_pago_urls ?? []).filter(Boolean).map((url, idx) => {
                            const esPdf = url.toLowerCase().includes('.pdf')
                            return esPdf ? (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] border border-red-200 bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                📄 PDF {idx + 1}
                              </a>
                            ) : (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Comprobante ${idx + 1}`}
                                  className="w-14 h-14 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                                />
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type HistorialItem = {
  id: string; nombre: string; cantidad_solicitada: number; cantidad_recibida?: number
  precio_unitario: number; precio_aceptado?: number | null; precio_cotizado?: number | null
  disponible_proveedor?: boolean | null
}

type HistorialOC = {
  id: string; numero_oc: string; estado: string; total: number; created_at: string
  fecha_recepcion: string | null; costo_envio_total: number
  comprobante_pago_urls?: string[] | null
  purchase_order_items?: HistorialItem[]
}
