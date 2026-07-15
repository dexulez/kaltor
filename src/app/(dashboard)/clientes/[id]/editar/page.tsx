import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClienteForm from '@/components/clientes/ClienteForm'
import BotonVolver from '@/components/shared/BotonVolver'
import { tieneSubPermiso } from '@/lib/modulos'

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: cliente } = await supabase.from('customers').select('*').eq('id', id).single()

  if (!cliente) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesData = perfil?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = perfil?.permisos_modulos as Record<string, boolean> | null
  const puedeOtorgarCredito = tieneSubPermiso('clientes.otorgar_credito', rolNombre, permisos)

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver al cliente" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Editar cliente</h1>
        <p className="text-gray-500 text-sm">{cliente.nombre}</p>
      </div>
      <div className="bg-white rounded-xl border p-6">
        <ClienteForm cliente={cliente} puedeOtorgarCredito={puedeOtorgarCredito} />
      </div>
    </div>
  )
}
