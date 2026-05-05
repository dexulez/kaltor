import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CargaMasivaForm from '@/components/inventario/CargaMasivaForm'

export default async function CargaMasivaPage() {
  const supabase = await createClient()

  const [{ data: categorias }, { data: proveedores }] = await Promise.all([
    supabase.from('product_categories').select('id, nombre, tipo').order('nombre'),
    supabase.from('suppliers').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <Link href="/inventario" className="text-sm text-blue-600 hover:underline">
          ← Volver al inventario
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Carga masiva de productos</h1>
        <p className="text-gray-500 text-sm">
          Importa hasta 500 productos a la vez usando un archivo Excel.
        </p>
      </div>

      <CargaMasivaForm
        categorias={categorias ?? []}
        proveedores={proveedores ?? []}
      />
    </div>
  )
}
