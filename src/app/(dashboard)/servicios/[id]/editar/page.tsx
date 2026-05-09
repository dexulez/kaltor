import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ServicioForm from '@/components/servicios/ServicioForm'

export default async function EditarServicioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('repair_services')
    .select('*, repair_service_items(*)')
    .eq('id', id)
    .single()

  if (!data) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/servicios" className="text-sm text-blue-600 hover:underline">← Volver a servicios</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Editar servicio</h1>
        <p className="text-gray-500 text-sm">{data.nombre}</p>
      </div>
      <ServicioForm servicio={data} />
    </div>
  )
}
