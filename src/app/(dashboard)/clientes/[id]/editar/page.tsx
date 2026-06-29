import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClienteForm from '@/components/clientes/ClienteForm'
import BotonVolver from '@/components/shared/BotonVolver'

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: cliente } = await supabase.from('customers').select('*').eq('id', id).single()

  if (!cliente) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver al cliente" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Editar cliente</h1>
        <p className="text-gray-500 text-sm">{cliente.nombre}</p>
      </div>
      <div className="bg-white rounded-xl border p-6">
        <ClienteForm cliente={cliente} />
      </div>
    </div>
  )
}
