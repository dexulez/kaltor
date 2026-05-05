import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Equipment, RepairOrder } from '@/types'

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  recibido:           { label: 'Recibido',           color: 'bg-gray-100 text-gray-700' },
  en_diagnostico:     { label: 'En diagnóstico',     color: 'bg-yellow-100 text-yellow-700' },
  presupuestado:      { label: 'Presupuestado',       color: 'bg-blue-100 text-blue-700' },
  aprobado:           { label: 'Aprobado',            color: 'bg-indigo-100 text-indigo-700' },
  rechazado:          { label: 'Rechazado',           color: 'bg-red-100 text-red-700' },
  esperando_repuesto: { label: 'Esperando repuesto',  color: 'bg-orange-100 text-orange-700' },
  en_reparacion:      { label: 'En reparación',       color: 'bg-purple-100 text-purple-700' },
  listo:              { label: 'Listo',               color: 'bg-green-100 text-green-700' },
  entregado:          { label: 'Entregado',           color: 'bg-emerald-100 text-emerald-700' },
  en_garantia:        { label: 'En garantía',         color: 'bg-teal-100 text-teal-700' },
  cancelado:          { label: 'Cancelado',           color: 'bg-gray-200 text-gray-500' },
}

type ClienteRepairOrder = RepairOrder & {
  equipment: Pick<Equipment, 'marca' | 'modelo'> | null
}

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: cliente }, { data: ots }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('repair_orders')
      .select('*, equipment(*)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!cliente) notFound()

  const otsList: ClienteRepairOrder[] = (ots ?? []) as ClienteRepairOrder[]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/clientes" className="text-sm text-blue-600 hover:underline">← Volver a clientes</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{cliente.nombre}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/clientes/${id}/editar`}>
            <Button variant="outline">Editar</Button>
          </Link>
          <Link href={`/reparaciones/nueva?cliente=${id}`}>
            <Button className="bg-blue-600 hover:bg-blue-700">+ Nueva OT</Button>
          </Link>
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="bg-white rounded-xl border p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Teléfono</p>
          <p className="font-medium">{cliente.telefono}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Email</p>
          <p className="font-medium">{cliente.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">RUT</p>
          <p className="font-medium">{cliente.rut ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Dirección</p>
          <p className="font-medium">{cliente.direccion ?? '—'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Cliente desde</p>
          <p className="font-medium">{new Date(cliente.created_at).toLocaleDateString('es-CL')}</p>
        </div>
        {cliente.notas && (
          <div className="col-span-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Notas</p>
            <p className="text-gray-700">{cliente.notas}</p>
          </div>
        )}
      </div>

      {/* Historial de reparaciones */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Historial de reparaciones ({otsList.length})
        </h2>
        <div className="bg-white rounded-xl border overflow-hidden">
          {!otsList.length ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Este cliente no tiene órdenes de trabajo registradas
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">OT</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Equipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {otsList.map((ot) => {
                  const estado = ESTADO_LABELS[ot.estado] ?? { label: ot.estado, color: 'bg-gray-100 text-gray-700' }
                  return (
                    <tr key={ot.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium">{ot.numero_ot}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {ot.equipment?.marca} {ot.equipment?.modelo}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${estado.color}`}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(ot.created_at).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/reparaciones/${ot.id}`}>
                          <Button variant="ghost" size="sm">Ver OT</Button>
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
    </div>
  )
}
