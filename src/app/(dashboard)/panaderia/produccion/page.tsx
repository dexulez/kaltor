import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'

export default async function ProduccionPage() {
  const supabase = await createClient()

  const { data: producciones } = await supabase
    .from('producciones')
    .select('*, products(nombre, unidad_medida)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🥖 Producción</h1>
          <p className="text-gray-500 text-sm mt-0.5">Historial de lotes de producción registrados</p>
        </div>
        <Link href="/panaderia/produccion/nueva">
          <Button className="bg-orange-600 hover:bg-orange-700">+ Nueva producción</Button>
        </Link>
      </div>

      {(producciones ?? []).length === 0 ? (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">🥖</span>
          <p className="font-medium text-gray-600">Sin producciones registradas</p>
          <Link href="/panaderia/produccion/nueva"><Button className="mt-4 bg-orange-600 hover:bg-orange-700">+ Registrar primera producción</Button></Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {(producciones ?? []).map(p => (
            <div key={p.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-gray-900">{p.products?.nombre ?? 'Producto eliminado'}</p>
                <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString('es-CL')}</p>
                {p.notas && <p className="text-xs text-gray-500 mt-0.5">{p.notas}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-800">{p.cantidad_producida} {p.products?.unidad_medida ?? ''}</p>
                <p className="text-xs text-gray-400">Costo total: {formatCLP(p.costo_total)} · unitario: {formatCLP(p.costo_unitario)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
