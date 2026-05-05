import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCLP } from '@/lib/calculations'
import RecibirMercanciaForm from '@/components/compras/RecibirMercanciaForm'
import { PurchaseOrder, PurchaseOrderItem, Supplier } from '@/types'

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  pendiente:          { label: 'Pendiente', color: 'bg-gray-100 text-gray-700' },
  en_transito:        { label: 'En tránsito', color: 'bg-blue-100 text-blue-700' },
  recibida_parcial:   { label: 'Recibida parcial', color: 'bg-amber-100 text-amber-700' },
  recibida_completa:  { label: 'Recibida', color: 'bg-green-100 text-green-700' },
  cancelada:          { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
}

type OrdenDetalle = PurchaseOrder & {
  suppliers: Supplier | null
  purchase_order_items: PurchaseOrderItem[]
}

export default async function DetalleOrdenCompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: oc } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(*), purchase_order_items(*)')
    .eq('id', id)
    .single()

  if (!oc) notFound()

  const orden = oc as OrdenDetalle

  const estado = ESTADO_LABELS[orden.estado] ?? { label: orden.estado, color: 'bg-gray-100 text-gray-700' }
  const totalRecibido = (orden.purchase_order_items ?? []).reduce((s, i) => s + i.cantidad_recibida, 0)
  const totalSolicitado = (orden.purchase_order_items ?? []).reduce((s, i) => s + i.cantidad_solicitada, 0)

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <Link href="/compras" className="text-sm text-blue-600 hover:underline">← Volver a Compras</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{orden.numero_oc}</h1>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estado.color}`}>{estado.label}</span>
        </div>
      </div>

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
            <p className="font-medium text-gray-800 capitalize">{orden.metodo_pago ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Costo envío</p>
            <p className="font-medium text-gray-800">{formatCLP(orden.costo_envio_total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total OC</p>
            <p className="font-bold text-gray-900">{formatCLP(orden.total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Llegada estimada</p>
            <p className="font-medium text-gray-800">
              {orden.fecha_estimada_llegada
                ? new Date(orden.fecha_estimada_llegada).toLocaleDateString('es-CL')
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Creada</p>
            <p className="font-medium text-gray-800">
              {new Date(orden.created_at).toLocaleDateString('es-CL')}
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
            {(orden.purchase_order_items ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium text-gray-800">{item.nombre}</td>
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
                <td className="px-4 py-3 text-right">{formatCLP(item.precio_unitario)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCLP(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-gray-50">
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

      {/* Recepción */}
      <RecibirMercanciaForm oc={orden} />
    </div>
  )
}
