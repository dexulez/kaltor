import { createClient } from '@/lib/supabase/server'
import ProductoForm from '@/components/inventario/ProductoForm'
import Link from 'next/link'

export default async function NuevoProductoPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  const supabase = await createClient()
  const [{ data: categorias }, { data: proveedores }] = await Promise.all([
    supabase.from('product_categories').select('*').order('nombre'),
    supabase.from('suppliers').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href={returnTo ?? '/inventario'} className="text-sm text-blue-600 hover:underline">← Volver</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nuevo producto</h1>
        {returnTo && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 inline-block">
            ↩ Al guardar volverás a donde estabas
          </p>
        )}
      </div>
      <ProductoForm categorias={categorias ?? []} proveedores={proveedores ?? []} returnTo={returnTo} />
    </div>
  )
}
