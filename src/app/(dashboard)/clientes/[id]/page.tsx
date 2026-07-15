import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BotonVolver from '@/components/shared/BotonVolver'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'
import { Equipment, RepairOrder } from '@/types'
import { labelTipoEquipo } from '@/lib/tipoEquipo'
import { tieneSubPermiso } from '@/lib/modulos'
import EliminarClienteBtn from '@/components/clientes/EliminarClienteBtn'
import AbonarClienteBtn from '@/components/clientes/AbonarClienteBtn'

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

const DOC_LABEL: Record<string, string> = {
  boleta: '🧾 Boleta', factura: '📄 Factura', presupuesto: '📋 Presupuesto',
}

type ClienteOT = RepairOrder & { equipment: (Pick<Equipment, 'marca' | 'modelo'> & { tipo_equipo?: string | null }) | null }

export default async function ClienteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab = 'reparaciones' } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfilUsuario } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesData = perfilUsuario?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = perfilUsuario?.permisos_modulos as Record<string, boolean> | null
  const puedeEditar = tieneSubPermiso('clientes.editar', rolNombre, permisos)
  const puedeEliminar = tieneSubPermiso('clientes.eliminar', rolNombre, permisos)
  const puedeCobrarCredito = tieneSubPermiso('clientes.cobrar_credito', rolNombre, permisos)

  const [{ data: cliente }, { data: ots }, { data: ventas }, { data: abonos }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('repair_orders')
      .select('*, equipment(tipo_equipo, marca, modelo)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('sales')
      .select('*, sale_items(nombre, cantidad, precio_unitario, subtotal)')
      .eq('customer_id', id)
      .eq('anulada', false)
      .order('created_at', { ascending: false }),
    supabase.from('customer_credit_payments')
      .select('*')
      .eq('customer_id', id)
      .order('fecha', { ascending: false }),
  ])

  if (!cliente) notFound()

  const otsList = (ots ?? []) as ClienteOT[]
  const ventasList = ventas ?? []
  const abonosList = abonos ?? []

  // Ledger de crédito: ventas fiado (deuda) + abonos (pago)
  const montoFiadoDeVenta = (v: typeof ventasList[number]) => {
    if (v.metodo_pago === 'fiado') return v.total - (v.monto_pago_2 ?? 0)
    if (v.metodo_pago_2 === 'fiado') return v.monto_pago_2 ?? 0
    return 0
  }
  const movimientosCredito = [
    ...ventasList
      .filter(v => montoFiadoDeVenta(v) > 0)
      .map(v => ({
        tipo: 'deuda' as const,
        monto: montoFiadoDeVenta(v),
        referencia: v.numero_venta,
        fecha: v.created_at,
      })),
    ...abonosList.map(a => ({
      tipo: 'abono' as const,
      monto: a.monto,
      referencia: a.nota || 'Abono',
      fecha: a.created_at ?? a.fecha,
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  // KPIs
  const otsActivas = otsList.filter(o => !['entregado', 'cancelado'].includes(o.estado))
  const otsEntregadas = otsList.filter(o => o.estado === 'entregado')
  const totalReparaciones = otsEntregadas.reduce((s, o) => s + (o.precio_servicio ?? 0), 0)
  const totalVentas = ventasList.reduce((s, v) => s + v.total, 0)
  const totalGastado = totalReparaciones + totalVentas
  const ultimaActividad = [...otsList, ...ventasList]
    .map(r => r.created_at)
    .sort()
    .at(-1)

  const TABS = [
    { key: 'reparaciones', label: `🔧 Reparaciones (${otsList.length})` },
    { key: 'ventas',       label: `🧾 Ventas (${ventasList.length})` },
    ...(cliente.permite_credito || cliente.saldo_deudor > 0
      ? [{ key: 'credito', label: `💳 Crédito${cliente.saldo_deudor > 0 ? ' ⚠' : ''}` }]
      : []),
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <BotonVolver label="← Volver a clientes" />
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{cliente.nombre}</h1>
          {ultimaActividad && (
            <p className="text-xs text-gray-400 mt-0.5">
              Última actividad: {new Date(ultimaActividad).toLocaleDateString('es-CL')}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {cliente.telefono && (
            <a href={`https://wa.me/${cliente.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-50">📱 WhatsApp</Button>
            </a>
          )}
          {puedeEditar && (
            <Link href={`/clientes/${id}/editar`}>
              <Button variant="outline" size="sm">✏️ Editar</Button>
            </Link>
          )}
          {puedeEliminar && <EliminarClienteBtn clienteId={id} nombreCliente={cliente.nombre} />}
          {puedeCobrarCredito && (
            <AbonarClienteBtn customerId={id} nombreCliente={cliente.nombre} saldoActual={cliente.saldo_deudor} />
          )}
          <Link href={`/reparaciones/nueva?cliente=${id}`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">+ Nueva OT</Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total gastado</p>
          <p className="text-lg font-bold text-blue-700 mt-0.5">{formatCLP(totalGastado)}</p>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide">En reparaciones</p>
          <p className="text-lg font-bold text-purple-700 mt-0.5">{formatCLP(totalReparaciones)}</p>
          <p className="text-xs text-gray-400">{otsEntregadas.length} entregadas</p>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide">En ventas</p>
          <p className="text-lg font-bold text-green-700 mt-0.5">{formatCLP(totalVentas)}</p>
          <p className="text-xs text-gray-400">{ventasList.length} transacción(es)</p>
        </div>
        <div className={`rounded-xl border p-3 ${otsActivas.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
          <p className="text-xs text-gray-400 uppercase tracking-wide">OTs activas</p>
          <p className={`text-lg font-bold mt-0.5 ${otsActivas.length > 0 ? 'text-amber-700' : 'text-gray-700'}`}>{otsActivas.length}</p>
          <p className="text-xs text-gray-400">en proceso</p>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Cliente desde</p>
          <p className="text-sm font-bold text-gray-700 mt-0.5">{new Date(cliente.created_at).toLocaleDateString('es-CL')}</p>
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="bg-white rounded-xl border p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Teléfono</p>
          <p className="font-medium">{cliente.telefono}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Email</p>
          <p className="font-medium">{cliente.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">RUT</p>
          <p className="font-medium">{cliente.rut ?? '—'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Dirección</p>
          <p className="font-medium">{cliente.direccion ?? '—'}</p>
        </div>
        {cliente.notas && (
          <div className="col-span-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Notas</p>
            <p className="text-gray-700">{cliente.notas}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex border-b">
          {TABS.map(t => (
            <Link key={t.key} href={`/clientes/${id}?tab=${t.key}`}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}>
              {t.label}
            </Link>
          ))}
        </div>

        {/* Tab Reparaciones */}
        {tab === 'reparaciones' && (
          otsList.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin órdenes de trabajo registradas</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">OT</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Equipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Precio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {otsList.map(ot => {
                  const estado = ESTADO_LABELS[ot.estado] ?? { label: ot.estado, color: 'bg-gray-100 text-gray-700' }
                  return (
                    <tr key={ot.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-blue-700">{ot.numero_ot}</td>
                      <td className="px-4 py-3 text-gray-700">{[labelTipoEquipo(ot.equipment?.tipo_equipo), ot.equipment?.marca, ot.equipment?.modelo].filter(Boolean).join(' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>{estado.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {ot.precio_servicio ? formatCLP(ot.precio_servicio) : ot.presupuesto_estimado ? <span className="text-gray-400 text-xs">Pres. {formatCLP(ot.presupuesto_estimado)}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(ot.created_at).toLocaleDateString('es-CL')}</td>
                      <td className="px-4 py-3">
                        <Link href={`/reparaciones/${ot.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">Ver OT →</Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">Total cobrado en reparaciones</td>
                  <td className="px-4 py-2 text-right font-bold text-purple-700">{formatCLP(totalReparaciones)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )
        )}

        {/* Tab Ventas */}
        {tab === 'ventas' && (
          ventasList.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin ventas registradas para este cliente</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">N° Venta</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Documento</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Método</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Productos</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ventasList.map(v => {
                  const items = (v.sale_items ?? []) as { nombre: string; cantidad: number; subtotal: number }[]
                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-gray-800">{v.numero_venta}</td>
                      <td className="px-4 py-3 text-xs">{DOC_LABEL[v.tipo_documento] ?? v.tipo_documento}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize text-xs">{v.metodo_pago}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {items.slice(0, 2).map((it, i) => (
                            <p key={i} className="text-xs text-gray-600">{it.cantidad > 1 ? `${it.cantidad}× ` : ''}{it.nombre}</p>
                          ))}
                          {items.length > 2 && <p className="text-xs text-gray-400">+{items.length - 2} más</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCLP(v.total)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(v.created_at).toLocaleDateString('es-CL')}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-xs text-gray-500">Total en ventas</td>
                  <td className="px-4 py-2 text-right font-bold text-green-700">{formatCLP(totalVentas)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )
        )}

        {/* Tab Crédito */}
        {tab === 'credito' && (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Límite</p>
                <p className="text-lg font-bold text-gray-700 mt-0.5">{formatCLP(cliente.limite_credito)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${cliente.saldo_deudor > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Deuda actual</p>
                <p className={`text-lg font-bold mt-0.5 ${cliente.saldo_deudor > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {formatCLP(cliente.saldo_deudor)}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Disponible</p>
                <p className="text-lg font-bold text-green-700 mt-0.5">
                  {formatCLP(Math.max(0, cliente.limite_credito - cliente.saldo_deudor))}
                </p>
              </div>
            </div>

            {!cliente.permite_credito && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Este cliente tiene fiado deshabilitado. Actívalo desde &quot;Editar&quot; para poder venderle a crédito.
              </p>
            )}

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Historial de movimientos</p>
              {movimientosCredito.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Sin movimientos de crédito registrados</div>
              ) : (
                <table className="w-full text-sm border rounded-xl overflow-hidden">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Tipo</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Referencia</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Monto</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {movimientosCredito.map((m, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">
                          {m.tipo === 'deuda' ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Venta fiado</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Abono</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600 font-mono text-xs">{m.referencia}</td>
                        <td className={`px-4 py-2 text-right font-bold ${m.tipo === 'deuda' ? 'text-red-600' : 'text-green-600'}`}>
                          {m.tipo === 'deuda' ? '+' : '−'} {formatCLP(m.monto)}
                        </td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{new Date(m.fecha).toLocaleDateString('es-CL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
