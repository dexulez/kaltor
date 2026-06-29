import { createClient } from '@/lib/supabase/server'
import ProductoForm from '@/components/inventario/ProductoForm'
import BotonVolver from '@/components/shared/BotonVolver'
import { tieneSubPermiso } from '@/lib/modulos'

export default async function NuevoProductoPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
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
  const puedeVerCostos = tieneSubPermiso('inventario.ver_costos', rolNombre, permisos)

  const [{ data: categorias }, { data: proveedores }] = await Promise.all([
    supabase.from('product_categories').select('*').order('nombre'),
    supabase.from('suppliers').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nuevo producto</h1>
        {returnTo && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 inline-block">
            ↩ Al guardar volverás a donde estabas
          </p>
        )}
      </div>
      <ProductoForm categorias={categorias ?? []} proveedores={proveedores ?? []} returnTo={returnTo} puedeVerCostos={puedeVerCostos} />
    </div>
  )
}
