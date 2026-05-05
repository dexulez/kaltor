import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProveedorForm from '@/components/compras/ProveedorForm'
import Link from 'next/link'

export default async function EditarProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: proveedor } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (!proveedor) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/compras" className="text-sm text-blue-600 hover:underline">← Volver</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Editar proveedor</h1>
      </div>
      <ProveedorForm proveedor={proveedor} />
    </div>
  )
}
