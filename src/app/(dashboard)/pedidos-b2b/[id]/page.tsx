import { createClient } from '@/lib/supabase/server'
import { tieneAccesoModulo, tieneSubPermiso } from '@/lib/modulos'
import Link from 'next/link'
import BotonVolver from '@/components/shared/BotonVolver'
import ConfirmarPedidoB2BForm from '@/components/pedidos-b2b/ConfirmarPedidoB2BForm'
import AccionesPedidoB2B from '@/components/pedidos-b2b/AccionesPedidoB2B'
import DespacharPedidoB2BForm from '@/components/pedidos-b2b/DespacharPedidoB2BForm'
import CancelarPedidoB2BBtn from '@/components/pedidos-b2b/CancelarPedidoB2BBtn'
import PagarPedidoB2BBtn from '@/components/pedidos-b2b/PagarPedidoB2BBtn'
import AgregarComprobanteB2BBtn from '@/components/pedidos-b2b/AgregarComprobanteB2BBtn'
import RecordatorioPagoB2BBtn from '@/components/pedidos-b2b/RecordatorioPagoB2BBtn'
import ReportarPagoB2BForm from '@/components/pedidos-b2b/ReportarPagoB2BForm'
import RevisarPagoB2BBtn from '@/components/pedidos-b2b/RevisarPagoB2BBtn'

type RolesRel = { nombre?: string } | { nombre?: string }[] | null | undefined

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', preparando: 'Preparando',
  en_camino: 'En camino', entregado: 'Entregado', rechazado: 'Rechazado', cancelado: 'Cancelado',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-green-100 text-green-700',
  preparando: 'bg-blue-100 text-blue-700',
  en_camino: 'bg-indigo-100 text-indigo-700',
  entregado: 'bg-emerald-100 text-emerald-700',
  rechazado: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
}
const METODO_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito',
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

const PASOS_SEGUIMIENTO = [
  { id: 'pendiente', label: 'Pedido enviado', icon: '📤' },
  { id: 'confirmado', label: 'Confirmado', icon: '✅' },
  { id: 'preparando', label: 'Preparando', icon: '📦' },
  { id: 'en_camino', label: 'En camino', icon: '🚚' },
  { id: 'entregado', label: 'Entregado', icon: '📥' },
] as const

const MENSAJE_SEGUIMIENTO: Record<string, string> = {
  pendiente: 'Esperando confirmación del vendedor',
  confirmado: 'El vendedor confirmó tu pedido',
  preparando: 'Estamos preparando tu pedido',
  en_camino: 'Tu pedido está en camino',
  entregado: '¡Pedido entregado!',
}

