import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCLP } from '@/lib/calculations'
import { Customer, Equipment, RepairOrder } from '@/types'
import SesionCajaPanel from '@/components/caja/SesionCajaPanel'
import AnularVentaBtn from '@/components/caja/AnularVentaBtn'
import ReprintVentaBtn from '@/components/caja/ReprintVentaBtn'
import VerVentaBtn from '@/components/caja/VerVentaBtn'
import { tieneSubPermiso } from '@/lib/modulos'
import MisComisionesHoy from '@/components/caja/MisComisionesHoy'

type OtPendienteCaja = RepairOrder & {
  customers: Pick<Customer, 'nombre'> | null
  equipment: (Pick<Equipment, 'marca' | 'modelo'> & { tipo_equipo?: string | null }) | null
}

export default async function CajaPage() {
  const supabase = await createClient()
  const hoy = new Intl.DateTimeFormat('sv', { timeZone: 'America/Santiago' }).format(new Date())

  const { data: { user } } = await supabase.auth.getUser()

  // Obtener sesión activa para filtrar ventas solo de esta sesión
  const { data: sesionActiva } = await supabase
    .from('sesiones_caja')
    .select('id, apertura_at')
    .eq('fecha', hoy)
    .eq('estado', 'abierta')
    .maybeSingle()

  // Filtrar ventas desde la apertura de la sesión actual (o inicio del día como fallback)
  const desdeSession = sesionActiva?.apertura_at ?? `${hoy}T00:00:00.000Z`

  const [{ data: ventasHoy }, { data: ultimasVentas }, { data: otsPendientes }, { data: perfil }, { data: sysConfig }] = await Promise.all([
    supabase.from('sales').select('total, metodo_pago, iva, ppm')
      .gte('created_at', desdeSession).eq('anulada', false),
    supabase.from('sales').select(`
      id, numero_venta, tipo, total, metodo_pago, tipo_documento, created_at, anulada, repair_order_id,
      customers(nombre),
      repair_orders(numero_ot, equipment(tipo_equipo, marca, modelo)),
      sale_items(nombre, cantidad, precio_unitario)
    `).gte('created_at', desdeSession)
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('repair_orders').select('*, customers(nombre), equipment(tipo_equipo, marca, modelo)')
      .eq('estado', 'listo').order('updated_at', { ascending: false }).limit(10),
    supabase.from('user_profiles').select('permisos_modulos, roles(nombre)').eq('id', user!.id).single(),
    supabase.from('system_config').select('pin_autorizacion, nombre_local, rut_local, direccion, telefono, email, logo_url, iva, comision_debito, comision_credito').maybeSingle()
      .then(r => r.error ? { data: null } : r),
  ])

  const rolesData = perfil?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = perfil?.permisos_modulos as Record<string, boolean> | null
  const puedeAnular = tieneSubPermiso('caja.anular', rolNombre, permisos)
  const cfgRaw = sysConfig as { pin_autorizacion?: string; nombre_local?: string; rut_local?: string; direccion?: string; telefono?: string; email?: string; logo_url?: string; iva?: number; comision_debito?: number; comision_credito?: number } | null
  const pinAdmin = cfgRaw?.pin_autorizacion ?? null
  const ticketCfg = {
    nombre_local: cfgRaw?.nombre_local ?? '',
    rut_local: cfgRaw?.rut_local ?? null,
    direccion: cfgRaw?.direccion ?? null,
    telefono: cfgRaw?.telefono ?? null,
    email: cfgRaw?.email ?? null,
    logo_url: cfgRaw?.logo_url ?? null,
  }

  const totalHoy = ventasHoy?.reduce((s, v) => s + v.total, 0) ?? 0
  const ivaHoy = ventasHoy?.reduce((s, v) => s + (v.iva ?? 0), 0) ?? 0
  const ppmHoy = ventasHoy?.reduce((s, v) => s + (v.ppm ?? 0), 0) ?? 0
  const netoHoy = totalHoy - ivaHoy - ppmHoy
  type VentaRow = {
    id: string; numero_venta: string; tipo: string; total: number
    metodo_pago: string; tipo_documento: string; created_at: string
    anulada: boolean; repair_order_id: string | null
    customers: { nombre: string } | { nombre: string }[] | null
    repair_orders: { numero_ot: string; equipment: { tipo_equipo?: string | null; marca: string; modelo: string } | null } | null
    sale_items: { nombre: string; cantidad: number; precio_unitario: number }[]
  }
  const ultimasVentasList = (ultimasVentas ?? []) as unknown as VentaRow[]
  const otsPendientesList: OtPendienteCaja[] = (otsPendientes ?? []) as OtPendienteCaja[]

  const METODOS = ['efectivo', 'transferencia', 'debito', 'credito']
  const totalesPorMetodo = METODOS.map(m => ({
    metodo: m,
    total: ventasHoy?.filter(v => v.metodo_pago === m).reduce((s, v) => s + v.total, 0) ?? 0,
  }))

  const METODO_LABELS: Record<string, string> = {
    efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia',
    debito: '💳 Débito', credito: '💳 Crédito',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caja / Ventas</h1>
          <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/caja/cierres">
            <Button variant="outline" className="text-gray-600 border-gray-300">📋 Historial cierres</Button>
          </Link>
          <Link href="/caja/venta-directa">
            <Button className="bg-green-600 hover:bg-green-700">🛒 Venta directa</Button>
          </Link>
        </div>
      </div>

      <SesionCajaPanel />

      {/* Comisiones del técnico logueado */}
      <MisComisionesHoy
        userId={user!.id}
        ivaRate={cfgRaw?.iva ?? 19}
        comisionDebito={cfgRaw?.comision_debito ?? 1.5}
        comisionCredito={cfgRaw?.comision_credito ?? 2.5}
      />

      {/* Resumen de la sesión */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Total sesión</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCLP(totalHoy)}</p>
            {sesionActiva && <p className="text-xs text-gray-400 mt-0.5">desde {new Date(sesionActiva.apertura_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Neto</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-700">{formatCLP(netoHoy)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">IVA (19%)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-gray-700">{formatCLP(ivaHoy)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">PPM (3%)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-gray-700">{formatCLP(ppmHoy)}</p></CardContent>
        </Card>
      </div>

      {/* Por método de pago */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {totalesPorMetodo.map(({ metodo, total }) => (
          <div key={metodo} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 mb-1">{METODO_LABELS[metodo]}</p>
            <p className="text-lg font-bold text-gray-800">{formatCLP(total)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OTs listas para cobrar */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">🔧 OTs listas para entregar</h2>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!otsPendientesList.length ? (
              <p className="text-center text-gray-400 py-8 text-sm">No hay OTs listas para cobro</p>
            ) : (
              <div className="divide-y">
                {otsPendientesList.map((ot) => (
                  <div key={ot.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono font-bold text-blue-700 text-sm">{ot.numero_ot}</p>
                      <p className="text-sm text-gray-700">{ot.customers?.nombre}</p>
                      <p className="text-xs text-gray-400">{[ot.equipment?.tipo_equipo?.replace(/^./, c => c.toUpperCase()), ot.equipment?.marca, ot.equipment?.modelo].filter(Boolean).join(' ')}</p>
                    </div>
                    <Link href={`/caja/venta-directa?ot=${ot.id}`}>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 shrink-0">Cobrar</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Últimas ventas */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">🧾 Ventas de esta sesión</h2>
          <div className="bg-white rounded-xl border overflow-hidden">
            {!ultimasVentasList.length ? (
              <p className="text-center text-gray-400 py-8 text-sm">
                {sesionActiva ? 'Sin ventas en esta sesión' : 'Abre la caja para registrar ventas'}
              </p>
            ) : (
              <div className="divide-y">
                {ultimasVentasList.map((v) => {
                  const nombreCliente = Array.isArray(v.customers) ? v.customers[0]?.nombre : v.customers?.nombre
                  // Preview inline de lo que se vendió
                  const ot = v.repair_orders
                  const eq = ot?.equipment
                  const equipoDesc = eq ? [eq.tipo_equipo?.replace(/^./, c => c.toUpperCase()), eq.marca, eq.modelo].filter(Boolean).join(' ') : null
                  const items = v.sale_items ?? []
                  const preview = v.tipo === 'reparacion' && equipoDesc
                    ? `${ot?.numero_ot ?? ''} · ${equipoDesc}`
                    : items.length >= 1
                      ? `${items[0].nombre}${items.length > 1 ? ` + ${items.length - 1} más` : ''}`
                      : null
                  return (
                    <div key={v.id} className={`px-4 py-3 ${v.anulada ? 'opacity-50 bg-red-50' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Header de la tarjeta */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono text-xs font-semibold text-gray-600">{v.numero_venta}</p>
                            {v.anulada && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Anulada</span>}
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${v.tipo === 'reparacion' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {v.tipo === 'reparacion' ? '🔧 OT' : '🛒 Directa'}
                            </span>
                          </div>
                          {/* Cliente */}
                          <p className="text-sm font-medium text-gray-800 truncate mt-0.5">{nombreCliente ?? 'Sin cliente'}</p>
                          {/* Preview de productos / equipo */}
                          {preview && (
                            <p className="text-xs text-blue-700 font-medium truncate mt-0.5 bg-blue-50 rounded px-1.5 py-0.5 inline-block max-w-full">{preview}</p>
                          )}
                          {/* Método y documento */}
                          <p className="text-xs text-gray-400 capitalize mt-0.5">{v.metodo_pago} · {v.tipo_documento}</p>
                        </div>
                        {/* Total y acciones */}
                        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                          <p className={`font-bold text-base ${v.anulada ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{formatCLP(v.total)}</p>
                          <div className="flex items-center gap-1">
                            <VerVentaBtn ventaId={v.id} numeroVenta={v.numero_venta} />
                            <ReprintVentaBtn
                              ventaId={v.id}
                              numeroVenta={v.numero_venta}
                              configNombreLocal={ticketCfg.nombre_local}
                              configRut={ticketCfg.rut_local}
                              configDireccion={ticketCfg.direccion}
                              configTelefono={ticketCfg.telefono}
                              configEmail={ticketCfg.email}
                              configLogo={ticketCfg.logo_url}
                            />
                            {!v.anulada && (
                              <AnularVentaBtn
                                ventaId={v.id}
                                numeroVenta={v.numero_venta}
                                total={v.total}
                                puedeAnular={puedeAnular}
                                pinAdmin={pinAdmin}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
