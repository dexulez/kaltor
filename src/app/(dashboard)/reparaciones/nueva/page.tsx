import { createClient } from '@/lib/supabase/server'
import NuevaOTForm from '@/components/reparaciones/NuevaOTForm'
import BotonVolver from '@/components/shared/BotonVolver'

type TecnicoConRol = {
  id: string
  nombre_completo: string
  roles: { nombre: string } | { nombre: string }[] | null
}

function getRoleName(roles: TecnicoConRol['roles']) {
  if (Array.isArray(roles)) return roles[0]?.nombre ?? ''
  return roles?.nombre ?? ''
}

export default async function NuevaOTPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>
}) {
  const { cliente: clienteId } = await searchParams
  const supabase = await createClient()

  const { data: clientes } = await supabase
    .from('customers')
    .select('id, nombre, telefono, rut')
    .eq('activo', true)
    .order('nombre')

  const { data: tecnicos } = await supabase
    .from('user_profiles')
    .select('id, nombre_completo, roles(nombre)')
    .eq('activo', true)

  const tecnicosData = (tecnicos ?? []) as TecnicoConRol[]
  const tecnicosFiltrados = tecnicosData.filter(
    (t) => ['tecnico', 'administrador'].includes(getRoleName(t.roles))
  ) ?? []

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver a reparaciones" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nueva orden de trabajo</h1>
      </div>
      <NuevaOTForm
        clientes={clientes ?? []}
        tecnicos={tecnicosFiltrados}
        clienteIdInicial={clienteId}
      />
    </div>
  )
}
