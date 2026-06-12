import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RepairOrder, RepairStatus, Customer, Equipment, UserProfile } from '@/types'
import { tieneSubPermiso } from '@/lib/modulos'
import AdjudicarOTButton from '@/components/reparaciones/AdjudicarOTButton'
import { Suspense } from 'react'
import BuscadorOTs from '@/components/reparaciones/BuscadorOTs'
import { labelTipoEquipo } from '@/lib/tipoEquipo'

// ── Constantes de estados ────────────────────────────────────────────────────

const ESTADOS: { value: RepairStatus | 'todas' | 'reparado' | 'sin_reparacion'; label: string; color: string }[] = [
  { value: 'todas',              label: 'Todas',              color: 'bg-gray-100 text-gray-700' },
  { value: 'recibido',           label: 'Recibido',           color: 'bg-gray-200 text-gray-700' },
  { value: 'en_diagnostico',     label: 'En diagnóstico',     color: 'bg-yellow-100 text-yellow-700' },
  { value: 'presupuestado',      label: 'Presupuestando',     color: 'bg-blue-100 text-blue-700' },
  { value: 'aprobado',           label: 'Aceptado',           color: 'bg-indigo-100 text-indigo-700' },
  { value: 'esperando_repuesto', label: 'Esperando repuesto', color: 'bg-orange-100 text-orange-700' },
  { value: 'en_reparacion',      label: 'En reparación',      color: 'bg-purple-100 text-purple-700' },
  { value: 'listo',              label: 'Listo',              color: 'bg-green-100 text-green-700' },
  { value: 'para_entrega',       label: 'Para entrega',       color: 'bg-cyan-100 text-cyan-700' },
  { value: 'entregado',          label: 'Entregado',          color: 'bg-emerald-100 text-emerald-700' },
  { value: 'rechazado',          label: 'Rechazado',          color: 'bg-red-100 text-red-600' },
  { value: 'reparado',           label: '✓ Reparado',         color: 'bg-green-100 text-green-700' },
  { value: 'sin_reparacion',     label: '⚠ Sin reparación',   color: 'bg-orange-100 text-orange-700' },
]

export const ESTADO_COLOR: Partial<Record<RepairStatus, string>> = {
  recibido:           'bg-gray-200 text-gray-700',
  en_diagnostico:     'bg-yellow-100 text-yellow-700',
  presupuestado:      'bg-blue-100 text-blue-700',
  aprobado:           'bg-indigo-100 text-indigo-700',
  rechazado:          'bg-red-100 text-red-600',
  esperando_repuesto: 'bg-orange-100 text-orange-700',
  en_reparacion:      'bg-purple-100 text-purple-700',
  listo:              'bg-green-100 text-green-700',
  para_entrega:       'bg-cyan-100 text-cyan-700',
  entregado:          'bg-emerald-100 text-emerald-700',
  en_garantia:        'bg-teal-100 text-teal-700',
  cancelado:          'bg-gray-100 text-gray-400',
}

export const ESTADO_LABEL_MAP: Partial<Record<RepairStatus, string>> = {
  recibido: 'Recibido', en_diagnostico: 'En diagnóstico',
  presupuestado: 'Presupuestando', aprobado: 'Aceptado', rechazado: 'Rechazado',
  esperando_repuesto: 'Esperando repuesto', en_reparacion: 'En reparación',
  listo: 'Listo', para_entrega: 'Para entrega',
  entregado: 'Entregado', en_garantia: 'En garantía', cancelado: 'Cancelado',
}

// ── Grupo de OT (0 = en proceso, 1 = listo para entregar, 2 = entregado/cerrado)
const GRUPO_ESTADO: Partial<Record<RepairStatus, 0 | 1 | 2>> = {
  recibido: 0, en_diagnostico: 0, presupuestado: 0, aprobado: 0,
  esperando_repuesto: 0, en_reparacion: 0,
  listo: 1, para_entrega: 1,
  entregado: 2, en_garantia: 2, cancelado: 2, rechazado: 2,
}

// ── Tipos ────────────────────────────────────────────────────────────────────

