import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BotonVolver from '@/components/shared/BotonVolver'
import { formatCLP } from '@/lib/calculations'
import RecibirMercanciaForm from '@/components/compras/RecibirMercanciaForm'
import CerrarCompraForm from '@/components/compras/CerrarCompraForm'
import EnviarPedidoWhatsAppBtn from '@/components/compras/EnviarPedidoWhatsAppBtn'
import AlertaOCDetalle from '@/components/compras/AlertaOCDetalle'
import CancelarEliminarOCBtn from '@/components/compras/CancelarEliminarOCBtn'
import RevisionRespuestaProveedor from '@/components/compras/RevisionRespuestaProveedor'
import PagarOCBtn from '@/components/compras/PagarOCBtn'
import EliminarAbonoBtn from '@/components/compras/EliminarAbonoBtn'
import AgregarComprobanteBtn from '@/components/compras/AgregarComprobanteBtn'
import ComprobanteGallery from '@/components/compras/ComprobanteGallery'
import ProductosSugeridosProveedor from '@/components/compras/ProductosSugeridosProveedor'
import { Button } from '@/components/ui/button'
import { PurchaseOrder, PurchaseOrderItem, Supplier } from '@/types'
import { tieneSubPermiso } from '@/lib/modulos'

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  pendiente:           { label: 'Pendiente',              color: 'bg-gray-100 text-gray-700' },
  enviada:             { label: 'Enviada al proveedor',   color: 'bg-purple-100 text-purple-700' },
  proveedor_respondio: { label: '⚡ Proveedor respondió', color: 'bg-teal-100 text-teal-700' },
  confirmada:          { label: 'Confirmada',             color: 'bg-indigo-100 text-indigo-700' },
  preparando:          { label: 'Preparando pedido',     color: 'bg-violet-100 text-violet-700' },
  en_transito:         { label: 'En tránsito',            color: 'bg-blue-100 text-blue-700' },
  recibida_parcial:    { label: 'Recibida parcial',       color: 'bg-amber-100 text-amber-700' },
  recibida_completa:   { label: 'Recibida',               color: 'bg-green-100 text-green-700' },
  cancelada:           { label: 'Cancelada',              color: 'bg-red-100 text-red-700' },
}

// El pago solo tiene sentido una vez que el proveedor marcó el envío
const ESTADOS_ENVIADO = ['en_transito', 'recibida_parcial', 'recibida_completa']

type OrdenDetalle = PurchaseOrder & {
  suppliers: Supplier | null
  purchase_order_items: PurchaseOrderItem[]
}

