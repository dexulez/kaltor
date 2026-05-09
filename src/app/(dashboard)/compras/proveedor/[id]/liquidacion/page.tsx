import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCLP } from '@/lib/calculations'
import LiquidacionActions from '@/components/compras/LiquidacionActions'

function hace7Dias() {
  const d = new Date(); d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}
function hoy() { return new Date().toISOString().split('T')[0] }

export default async function LiquidacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const { id } = await params
  const { desde = hace7Dias(), hasta = hoy() } = await searchParams
  const supabase = await createClient()

  const [{ data: proveedor }, { data: liquidaciones }] = await Promise.all([
    supabase.from('suppliers').select('*').eq('id', id).single(),
    supabase.from('supplier_settlements')
      .select('*')
      .eq('supplier_id', id)
      .order('fecha', { ascending: false })
      .limit(20),
  ])

  if (!proveedor) notFound()

  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  // Ventas de productos de este proveedor en el período
  const { data: ventasRaw } = await supabase
    .from('sale_items')
    .select(`
      cantidad,
      precio_unitario,
      producto:products!inner(nombre, sku, precio_costo, costo_envio, proveedor_id),
      venta:sales!inner(created_at, anulada, numero_venta)
    `)
    .eq('producto.proveedor_id', id)
    .gte('venta.created_at', desdeIso)
    .lte('venta.created_at', hastaIso)

  // Agrupar por producto
  type ItemVenta = {
    nombre: string; sku: string | null
    cantidadTotal: number; costoUnit: number; totalCosto: number
    precioVenta: number; totalVenta: number
  }
  const porProducto: Record<string, ItemVenta> = {}
  let totalVentasCosto = 0
  let totalVentasPrecio = 0

  ;(ventasRaw ?? []).forEach((row) => {
    const prod = (Array.isArray(row.producto) ? row.producto[0] : row.producto) as { nombre: string; sku: string | null; precio_costo: number; costo_envio: number; proveedor_id: string } | null
    const venta = (Array.isArray(row.venta) ? row.venta[0] : row.venta) as { anulada: boolean } | null
    if (!prod || venta?.anulada) return

    const key = prod.sku ?? prod.nombre
    const costoUnit = (prod.precio_costo ?? 0) + (prod.costo_envio ?? 0)
    const subtotalCosto = costoUnit * row.cantidad
    const subtotalVenta = row.precio_unitario * row.cantidad

    if (!porProducto[key]) {
      porProducto[key] = { nombre: prod.nombre, sku: prod.sku, cantidadTotal: 0, costoUnit, totalCosto: 0, precioVenta: row.precio_unitario, totalVenta: 0 }
    }
    porProducto[key].cantidadTotal += row.cantidad
    porProducto[key].totalCosto += subtotalCosto
    porProducto[key].totalVenta += subtotalVenta
    totalVentasCosto += subtotalCosto
    totalVentasPrecio += subtotalVenta
  })

  const items = Object.values(porProducto).sort((a, b) => b.totalCosto - a.totalCosto)

  // Pagos ya realizados en el período
  const pagosPeriodo = (liquidaciones ?? [])
    .filter(l => l.fecha >= desde && l.fecha <= hasta)
    .reduce((s, l) => s + l.monto, 0)

  // Saldo pendiente del período
  const saldoPeriodo = totalVentasCosto - pagosPeriodo

  // Total pagado histórico
  const totalPagado = (liquidaciones ?? []).reduce((s, l) => s + l.monto, 0)

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <Link href="/compras" className="text-sm text-blue-600 hover:underline">← Volver a Compras</Link>
        <div className="flex items-start justify-between flex-wrap gap-3 mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{proveedor.nombre}</h1>
            <p className="text-gray-500 text-sm">Liquidación de ventas · Control de pagos por consignación</p>
          </div>
          {proveedor.telefono && (
            <a href={`https://wa.me/${proveedor.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm hover:bg-green-100">
              📱 WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Vendido en período (costo)</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{formatCLP(totalVentasCosto)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Lo que le debes por este período</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Pagado en período</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCLP(pagosPeriodo)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{(liquidaciones ?? []).filter(l => l.fecha >= desde && l.fecha <= hasta).length} pago(s)</p>
        </div>
        <div className={`rounded-xl border p-4 ${saldoPeriodo > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Saldo del período</p>
          <p className={`text-xl font-bold mt-1 ${saldoPeriodo > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCLP(saldoPeriodo)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{saldoPeriodo > 0 ? 'Pendiente por pagar' : 'Período al día ✓'}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total pagado histórico</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{formatCLP(totalPagado)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{(liquidaciones ?? []).length} liquidación(es)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ventas del período */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filtro de fechas */}
          <form className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 font-medium">Período:</span>
            <input type="date" name="desde" defaultValue={desde}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span className="text-gray-400">→</span>
            <input type="date" name="hasta" defaultValue={hasta}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Filtrar
            </button>
            <Link href="?" className="text-xs text-gray-400 hover:text-gray-600">Últimos 7 días</Link>
          </form>

          {/* Tabla de ventas */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
              <p className="font-semibold text-gray-800">Productos vendidos del {desde} al {hasta}</p>
              <p className="text-xs text-gray-500">{items.length} producto(s)</p>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">Sin ventas de productos de este proveedor en el período</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">Producto</th>
                    <th className="text-center px-4 py-2 text-gray-500 font-medium">Cant.</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Costo unit.</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Total costo</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Venta total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.nombre}</p>
                        {item.sku && <p className="text-xs text-gray-400">{item.sku}</p>}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-700">{item.cantidadTotal}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCLP(item.costoUnit)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700">{formatCLP(item.totalCosto)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatCLP(item.totalVenta)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right font-bold text-gray-700">Total a pagar</td>
                    <td className="px-4 py-2 text-right font-bold text-blue-700 text-base">{formatCLP(totalVentasCosto)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{formatCLP(totalVentasPrecio)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* Panel de pago */}
        <div className="space-y-4">
          <LiquidacionActions
            supplierId={id}
            nombreProveedor={proveedor.nombre}
            montoSugerido={Math.max(0, saldoPeriodo)}
            periodoDesde={desde}
            periodoHasta={hasta}
          />

          {/* Historial de pagos */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <p className="font-semibold text-gray-800 text-sm">Historial de pagos</p>
            </div>
            {!liquidaciones?.length ? (
              <p className="text-center py-6 text-gray-400 text-xs">Sin pagos registrados</p>
            ) : (
              <div className="divide-y">
                {liquidaciones.map(l => (
                  <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{formatCLP(l.monto)}</p>
                      <p className="text-xs text-gray-400">
                        {l.fecha} · {l.metodo_pago ?? '—'}
                        {l.periodo_desde && ` · ${l.periodo_desde} → ${l.periodo_hasta}`}
                      </p>
                      {l.nota && <p className="text-xs text-gray-500 mt-0.5 italic">{l.nota}</p>}
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium shrink-0">✓ Pagado</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
