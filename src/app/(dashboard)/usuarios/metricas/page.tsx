import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Role, UserProfile } from '@/types'

type RoleRelation = Pick<Role, 'id' | 'nombre'> | Pick<Role, 'id' | 'nombre'>[] | null

function getRoleName(roles: RoleRelation) {
  if (Array.isArray(roles)) return roles[0]?.nombre ?? ''
  return roles?.nombre ?? ''
}

const ROL_LABEL: Record<string, string> = {
  administrador:     'Administrador',
  tecnico:           'Técnico',
  vendedor:          'Vendedor',
  supervisor_ventas: 'Supervisor Ventas',
  comprador_externo: 'Comprador externo',
}

function formatearFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function MetricasUsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfilPropio } = await supabase
    .from('user_profiles')
    .select('store_id, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolNombrePropio = getRoleName(perfilPropio?.roles as RoleRelation)
  if (rolNombrePropio !== 'administrador') {
    redirect('/usuarios')
  }
  const storeId = (perfilPropio as { store_id?: string } | null)?.store_id ?? null

  const { data: usuarios } = await supabase
    .from('user_profiles')
    .select('id, nombre_completo, email, roles(nombre)')
    .eq('store_id', storeId)
    .is('eliminado_at', null)
    .order('nombre_completo')

  const usuariosList = ((usuarios ?? []) as (Pick<UserProfile, 'id' | 'nombre_completo' | 'email'> & { roles: RoleRelation })[])
    .filter(u => getRoleName(u.roles) !== 'comprador_externo')

  const { data: eventos, error: eventosError } = await supabase
    .from('user_login_events')
    .select('user_id, tipo_dispositivo, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: true })

  const tablaNoExiste = !!eventosError && /user_login_events/i.test(eventosError.message)

  type Resumen = { total: number; movil: number; computador: number; primero: string | null; ultimo: string | null }
  const resumenPorUsuario = new Map<string, Resumen>()
  for (const ev of eventos ?? []) {
    const actual = resumenPorUsuario.get(ev.user_id) ?? { total: 0, movil: 0, computador: 0, primero: ev.created_at, ultimo: ev.created_at }
    actual.total += 1
    if (ev.tipo_dispositivo === 'movil') actual.movil += 1
    else if (ev.tipo_dispositivo === 'computador') actual.computador += 1
    actual.ultimo = ev.created_at
    resumenPorUsuario.set(ev.user_id, actual)
  }

  const filas = usuariosList
    .map(u => ({ usuario: u, resumen: resumenPorUsuario.get(u.id) ?? { total: 0, movil: 0, computador: 0, primero: null, ultimo: null } }))
    .sort((a, b) => b.resumen.total - a.resumen.total)

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/usuarios" className="text-sm text-gray-500 hover:text-gray-700">← Usuarios</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Actividad de usuarios</h1>
        <p className="text-gray-500 text-sm">Cuántas veces ha entrado cada usuario al sistema y cuándo fue la última vez</p>
      </div>

      {tablaNoExiste ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">
          Falta ejecutar el script <code className="font-mono">supabase/kaltor_metricas_usuarios.sql</code> en el
          Dashboard de Supabase. Hasta entonces no hay datos de accesos registrados.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          {!filas.length ? (
            <div className="text-center py-14 text-gray-400">
              <span className="text-5xl block mb-3">📊</span>
              <p className="font-medium">Todavía no hay accesos registrados</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Total accesos</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">💻 / 📱</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Primer acceso</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Último acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filas.map(({ usuario: u, resumen }) => {
                  const rolNombre = getRoleName(u.roles)
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                            {u.nombre_completo?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.nombre_completo || '(sin nombre)'}</p>
                            <p className="text-xs text-gray-400 sm:hidden">{ROL_LABEL[rolNombre] ?? (rolNombre || '—')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{ROL_LABEL[rolNombre] ?? (rolNombre || '—')}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{resumen.total}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{resumen.computador} / {resumen.movil}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatearFecha(resumen.primero)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatearFecha(resumen.ultimo)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
