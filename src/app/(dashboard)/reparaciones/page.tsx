import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RepairOrder, RepairStatus, Customer, Equipment, UserProfile } from '@/types'
import { tieneSubPermiso } from '@/lib/modulos'
import AdjudicarOTButton from '@/components/reparaciones/AdjudicarOTButton'
import { Suspense } from 'react'
import BuscadorOTs from '@/components/reparaciones/BuscadorOTs'

const ESTADOS: { value: RepairStatus | 'todas'; label: string; color: string }[] = [
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

type OTRow = RepairOrder & {
  customers: Pick<Customer, 'nombre' | 'telefono'> | null
  equipment: (Pick<Equipment, 'marca' | 'modelo'> & { tipo_equipo?: string | null }) | null
  user_profiles: Pick<UserProfile, 'nombre_completo'> | null
}

function OTTable({ ots, userId, puedeAdjudicar, puedeCobrar }: {
  ots: OTRow[]
  userId: string
  puedeAdjudicar: boolean
  puedeCobrar: boolean
}) {
  if (!ots.length) return (
    <div className="text-center py-10 text-gray-400">
      <span className="text-4xl block mb-2">🔧</span>
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
            <th className="text-left px-4 py-3 font-medium text-gray-600">Equipo</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Técnico</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ots.map(ot => {
            const estadoLabel = ESTADOS.find(e => e.value === ot.estado)?.label ?? ot.estado
            const esMia = ot.tecnico_id === userId
            return (
              <tr key={ot.id} className={`hover:bg-gray-50 ${esMia ? 'bg-blue-50/40' : ''}`}>
                <td className="px-4 py-3 font-mono font-bold text-blue-700">{ot.numero_ot}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{ot.customers?.nombre}</p>
                  <p className="text-gray-400 text-xs">{ot.customers?.telefono}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{[ot.equipment?.tipo_equipo?.replace(/^./, c => c.toUpperCase()), ot.equipment?.marca, ot.equipment?.modelo].filter(Boolean).join(' ')}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {ot.user_profiles?.nombre_completo ?? <span className="text-amber-600 font-medium">Sin asignar</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLOR[ot.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                    {estadoLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(ot.created_at).toLocaleDateString('es-CL')}</td>
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

export default async function ReparacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>
}) {
  const { estado, q: busqueda } = await searchParams
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

  const verTodas    = tieneSubPermiso('reparaciones.ver_todas',  rolNombre, permisos)
  const puedeAdjudicar = tieneSubPermiso('reparaciones.adjudicar', rolNombre, permisos)
  const puedeCrear  = tieneSubPermiso('reparaciones.crear',      rolNombre, permisos)
  const puedeCobrar = tieneSubPermiso('reparaciones.cobrar',     rolNombre, permisos)
  const estadoActivo = estado ?? 'todas'

  // ── Vista técnico: mis OTs + disponibles ───────────────────────────────────
  if (!verTodas) {
    const baseSelect = '*, customers(nombre, telefono), equipment(tipo_equipo, marca, modelo), user_profiles(nombre_completo)'
    const estadoQ = estadoActivo !== 'todas' ? { estado: estadoActivo } : {}

    const [{ data: misOTs }, { data: disponibles }] = await Promise.all([
      supabase.from('repair_orders').select(baseSelect)
        .eq('tecnico_id', user!.id)
        .match(estadoQ)
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

        {/* Filtro de estados */}
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map(e => (
            <Link key={e.value} href={e.value === 'todas' ? '/reparaciones' : `/reparaciones?estado=${e.value}`}>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${estadoActivo === e.value ? 'ring-2 ring-blue-400 ' + e.color : e.color + ' opacity-70 hover:opacity-100'}`}>
                {e.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Mis OTs */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-blue-50 border-b px-4 py-2.5">
            <p className="font-semibold text-blue-800 text-sm">🔧 Mis OTs asignadas ({mis.length})</p>
          </div>
          <OTTable ots={mis} userId={user!.id} puedeAdjudicar={false} puedeCobrar={puedeCobrar} />
        </div>

        {/* OTs disponibles para adjudicarse */}
        {puedeAdjudicar && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-amber-50 border-b px-4 py-2.5 flex items-center justify-between">
              <p className="font-semibold text-amber-800 text-sm">⚡ OTs disponibles para adjudicarse ({disp.length})</p>
              <p className="text-xs text-amber-600">Sin técnico asignado — haz clic en "Adjudicarme"</p>
            </div>
            <OTTable ots={disp} userId={user!.id} puedeAdjudicar={true} puedeCobrar={false} />
          </div>
        )}
      </div>
    )
  }

  // ── Vista completa (admin, supervisor, vendedor) ───────────────────────────
  let query = supabase
    .from('repair_orders')
    .select('*, customers(nombre, telefono), equipment(tipo_equipo, marca, modelo), user_profiles(nombre_completo)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (estadoActivo !== 'todas') query = query.eq('estado', estadoActivo as RepairStatus)

  const { data: ots } = await query
  let otList = (ots ?? []) as OTRow[]

  // Filtrar por búsqueda (nombre, teléfono, RUT del cliente o nº OT)
  if (busqueda?.trim()) {
    const q = busqueda.toLowerCase()
    otList = otList.filter(ot =>
      ot.numero_ot?.toLowerCase().includes(q) ||
      (ot.customers?.nombre ?? '').toLowerCase().includes(q) ||
      (ot.customers?.telefono ?? '').toLowerCase().includes(q)
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reparaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">{otList.length} orden(es)</p>
        </div>
        {puedeCrear && (
          <Link href="/reparaciones/nueva">
            <Button className="bg-blue-600 hover:bg-blue-700">+ Nueva OT</Button>
          </Link>
        )}
      </div>

      {/* Buscador */}
      <Suspense fallback={null}>
        <BuscadorOTs q={busqueda ?? ''} />
      </Suspense>

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
        <OTTable ots={otList} userId={user!.id} puedeAdjudicar={puedeAdjudicar} puedeCobrar={puedeCobrar} />
      </div>
    </div>
  )
}
