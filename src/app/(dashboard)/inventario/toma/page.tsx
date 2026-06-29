import { createClient } from '@/lib/supabase/server'
import TomaInventarioChecklist from '@/components/inventario/TomaInventarioChecklist'
import BotonVolver from '@/components/shared/BotonVolver'

type ProductoToma = {
  id: string
  nombre: string
  sku: string | null
  stock_actual: number
  stock_minimo: number
  product_categories: { nombre: string }[] | null
}

export default async function TomaInventarioPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select('id, nombre, sku, stock_actual, stock_minimo, product_categories(nombre)')
    .eq('activo', true)
    .order('nombre')

  const productos = ((data ?? []) as ProductoToma[]).map((producto) => ({
    id: producto.id,
    nombre: producto.nombre,
    sku: producto.sku,
    stock_actual: producto.stock_actual ?? 0,
    stock_minimo: producto.stock_minimo ?? 0,
    categoria_nombre: producto.product_categories?.[0]?.nombre ?? 'Sin categoría',
  }))

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver al inventario" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Toma de inventario</h1>
        <p className="text-sm text-gray-500 mt-1">
          Genera checklist y compara stock del sistema con conteo físico real.
        </p>
      </div>

      <TomaInventarioChecklist productos={productos} />
    </div>
  )
}
