import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import UsuarioForm from '@/components/usuarios/UsuarioForm'
import { Role, UserProfile } from '@/types'

type UsuarioDetalle = Pick<UserProfile, 'id' | 'nombre_completo' | 'email' | 'telefono' | 'rol_id' | 'activo' | 'permisos_modulos'>

type RolOption = Pick<Role, 'id' | 'nombre'>

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: usuario }, { data: roles }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, nombre_completo, email, telefono, rol_id, activo, permisos_modulos')
      .eq('id', id)
      .single(),
    supabase
      .from('roles')
      .select('id, nombre')
      .order('nombre'),
  ])

  if (!usuario) notFound()

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <Link href="/usuarios" className="text-sm text-blue-600 hover:underline">← Volver a usuarios</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Editar usuario</h1>
        <p className="text-gray-500 text-sm">{usuario.nombre_completo}</p>
      </div>

      <UsuarioForm usuario={usuario as UsuarioDetalle} roles={(roles ?? []) as RolOption[]} />
    </div>
  )
}
