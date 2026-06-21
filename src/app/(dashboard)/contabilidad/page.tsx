import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { calcularPrecioSinIva, calcularIva, calcularPpm, formatCLP } from '@/lib/calculations'
import ResumenF29 from '@/components/contabilidad/ResumenF29'
import PagosPrevisionalesTable from '@/components/contabilidad/PagosPrevisionalesTable'
import ObligacionesTributariasManager from '@/components/contabilidad/ObligacionesTributariasManager'

function mesLabel(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

function sumarMes(mes: string, delta: number) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function ContabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes: mesParam } = await searchParams
  const mes = mesParam ?? new Date().toISOString().slice(0, 7)
  const mesInicio = `${mes}-01`
  const inicioDate = new Date(`${mesInicio}T00:00:00`)
  const finDate = new Date(inicioDate.getFullYear(), inicioDate.getMonth() + 1, 0)
  const mesFin = finDate.toISOString().split('T')[0]
  const desdeIso = `${mesInicio}T00:00:00.000Z`
  const hastaIso = `${mesFin}T23:59:59.999Z`

  const supabase = await createClient()

  const [{ data: ventasMes }, { data: f29 }, { data: empleados }, { data: pagosPrev }, { data: obligaciones }] = await Promise.all([
    supabase.from('sales').select('total').eq('anulada', false).gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('declaraciones_f29').select('*').eq('mes', mesInicio).maybeSingle(),
    supabase.from('empleados_taller').select('*').eq('activo', true).order('nombre'),
    supabase.from('pagos_previsionales').select('*').eq('mes', mesInicio),
    supabase.from('obligaciones_tributarias').select('*').eq('activa', true).order('fecha_vencimiento'),
  ])

  const totalBruto = (ventasMes ?? []).reduce((s, v) => s + (v.total ?? 0), 0)
  const neto = calcularPrecioSinIva(totalBruto)
  const ivaDebito = calcularIva(neto)
  const ppm = calcularPpm(neto)

  type Empleado = { id: string; nombre: string; cargo: string | null; sueldo_base: number; tasa_afp: number; tasa_salud: number; activo: boolean }
  type PagoPrev = { id: string; empleado_id: string; mes: string; sueldo_pagado: number; afp_pagado: number; salud_pagado: number; fecha_pago: string | null; comprobante_url: string | null; estado: string; notas: string | null }
  type Obligacion = { id: string; nombre: string; monto: number; fecha_vencimiento: string | null; recurrencia: string; fecha_pago: string | null; comprobante_url: string | null; notas: string | null; activa: boolean }
  type F29 = { id: string; mes: string; iva_credito: number; fecha_vencimiento: string | null; fecha_pago: string | null; comprobante_url: string | null; notas: string | null }

  const empleadosList = (empleados ?? []) as Empleado[]
  const pagosPrevList = (pagosPrev ?? []) as PagoPrev[]
  const obligacionesList = (obligaciones ?? []) as Obligacion[]
  const f29Row = f29 as F29 | null

  const ivaCredito = f29Row?.iva_credito ?? 0
  const netoF29 = Math.max(0, ivaDebito - ivaCredito) + ppm
  const f29Pendiente = !f29Row?.fecha_pago

  const totalPrevisionesPendientes = empleadosList.reduce((s, e) => {
    const pago = pagosPrevList.find(p => p.empleado_id === e.id)
    if (pago?.estado === 'pagado') return s
    const descuento = Math.round(e.sueldo_base * (e.tasa_afp + e.tasa_salud + 0.6) / 100)
    return s + descuento
  }, 0)

  const obligacionesDelMes = obligacionesList.filter(o => {
    if (o.fecha_pago) return false
    if (!o.fecha_vencimiento) return false
    if (o.recurrencia === 'mensual') return true
    return o.fecha_vencimiento >= mesInicio && o.fecha_vencimiento <= mesFin
  })
  const totalObligacionesPendientes = obligacionesDelMes.reduce((s, o) => s + o.monto, 0)

  const totalAPagarMes = (f29Pendiente ? netoF29 : 0) + totalPrevisionesPendientes + totalObligacionesPendientes

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧾 Contabilidad</h1>
          <p className="text-gray-500 text-sm mt-0.5">IVA/PPM mensual, previsiones de empleados y otras obligaciones tributarias</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/contabilidad?mes=${sumarMes(mes, -1)}`} className="px-2 py-1.5 rounded-lg border text-gray-600 hover:bg-gray-50">←</Link>
          <span className="font-medium text-gray-800 capitalize min-w-[140px] text-center">{mesLabel(mes)}</span>
          <Link href={`/contabilidad?mes=${sumarMes(mes, 1)}`} className="px-2 py-1.5 rounded-lg border text-gray-600 hover:bg-gray-50">→</Link>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
        ⚠️ Los montos y fechas de este módulo son referenciales. Confirma siempre con tu contador antes de declarar o pagar.
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-blue-100 text-sm">Total pendiente de pago este mes</p>
          <p className="text-3xl font-bold mt-1">{formatCLP(totalAPagarMes)}</p>
        </div>
        <div className="text-xs text-blue-100 space-y-0.5 text-right">
          <p>F29 (IVA+PPM): {formatCLP(f29Pendiente ? netoF29 : 0)}</p>
          <p>Previsiones: {formatCLP(totalPrevisionesPendientes)}</p>
          <p>Otras obligaciones: {formatCLP(totalObligacionesPendientes)}</p>
        </div>
      </div>

      <ResumenF29
        mes={mesInicio}
        ivaDebito={ivaDebito}
        ppm={ppm}
        existing={f29Row}
      />

      <PagosPrevisionalesTable
        mes={mesInicio}
        empleados={empleadosList}
        pagos={pagosPrevList}
      />

      <ObligacionesTributariasManager
        obligaciones={obligacionesList}
      />
    </div>
  )
}
