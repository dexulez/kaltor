import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'
import { Customer, Equipment, RepairOrder, Sale } from '@/types'

type DashboardRepairOrder = Pick<RepairOrder, 'id' | 'numero_ot' | 'estado'> & {
  customers: Pick<Customer, 'nombre'> | null
  equipment: Pick<Equipment, 'marca' | 'modelo'> | null
}

type DashboardRepairOrderRaw = Pick<RepairOrder, 'id' | 'numero_ot' | 'estado'> & {
  customers: Pick<Customer, 'nombre'>[] | null
  equipment: Pick<Equipment, 'marca' | 'modelo'>[] | null
}

type DashboardSale = Pick<Sale, 'id' | 'numero_venta' | 'total' | 'metodo_pago' | 'tipo_documento'> & {
  customers: Pick<Customer, 'nombre'> | null
}

type DashboardSaleRaw = Pick<Sale, 'id' | 'numero_venta' | 'total' | 'metodo_pago' | 'tipo_documento'> & {
  customers: Pick<Customer, 'nombre'>[] | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const hoy = new Date().toISOString().split('T')[0]

  const [
    { count: otActivas },
    { count: otHoy },
    { count: otListasCobrar },
    { count: clientesTotal },
    { data: ventasHoy },
    { data: stockCritico },
    { data: otRecientes },
    { data: ventasRecientes },
  ] = await Promise.all([
    supabase.from('repair_orders').select('*', { count: 'exact', head: true })
      .not('estado', 'in', '("entregado","cancelado","rechazado")'),
    supabase.from('repair_orders').select('*', { count: 'exact', head: true })
      .gte('created_at', hoy),
    supabase.from('repair_orders').select('*', { count: 'exact', head: true })
      .eq('estado', 'listo'),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('sales').select('total, iva, ppm').gte('created_at', hoy).eq('anulada', false),
    supabase.from('products').select('nombre, stock_actual, stock_minimo')
      .filter('stock_actual', 'lte', 'stock_minimo').eq('activo', true).limit(5),
    supabase.from('repair_orders')
      .select('id, numero_ot, estado, created_at, customers(nombre), equipment(marca, modelo)')
      .order('created_at', { ascending: false }).limit(6),
    supabase.from('sales')
      .select('id, numero_venta, total, metodo_pago, tipo_documento, created_at, customers(nombre)')
      .order('created_at', { ascending: false }).limit(6).eq('anulada', false),
  ])

  const totalHoy = ventasHoy?.reduce((s, v) => s + v.total, 0) ?? 0
  const netoHoy = ventasHoy?.reduce((s, v) => s + v.total - (v.iva ?? 0) - (v.ppm ?? 0), 0) ?? 0
  const otRecientesList: DashboardRepairOrder[] = ((otRecientes ?? []) as DashboardRepairOrderRaw[]).map((ot) => ({
    ...ot,
    customers: ot.customers?.[0] ?? null,
    equipment: ot.equipment?.[0] ?? null,
  }))
  const ventasRecientesList: DashboardSale[] = ((ventasRecientes ?? []) as DashboardSaleRaw[]).map((venta) => ({
    ...venta,
    customers: venta.customers?.[0] ?? null,
  }))

  const ESTADO_BADGE: Record<string, string> = {
    recibido: 'bg-gray-100 text-gray-700',
    en_diagnostico: 'bg-yellow-100 text-yellow-700',
    presupuestado: 'bg-blue-100 text-blue-700',
    aprobado: 'bg-indigo-100 text-indigo-700',
    esperando_repuesto: 'bg-orange-100 text-orange-700',
    en_reparacion: 'bg-purple-100 text-purple-700',
    listo: 'bg-green-100 text-green-700',
    entregado: 'bg-emerald-100 text-emerald-700',
    rechazado: 'bg-red-100 text-red-700',
    cancelado: 'bg-gray-200 text-gray-500',
    en_garantia: 'bg-teal-100 text-teal-700',
  }

  const ESTADO_LABEL: Record<string, string> = {
    recibido: 'Recibido', en_diagnostico: 'Diagnóstico', presupuestado: 'Presupuestado',
    aprobado: 'Aprobado', esperando_repuesto: 'Esp. repuesto', en_reparacion: 'En reparación',
    listo: 'Listo', entregado: 'Entregado', rechazado: 'Rechazado', cancelado: 'Cancelado',
    en_garantia: 'En garantía',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/reparaciones/nueva"><Button variant="outline">+ Nueva OT</Button></Link>
          <Link href="/caja/venta-directa"><Button className="bg-green-600 hover:bg-green-700">🛒 Venta directa</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Ventas hoy</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCLP(totalHoy)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Neto: {formatCLP(netoHoy)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">OT activas</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-blue-600">{otActivas ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Listas cobrar</CardTitle></CardHeader>
          <CardContent>
            <Link href="/caja">
              <p className={`text-3xl font-bold ${(otListasCobrar ?? 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {otListasCobrar ?? 0}
              </p>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">OT hoy</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-orange-600">{otHoy ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Clientes</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-gray-700">{clientesTotal ?? 0}</p></CardContent>
        </Card>
      </div>

      {/* Stock crítico */}
      {stockCritico && stockCritico.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Productos con stock crítico</p>
          <div className="flex flex-wrap gap-3">
            {stockCritico.map((p, i) => (
              <div key={i} className="bg-white border border-red-200 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium text-gray-800">{p.nombre}</span>
                <span className="text-red-600 ml-2 font-bold">{p.stock_actual}/{p.stock_minimo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OT recientes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Órdenes de trabajo recientes</h2>
            <Link href="/reparaciones" className="text-sm text-blue-600 hover:underline">Ver todas →</Link>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!otRecientesList.length ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin OTs registradas</p>
            ) : (
              <div className="divide-y">
                {otRecientesList.map((ot) => (
                  <Link key={ot.id} href={`/reparaciones/${ot.id}`}>
                    <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-mono font-bold text-blue-700 text-sm">{ot.numero_ot}</p>
                        <p className="text-sm text-gray-700">{ot.customers?.nombre}</p>
                        <p className="text-xs text-gray-400">
                          {ot.equipment?.marca} {ot.equipment?.modelo}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_BADGE[ot.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ESTADO_LABEL[ot.estado] ?? ot.estado}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ventas recientes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Ventas recientes</h2>
            <Link href="/caja" className="text-sm text-blue-600 hover:underline">Ver caja →</Link>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!ventasRecientesList.length ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin ventas registradas</p>
            ) : (
              <div className="divide-y">
                {ventasRecientesList.map((v) => (
                  <div key={v.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs text-gray-400">{v.numero_venta}</p>
                      <p className="text-sm font-medium text-gray-800">{v.customers?.nombre ?? 'Sin cliente'}</p>
                      <p className="text-xs text-gray-500 capitalize">{v.metodo_pago} · {v.tipo_documento}</p>
                    </div>
                    <p className="font-bold text-gray-900">{formatCLP(v.total)}</p>
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