// Barra de seguimiento horizontal con los pasos del pedido (mismo estilo que el seguimiento de compras)
function BarraSeguimientoB2B({ estado }: { estado: string }) {
  const orden = PASOS_SEGUIMIENTO.map(p => p.id)
  const detenido = estado === 'rechazado' || estado === 'cancelado'
  const idxActual = orden.indexOf(estado as typeof orden[number])
  const completados = new Set(detenido ? orden.slice(0, 1) : orden.slice(0, Math.max(idxActual, 0)))
  const activoId = detenido ? '' : orden[idxActual]

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seguimiento del pedido</p>

      <div className="flex items-center gap-0">
        {PASOS_SEGUIMIENTO.map((paso, idx) => {
          const done = completados.has(paso.id)
          const current = !detenido && activoId === paso.id
          const fallido = detenido && idx === 1
          const isLast = idx === PASOS_SEGUIMIENTO.length - 1
          return (
            <div key={paso.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all
                  ${fallido ? 'bg-red-500 border-red-500 text-white' :
                    done ? 'bg-green-500 border-green-500 text-white' :
                    current ? 'bg-blue-500 border-blue-500 text-white animate-pulse' :
                    'bg-gray-100 border-gray-200 text-gray-400'}`}>
                  {fallido ? '✕' : done ? '✓' : paso.icon}
                </div>
                <p className={`text-[10px] text-center mt-1 leading-tight max-w-[64px]
                  ${fallido ? 'text-red-700 font-medium' : done ? 'text-green-700 font-medium' : current ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
                  {paso.label}
                </p>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 rounded ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className={`text-center text-sm font-medium py-1.5 rounded-lg
        ${estado === 'entregado' ? 'text-green-700 bg-green-50' :
          estado === 'rechazado' ? 'text-red-700 bg-red-50' :
          estado === 'cancelado' ? 'text-gray-600 bg-gray-100' :
          'text-blue-700 bg-blue-50'}`}>
        {estado === 'rechazado' ? 'El vendedor rechazó este pedido' :
         estado === 'cancelado' ? 'Este pedido fue cancelado' :
         MENSAJE_SEGUIMIENTO[estado] ?? ''}
      </div>
    </div>
  )
}

export default async function PedidoB2BDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()

  const rolesRel = profile?.roles as RolesRel
  const rol = (Array.isArray(rolesRel) ? rolesRel[0]?.nombre : rolesRel?.nombre) ?? ''
  const permisos = profile?.permisos_modulos as Record<string, boolean> | null

  if (!tieneAccesoModulo('pedidos_b2b', rol, permisos)) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">
          No tienes acceso a Pedidos B2B.
        </div>
      </div>
    )
  }

  const esComprador = rol === 'comprador_externo'
  const esStaff = ['administrador', 'vendedor', 'supervisor_ventas'].includes(rol)
  const puedeCancelar = tieneSubPermiso('caja.anular', rol, permisos)

  const { data: pedido } = await supabase.from('sales_orders').select('*').eq('id', id).single()
  if (!pedido || (esComprador && pedido.comprador_id !== user!.id)) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">
          Pedido no encontrado.
        </div>
      </div>
    )
  }

  const [{ data: items }, { data: comprador }, { data: pagos }, { data: productosActivos }] = await Promise.all([
    supabase.from('sales_order_items').select('*, products(stock_actual)').eq('sales_order_id', id),
    supabase.from('user_profiles').select('nombre_completo, email, telefono').eq('id', pedido.comprador_id).single(),
    supabase.from('sales_order_payments').select('*').eq('sales_order_id', id).order('created_at', { ascending: false }),
    (pedido.estado === 'pendiente' && esStaff)
      ? supabase.from('products').select('id, nombre, precio_venta, precio_mayorista, stock_actual').eq('activo', true).order('nombre')
      : Promise.resolve({ data: null }),
  ])

  // Lookup de quién confirmó/rechazó/canceló (evita ambigüedad de FK con comprador_id)
  const actorIds = [...new Set([pedido.confirmado_por, pedido.rechazado_por, pedido.cancelado_por].filter(Boolean))]
  let nombresActores: Record<string, string> = {}
  if (actorIds.length > 0) {
    const { data: actores } = await supabase.from('user_profiles').select('id, nombre_completo').in('id', actorIds)
    nombresActores = Object.fromEntries((actores ?? []).map(a => [a.id, a.nombre_completo as string]))
  }

  type ItemRow = {
    id: string; product_id: string; nombre: string; cantidad_solicitada: number
    cantidad_confirmada: number | null; precio_unitario: number; subtotal: number
    agregado_por_staff: boolean | null
    products: { stock_actual: number } | { stock_actual: number }[] | null
  }
  const itemsList = (items ?? []) as ItemRow[]
  const stockDe = (it: ItemRow) => Array.isArray(it.products) ? it.products[0]?.stock_actual ?? 0 : it.products?.stock_actual ?? 0

  const itemsDespacho = itemsList
    .filter(it => (it.cantidad_confirmada ?? 0) > 0)
    .map(it => ({ id: it.id, nombre: it.nombre, cantidadConfirmada: it.cantidad_confirmada ?? 0, precioUnitario: it.precio_unitario }))

  const ESTADOS_PAGABLES = ['confirmado', 'preparando', 'en_camino', 'entregado']
  const mostrarPagosYCancelar = esStaff && ESTADOS_PAGABLES.includes(pedido.estado)
  const saldoPendiente = (pedido.total_estimado ?? 0) - (pedido.monto_pagado ?? 0)
  const mostrarPagoComprador = esComprador && ESTADOS_PAGABLES.includes(pedido.estado) && !pedido.pagado

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{pedido.numero_pedido}</h1>
          <p className="text-sm text-gray-500">{comprador?.nombre_completo ?? 'Comprador'} · {pedido.created_at.split('T')[0]}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${ESTADO_COLOR[pedido.estado] ?? 'bg-gray-100 text-gray-600'}`}>
          {ESTADO_LABEL[pedido.estado] ?? pedido.estado}
        </span>
      </div>

      <BarraSeguimientoB2B estado={pedido.estado} />

      {esStaff && (
        <div className="bg-white rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div><p className="text-gray-400 text-xs">Comprador</p><p className="font-medium">{comprador?.nombre_completo ?? '—'}</p></div>
          <div><p className="text-gray-400 text-xs">Email</p><p className="font-medium">{comprador?.email ?? '—'}</p></div>
          <div><p className="text-gray-400 text-xs">Teléfono</p><p className="font-medium">{comprador?.telefono ?? '—'}</p></div>
        </div>
      )}

      {pedido.estado === 'pendiente' && esStaff ? (
        <ConfirmarPedidoB2BForm
          pedidoId={pedido.id}
          items={itemsList.map(it => ({
            id: it.id,
            nombre: it.nombre,
            cantidadSolicitada: it.cantidad_solicitada,
            precioSugerido: it.precio_unitario,
            stockActual: stockDe(it),
          }))}
          productosDisponibles={(productosActivos ?? []).map(p => ({
            id: p.id, nombre: p.nombre, precioVenta: p.precio_venta, precioMayorista: p.precio_mayorista, stockActual: p.stock_actual,
          }))}
          solicitudComprador={{
            tipoDocumento: pedido.tipo_documento_solicitado ?? null,
            rutFacturacion: pedido.rut_facturacion ?? null,
            razonSocialFacturacion: pedido.razon_social_facturacion ?? null,
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-2.5">
            <h2 className="font-semibold text-gray-800 text-sm">Productos del pedido</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Producto</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Solicitado</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Confirmado</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Precio</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {itemsList.map(it => (
                  <tr key={it.id}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {it.nombre}
                      {it.agregado_por_staff && <span className="ml-1.5 text-[10px] text-blue-600 font-normal">añadido</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">{it.cantidad_solicitada}</td>
                    <td className="px-4 py-2.5 text-right">{it.cantidad_confirmada ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right">{formatCLP(it.precio_unitario)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatCLP(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold border-t-2">
                  <td className="px-4 py-2.5" colSpan={4}>Total estimado</td>
                  <td className="px-4 py-2.5 text-right">{formatCLP(pedido.total_estimado)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {pedido.estado === 'rechazado' && (
            <div className="px-4 py-3 bg-red-50 border-t text-sm text-red-700 space-y-0.5">
              <p><strong>Rechazado por:</strong> {nombresActores[pedido.rechazado_por] ?? 'Vendedor'} (TechRepair Pro)</p>
              {pedido.motivo_rechazo && <p><strong>Motivo:</strong> {pedido.motivo_rechazo}</p>}
            </div>
          )}
          {pedido.estado === 'cancelado' && (
            <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600 space-y-0.5">
              <p><strong>Cancelado por:</strong> {nombresActores[pedido.cancelado_por] ?? 'Vendedor'} (TechRepair Pro)</p>
              {pedido.motivo_cancelacion && <p><strong>Motivo:</strong> {pedido.motivo_cancelacion}</p>}
            </div>
          )}
          {['confirmado', 'preparando', 'en_camino', 'entregado'].includes(pedido.estado) && (
            <div className="px-4 py-3 border-t space-y-3">
              {(() => {
                const hoy = new Date().toISOString().split('T')[0]
                const vencido = !pedido.pagado && pedido.fecha_vencimiento_pago && pedido.fecha_vencimiento_pago < hoy
                return (
                  <div className="space-y-3">
                    {vencido && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 font-medium flex items-center gap-2">
                        🚨 Pago vencido desde el {pedido.fecha_vencimiento_pago}
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">Confirmado por</p>
                        <p className="font-medium">{pedido.confirmado_por ? `${nombresActores[pedido.confirmado_por] ?? 'Vendedor'} (TechRepair Pro)` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Medio de pago</p>
                        <p className="font-medium">{METODO_PAGO_LABEL[pedido.metodo_pago] ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Pagado</p>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${pedido.pagado ? 'bg-green-100 text-green-700' : vencido ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {pedido.pagado ? '✓ Pagado' : vencido ? '⚠ Vencido' : 'Pendiente'}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Vencimiento pago</p>
                        <p className="font-medium">{pedido.fecha_vencimiento_pago ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Fecha entregado</p>
                        <p className="font-medium">{pedido.fecha_entregado ? pedido.fecha_entregado.split('T')[0] : '—'}</p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {pedido.comprobante_envio_url && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">Comprobante de despacho</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pedido.comprobante_envio_url} alt="Comprobante de despacho" className="h-32 rounded-lg border" />
                </div>
              )}

              {esStaff && pedido.estado === 'preparando' && (
                <DespacharPedidoB2BForm pedidoId={pedido.id} items={itemsDespacho} />
              )}

              {esStaff && (
                <div className="flex flex-wrap gap-2">
                  <AccionesPedidoB2B pedidoId={pedido.id} estado={pedido.estado} />
                  <CancelarPedidoB2BBtn pedidoId={pedido.id} numero={pedido.numero_pedido} estado={pedido.estado} puedeCancelar={puedeCancelar} />
                </div>
              )}

              {esComprador && pedido.estado === 'en_camino' && (
                <div className="flex flex-wrap gap-2">
                  <AccionesPedidoB2B pedidoId={pedido.id} estado={pedido.estado} />
                </div>
              )}

              {esStaff && pedido.sale_id && (
                <Link href="/caja" className="text-green-700 hover:underline font-medium text-sm inline-block">Ver en Caja / Ventas →</Link>
              )}
            </div>
          )}
        </div>
      )}

      {mostrarPagosYCancelar && pedido.pago_en_revision && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-amber-800 text-sm">⏳ Pago en revisión</p>
          <p className="text-xs text-amber-700">
            El comprador reportó un pago de {formatCLP(saldoPendiente)} vía {METODO_PAGO_LABEL[pedido.metodo_pago_reportado] ?? pedido.metodo_pago_reportado}.
            {pedido.nota_pago_comprador && <> Nota: {pedido.nota_pago_comprador}</>}
          </p>
          <RevisarPagoB2BBtn pedidoId={pedido.id} />
        </div>
      )}

      {mostrarPagosYCancelar && (
        <PagarPedidoB2BBtn
          pedidoId={pedido.id}
          total={pedido.total_estimado}
          montoPagado={pedido.monto_pagado ?? 0}
          pagos={pagos ?? []}
        />
      )}

      {mostrarPagoComprador && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div>
            <p className="font-semibold text-gray-800 text-sm">Pago de este pedido</p>
            <p className="text-xs text-gray-500 mt-0.5">Saldo pendiente: <strong>{formatCLP(saldoPendiente)}</strong></p>
          </div>
          {pedido.pago_en_revision ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
              ⏳ Tu pago está en revisión. Te avisaremos por WhatsApp cuando se confirme.
            </div>
          ) : (
            <ReportarPagoB2BForm pedidoIds={[pedido.id]} totalAPagar={saldoPendiente} etiqueta="Pagar este pedido" />
          )}
        </div>
      )}

      {mostrarPagosYCancelar && !pedido.pagado && (
        <div className="bg-white rounded-xl border p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-800">Recordatorio de pago</p>
            <p className="text-xs text-gray-400 mt-0.5">Envía un aviso por WhatsApp al comprador sobre su saldo pendiente.</p>
          </div>
          <RecordatorioPagoB2BBtn
            pedidoId={pedido.id}
            saldoPendiente={(pedido.total_estimado ?? 0) - (pedido.monto_pagado ?? 0)}
            telefono={comprador?.telefono}
            recordatorioEnviadoAt={pedido.recordatorio_enviado_at ?? null}
          />
        </div>
      )}

      {mostrarPagosYCancelar && (
        <div className="bg-white rounded-xl border p-4 space-y-2">
          <p className="font-semibold text-gray-800 text-sm">Comprobantes de pago</p>
          {pedido.comprobante_pago_urls?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(pedido.comprobante_pago_urls as string[]).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Comprobante ${i + 1}`} className="h-20 w-20 object-cover rounded-lg border" />
                </a>
              ))}
            </div>
          )}
          <AgregarComprobanteB2BBtn pedidoId={pedido.id} />
        </div>
      )}
    </div>
  )
}
