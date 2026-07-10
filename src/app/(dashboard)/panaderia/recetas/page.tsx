import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function RecetasPage() {
  const supabase = await createClient()

  const [{ data: productos }, { data: recetas }] = await Promise.all([
    supabase.from('products').select('id, nombre, unidad_medida, activo').eq('es_elaborado', true).order('nombre'),
    supabase.from('recetas').select('producto_id, rendimiento_cantidad, rendimiento_unidad'),
  ])

  const recetaPorProducto = new Map((recetas ?? []).map(r => [r.producto_id, r]))

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📖 Recetas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Productos elaborados y sus recetas</p>
        </div>
        <Link href="/inventario/nuevo">
          <Button className="bg-orange-600 hover:bg-orange-700">+ Nuevo producto elaborado</Button>
        </Link>
      </div>

      {(productos ?? []).length === 0 ? (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">📖</span>
          <p className="font-medium text-gray-600">Sin productos elaborados</p>
          <p className="text-sm mt-1">Marca un producto como &quot;elaborado&quot; desde su ficha en Inventario para crearle una receta aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(productos ?? []).map(p => {
            const receta = recetaPorProducto.get(p.id)
            return (
              <div key={p.id} className={`bg-white rounded-xl border p-4 space-y-3 ${!p.activo ? 'opacity-50' : ''}`}>
                <div>
                  <p className="font-bold text-gray-900">{p.nombre}</p>
                  {receta ? (
                    <p className="text-xs text-green-700 mt-0.5">✓ Receta: rinde {receta.rendimiento_cantidad} {receta.rendimiento_unidad}</p>
                  ) : (
                    <p className="text-xs text-amber-600 mt-0.5">Sin receta definida</p>
                  )}
                </div>
                <Link href={`/panaderia/recetas/${p.id}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    {receta ? 'Editar receta' : 'Crear receta'}
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
