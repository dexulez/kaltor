import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getVendedorActual } from '@/lib/vendedores/getVendedorActual'

export const dynamic = 'force-dynamic'

export default async function ComisionesVendedorPage() {
  const vendedor = await getVendedorActual()
  if (!vendedor) redirect('/login')

  const admin = createServiceClient()
  const { data: comisiones } = await admin
    .from('comisiones_vendedor')
    .select('id, monto, estado, created_at, pagada_at, store_id')
    .eq('vendedor_id', vendedor.id)
    .order('created_at', { ascending: false })

  const storeIds = [...new Set((comisiones ?? []).map(c => c.store_id))]
  const { data: stores } = storeIds.length
    ? await admin.from('stores').select('id, nombre').in('id', storeIds)
    : { data: [] }
  const storeNombrePorId = new Map((stores ?? []).map(s => [s.id, s.nombre]))

  const pendiente = (comisiones ?? []).filter(c => c.estado === 'pendiente').reduce((sum, c) => sum + Number(c.monto), 0)
  const pagada = (comisiones ?? []).filter(c => c.estado === 'pagada').reduce((sum, c) => sum + Number(c.monto), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis comisiones</h1>
        <p className="text-gray-500 text-sm mt-1">El pago de las comisiones se realiza manualmente por transferencia.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500">Pendiente de pago</p>
          <p className="text-2xl font-bold text-[#C05010] mt-1">${pendiente.toLocaleString('es-CL')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500">Pagado a la fecha</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${pagada.toLocaleString('es-CL')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {!comisiones || comisiones.length === 0 ? (
          <p className="text-gray-400 text-sm p-6">Aún no se han generado comisiones.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {comisiones.map(c => (
              <div key={c.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">${Number(c.monto).toLocaleString('es-CL')}</p>
                  <p className="text-xs text-gray-400">
                    {storeNombrePorId.get(c.store_id) ?? ''} ·{' '}
                    {new Date(c.pagada_at ?? c.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {c.estado === 'pagada' ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">Pagada</span>
                ) : (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-semibold">Pendiente</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
