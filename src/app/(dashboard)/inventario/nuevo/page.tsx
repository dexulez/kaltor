import { createClient, createServiceClient } from '@/lib/supabase/server'
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
    .select('store_id, permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesData = perfil?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = perfil?.permisos_modulos as Record<string, boolean> | null
  const puedeVerCostos = tieneSubPermiso('inventario.ver_costos', rolNombre, permisos)

  const storeId = (perfil as { store_id?: string } | null)?.store_id
  let tieneB2B = true
  if (storeId) {
    const admin = createServiceClient()
    const { data: storeModules } = await admin
      .from('store_modules')
      .select('module_key')
      .eq('store_id', storeId)
      .eq('activo', true)
    if (storeModules && storeModules.length > 0) {
      tieneB2B = storeModules.some((m: { module_key: string }) => m.module_key === 'canal_b2b')
    }
  }

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
      <ProductoForm categorias={categorias ?? []} proveedores={proveedores ?? []} returnTo={returnTo} puedeVerCostos={puedeVerCostos} tieneB2B={tieneB2B} />
    </div>
  )
}
