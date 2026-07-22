import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BotonVolver from '@/components/shared/BotonVolver'
import RespaldoManager from '@/components/configuracion/RespaldoManager'

type RoleRelation = { nombre?: string } | { nombre?: string }[] | null

function getRoleName(roles: RoleRelation) {
  if (Array.isArray(roles)) return roles[0]?.nombre ?? ''
  return roles?.nombre ?? ''
}

export default async function RespaldoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('roles(nombre)')
    .eq('id', user.id)
    .single()

  const rolNombre = getRoleName(perfil?.roles as RoleRelation)
  if (rolNombre !== 'administrador') redirect('/configuracion')

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <BotonVolver label="← Volver a Configuración" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Respaldo y limpieza del sistema</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Descarga respaldos de tus datos y, si lo necesitas, borra categorías completas por separado. Esta acción no se puede deshacer.
        </p>
      </div>
      <RespaldoManager />
    </div>
  )
}
