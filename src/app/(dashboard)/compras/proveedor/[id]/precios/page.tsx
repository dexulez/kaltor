import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BotonVolver from '@/components/shared/BotonVolver'
import PreciosProveedorManager from '@/components/compras/PreciosProveedorManager'

export default async function PreciosProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: proveedor }, { data: precios }, { data: productos }] = await Promise.all([
    supabase.from('suppliers').select('*').eq('id', id).single(),
    supabase.from('supplier_product_prices').select('*').eq('supplier_id', id).order('nombre_repuesto'),
    supabase.from('products').select('*').eq('activo', true).order('nombre'),
  ])

  if (!proveedor) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver a Proveedores" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Lista de precios — {proveedor.nombre}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Carga aquí los precios que este proveedor cobra por cada repuesto, para poder compararlos con otros proveedores al crear una orden de compra.
        </p>
      </div>
      <PreciosProveedorManager
        supplierId={id}
        preciosIniciales={precios ?? []}
        productos={productos ?? []}
      />
    </div>
  )
}
