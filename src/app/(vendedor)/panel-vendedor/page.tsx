import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getVendedorActual } from '@/lib/vendedores/getVendedorActual'
import CrearInvitacion from './_components/CrearInvitacion'

export const dynamic = 'force-dynamic'

export default async function PanelVendedorPage() {
  const vendedor = await getVendedorActual()
  if (!vendedor) redirect('/login')

  const admin = createServiceClient()

  const [{ data: stores }, { data: comisiones }, { data: plans }, { data: config }] = await Promise.all([
    admin.from('stores').select('id, billing_status').eq('vendedor_id', vendedor.id),
    admin.from('comisiones_vendedor').select('monto, estado').eq('vendedor_id', vendedor.id),
    admin.from('plans').select('slug, nombre, precio_mensual').eq('activo', true).eq('es_especial', false).order('precio_mensual', { ascending: true }),
    admin.from('config_vendedores').select('tope_descuento_pct').eq('id', 1).maybeSingle(),
  ])

  const clientesActivos = (stores ?? []).filter(s => s.billing_status === 'active').length
  const comisionPendiente = (comisiones ?? []).filter(c => c.estado === 'pendiente').reduce((sum, c) => sum + Number(c.monto), 0)
  const comisionPagada = (comisiones ?? []).filter(c => c.estado === 'pagada').reduce((sum, c) => sum + Number(c.monto), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hola, {vendedor.nombre.split(' ')[0]}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tu código de vendedor es <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{vendedor.codigo}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500">Clientes referidos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stores?.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">{clientesActivos} activos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500">Comisión pendiente de pago</p>
          <p className="text-2xl font-bold text-[#C05010] mt-1">${comisionPendiente.toLocaleString('es-CL')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500">Comisión pagada</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${comisionPagada.toLocaleString('es-CL')}</p>
        </div>
      </div>

      <CrearInvitacion
        codigo={vendedor.codigo}
        plans={plans ?? []}
        topePct={config?.tope_descuento_pct ?? 15}
      />
    </div>
  )
}
