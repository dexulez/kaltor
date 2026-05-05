import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCLP } from '@/lib/calculations'
import { Customer, Equipment, RepairOrder, Sale } from '@/types'

type VentaCaja = Sale & {
  customers: Pick<Customer, 'nombre'> | null
}

type OtPendienteCaja = RepairOrder & {
  customers: Pick<Customer, 'nombre'> | null
  equipment: Pick<Equipment, 'marca' | 'modelo'> | null
}

export default async function CajaPage() {
  const supabase = await createClient()
  const hoy = new Date().toISOString().split('T')[0]

  const [{ data: ventasHoy }, { data: ultimasVentas }, { data: otsPendientes }] = await Promise.all([
    supabase.from('sales').select('total, metodo_pago, iva, ppm')
      .gte('created_at', hoy).eq('anulada', false),
    supabase.from('sales').select('*, customers(nombre)')
      .order('created_at', { ascending: false }).limit(10).eq('anulada', false),
    supabase.from('repair_orders').select('*, customers(nombre), equipment(marca, modelo)')
      .eq('estado', 'listo').order('updated_at', { ascending: false }).limit(10),
  ])

  const totalHoy = ventasHoy?.reduce((s, v) => s + v.total, 0) ?? 0
  const ivaHoy = ventasHoy?.reduce((s, v) => s + (v.iva ?? 0), 0) ?? 0
  const ppmHoy = ventasHoy?.reduce((s, v) => s + (v.ppm ?? 0), 0) ?? 0
  const netoHoy = totalHoy - ivaHoy - ppmHoy
  const ultimasVentasList: VentaCaja[] = (ultimasVentas ?? []) as VentaCaja[]
  const otsPendientesList: OtPendienteCaja[] = (otsPendientes ?? []) as OtPendienteCaja[]

  const METODOS = ['efectivo', 'transferencia', 'debito', 'credito']
  const totalesPorMetodo = METODOS.map(m => ({
    metodo: m,
    total: ventasHoy?.filter(v => v.metodo_pago === m).reduce((s, v) => s + v.total, 0) ?? 0,
  }))

  const METODO_LABELS: Record<string, string> = {
    efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia',
    debito: '💳 Débito', credito: '💳 Crédito',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caja / Ventas</h1>
          <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/caja/venta-directa">
            <Button className="bg-green-600 hover:bg-green-700">🛒 Venta directa</Button>
          </Link>
        </div>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Total del día</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-gray-900">{formatCLP(totalHoy)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Neto</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-700">{formatCLP(netoHoy)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">IVA (19%)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-gray-700">{formatCLP(ivaHoy)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">PPM (3%)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-gray-700">{formatCLP(ppmHoy)}</p></CardContent>
        </Card>
      </div>

      {/* Por método de pago */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {totalesPorMetodo.map(({ metodo, total }) => (
          <div key={metodo} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 mb-1">{METODO_LABELS[metodo]}</p>
            <p className="text-lg font-bold text-gray-800">{formatCLP(total)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OTs listas para cobrar */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">🔧 OTs listas para entregar</h2>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!otsPendientesList.length ? (
              <p className="text-center text-gray-400 py-8 text-sm">No hay OTs listas para cobro</p>
            ) : (
              <div className="divide-y">
                {otsPendientesList.map((ot) => (
                  <div key={ot.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono font-bold text-blue-700 text-sm">{ot.numero_ot}</p>
                      <p className="text-sm text-gray-700">{ot.customers?.nombre}</p>
                      <p className="text-xs text-gray-400">{ot.equipment?.marca} {ot.equipment?.modelo}</p>
                    </div>
                    <Link href={`/caja/cobrar-ot/${ot.id}`}>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 shrink-0">Cobrar</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Últimas ventas */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">🧾 Últimas ventas</h2>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!ultimasVentasList.length ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin ventas registradas hoy</p>
            ) : (
              <div className="divide-y">
                {ultimasVentasList.map((v) => (
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
