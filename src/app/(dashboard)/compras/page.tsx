import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCLP } from '@/lib/calculations'
import { Supplier } from '@/types'
import AlertasOCPanel from '@/components/compras/AlertasOCPanel'
import AbonarProveedorBtn from '@/components/compras/AbonarProveedorBtn'
import OrdenesConFiltro from '@/components/compras/OrdenesConFiltro'
import { tieneSubPermiso } from '@/lib/modulos'

export default async function ComprasPage() {
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
  const puedeCrear = tieneSubPermiso('compras.crear', rolNombre, permisos)
  const puedePagar = tieneSubPermiso('compras.pagar', rolNombre, permisos)
  const puedeProveedores = tieneSubPermiso('compras.proveedores', rolNombre, permisos)

  const [{ data: proveedores }, { data: ordenes }] = await Promise.all([
    supabase.from('suppliers').select('*').eq('activo', true).order('nombre'),
    supabase.from('purchase_orders')
      .select('*, suppliers(nombre, whatsapp, telefono)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const hoyStr = new Intl.DateTimeFormat('sv', { timeZone: 'America/Santiago' }).format(new Date())

  type ORow = { id: string; numero_oc: string; estado: string; metodo_pago?: string | null; total?: number | null; created_at?: string | null; notas?: string | null; fecha_estimada_llegada?: string | null; suppliers?: { nombre?: string | null; whatsapp?: string | null; telefono?: string | null } | null }
  const todas = (ordenes ?? []) as ORow[]
  const borradores = todas.filter(o => (o.notas ?? '').startsWith('[SOLICITUD]'))
  const otrasOrdenes = todas.filter(o => !(o.notas ?? '').startsWith('[SOLICITUD]'))

  return (
    <div className="p-6 space-y-4">
      <AlertasOCPanel />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Compras y Proveedores</h1>
        <Link href="/compras/historial">
          <Button variant="outline" className="gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50">
            🔍 Historial de compras
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="ordenes">
        <TabsList>
          <TabsTrigger value="ordenes">Órdenes de compra ({todas.length})</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores ({proveedores?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* PROVEEDORES */}
        <TabsContent value="proveedores" className="mt-4 space-y-3">
          {puedeProveedores && (
            <div className="flex justify-end">
              <Link href="/compras/proveedor/nuevo">
                <Button className="bg-blue-600 hover:bg-blue-700">+ Nuevo proveedor</Button>
              </Link>
            </div>
          )}
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
                        {p.saldo_deudor > 0 ? (
                          <div className="space-y-1">
                            <span className="font-bold text-red-600 text-base">{formatCLP(p.saldo_deudor)}</span>
                            <p className="text-xs text-red-400">Deuda por crédito</p>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end flex-wrap items-center">
                          {puedePagar && p.saldo_deudor > 0 && (
                            <AbonarProveedorBtn
                              supplierId={p.id}
                              nombreProveedor={p.nombre}
                              saldoActual={p.saldo_deudor}
                            />
                          )}
                          {puedePagar && (
                            <Link href={`/compras/proveedor/${p.id}/liquidacion`}>
                              <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50">💸 Liquidar</Button>
                            </Link>
                          )}
                          {puedeProveedores && (
                            <Link href={`/compras/proveedor/${p.id}/editar`}>
                              <Button variant="outline" size="sm">Editar</Button>
                            </Link>
                          )}
                          {puedeCrear && (
                            <Link href={`/compras/orden/nueva?proveedor=${p.id}`}>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Nueva OC</Button>
                            </Link>
                          )}
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
        <TabsContent value="ordenes" className="mt-4">
          <OrdenesConFiltro
            borradores={borradores}
            ordenes={otrasOrdenes}
            hoyStr={hoyStr}
            puedeCrear={puedeCrear}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
