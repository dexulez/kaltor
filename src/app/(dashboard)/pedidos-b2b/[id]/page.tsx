import { createClient } from '@/lib/supabase/server'
import { tieneAccesoModulo } from '@/lib/modulos'
import Link from 'next/link'
import BotonVolver from '@/components/shared/BotonVolver'
import ConfirmarPedidoB2BForm from '@/components/pedidos-b2b/ConfirmarPedidoB2BForm'

type RolesRel = { nombre?: string } | { nombre?: string }[] | null | undefined

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', rechazado: 'Rechazado', cancelado: 'Cancelado',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
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

  const [{ data: items }, { data: comprador }] = await Promise.all([
    supabase.from('sales_order_items').select('*, products(stock_actual)').eq('sales_order_id', id),
    supabase.from('user_profiles').select('nombre_completo, email, telefono').eq('id', pedido.comprador_id).single(),
  ])

  type ItemRow = {
    id: string; product_id: string; nombre: string; cantidad_solicitada: number
    cantidad_confirmada: number | null; precio_unitario: number; subtotal: number
    products: { stock_actual: number } | { stock_actual: number }[] | null
  }
  const itemsList = (items ?? []) as ItemRow[]
  const stockDe = (it: ItemRow) => Array.isArray(it.products) ? it.products[0]?.stock_actual ?? 0 : it.products?.stock_actual ?? 0

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
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">{pedido.estado === 'confirmado' ? 'Confirmado' : '—'}</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Precio</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {itemsList.map(it => (
                  <tr key={it.id}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{it.nombre}</td>
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
          {pedido.estado === 'rechazado' && pedido.motivo_rechazo && (
            <div className="px-4 py-3 bg-red-50 border-t text-sm text-red-700">
              <strong>Motivo:</strong> {pedido.motivo_rechazo}
            </div>
          )}
          {pedido.estado === 'confirmado' && esStaff && pedido.sale_id && (
            <div className="px-4 py-3 bg-green-50 border-t text-sm">
              <Link href={`/caja`} className="text-green-700 hover:underline font-medium">Ver en Caja / Ventas →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