export default async function DetalleOrdenCompraPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ revisar?: string }> }) {
  const { id } = await params
  const { revisar } = await searchParams
  const forzarRevision = revisar === '1'
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesData = perfil?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = perfil?.permisos_modulos as Record<string, boolean> | null
  const puedeEditar = tieneSubPermiso('compras.editar', rolNombre, permisos)
  const puedeEditarRecibidas = tieneSubPermiso('compras.editar_recibidas', rolNombre, permisos)
  const puedeCancelar = tieneSubPermiso('compras.cancelar', rolNombre, permisos)
  const puedeRecibir = tieneSubPermiso('compras.recibir', rolNombre, permisos)
  const puedePagar = tieneSubPermiso('compras.pagar', rolNombre, permisos)

  const [{ data: oc }, { data: pagos }] = await Promise.all([
    supabase
      .from('purchase_orders')
      .select('*, suppliers(*), purchase_order_items(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('purchase_order_payments')
      .select('id, monto, metodo_pago, fecha, nota, created_at')
      .eq('purchase_order_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!oc) notFound()

  const orden = oc as OrdenDetalle

  // Una vez que el proveedor registró el envío, ya no se puede corregir la OC.
  // Excepción: si ya fue recibida (parcial o completa), el admin -o quien tenga
  // el permiso compras.editar_recibidas- puede seguir editándola.
  const yaRecibida = ['recibida_parcial', 'recibida_completa'].includes(orden.estado)
  const puedeEditarAhora = puedeEditar && orden.estado !== 'cancelada' && (yaRecibida ? puedeEditarRecibidas : orden.estado !== 'en_transito')

  const estado = ESTADO_LABELS[orden.estado] ?? { label: orden.estado, color: 'bg-gray-100 text-gray-700' }
  const itemsRegulares = (orden.purchase_order_items ?? []).filter(i => {
    if (i.cantidad_solicitada <= 0) return false
    if (!['pendiente','enviada'].includes(orden.estado)) {
      const extra = i as unknown as Record<string, unknown>
      if (extra.disponible_proveedor === false) return false
    }
    return true
  })
  const totalRecibido = itemsRegulares.reduce((s, i) => s + i.cantidad_recibida, 0)
  const totalSolicitado = itemsRegulares.reduce((s, i) => s + i.cantidad_solicitada, 0)
  const subtotalProductos = itemsRegulares.reduce((s, i) => s + (i.subtotal ?? 0), 0)
  const montoPagado = (orden as unknown as Record<string, unknown>).monto_pagado as number ?? 0
  const plazoPagoDias = (orden as unknown as Record<string, unknown>).plazo_pago_dias as number ?? 30
  const fechaVencPago = (orden as unknown as Record<string, unknown>).fecha_vencimiento_pago as string | null
  const historialPagos = (pagos ?? []) as { id: string; monto: number; metodo_pago: string; fecha: string; nota: string | null; created_at: string }[]
  const totalAbonado = historialPagos.reduce((s, p) => s + p.monto, 0)

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <BotonVolver label="← Volver a Compras" />
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{orden.numero_oc}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estado.color}`}>{estado.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <EnviarPedidoWhatsAppBtn
            ordenId={id}
            numero={orden.numero_oc}
            supplierPhone={(orden.suppliers as Supplier & { whatsapp?: string | null } | null)?.whatsapp ?? orden.suppliers?.telefono ?? null}
            estado={orden.estado}
          />
          {puedeCancelar && <CancelarEliminarOCBtn ordenId={id} numero={orden.numero_oc} estado={orden.estado} />}
          {puedeEditarAhora && (
            <Link href={`/compras/orden/${id}/editar`}>
              <Button variant="outline" className="gap-1.5">✏️ Editar / Corregir</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Alertas en tiempo real para esta OC */}
      <AlertaOCDetalle ordenId={id} />

      {/* Info general */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Información general</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Proveedor</p>
            <p className="font-medium text-gray-800">{orden.suppliers?.nombre}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Método de pago</p>
            <p className="font-medium text-gray-800 capitalize">
              {orden.metodo_pago === 'credito'
                ? `💳 Crédito ${plazoPagoDias}d`
                : orden.metodo_pago ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Costo envío</p>
            <p className="font-medium text-gray-800">{formatCLP(orden.costo_envio_total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total OC</p>
            <p className="font-bold text-gray-900">{formatCLP(orden.total)}</p>
          </div>
          {ESTADOS_ENVIADO.includes(orden.estado) && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Pagado / Pendiente</p>
              <p className="font-medium">
                <span className="text-green-700">{formatCLP(montoPagado)}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-red-600 font-bold">{formatCLP(Math.max(0, orden.total - montoPagado))}</span>
              </p>
            </div>
          )}
          {fechaVencPago && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Vence pago</p>
              <p className="font-medium text-gray-800">{new Date(fechaVencPago).toLocaleDateString('es-CL')}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Llegada estimada</p>
            <p className="font-medium text-gray-800">
              {orden.fecha_estimada_llegada
                ? new Date(orden.fecha_estimada_llegada + 'T12:00:00').toLocaleDateString('es-CL')
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Creada</p>
            <p className="font-medium text-gray-800">
              {new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(orden.created_at))}
            </p>
          </div>
          {orden.notas && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Notas</p>
              <p className="text-gray-700">{orden.notas}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <p className="font-semibold text-gray-800">Productos ordenados</p>
          <p className="text-sm text-gray-500">{totalRecibido}/{totalSolicitado} recibidos</p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-gray-500 font-medium">Producto</th>
              <th className="text-center px-4 py-2 text-gray-500 font-medium">Solicitado</th>
              <th className="text-center px-4 py-2 text-gray-500 font-medium">Recibido</th>
              <th className="text-right px-4 py-2 text-gray-500 font-medium">P. unitario</th>
              <th className="text-right px-4 py-2 text-gray-500 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(orden.purchase_order_items ?? []).filter(i => {
              if (i.cantidad_solicitada <= 0) return false
              if (!['pendiente','enviada'].includes(orden.estado)) {
                const extra = i as unknown as Record<string, unknown>
                if (extra.disponible_proveedor === false) return false
              }
              return true
            }).map((item) => {
              const extra = item as unknown as Record<string, unknown>
              const precioCotizado = extra.precio_cotizado as number | null
              const notaProv = extra.nota_proveedor as string | null
              const alternativa = extra.alternativa as string | null
              const disponible = extra.disponible_proveedor as boolean | null
              return (
                <>
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {item.nombre}
                      {disponible === false && (
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Sin stock</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{item.cantidad_solicitada}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${item.cantidad_recibida >= item.cantidad_solicitada
                        ? 'text-green-600'
                        : item.cantidad_recibida > 0
                          ? 'text-amber-600'
                          : 'text-gray-400'}`}>
                        {item.cantidad_recibida}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {precioCotizado ? (
                        <span className="text-blue-700 font-semibold">{formatCLP(precioCotizado)}</span>
                      ) : formatCLP(item.precio_unitario)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCLP(item.subtotal)}</td>
                  </tr>
                  {(notaProv || alternativa) && (
                    <tr key={`${item.id}-extra`} className="bg-blue-50">
                      <td colSpan={5} className="px-4 py-1.5 text-xs text-blue-700">
                        {notaProv && <span>📝 {notaProv}</span>}
                        {alternativa && <span className="ml-3">💡 Alternativa: {alternativa}</span>}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
          <tfoot className="border-t bg-gray-50">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-gray-600">
                Subtotal productos
              </td>
              <td className="px-4 py-2 text-right font-medium">{formatCLP(subtotalProductos)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right font-semibold text-gray-700">
                Costo de envío
              </td>
              <td className="px-4 py-2 text-right font-medium">{formatCLP(orden.costo_envio_total)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right font-bold text-gray-900">
                Total
              </td>
              <td className="px-4 py-2 text-right font-bold text-gray-900">{formatCLP(orden.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Revisión de respuesta del proveedor */}
      {(() => {
        const confirmadoAt = (orden as unknown as Record<string, unknown>).confirmado_proveedor_at
        const estadosYaConfirmados = ['confirmada', 'preparando', 'en_transito', 'recibida_parcial', 'recibida_completa', 'cancelada']
        const proveedorRespondioItems = (orden.purchase_order_items ?? []).some(
          i => (i as unknown as Record<string, unknown>).disponible_proveedor !== null
        )
        const mostrar = !estadosYaConfirmados.includes(orden.estado) && (
          orden.estado === 'proveedor_respondio' ||
          !!confirmadoAt ||
          proveedorRespondioItems ||
          forzarRevision
        )
        if (mostrar) {
          return (
            <RevisionRespuestaProveedor
              ordenId={id}
              numero={orden.numero_oc}
              items={(orden.purchase_order_items ?? []).filter(i => i.cantidad_solicitada > 0) as Parameters<typeof RevisionRespuestaProveedor>[0]['items']}
              supplierPhone={(orden.suppliers as Supplier & { whatsapp?: string | null } | null)?.whatsapp ?? orden.suppliers?.telefono ?? null}
              supplierNombre={orden.suppliers?.nombre}
              modoManual={forzarRevision || (!proveedorRespondioItems && !confirmadoAt)}
            />
          )
        }
        // Botón de escape para cuando el proveedor respondió pero DB no se actualizó
        if (['pendiente', 'enviada'].includes(orden.estado)) {
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">¿El proveedor ya respondió la cotización?</p>
                <p className="text-xs text-amber-600 mt-0.5">Ingresa manualmente los precios y disponibilidad para confirmar el pedido.</p>
              </div>
              <Link href={`/compras/orden/${id}?revisar=1`}>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white text-sm">Ingresar respuesta del proveedor</Button>
              </Link>
            </div>
          )
        }
        return null
      })()}

      {/* Productos sugeridos por el proveedor (cantidad_solicitada=0 ó sugerido_proveedor=true) */}
      {(() => {
        const sugeridos = (orden.purchase_order_items ?? []).filter(i => {
          const extra = i as unknown as Record<string, unknown>
          return extra.sugerido_proveedor === true || i.cantidad_solicitada === 0
        })
        if (sugeridos.length === 0) return null
        type SugItem = { id: string; nombre: string; precio_cotizado: number | null; precio_unitario: number; nota_proveedor: string | null; product_id: string | null }
        return (
          <ProductosSugeridosProveedor
            ordenId={id}
            items={sugeridos as unknown as SugItem[]}
            supplierId={orden.supplier_id}
          />
        )
      })()}

      {/* Enlace al proveedor cuando está en estado 'enviada', 'confirmada' o 'preparando' */}
      {['enviada', 'confirmada', 'preparando'].includes(orden.estado) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">
              {orden.estado === 'enviada' ? '⏳ Esperando respuesta del proveedor'
                : orden.estado === 'preparando' ? '📦 El proveedor está preparando el pedido'
                : '✅ Confirmada — esperando envío del proveedor'}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Link del proveedor: <span className="font-mono">/pedido/{id}</span>
            </p>
          </div>
          <EnviarPedidoWhatsAppBtn
            ordenId={id}
            numero={orden.numero_oc}
            supplierPhone={(orden.suppliers as Supplier & { whatsapp?: string | null } | null)?.whatsapp ?? orden.suppliers?.telefono ?? null}
            estado={orden.estado}
          />
        </div>
      )}

      {/* Recepción de mercancía */}
      {puedeRecibir && <RecibirMercanciaForm oc={orden} />}

      {/* Cerrar compra / registrar pago */}
      {puedePagar && <CerrarCompraForm oc={orden} />}

      {/* El pago solo aplica una vez que el proveedor marcó el envío (productos en camino o ya recibidos) */}
      {puedePagar && ESTADOS_ENVIADO.includes(orden.estado) && (
        <PagarOCBtn
          ordenId={id}
          supplierId={orden.supplier_id}
          numero={orden.numero_oc}
          totalOC={orden.total}
          montoPagado={montoPagado}
          saldoDeudorProveedor={orden.suppliers?.saldo_deudor ?? 0}
          metodoPagoOC={orden.metodo_pago}
        />
      )}

      {/* Comprobantes */}
      {(() => {
        if (!ESTADOS_ENVIADO.includes(orden.estado)) return null
        const comprobantes = (orden.comprobante_pago_urls ?? []).filter(Boolean)
        const saldoPendiente = Math.max(0, orden.total - montoPagado)
        return (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-blue-800 text-sm">Comprobantes</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {comprobantes.length > 0
                    ? `${comprobantes.length} archivo(s) adjunto(s)`
                    : 'Sin comprobantes adjuntos aún'}
                </p>
              </div>
              {saldoPendiente <= 0 ? (
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                  ✓ Pagado completo{orden.fecha_pago ? ` el ${new Date(orden.fecha_pago).toLocaleDateString('es-CL')}` : ''}
                </span>
              ) : montoPagado > 0 ? (
                <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                  🟡 Pago parcial — {formatCLP(montoPagado)} de {formatCLP(orden.total)}
                </span>
              ) : (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-medium">
                  ⏳ Por pagar
                </span>
              )}
            </div>
            <div className="p-4 flex items-start gap-4 flex-wrap">
              {comprobantes.length > 0 ? (
                <ComprobanteGallery urls={comprobantes} size="lg" />
              ) : (
                <p className="text-sm text-gray-400 italic">No se ha adjuntado ningún comprobante.</p>
              )}
              {puedePagar && (
                <div className="ml-auto">
                  <AgregarComprobanteBtn ordenId={id} />
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Historial de abonos */}
      {historialPagos.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm">Historial de abonos</p>
            <div className="text-xs text-gray-500 flex gap-3">
              <span>Total abonado: <strong className="text-green-700">{formatCLP(totalAbonado)}</strong></span>
              <span>Pendiente: <strong className="text-red-600">{formatCLP(Math.max(0, orden.total - totalAbonado))}</strong></span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Fecha</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Método</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Nota</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">Monto</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {historialPagos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-600">
                    {new Date(p.fecha).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-2.5 capitalize text-gray-700">{p.metodo_pago}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{p.nota ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-700">{formatCLP(p.monto)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {puedePagar && (
                      <EliminarAbonoBtn
                        pagoId={p.id}
                        ordenId={id}
                        supplierId={orden.supplier_id}
                        monto={p.monto}
                        montoPagadoActual={montoPagado}
                        saldoDeudorProveedor={orden.suppliers?.saldo_deudor ?? 0}
                        metodoPagoOC={orden.metodo_pago}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-xs font-medium text-gray-600">Total abonado</td>
                <td className="px-4 py-2 text-right font-bold text-green-700">{formatCLP(totalAbonado)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
