import { createClient } from '@/lib/supabase/server'
import BotonVolver from '@/components/shared/BotonVolver'
import NuevaOrdenCompraForm from '@/components/compras/NuevaOrdenCompraForm'

export default async function NuevaOrdenCompraPage() {
  const supabase = await createClient()

  const [{ data: proveedores }, { data: productos }] = await Promise.all([
    supabase.from('suppliers').select('*').eq('activo', true).order('nombre'),
    supabase.from('products').select('*').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver a Compras" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nueva orden de compra</h1>
      </div>
      <NuevaOrdenCompraForm
        proveedores={proveedores ?? []}
        productos={productos ?? []}
      />
    </div>
  )
}