type OTRow = RepairOrder & {
  customers: Pick<Customer, 'nombre' | 'telefono'> | null
  equipment: (Pick<Equipment, 'marca' | 'modelo'> & { tipo_equipo?: string | null; falla_reportada?: string | null }) | null
  user_profiles: Pick<UserProfile, 'nombre_completo'> | null
  resultado?: string | null
  comentario_resultado?: string | null
  fecha_estimada_entrega?: string | null
}

type Vista = 'defecto' | 'fecha_prometida' | 'recibidos' | 'fuera_plazo' | 'por_cobrar'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGrupo(ot: OTRow): 0 | 1 | 2 {
  if (ot.estado === 'rechazado') return ot.fecha_entrega ? 2 : 1
  return GRUPO_ESTADO[ot.estado] ?? 2
}

function calcAlarmas(ots: OTRow[]) {
  const hoy = new Date().toISOString().split('T')[0]
  const hace3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const estadosFinales = new Set<string>(['entregado', 'cancelado', 'en_garantia', 'rechazado'])

  const fueraPlazo = ots.filter(ot =>
    ot.fecha_estimada_entrega &&
    ot.fecha_estimada_entrega < hoy &&
    !estadosFinales.has(ot.estado)
  )
  const sinRetirar = ots.filter(ot =>
    (ot.estado === 'listo' || ot.estado === 'para_entrega') &&
    new Date(ot.updated_at) < hace3dias
  )
  const sinRespuesta = ots.filter(ot =>
    ot.estado === 'presupuestado' &&
    new Date(ot.updated_at) < hace3dias
  )
  return { fueraPlazo, sinRetirar, sinRespuesta }
}

function isFueraPlazo(ot: OTRow): boolean {
  const hoy = new Date().toISOString().split('T')[0]
  const estadosFinales = new Set<string>(['entregado', 'cancelado', 'en_garantia', 'rechazado'])
  return !!(ot.fecha_estimada_entrega && ot.fecha_estimada_entrega < hoy && !estadosFinales.has(ot.estado))
}

