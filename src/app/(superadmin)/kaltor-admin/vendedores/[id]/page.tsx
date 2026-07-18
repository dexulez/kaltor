import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import VendedorActions from './_components/VendedorActions'
import ComisionRow from './_components/ComisionRow'

export const dynamic = 'force-dynamic'

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-yellow-100 text-yellow-700' },
  activo:     { label: 'Activo',     cls: 'bg-green-100 text-green-700' },
  rechazado:  { label: 'Rechazado',  cls: 'bg-red-100 text-red-700' },
  suspendido: { label: 'Suspendido', cls: 'bg-orange-100 text-orange-700' },
}

export default async function VendedorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createServiceClient()

  const [{ data: vendedor, error: vendedorErr }, { data: stores }, { data: comisiones }] = await Promise.all([
    admin.from('vendedores_externos')
      .select('id, codigo, nombre, email, telefono, rut, banco, tipo_cuenta, numero_cuenta, titular_cuenta, estado, created_at, aprobado_at, aprobado_por')
      .eq('id', id)
      .single(),
    admin.from('stores')
      .select('id, nombre, email, billing_status, created_at, plan_id')
      .eq('vendedor_id', id)
      .order('created_at', { ascending: false }),
    admin.from('comisiones_vendedor')
      .select('id, monto, estado, created_at, pagada_at, store_id')
      .eq('vendedor_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (vendedorErr || !vendedor) notFound()

  const planIds = (stores ?? []).map(s => s.plan_id).filter(Boolean) as string[]
  const { data: plans } = planIds.length
    ? await admin.from('plans').select('id, nombre').in('id', planIds)
    : { data: [] }
  const planNombrePorId = new Map((plans ?? []).map(p => [p.id, p.nombre]))
  const storeNombrePorId = new Map((stores ?? []).map(s => [s.id, s.nombre]))

  const comisionPendiente = (comisiones ?? []).filter(c => c.estado === 'pendiente').reduce((sum, c) => sum + Number(c.monto), 0)
  const comisionPagada = (comisiones ?? []).filter(c => c.estado === 'pagada').reduce((sum, c) => sum + Number(c.monto), 0)
  const tienePendientes = (comisiones ?? []).some(c => c.estado === 'pendiente')

  const statusCfg = STATUS_CFG[vendedor.estado] ?? STATUS_CFG.pendiente

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/kaltor-admin/vendedores" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">
          ← Volver
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{vendedor.nombre}</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
          {statusCfg.label}
        </span>
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{vendedor.codigo}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500">Clientes referidos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stores?.length ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500">Comisión pendiente</p>
              <p className="text-2xl font-bold text-[#C05010] mt-1">${comisionPendiente.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500">Comisión pagada</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">${comisionPagada.toLocaleString('es-CL')}</p>
            </div>
          </div>

          {/* Datos de contacto y bancarios */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-5">Datos de contacto y bancarios</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <Field label="Email" value={vendedor.email} />
              <Field label="Teléfono" value={vendedor.telefono ?? '—'} />
              <Field label="RUT" value={vendedor.rut ?? '—'} />
              <Field label="Banco" value={vendedor.banco ?? '—'} />
              <Field label="Tipo de cuenta" value={vendedor.tipo_cuenta ?? '—'} />
              <Field label="Número de cuenta" value={vendedor.numero_cuenta ?? '—'} />
              <Field label="Titular" value={vendedor.titular_cuenta ?? '—'} />
              <Field
                label="Registro"
                value={new Date(vendedor.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
              />
              {vendedor.aprobado_at && (
                <Field
                  label="Aprobado"
                  value={`${new Date(vendedor.aprobado_at).toLocaleDateString('es-CL')}${vendedor.aprobado_por ? ` por ${vendedor.aprobado_por}` : ''}`}
                />
              )}
            </dl>
          </div>

          {/* Clientes referidos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              Clientes referidos
              <span className="ml-2 text-sm font-normal text-gray-400">({stores?.length ?? 0})</span>
            </h2>
            {!stores || stores.length === 0 ? (
              <p className="text-gray-400 text-sm">Aún no tiene clientes referidos.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {stores.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{s.nombre}</p>
                      <p className="text-xs text-gray-400">
                        {s.email} · {planNombrePorId.get(s.plan_id ?? '') ?? '—'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                      {s.billing_status ?? 'trial'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comisiones */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              Comisiones
              <span className="ml-2 text-sm font-normal text-gray-400">({comisiones?.length ?? 0})</span>
            </h2>
            {!comisiones || comisiones.length === 0 ? (
              <p className="text-gray-400 text-sm">Aún no se han generado comisiones.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {comisiones.map(c => (
                  <div key={c.id}>
                    <p className="text-xs text-gray-400 pt-2.5 first:pt-0">{storeNombrePorId.get(c.store_id) ?? ''}</p>
                    <ComisionRow
                      vendedorId={id}
                      comisionId={c.id}
                      monto={Number(c.monto)}
                      estado={c.estado}
                      fecha={c.pagada_at ?? c.created_at}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <VendedorActions vendedorId={id} estado={vendedor.estado} tienePendientes={tienePendientes} />
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}
