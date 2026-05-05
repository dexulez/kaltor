import { createClient } from '@/lib/supabase/server'
import ProductoForm from '@/components/inventario/ProductoForm'
import Link from 'next/link'

export default async function NuevoProductoPage() {
  const supabase = await createClient()
  const [{ data: categorias }, { data: proveedores }] = await Promise.all([
    supabase.from('product_categories').select('*').order('nombre'),
    supabase.from('suppliers').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/inventario" className="text-sm text-blue-600 hover:underline">← Volver al inventario</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nuevo producto</h1>
      </div>
      <ProductoForm categorias={categorias ?? []} proveedores={proveedores ?? []} />
    </div>
  )
}
