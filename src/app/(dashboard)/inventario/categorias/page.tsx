import { createClient } from '@/lib/supabase/server'
import BotonVolver from '@/components/shared/BotonVolver'
import CategoriasManager from '@/components/inventario/CategoriasManager'

export default async function CategoriasPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('product_categories')
    .select('*, productos_count:products(count)')
    .order('nombre')

  const categorias = (data ?? []).map(c => ({
    ...c,
    productos_count: (c.productos_count as unknown as { count: number }[])[0]?.count ?? 0,
  }))

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver al inventario" />
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-gray-900">Categorías de productos</h1>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {categorias.length} categorías
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Crea y organiza las categorías para clasificar tu inventario.
        </p>
      </div>

      <CategoriasManager categorias={categorias} />
    </div>
  )
}
