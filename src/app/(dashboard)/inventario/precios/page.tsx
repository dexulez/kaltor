import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PreciosTable from '@/components/inventario/PreciosTable'

export default async function PreciosPage() {
  const supabase = await createClient()
  const { data: productos } = await supabase
    .from('products')
    .select('id, nombre, sku, precio_costo, costo_envio, precio_venta, precio_incluye_iva, stock_actual, product_categories(nombre)')
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/inventario" className="text-sm text-blue-600 hover:underline">← Volver al inventario</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Gestión de precios</h1>
        <p className="text-gray-500 text-sm">Edita precios y márgenes directamente. Visualiza utilidades unitarias y totales.</p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
  <PreciosTable productos={(productos ?? []) as any} />
    </div>
  )
}
