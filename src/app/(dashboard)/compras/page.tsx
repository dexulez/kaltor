import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCLP } from '@/lib/calculations'
import { PurchaseOrder, Supplier } from '@/types'

const OC_ESTADO: Record<string, { label: string; color: string }> = {
  pendiente:          { label: 'Pendiente',         color: 'bg-yellow-100 text-yellow-700' },
  en_transito:        { label: 'En tránsito',       color: 'bg-blue-100 text-blue-700' },
  recibida_parcial:   { label: 'Recibida parcial',  color: 'bg-orange-100 text-orange-700' },
  recibida_completa:  { label: 'Recibida',          color: 'bg-green-100 text-green-700' },
  cancelada:          { label: 'Cancelada',          color: 'bg-gray-200 text-gray-500' },
}

type OrdenCompraRow = PurchaseOrder & {
  suppliers: Pick<Supplier, 'nombre'> | null
}

export default async function ComprasPage() {
  const supabase = await createClient()
  const [{ data: proveedores }, { data: ordenes }] = await Promise.all([
    supabase.from('suppliers').select('*').eq('activo', true).order('nombre'),
    supabase.from('purchase_orders')
      .select('*, suppliers(nombre)')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const ordenesList: OrdenCompraRow[] = (ordenes ?? []) as OrdenCompraRow[]

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Compras y Proveedores</h1>

      <Tabs defaultValue="proveedores">
        <TabsList>
          <TabsTrigger value="proveedores">Proveedores ({proveedores?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="ordenes">Órdenes de compra ({ordenesList.length})</TabsTrigger>
        </TabsList>

        {/* PROVEEDORES */}
        <TabsContent value="proveedores" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Link href="/compras/proveedor/nuevo">
              <Button className="bg-blue-600 hover:bg-blue-700">+ Nuevo proveedor</Button>
            </Link>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!proveedores?.length ? (
              <div className="text-center py-14 text-gray-400">
                <span className="text-5xl block mb-3">🏭</span>
                <p className="font-medium">Sin proveedores registrados</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Condición pago</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo deudor</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {proveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.nombre}</p>
                        {p.rut && <p className="text-xs text-gray-400">RUT: {p.rut}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{p.contacto_nombre ?? '—'}</p>
                        {p.telefono && <p className="text-xs text-gray-400">{p.telefono}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">
                        {p.condicion_pago}
                        {p.plazo_pago_dias > 0 && <span className="text-gray-400"> ({p.plazo_pago_dias} días)</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${p.saldo_deudor > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {formatCLP(p.saldo_deudor)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Link href={`/compras/proveedor/${p.id}/editar`}>
                            <Button variant="outline" size="sm">Editar</Button>
                          </Link>
                          <Link href={`/compras/orden/nueva?proveedor=${p.id}`}>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Nueva OC</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ÓRDENES DE COMPRA */}
        <TabsContent value="ordenes" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Link href="/compras/orden/nueva">
              <Button className="bg-blue-600 hover:bg-blue-700">+ Nueva orden de compra</Button>
            </Link>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!ordenesList.length ? (
              <div className="text-center py-14 text-gray-400">
                <span className="text-5xl block mb-3">📋</span>
                <p className="font-medium">Sin órdenes de compra</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">N° OC</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Pago</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Llegada est.</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ordenesList.map((o) => {
                    const est = OC_ESTADO[o.estado]
                    return (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{o.numero_oc}</td>
                        <td className="px-4 py-3 font-medium">{o.suppliers?.nombre}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${est?.color}`}>{est?.label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 capitalize">{o.metodo_pago ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCLP(o.total)}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {o.fecha_estimada_llegada ? new Date(o.fecha_estimada_llegada).toLocaleDateString('es-CL') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/compras/orden/${o.id}`}>
                            <Button variant="ghost" size="sm">Ver</Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
