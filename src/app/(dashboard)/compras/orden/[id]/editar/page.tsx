import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import EditarOrdenForm from '@/components/compras/EditarOrdenForm'
import BotonVolver from '@/components/shared/BotonVolver'
import { tieneSubPermiso } from '@/lib/modulos'

export default async function EditarOrdenCompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: oc }, { data: proveedores }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('purchase_orders')
      .select('*, purchase_order_items(*)')
      .eq('id', id)
      .single(),
    supabase.from('suppliers').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  if (!oc) notFound()

  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesData = perfil?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = perfil?.permisos_modulos as Record<string, boolean> | null
  const puedeEditar = tieneSubPermiso('compras.editar', rolNombre, permisos)
  const puedeEditarRecibidas = tieneSubPermiso('compras.editar_recibidas', rolNombre, permisos)
  const yaRecibida = ['recibida_parcial', 'recibida_completa'].includes(oc.estado)
  const puedeEditarAhora = puedeEditar && oc.estado !== 'cancelada' && (yaRecibida ? puedeEditarRecibidas : oc.estado !== 'en_transito')

  if (!puedeEditarAhora) redirect(`/compras/orden/${id}`)

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver a la OC" />
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{oc.numero_oc}</h1>
          <span className="text-sm text-gray-500">— Editar orden de compra</span>
        </div>
      </div>
      <EditarOrdenForm oc={oc} proveedores={proveedores ?? []} />
    </div>
  )
}
