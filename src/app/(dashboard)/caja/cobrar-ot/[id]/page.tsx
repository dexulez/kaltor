import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CobrarOTForm from '@/components/caja/CobrarOTForm'
import { Customer, Equipment, RepairItem, RepairOrder, SystemConfig } from '@/types'

type CobroOT = RepairOrder & {
  customers: Pick<Customer, 'nombre'> | null
  equipment: Pick<Equipment, 'marca' | 'modelo'> | null
  repair_items: RepairItem[] | null
}

type CobroConfig = Pick<SystemConfig, 'iva' | 'ppm' | 'comision_debito' | 'comision_credito'>

export default async function CobrarOTPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: ot }, { data: config }] = await Promise.all([
    supabase.from('repair_orders')
      .select('*, customers(*), equipment(*), repair_items(*)')
      .eq('id', id)
      .single(),
    supabase.from('system_config').select('*').single(),
  ])

  if (!ot) notFound()

  const otData = ot as CobroOT
  const configData: CobroConfig = config
    ? {
      iva: config.iva,
      ppm: config.ppm,
      comision_debito: config.comision_debito,
      comision_credito: config.comision_credito,
    }
    : {
      iva: 19,
      ppm: 3,
      comision_debito: 0,
      comision_credito: 0,
    }

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/caja" className="text-sm text-blue-600 hover:underline">← Volver a Caja</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Cobrar reparación — <span className="font-mono text-blue-700">{otData.numero_ot}</span>
        </h1>
      </div>
      <CobrarOTForm ot={otData} config={configData} />
    </div>
  )
}