function diasRestantes(fecha: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const f = new Date(fecha + 'T00:00:00')
  return Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

// ── Componente de tabla ──────────────────────────────────────────────────────

function OTTable({ ots, userId, puedeAdjudicar, puedeCobrar, mostrarFecha = 'recibido' }: {
  ots: OTRow[]
  userId: string
  puedeAdjudicar: boolean
  puedeCobrar: boolean
  mostrarFecha?: 'recibido' | 'prometida'
}) {
  if (!ots.length) return (
    <div className="text-center py-8 text-gray-400">
      <span className="text-3xl block mb-2">🔧</span>
      <p className="text-sm">Sin órdenes en este estado</p>
    </div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">OT</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Equipo / Falla</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Técnico</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">
              {mostrarFecha === 'prometida' ? 'Entrega prometida' : 'Recibido'}
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ots.map(ot => {
            const estadoLabel = ESTADOS.find(e => e.value === ot.estado)?.label ?? ot.estado
            const esMia = ot.tecnico_id === userId
            const vencida = isFueraPlazo(ot)
            const dias = ot.fecha_estimada_entrega ? diasRestantes(ot.fecha_estimada_entrega) : null
            return (
              <tr key={ot.id} className={`hover:bg-gray-50 ${esMia ? 'bg-blue-50/40' : ''} ${vencida ? 'bg-red-50/40' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-mono font-bold text-blue-700">{ot.numero_ot}</p>
                  {vencida && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">⏰ VENCIDA</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{ot.customers?.nombre}</p>
                  <p className="text-gray-400 text-xs">{ot.customers?.telefono}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-700">{[labelTipoEquipo(ot.equipment?.tipo_equipo), ot.equipment?.marca, ot.equipment?.modelo].filter(Boolean).join(' ')}</p>
                  {ot.equipment?.falla_reportada && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]" title={ot.equipment.falla_reportada}>
                      {ot.equipment.falla_reportada}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {ot.user_profiles?.nombre_completo ?? <span className="text-amber-600 font-medium">Sin asignar</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLOR[ot.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                    {estadoLabel}
                  </span>
                  {ot.resultado === 'exitosa' && (
                    <p className="mt-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Reparado</span>
                    </p>
                  )}
                  {ot.resultado === 'no_exitosa' && (
                    <p className="mt-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">⚠ Sin reparación</span>
                    </p>
                  )}
                  {!ot.resultado && ot.estado === 'rechazado' && (
                    <>
                      <p className="mt-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">✕ Rechazado</span>
                      </p>
                      <p className="mt-0.5">
                        {ot.fecha_entrega
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Entregado</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Para entregar</span>
                        }
                      </p>
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {mostrarFecha === 'prometida' && ot.fecha_estimada_entrega ? (
                    <div>
                      <p className={`font-medium ${vencida ? 'text-red-600' : dias !== null && dias <= 1 ? 'text-amber-600' : 'text-gray-700'}`}>
                        {new Date(ot.fecha_estimada_entrega + 'T00:00:00').toLocaleDateString('es-CL')}
                      </p>
                      {dias !== null && (
                        <p className={`text-[10px] mt-0.5 ${vencida ? 'text-red-500 font-bold' : dias === 0 ? 'text-amber-500 font-bold' : 'text-gray-400'}`}>
                          {vencida ? `${Math.abs(dias)} día(s) atrasada` : dias === 0 ? 'Hoy' : `en ${dias} día(s)`}
                        </p>
                      )}
                    </div>
                  ) : mostrarFecha === 'prometida' && !ot.fecha_estimada_entrega ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <span className="text-gray-400">{new Date(ot.created_at).toLocaleDateString('es-CL')}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 items-center">
                    {puedeAdjudicar && !ot.tecnico_id && (
                      <AdjudicarOTButton otId={ot.id} userId={userId} />
                    )}
                    {puedeCobrar && (ot.estado === 'listo' || ot.estado === 'para_entrega') && (
                      <Link href={`/caja/venta-directa?ot=${ot.id}`}>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs px-2">💰</Button>
                      </Link>
                    )}
                    <Link href={`/reparaciones/${ot.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">Ver</Button>
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Secciones agrupadas ──────────────────────────────────────────────────────

function SeccionGrupo({
  titulo, icono, colorHeader, ots, userId, puedeAdjudicar, puedeCobrar, expandida = true,
}: {
  titulo: string; icono: string; colorHeader: string
  ots: OTRow[]; userId: string; puedeAdjudicar: boolean; puedeCobrar: boolean; expandida?: boolean
}) {
  if (!ots.length && expandida) return null
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className={`${colorHeader} border-b px-4 py-2.5 flex items-center justify-between`}>
        <p className="font-semibold text-sm">{icono} {titulo}</p>
        <span className="text-xs font-medium opacity-70">{ots.length} OT{ots.length !== 1 ? 's' : ''}</span>
      </div>
      {ots.length > 0
        ? <OTTable ots={ots} userId={userId} puedeAdjudicar={puedeAdjudicar} puedeCobrar={puedeCobrar} />
        : <div className="py-6 text-center text-sm text-gray-400">Sin órdenes en este grupo</div>
      }
    </div>
  )
}

// ── Banner de alarmas ────────────────────────────────────────────────────────

function BannerAlarmas({ fueraPlazo, sinRetirar, sinRespuesta, vistaActual }: {
  fueraPlazo: number; sinRetirar: number; sinRespuesta: number; vistaActual: Vista
}) {
  if (!fueraPlazo && !sinRetirar && !sinRespuesta) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">Avisos del sistema</p>
      <div className="flex flex-wrap gap-2">
        {fueraPlazo > 0 && (
          <Link href="/reparaciones?vista=fuera_plazo">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-all ${vistaActual === 'fuera_plazo' ? 'bg-red-600 text-white border-red-600' : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'}`}>
              ⏰ {fueraPlazo} fuera de plazo
            </span>
          </Link>
        )}
        {sinRetirar > 0 && (
          <Link href="/reparaciones?vista=por_cobrar">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-all ${vistaActual === 'por_cobrar' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'}`}>
              📦 {sinRetirar} sin retirar (+3 días)
            </span>
          </Link>
        )}
        {sinRespuesta > 0 && (
          <Link href="/reparaciones?estado=presupuestado">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 cursor-pointer transition-all">
              💬 {sinRespuesta} sin respuesta de cliente (+3 días)
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Selector de vista ────────────────────────────────────────────────────────

function SelectorVista({ vistaActual, estadoActivo }: { vistaActual: Vista; estadoActivo: string }) {
  const vistas: { value: Vista; label: string; icon: string }[] = [
    { value: 'defecto',       label: 'Grupos',          icon: '🗂' },
    { value: 'fecha_prometida', label: 'Fecha prometida', icon: '📅' },
    { value: 'recibidos',     label: 'Por recibidos',   icon: '📥' },
    { value: 'fuera_plazo',   label: 'Fuera de plazo',  icon: '⏰' },
    { value: 'por_cobrar',    label: 'Por cobrar',      icon: '💰' },
  ]
  const estadoQ = estadoActivo !== 'todas' ? `&estado=${estadoActivo}` : ''
  return (
    <div className="flex flex-wrap gap-1.5">
      {vistas.map(v => (
        <Link key={v.value} href={`/reparaciones?vista=${v.value}${estadoQ}`}>
          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all ${vistaActual === v.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {v.icon} {v.label}
          </span>
        </Link>
      ))}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export default async function ReparacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; vista?: string }>
}) {
  const { estado, q: busqueda, vista: vistaParam } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()

  const rolesData = profile?.roles as { nombre?: string } | { nombre?: string }[] | null | undefined
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = profile?.permisos_modulos as Record<string, boolean> | null

  const verTodas       = tieneSubPermiso('reparaciones.ver_todas',  rolNombre, permisos)
  const puedeAdjudicar = tieneSubPermiso('reparaciones.adjudicar',  rolNombre, permisos)
  const puedeCrear     = tieneSubPermiso('reparaciones.crear',       rolNombre, permisos)
  const puedeCobrar    = tieneSubPermiso('reparaciones.cobrar',      rolNombre, permisos)

  const estadoActivo = estado ?? 'todas'
  const vista: Vista = (vistaParam as Vista) ?? 'defecto'

  // ── Vista técnico (mis OTs + disponibles) ─────────────────────────────────
  if (!verTodas) {
    const baseSelect = '*, customers(nombre, telefono), equipment(tipo_equipo, marca, modelo, falla_reportada), user_profiles(nombre_completo)'
    const estadoQ = estadoActivo !== 'todas' ? { estado: estadoActivo } : {}

    const [{ data: misOTs }, { data: disponibles }] = await Promise.all([
      supabase.from('repair_orders').select(baseSelect)
        .eq('tecnico_id', user!.id).match(estadoQ)
        .not('estado', 'in', '(entregado,cancelado)')
        .order('created_at', { ascending: false }).limit(50),
      puedeAdjudicar
        ? supabase.from('repair_orders').select(baseSelect)
            .is('tecnico_id', null)
            .not('estado', 'in', '(entregado,cancelado)')
            .order('created_at', { ascending: false }).limit(30)
        : Promise.resolve({ data: [] }),
    ])

    const mis = (misOTs ?? []) as OTRow[]
    const disp = (disponibles ?? []) as OTRow[]
    const { fueraPlazo, sinRetirar, sinRespuesta } = calcAlarmas(mis)

    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Reparaciones</h1>
            <p className="text-gray-500 text-sm mt-0.5">{mis.length} activa(s)</p>
          </div>
          {puedeCrear && (
            <Link href="/reparaciones/nueva">
              <Button className="bg-blue-600 hover:bg-blue-700">+ Nueva OT</Button>
            </Link>
          )}
        </div>

        <BannerAlarmas fueraPlazo={fueraPlazo.length} sinRetirar={sinRetirar.length} sinRespuesta={sinRespuesta.length} vistaActual={vista} />

        <div className="flex flex-wrap gap-2">
          {ESTADOS.map(e => (
            <Link key={e.value} href={e.value === 'todas' ? '/reparaciones' : `/reparaciones?estado=${e.value}`}>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${estadoActivo === e.value ? 'ring-2 ring-blue-400 ' + e.color : e.color + ' opacity-70 hover:opacity-100'}`}>
                {e.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-blue-50 border-b px-4 py-2.5">
            <p className="font-semibold text-blue-800 text-sm">🔧 Mis OTs asignadas ({mis.length})</p>
          </div>
          <OTTable ots={mis} userId={user!.id} puedeAdjudicar={false} puedeCobrar={puedeCobrar} />
        </div>

        {puedeAdjudicar && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-amber-50 border-b px-4 py-2.5 flex items-center justify-between">
              <p className="font-semibold text-amber-800 text-sm">⚡ OTs disponibles ({disp.length})</p>
              <p className="text-xs text-amber-600">Sin técnico — haz clic en "Adjudicarme"</p>
            </div>
            <OTTable ots={disp} userId={user!.id} puedeAdjudicar={true} puedeCobrar={false} />
          </div>
        )}
      </div>
    )
  }

  // ── Vista completa (admin / vendedor / supervisor) ─────────────────────────
  const baseSelect = '*, customers(nombre, telefono), equipment(tipo_equipo, marca, modelo, falla_reportada), user_profiles(nombre_completo)'

  let query = supabase.from('repair_orders').select(baseSelect).limit(500)

  // Filtro de estado
  if (estadoActivo === 'reparado') {
    query = query.eq('resultado', 'exitosa')
  } else if (estadoActivo === 'sin_reparacion') {
    query = query.eq('resultado', 'no_exitosa')
  } else if (estadoActivo !== 'todas') {
    query = query.eq('estado', estadoActivo as RepairStatus)
  }

  // Ordenamiento base según vista
  if (vista === 'recibidos') {
    query = query.order('created_at', { ascending: true })
  } else if (vista === 'fecha_prometida') {
    query = query.order('fecha_estimada_entrega', { ascending: true, nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: ots } = await query
  let otList = (ots ?? []) as OTRow[]

  // Filtro búsqueda
  if (busqueda?.trim()) {
    const q = busqueda.toLowerCase()
    otList = otList.filter(ot =>
      ot.numero_ot?.toLowerCase().includes(q) ||
      (ot.customers?.nombre ?? '').toLowerCase().includes(q) ||
      (ot.customers?.telefono ?? '').toLowerCase().includes(q) ||
      (ot.equipment?.marca ?? '').toLowerCase().includes(q) ||
      (ot.equipment?.modelo ?? '').toLowerCase().includes(q) ||
      (ot.equipment?.tipo_equipo ?? '').toLowerCase().includes(q) ||
      (ot.equipment?.falla_reportada ?? '').toLowerCase().includes(q)
    )
  }

  // Filtros de vista especiales
  if (vista === 'fuera_plazo') {
    const hoy = new Date().toISOString().split('T')[0]
    const estadosFinales = new Set<string>(['entregado', 'cancelado', 'en_garantia', 'rechazado'])
    otList = otList.filter(ot =>
      ot.fecha_estimada_entrega &&
      ot.fecha_estimada_entrega < hoy &&
      !estadosFinales.has(ot.estado)
    )
    otList.sort((a, b) => (a.fecha_estimada_entrega ?? '').localeCompare(b.fecha_estimada_entrega ?? ''))
  }

  if (vista === 'por_cobrar') {
    otList = otList.filter(ot => ot.estado === 'listo' || ot.estado === 'para_entrega')
    otList.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
  }

  // Calcular alarmas del conjunto total (antes de filtros de vista)
  const { data: todosParaAlarmas } = await supabase
    .from('repair_orders')
    .select('estado, fecha_estimada_entrega, updated_at, fecha_entrega')
    .not('estado', 'in', '(entregado,cancelado,en_garantia)')
    .limit(500)
  const alarmasData = (todosParaAlarmas ?? []) as OTRow[]
  const { fueraPlazo, sinRetirar, sinRespuesta } = calcAlarmas(alarmasData)

  // Separar en grupos (solo para vista defecto)
  const grupo0 = otList.filter(ot => getGrupo(ot) === 0)
  const grupo1 = otList.filter(ot => getGrupo(ot) === 1)
  const grupo2 = otList.filter(ot => getGrupo(ot) === 2)

  const vistaEsGrupos = vista === 'defecto' && estadoActivo === 'todas' && !busqueda?.trim()

  // Etiquetas de vista
  const VISTA_LABELS: Record<Vista, string> = {
    defecto: 'Vista grupos',
    fecha_prometida: 'Por fecha prometida',
    recibidos: 'Por fecha recibido',
    fuera_plazo: 'Fuera de plazo',
    por_cobrar: 'Por cobrar / sin retirar',
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reparaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">{otList.length} orden(es) · {VISTA_LABELS[vista]}</p>
        </div>
        {puedeCrear && (
          <Link href="/reparaciones/nueva">
            <Button className="bg-blue-600 hover:bg-blue-700">+ Nueva OT</Button>
          </Link>
        )}
      </div>

      {/* Alarmas */}
      <BannerAlarmas
        fueraPlazo={fueraPlazo.length}
        sinRetirar={sinRetirar.length}
        sinRespuesta={sinRespuesta.length}
        vistaActual={vista}
      />

      {/* Buscador */}
      <Suspense fallback={null}>
        <BuscadorOTs q={busqueda ?? ''} />
      </Suspense>

      {/* Selector de vista */}
      <SelectorVista vistaActual={vista} estadoActivo={estadoActivo} />

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        {ESTADOS.map(e => {
          const vistaQ = vista !== 'defecto' ? `&vista=${vista}` : ''
          return (
            <Link key={e.value} href={e.value === 'todas' ? `/reparaciones?vista=${vista}` : `/reparaciones?estado=${e.value}${vistaQ}`}>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${estadoActivo === e.value ? 'ring-2 ring-blue-400 ' + e.color : e.color + ' opacity-70 hover:opacity-100'}`}>
                {e.label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Contenido principal */}
      {vistaEsGrupos ? (
        <div className="space-y-4">
          <SeccionGrupo
            titulo="En Proceso"
            icono="🔧"
            colorHeader="bg-slate-50 text-slate-800"
            ots={grupo0}
            userId={user!.id}
            puedeAdjudicar={puedeAdjudicar}
            puedeCobrar={puedeCobrar}
          />
          <SeccionGrupo
            titulo="Listos para Entregar"
            icono="✅"
            colorHeader="bg-green-50 text-green-800"
            ots={grupo1}
            userId={user!.id}
            puedeAdjudicar={false}
            puedeCobrar={puedeCobrar}
          />
          <SeccionGrupo
            titulo="Entregados / Cerrados"
            icono="📦"
            colorHeader="bg-emerald-50 text-emerald-800"
            ots={grupo2}
            userId={user!.id}
            puedeAdjudicar={false}
            puedeCobrar={false}
            expandida={grupo2.length > 0}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          {vista === 'fuera_plazo' && (
            <div className="bg-red-50 border-b px-4 py-2.5">
              <p className="font-semibold text-red-800 text-sm">⏰ OTs con fecha de entrega vencida ({otList.length})</p>
            </div>
          )}
          {vista === 'por_cobrar' && (
            <div className="bg-green-50 border-b px-4 py-2.5">
              <p className="font-semibold text-green-800 text-sm">💰 Listos para cobrar / pendientes de retiro ({otList.length})</p>
            </div>
          )}
          <OTTable
            ots={otList}
            userId={user!.id}
            puedeAdjudicar={puedeAdjudicar}
            puedeCobrar={puedeCobrar}
            mostrarFecha={vista === 'fecha_prometida' || vista === 'fuera_plazo' ? 'prometida' : 'recibido'}
          />
        </div>
      )}
    </div>
  )
}
