import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditarOrdenForm from '@/components/compras/EditarOrdenForm'

export default async function EditarOrdenCompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: oc }, { data: proveedores }] = await Promise.all([
    supabase.from('purchase_orders')
      .select('*, purchase_order_items(*)')
      .eq('id', id)
      .single(),
    supabase.from('suppliers').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  if (!oc) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href={`/compras/orden/${id}`} className="text-sm text-blue-600 hover:underline">← Volver a la OC</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{oc.numero_oc}</h1>
          <span className="text-sm text-gray-500">— Editar orden de compra</span>
        </div>
      </div>
      <EditarOrdenForm oc={oc} proveedores={proveedores ?? []} />
    </div>
  )
}
