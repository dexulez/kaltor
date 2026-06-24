import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import InvitarUsuarioDialog from '@/components/usuarios/InvitarUsuarioDialog'
import InvitarCompradorDialog from '@/components/usuarios/InvitarCompradorDialog'
import UsuarioAcciones from '@/components/usuarios/UsuarioAcciones'
import { Role, UserProfile } from '@/types'
import { tieneSubPermiso } from '@/lib/modulos'

const ROL_COLOR: Record<string, string> = {
  administrador:     'bg-purple-100 text-purple-700',
  tecnico:           'bg-blue-100 text-blue-700',
  vendedor:          'bg-green-100 text-green-700',
  supervisor_ventas: 'bg-orange-100 text-orange-700',
  comprador_externo: 'bg-cyan-100 text-cyan-700',
}

const ROL_LABEL: Record<string, string> = {
  administrador:     'Administrador',
  tecnico:           'Técnico',
  vendedor:          'Vendedor',
  supervisor_ventas: 'Supervisor Ventas',
  comprador_externo: 'Comprador externo',
}

type RoleRelation = Pick<Role, 'id' | 'nombre'> | Pick<Role, 'id' | 'nombre'>[] | null

function getRoleName(roles: RoleRelation) {
  if (Array.isArray(roles)) return roles[0]?.nombre ?? ''
  return roles?.nombre ?? ''
}

type UsuarioListItem = UserProfile & {
  roles: RoleRelation
}

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfilPropio } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesDataPropio = perfilPropio?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombrePropio = (Array.isArray(rolesDataPropio) ? rolesDataPropio[0]?.nombre : rolesDataPropio?.nombre) ?? ''
  const permisosPropio = perfilPropio?.permisos_modulos as Record<string, boolean> | null
  const puedeCrear = tieneSubPermiso('usuarios.crear', rolNombrePropio, permisosPropio)
  const puedeEditar = tieneSubPermiso('usuarios.editar', rolNombrePropio, permisosPropio)
  const puedeEliminar = tieneSubPermiso('usuarios.eliminar', rolNombrePropio, permisosPropio)

  const [{ data: usuarios }, { data: roles }] = await Promise.all([
    supabase.from('user_profiles').select('*, roles(id, nombre)').order('created_at'),
    supabase.from('roles').select('id, nombre').order('nombre'),
  ])

  const todosLosUsuarios = ((usuarios ?? []) as UsuarioListItem[]).filter(u => !(u as unknown as { eliminado_at?: string | null }).eliminado_at)
  const usuariosList = todosLosUsuarios.filter(u => getRoleName(u.roles) !== 'comprador_externo')
  const compradoresList = todosLosUsuarios.filter(u => getRoleName(u.roles) === 'comprador_externo')
  const rolesStaff = (roles ?? []).filter(r => r.nombre !== 'comprador_externo')
  const rolCompradorId = (roles ?? []).find(r => r.nombre === 'comprador_externo')?.id ?? null

  const total = usuariosList.length
  const activos = usuariosList.filter(u => u.activo).length
  const admins = usuariosList.filter(u => getRoleName(u.roles) === 'administrador').length
  const tecnicos = usuariosList.filter(u => getRoleName(u.roles) === 'tecnico').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 text-sm">{total} usuario(s) en el sistema</p>
        </div>
        {puedeCrear && <InvitarUsuarioDialog roles={rolesStaff} />}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-gray-900' },
          { label: 'Activos', value: activos, color: 'text-green-600' },
          { label: 'Admins', value: admins, color: 'text-purple-700' },
          { label: 'Técnicos', value: tecnicos, color: 'text-blue-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {!usuariosList.length ? (
          <div className="text-center py-14 text-gray-400">
            <span className="text-5xl block mb-3">👥</span>
            <p className="font-medium">Sin usuarios registrados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rol actual</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuariosList.map((u) => {
                const rolNombre = getRoleName(u.roles)
                const esPropio = u.id === user?.id
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                          {u.nombre_completo?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            {u.nombre_completo || '(sin nombre)'}
                            {esPropio && <span className="text-xs text-gray-400 font-normal italic">tú</span>}
                          </p>
                          <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      {rolNombre ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROL_COLOR[rolNombre] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ROL_LABEL[rolNombre] ?? rolNombre}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Sin rol</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${u.activo ? 'text-green-600' : 'text-red-400'}`}>
                        {u.activo ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UsuarioAcciones
                          userId={u.id}
                          nombreUsuario={u.nombre_completo || u.email || 'este usuario'}
                          rolActualId={u.rol_id ?? null}
                          activo={u.activo}
                          roles={roles ?? []}
                          esPropio={esPropio}
                          puedeEditar={puedeEditar}
                          puedeEliminar={puedeEliminar}
                        />
                        {puedeEditar && (
                          <Link href={`/usuarios/${u.id}/editar`}>
                            <Button variant="ghost" size="sm" className="text-xs">Editar</Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Compradores externos (B2B) */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Compradores externos</h2>
          <p className="text-gray-500 text-sm">{compradoresList.length} cuenta(s) — otros talleres con acceso al catálogo B2B</p>
        </div>
        {puedeCrear && <InvitarCompradorDialog rolId={rolCompradorId} />}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {!compradoresList.length ? (
          <div className="text-center py-10 text-gray-400">
            <span className="text-4xl block mb-2">🛍️</span>
            <p className="text-sm">Sin compradores externos invitados todavía</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Comprador</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {compradoresList.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-sm shrink-0">
                        {u.nombre_completo?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <p className="font-medium text-gray-900">{u.nombre_completo || '(sin nombre)'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{u.telefono ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${u.activo ? 'text-green-600' : 'text-red-400'}`}>
                      {u.activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <UsuarioAcciones
                      userId={u.id}
                      nombreUsuario={u.nombre_completo || u.email || 'este comprador'}
                      rolActualId={u.rol_id ?? null}
                      activo={u.activo}
                      roles={roles ?? []}
                      esPropio={false}
                      puedeEditar={puedeEditar}
                      puedeEliminar={puedeEliminar}
                    />
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
