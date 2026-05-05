import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RepairOrder, RepairStatus, Customer, Equipment, UserProfile } from '@/types'

const ESTADOS: { value: RepairStatus | 'todas'; label: string; color: string }[] = [
  { value: 'todas',              label: 'Todas',              color: 'bg-gray-100 text-gray-700' },
  { value: 'recibido',           label: 'Recibido',           color: 'bg-gray-200 text-gray-700' },
  { value: 'en_diagnostico',     label: 'En diagnóstico',     color: 'bg-yellow-100 text-yellow-700' },
  { value: 'presupuestado',      label: 'Presupuestado',      color: 'bg-blue-100 text-blue-700' },
  { value: 'aprobado',           label: 'Aprobado',           color: 'bg-indigo-100 text-indigo-700' },
  { value: 'esperando_repuesto', label: 'Esperando repuesto', color: 'bg-orange-100 text-orange-700' },
  { value: 'en_reparacion',      label: 'En reparación',      color: 'bg-purple-100 text-purple-700' },
  { value: 'listo',              label: 'Listo',              color: 'bg-green-100 text-green-700' },
  { value: 'entregado',          label: 'Entregado',          color: 'bg-emerald-100 text-emerald-700' },
]

type RepairOrderListItem = RepairOrder & {
  customers: Pick<Customer, 'nombre' | 'telefono'> | null
  equipment: Pick<Equipment, 'marca' | 'modelo'> | null
  user_profiles: Pick<UserProfile, 'nombre_completo'> | null
}

export default async function ReparacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>
}) {
  const { estado } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('repair_orders')
    .select('*, customers(nombre, telefono), equipment(marca, modelo), user_profiles(nombre_completo)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (estado && estado !== 'todas') {
    query = query.eq('estado', estado)
  }

  const { data: ots } = await query
  const otList: RepairOrderListItem[] = (ots ?? []) as RepairOrderListItem[]
  const estadoActivo = estado ?? 'todas'

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reparaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">{otList.length} orden(es)</p>
        </div>
        <Link href="/reparaciones/nueva">
          <Button className="bg-blue-600 hover:bg-blue-700">+ Nueva OT</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => (
          <Link key={e.value} href={e.value === 'todas' ? '/reparaciones' : `/reparaciones?estado=${e.value}`}>
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all
              ${estadoActivo === e.value ? 'ring-2 ring-blue-400 ' + e.color : e.color + ' opacity-70 hover:opacity-100'}`}>
              {e.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {!otList.length ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl block mb-3">🔧</span>
            <p className="font-medium">No hay órdenes de trabajo en este estado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">OT</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Equipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Técnico</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {otList.map((ot) => {
                const estadoInfo = ESTADOS.find(e => e.value === ot.estado)
                return (
                  <tr key={ot.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{ot.numero_ot}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{ot.customers?.nombre}</p>
                      <p className="text-gray-400 text-xs">{ot.customers?.telefono}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {ot.equipment?.marca} {ot.equipment?.modelo}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {ot.user_profiles?.nombre_completo ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoInfo?.color ?? 'bg-gray-100 text-gray-700'}`}>
                        {estadoInfo?.label ?? ot.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(ot.created_at).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/reparaciones/${ot.id}`}>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
