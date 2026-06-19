import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProductoForm from '@/components/inventario/ProductoForm'
import Link from 'next/link'
import { tieneSubPermiso } from '@/lib/modulos'

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const [{ data: producto }, { data: categorias }, { data: proveedores }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    supabase.from('product_categories').select('*').order('nombre'),
    supabase.from('suppliers').select('id, nombre').eq('activo', true).order('nombre'),
  ])
  if (!producto) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/inventario" className="text-sm text-blue-600 hover:underline">← Volver al inventario</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Editar producto</h1>
        <p className="text-gray-500 text-sm">{producto.nombre}</p>
      </div>
      <ProductoForm producto={producto} categorias={categorias ?? []} proveedores={proveedores ?? []} puedeVerCostos={puedeVerCostos} />
    </div>
  )
}
