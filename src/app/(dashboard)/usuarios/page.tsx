import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import InvitarUsuarioDialog from '@/components/usuarios/InvitarUsuarioDialog'
import UsuarioAcciones from '@/components/usuarios/UsuarioAcciones'
import { Role, UserProfile } from '@/types'

const ROL_COLOR: Record<string, string> = {
  administrador:     'bg-purple-100 text-purple-700',
  tecnico:           'bg-blue-100 text-blue-700',
  vendedor:          'bg-green-100 text-green-700',
  supervisor_ventas: 'bg-orange-100 text-orange-700',
}

const ROL_LABEL: Record<string, string> = {
  administrador:     'Administrador',
  tecnico:           'Técnico',
  vendedor:          'Vendedor',
  supervisor_ventas: 'Supervisor Ventas',
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

  const [{ data: usuarios }, { data: roles }] = await Promise.all([
    supabase.from('user_profiles').select('*, roles(id, nombre)').order('created_at'),
    supabase.from('roles').select('id, nombre').order('nombre'),
  ])

  const usuariosList = (usuarios ?? []) as UsuarioListItem[]

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
        <InvitarUsuarioDialog roles={roles ?? []} />
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
                          rolActualId={u.rol_id ?? null}
                          activo={u.activo}
                          roles={roles ?? []}
                          esPropio={esPropio}
                        />
                        <Link href={`/usuarios/${u.id}/editar`}>
                          <Button variant="ghost" size="sm" className="text-xs">Editar</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
