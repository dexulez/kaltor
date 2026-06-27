import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ServicioForm from '@/components/servicios/ServicioForm'

export default async function EditarServicioPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { id } = await params
  const { returnTo } = await searchParams
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
        <Link href={returnTo ?? '/servicios'} className="text-sm text-blue-600 hover:underline">← Volver</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Editar servicio</h1>
        <p className="text-gray-500 text-sm">{data.nombre}</p>
        {returnTo && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 inline-block">
            ↩ Al guardar volverás a donde estabas
          </p>
        )}
      </div>
      <ServicioForm servicio={data} returnTo={returnTo} />
    </div>
  )
}
