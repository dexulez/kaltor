import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditarOTForm from '@/components/reparaciones/EditarOTForm'

export default async function EditarOTPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: ot }, { data: tecnicos }] = await Promise.all([
    supabase.from('repair_orders')
      .select('*, customers(*), equipment(*), user_profiles(id, nombre_completo)')
      .eq('id', id)
      .single(),
    supabase.from('user_profiles').select('id, nombre_completo').eq('activo', true).order('nombre_completo'),
  ])

  if (!ot) notFound()

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <Link href={`/reparaciones/${id}`} className="text-sm text-blue-600 hover:underline">← Volver a la OT</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Editar OT — <span className="font-mono text-blue-700">{(ot as { numero_ot: string }).numero_ot}</span>
        </h1>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 inline-block">
          ⚠ Usa esta pantalla solo para corregir errores de captura
        </p>
      </div>
      <EditarOTForm ot={ot as Parameters<typeof EditarOTForm>[0]['ot']} tecnicos={tecnicos ?? []} />
    </div>
  )
}
