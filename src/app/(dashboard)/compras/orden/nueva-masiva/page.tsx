import { createClient } from '@/lib/supabase/server'
import BotonVolver from '@/components/shared/BotonVolver'
import CargaMasivaOrdenForm from '@/components/compras/CargaMasivaOrdenForm'

export default async function NuevaOrdenMasivaPage() {
  const supabase = await createClient()

  const [{ data: proveedores }, { data: categorias }] = await Promise.all([
    supabase.from('suppliers').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('product_categories').select('id, nombre, tipo').order('nombre'),
  ])

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div>
        <BotonVolver label="← Volver a Compras" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Carga masiva de compra</h1>
        <p className="text-gray-500 text-sm">
          Crea una orden de compra completa desde Excel. Los productos nuevos se dan de alta automáticamente en inventario.
        </p>
      </div>

      <CargaMasivaOrdenForm
        proveedores={proveedores ?? []}
        categorias={categorias ?? []}
      />
    </div>
  )
}
