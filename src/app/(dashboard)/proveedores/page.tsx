import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'
import AbonarProveedorBtn from '@/components/compras/AbonarProveedorBtn'
import { tieneSubPermiso } from '@/lib/modulos'

export default async function ProveedoresPage() {
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
  const puedeCrear    = tieneSubPermiso('compras.proveedores', rolNombre, permisos)
  const puedePagar    = tieneSubPermiso('compras.pagar',       rolNombre, permisos)
  const puedeEditar   = tieneSubPermiso('compras.proveedores', rolNombre, permisos)
  const puedeNuevaOC  = tieneSubPermiso('compras.crear',       rolNombre, permisos)

  const { data: proveedores } = await supabase
    .from('suppliers')
    .select('*')
    .order('nombre')

  const activos  = (proveedores ?? []).filter(p => p.activo)
  const inactivos = (proveedores ?? []).filter(p => !p.activo)

  const totalDeuda = activos.reduce((s, p) => s + (p.saldo_deudor ?? 0), 0)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activos.length} proveedor{activos.length !== 1 ? 'es' : ''} activo{activos.length !== 1 ? 's' : ''}
            {totalDeuda > 0 && (
              <span className="ml-2 text-red-600 font-medium">· Deuda total: {formatCLP(totalDeuda)}</span>
            )}
          </p>
        </div>
        {puedeCrear && (
          <Link href="/compras/proveedor/nuevo">
            <Button className="bg-[#FF7A1A] hover:bg-[#E56900] text-white">+ Nuevo proveedor</Button>
          </Link>
        )}
      </div>

      {/* Tabla proveedores activos */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {activos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl block mb-3">🏭</span>
            <p className="font-medium">Sin proveedores registrados</p>
            {puedeCrear && (
              <Link href="/compras/proveedor/nuevo">
                <Button className="mt-4 bg-[#FF7A1A] hover:bg-[#E56900] text-white">+ Agregar proveedor</Button>
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Condición de pago</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo deudor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{p.nombre}</p>
                    {p.rut && <p className="text-xs text-gray-400">RUT: {p.rut}</p>}
                    {p.email && <p className="text-xs text-gray-400">{p.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p className="font-medium">{p.contacto_nombre ?? '—'}</p>
                    {p.telefono && <p className="text-xs text-gray-400">{p.telefono}</p>}
                    {p.whatsapp && <p className="text-xs text-gray-400">WA: {p.whatsapp}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize hidden md:table-cell">
                    {p.condicion_pago ?? '—'}
                    {p.plazo_pago_dias > 0 && (
                      <span className="text-gray-400 text-xs ml-1">({p.plazo_pago_dias} días)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(p.saldo_deudor ?? 0) > 0 ? (
                      <div>
                        <span className="font-bold text-red-600">{formatCLP(p.saldo_deudor)}</span>
                        <p className="text-xs text-red-400">Por crédito</p>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end flex-wrap items-center">
                      {puedePagar && (p.saldo_deudor ?? 0) > 0 && (
                        <AbonarProveedorBtn
                          supplierId={p.id}
                          nombreProveedor={p.nombre}
                          saldoActual={p.saldo_deudor}
                        />
                      )}
                      {puedePagar && (
                        <Link href={`/compras/proveedor/${p.id}/liquidacion`}>
                          <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50">
                            💸 Liquidar
                          </Button>
                        </Link>
                      )}
                      {puedeNuevaOC && (
                        <Link href={`/compras/orden/nueva?proveedor=${p.id}`}>
                          <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50">
                            Nueva OC
                          </Button>
                        </Link>
                      )}
                      {puedeEditar && (
                        <Link href={`/compras/proveedor/${p.id}/editar`}>
                          <Button variant="outline" size="sm">Editar</Button>
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

      {/* Proveedores inactivos (colapsado) */}
      {inactivos.length > 0 && (
        <details className="bg-white rounded-xl border overflow-hidden">
          <summary className="px-4 py-3 text-sm text-gray-500 cursor-pointer hover:bg-gray-50 select-none">
            {inactivos.length} proveedor{inactivos.length !== 1 ? 'es' : ''} inactivo{inactivos.length !== 1 ? 's' : ''}
          </summary>
          <table className="w-full text-sm border-t">
            <tbody className="divide-y">
              {inactivos.map((p) => (
                <tr key={p.id} className="opacity-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-700">{p.nombre}</p>
                    {p.rut && <p className="text-xs text-gray-400">RUT: {p.rut}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{p.contacto_nombre ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {puedeEditar && (
                      <Link href={`/compras/proveedor/${p.id}/editar`}>
                        <Button variant="outline" size="sm" className="text-xs">Reactivar</Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  )
}
