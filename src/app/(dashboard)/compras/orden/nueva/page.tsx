import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
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
        <Link href="/compras" className="text-sm text-blue-600 hover:underline">← Volver a Compras</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nueva orden de compra</h1>
      </div>
      <NuevaOrdenCompraForm
        proveedores={proveedores ?? []}
        productos={productos ?? []}
      />
    </div>
  )
}
