import { createClient } from '@/lib/supabase/server'
import { formatCLP } from '@/lib/calculations'
import Link from 'next/link'
import InformesExportActions from '@/components/informes/InformesExportActions'

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const { desde, hasta } = await searchParams
  const supabase = await createClient()

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const fechaDesde = desde ?? formatDate(inicioMes)
  const fechaHasta = hasta ?? formatDate(hoy)

  const desdeIso = `${fechaDesde}T00:00:00.000Z`
  const hastaIso = `${fechaHasta}T23:59:59.999Z`

  const [{ data: ventas }, { data: reparaciones }, { data: compras }] = await Promise.all([
    supabase.from('sales')
      .select('id, total, metodo_pago')
      .eq('anulada', false)
      .gte('created_at', desdeIso)
      .lte('created_at', hastaIso),
    supabase.from('repair_orders')
      .select('id, estado')
      .gte('created_at', desdeIso)
      .lte('created_at', hastaIso),
    supabase.from('purchase_orders')
      .select('id, total')
      .gte('created_at', desdeIso)
      .lte('created_at', hastaIso),
  ])

  const totalVentas = ventas?.reduce((sum, v) => sum + v.total, 0) ?? 0
  const cantidadVentas = ventas?.length ?? 0
  const ticketPromedio = cantidadVentas > 0 ? Math.round(totalVentas / cantidadVentas) : 0
  const totalCompras = compras?.reduce((sum, c) => sum + c.total, 0) ?? 0

  const metodosPago = ['efectivo', 'transferencia', 'debito', 'credito'] as const
  const resumenMetodos = metodosPago.map((metodo) => {
    const registros = (ventas ?? []).filter((v) => v.metodo_pago === metodo)
    return {
      metodo,
      cantidad: registros.length,
      total: registros.reduce((sum, v) => sum + v.total, 0),
    }
  })

  const reparacionesPorEstado = (reparaciones ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.estado] = (acc[r.estado] ?? 0) + 1
    return acc
  }, {})

  const entregadas = reparacionesPorEstado.entregado ?? 0
  const listas = reparacionesPorEstado.listo ?? 0

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📈</span>
        <h1 className="text-2xl font-bold text-gray-900">Informes</h1>
      </div>

      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-end gap-3 justify-between">
        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Desde</label>
            <input name="desde" type="date" defaultValue={fechaDesde} className="block mt-1 border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Hasta</label>
            <input name="hasta" type="date" defaultValue={fechaHasta} className="block mt-1 border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">Aplicar</button>
          <Link href="/informes" className="text-sm text-gray-500 hover:text-gray-700">Limpiar</Link>
        </form>

        <InformesExportActions
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          totalVentas={totalVentas}
          cantidadVentas={cantidadVentas}
          ticketPromedio={ticketPromedio}
          totalCompras={totalCompras}
          resumenMetodos={resumenMetodos}
          reparacionesPorEstado={reparacionesPorEstado}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Ventas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCLP(totalVentas)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Ticket promedio</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{formatCLP(ticketPromedio)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Reparaciones entregadas</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{entregadas}</p>
          <p className="text-xs text-gray-400 mt-0.5">Listas por cobrar: {listas}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Compras</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{formatCLP(totalCompras)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800 text-sm">Ventas por método de pago</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Método</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Transacciones</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {resumenMetodos.map((item) => (
                <tr key={item.metodo}>
                  <td className="px-4 py-2 capitalize">{item.metodo}</td>
                  <td className="px-4 py-2 text-right">{item.cantidad}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCLP(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800 text-sm">Reparaciones por estado</h2>
          </div>
          {!Object.keys(reparacionesPorEstado).length ? (
            <p className="text-center text-gray-400 py-8 text-sm">Sin reparaciones en el rango seleccionado</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Estado</th>
                  <th className="text-right px-4 py-2 text-gray-500 font-medium">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(reparacionesPorEstado).map(([estado, cantidad]) => (
                  <tr key={estado}>
                    <td className="px-4 py-2 capitalize">{estado.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-2 text-right font-medium">{cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
