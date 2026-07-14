import { createServiceClient } from '@/lib/supabase/server'
import PlanesEditor from './_components/PlanesEditor'

export const dynamic = 'force-dynamic'

export default async function PlanesPage() {
  const admin = createServiceClient()
  const { data: plans } = await admin
    .from('plans')
    .select('id, nombre, slug, precio_mensual, precio_anual, precio_mensual_usd, precios_pais, activo')
    .order('precio_mensual', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Precios de planes</h1>
        <p className="text-gray-500 text-sm mt-1 max-w-2xl">
          Define el precio en pesos chilenos (CLP) y en dólares (USD) de cada plan. Chile siempre
          ve el precio en CLP, y los países dolarizados ven el precio en USD directamente. Al
          guardar un nuevo precio en USD, los precios manuales por país se recalculan
          automáticamente desde ese valor — luego puedes ajustarlos país por país en
          &quot;Ver por país&quot;, y esos ajustes serán el precio real que verán los visitantes de
          cada país.
        </p>
      </div>
      <PlanesEditor plans={plans ?? []} />
    </div>
  )
}
