import { createServiceClient } from '@/lib/supabase/server'
import PlanesEditor from './_components/PlanesEditor'

export const dynamic = 'force-dynamic'

export default async function PlanesPage() {
  const admin = createServiceClient()
  const { data: plans } = await admin
    .from('plans')
    .select('id, nombre, slug, precio_mensual, precio_anual, precio_mensual_usd, activo')
    .order('precio_mensual', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Precios de planes</h1>
        <p className="text-gray-500 text-sm mt-1 max-w-2xl">
          Define el precio en dólares (USD) de cada plan. El precio en CLP se recalcula
          automáticamente según el tipo de cambio vigente, y los visitantes de otros países
          ven el equivalente convertido a su moneda local en la landing page.
        </p>
      </div>
      <PlanesEditor plans={plans ?? []} />
    </div>
  )
}
