import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getVendedorActual } from '@/lib/vendedores/getVendedorActual'

export const dynamic = 'force-dynamic'

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  trial:     { label: 'En trial',      cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Activo',        cls: 'bg-green-100 text-green-700' },
  pending:   { label: 'Pendiente',     cls: 'bg-yellow-100 text-yellow-700' },
  past_due:  { label: 'Pago vencido',  cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelado',     cls: 'bg-gray-100 text-gray-500' },
  suspended: { label: 'Suspendido',    cls: 'bg-orange-100 text-orange-700' },
}

export default async function ClientesVendedorPage() {
  const vendedor = await getVendedorActual()
  if (!vendedor) redirect('/login')

  const admin = createServiceClient()
  const { data: stores } = await admin
    .from('stores')
    .select('id, nombre, email, billing_status, created_at, plan_id')
    .eq('vendedor_id', vendedor.id)
    .order('created_at', { ascending: false })

  const planIds = [...new Set((stores ?? []).map(s => s.plan_id).filter(Boolean))] as string[]
  const { data: plans } = planIds.length
    ? await admin.from('plans').select('id, nombre').in('id', planIds)
    : { data: [] }
  const planNombrePorId = new Map((plans ?? []).map(p => [p.id, p.nombre]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis clientes referidos</h1>
        <p className="text-gray-500 text-sm mt-1">Tiendas que se registraron con tu código.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {!stores || stores.length === 0 ? (
          <p className="text-gray-400 text-sm p-6">Aún no tienes clientes referidos.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {stores.map(s => {
              const cfg = STATUS_CFG[s.billing_status ?? 'trial'] ?? STATUS_CFG.trial
              return (
                <div key={s.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {s.email} · {planNombrePorId.get(s.plan_id ?? '') ?? '—'} · desde{' '}
                      {new Date(s.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
