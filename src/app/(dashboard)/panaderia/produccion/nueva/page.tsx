import { createClient } from '@/lib/supabase/server'
import BotonVolver from '@/components/shared/BotonVolver'
import ProduccionForm from '@/components/panaderia/ProduccionForm'

export default async function NuevaProduccionPage() {
  const supabase = await createClient()

  const { data: productosConReceta } = await supabase
    .from('recetas')
    .select('*, products(id, nombre, unidad_medida, stock_actual), receta_ingredientes(*, products(id, nombre, unidad_medida, stock_actual, precio_costo))')

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver a producción" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nueva producción</h1>
        <p className="text-gray-500 text-sm">Registra un lote de producción para descontar ingredientes y sumar stock</p>
      </div>
      <ProduccionForm recetas={productosConReceta ?? []} />
    </div>
  )
}
