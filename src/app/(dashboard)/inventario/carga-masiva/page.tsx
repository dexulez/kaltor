import { createClient } from '@/lib/supabase/server'
import BotonVolver from '@/components/shared/BotonVolver'
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
        <BotonVolver label="← Volver al inventario" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Carga masiva de productos</h1>
        <p className="text-gray-500 text-sm">
          Importa hasta 5000 productos a la vez usando un archivo Excel.
        </p>
      </div>

      <CargaMasivaForm
        categorias={categorias ?? []}
        proveedores={proveedores ?? []}
      />
    </div>
  )
}
