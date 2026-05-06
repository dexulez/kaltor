import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CobrarOTForm from '@/components/caja/CobrarOTForm'

export default async function CobrarOTPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: ot }, { data: config }] = await Promise.all([
    supabase.from('repair_orders')
      .select('*, customers(*), equipment(*), repair_items(*), user_profiles(nombre_completo)')
      .eq('id', id)
      .single(),
    supabase.from('system_config').select('*').single(),
  ])

  if (!ot) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/caja" className="text-sm text-blue-600 hover:underline">← Volver a Caja</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Cobrar reparación — <span className="font-mono text-blue-700">{(ot as { numero_ot: string }).numero_ot}</span>
        </h1>
      </div>
      <CobrarOTForm
        ot={ot as Parameters<typeof CobrarOTForm>[0]['ot']}
        config={{
          iva: config?.iva ?? 19,
          ppm: config?.ppm ?? 3,
          comision_debito: config?.comision_debito ?? 0,
          comision_credito: config?.comision_credito ?? 0,
          nombre_local: config?.nombre_local ?? 'TechRepair Pro',
          rut_local: config?.rut_local ?? null,
          direccion: config?.direccion ?? null,
          telefono: config?.telefono ?? null,
          email: config?.email ?? null,
          logo_url: config?.logo_url ?? null,
          terminos_condiciones: config?.terminos_condiciones ?? null,
        }}
      />
    </div>
  )
}
