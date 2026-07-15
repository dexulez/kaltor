import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ClientesBuscador from '@/components/clientes/ClientesBuscador'
import { tieneSubPermiso } from '@/lib/modulos'
import { formatCLP } from '@/lib/calculations'

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
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
  const puedeCrear = tieneSubPermiso('clientes.crear', rolNombre, permisos)
  const puedeEditar = tieneSubPermiso('clientes.editar', rolNombre, permisos)

  let query = supabase
    .from('customers')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%,rut.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data: clientes } = await query.limit(50)
  const totalDeuda = (clientes ?? []).reduce((s, c) => s + (c.saldo_deudor ?? 0), 0)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {clientes?.length ?? 0} cliente(s) encontrado(s)
            {totalDeuda > 0 && (
              <span className="ml-2 text-red-600 font-medium">· Deuda por fiado: {formatCLP(totalDeuda)}</span>
            )}
          </p>
        </div>
        {puedeCrear && (
          <Link href="/clientes/nuevo">
            <Button className="bg-blue-600 hover:bg-blue-700">+ Nuevo cliente</Button>
          </Link>
        )}
      </div>

      <ClientesBuscador defaultValue={q} />

      <div className="bg-white rounded-xl border overflow-hidden">
        {!clientes?.length ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl block mb-3">👤</span>
            <p className="font-medium">{q ? 'Sin resultados para tu búsqueda' : 'Aún no hay clientes registrados'}</p>
            {!q && <p className="text-sm mt-1">Crea el primer cliente haciendo click en &quot;+ Nuevo cliente&quot;</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">RUT</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Crédito</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Registro</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{c.telefono}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.rut ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {(c.saldo_deudor ?? 0) > 0 ? (
                      <span className="font-bold text-red-600">{formatCLP(c.saldo_deudor)}</span>
                    ) : c.permite_credito ? (
                      <span className="text-xs text-green-600 font-medium">💳 Habilitado</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/clientes/${c.id}`}>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </Link>
                      {puedeEditar && (
                        <Link href={`/clientes/${c.id}/editar`}>
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
    </div>
  )
}
