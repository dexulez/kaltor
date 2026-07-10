import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BotonVolver from '@/components/shared/BotonVolver'
import RecetaForm from '@/components/panaderia/RecetaForm'

export default async function RecetaDetailPage({ params }: { params: Promise<{ productoId: string }> }) {
  const { productoId } = await params
  const supabase = await createClient()

  const [{ data: producto }, { data: receta }, { data: ingredientesDisponibles }] = await Promise.all([
    supabase.from('products').select('*').eq('id', productoId).single(),
    supabase.from('recetas').select('*, receta_ingredientes(*, products(id, nombre, unidad_medida, precio_costo))').eq('producto_id', productoId).maybeSingle(),
    supabase.from('products').select('id, nombre, unidad_medida, precio_costo').eq('activo', true).neq('id', productoId).order('nombre'),
  ])

  if (!producto) notFound()
  if (!producto.es_elaborado) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver a recetas" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Receta de {producto.nombre}</h1>
        <p className="text-gray-500 text-sm">Define los ingredientes y el rendimiento de esta receta</p>
      </div>
      <RecetaForm
        producto={producto}
        receta={receta ?? undefined}
        ingredientesDisponibles={ingredientesDisponibles ?? []}
      />
    </div>
  )
}
