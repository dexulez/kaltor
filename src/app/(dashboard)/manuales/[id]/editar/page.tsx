import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ManualForm from '@/components/manuales/ManualForm'
import BotonVolver from '@/components/shared/BotonVolver'

export default async function EditarManualPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: manual } = await supabase
    .from('equipment_manuals')
    .select('*')
    .eq('id', id)
    .single()

  if (!manual) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver al manual" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Editar manual</h1>
        <p className="text-gray-500 text-sm">{manual.titulo}</p>
      </div>
      <ManualForm manual={manual} />
    </div>
  )
}
