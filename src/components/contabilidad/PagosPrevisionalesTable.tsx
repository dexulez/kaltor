'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCLP } from '@/lib/calculations'
import SubirComprobanteBtn from '@/components/contabilidad/SubirComprobanteBtn'

interface Empleado {
  id: string
  nombre: string
  cargo: string | null
  sueldo_base: number
  tasa_afp: number
  tasa_salud: number
}

interface PagoPrev {
  id: string
  empleado_id: string
  mes: string
  sueldo_pagado: number
  afp_pagado: number
  salud_pagado: number
  fecha_pago: string | null
  comprobante_url: string | null
  estado: string
  notas: string | null
}

interface Props {
  mes: string // 'YYYY-MM-01'
  empleados: Empleado[]
  pagos: PagoPrev[]
  vencimientoPresencial: string
  vencimientoElectronico: string
}

function FilaEmpleado({ mes, empleado, pago }: { mes: string; empleado: Empleado; pago: PagoPrev | undefined }) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const descuentoRef = Math.round(empleado.sueldo_base * (empleado.tasa_afp + empleado.tasa_salud + 0.6) / 100)
  const afpRef = Math.round(empleado.sueldo_base * empleado.tasa_afp / 100)
  const saludRef = Math.round(empleado.sueldo_base * empleado.tasa_salud / 100)

  const [sueldoPagado, setSueldoPagado] = useState(String(pago?.sueldo_pagado ?? empleado.sueldo_base))
  const [afpPagado, setAfpPagado] = useState(String(pago?.afp_pagado ?? afpRef))
  const [saludPagado, setSaludPagado] = useState(String(pago?.salud_pagado ?? saludRef))

  const pagado = pago?.estado === 'pagado'
  const hoy = new Date().toISOString().split('T')[0]

  async function marcarPagado() {
    setSaving(true)
    const { error } = await supabase.from('pagos_previsionales').upsert({
      empleado_id: empleado.id,
      mes,
      sueldo_pagado: parseInt(sueldoPagado) || 0,
      afp_pagado: parseInt(afpPagado) || 0,
      salud_pagado: parseInt(saludPagado) || 0,
      fecha_pago: hoy,
      estado: 'pagado',
    }, { onConflict: 'empleado_id,mes' })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`Pago de ${empleado.nombre} registrado`)
    router.refresh()
  }

  async function marcarPendiente() {
    if (!pago) return
    setSaving(true)
    const { error } = await supabase.from('pagos_previsionales')
      .update({ estado: 'pendiente', fecha_pago: null })
      .eq('id', pago.id)
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Revertido a pendiente')
    router.refresh()
  }

  return (
    <tr className={pagado ? 'bg-green-50' : ''}>
      <td className="px-3 py-2.5">
        <p className="font-medium text-gray-900">{empleado.nombre}</p>
        {empleado.cargo && <p className="text-xs text-gray-400">{empleado.cargo}</p>}
      </td>
      <td className="px-3 py-2 text-right">
        <Input type="number" min={0} value={sueldoPagado} onChange={e => setSueldoPagado(e.target.value)}
          disabled={pagado} className="h-8 text-xs text-right w-28 ml-auto" />
      </td>
      <td className="px-3 py-2 text-right">
        <Input type="number" min={0} value={afpPagado} onChange={e => setAfpPagado(e.target.value)}
          disabled={pagado} className="h-8 text-xs text-right w-24 ml-auto" />
      </td>
      <td className="px-3 py-2 text-right">
        <Input type="number" min={0} value={saludPagado} onChange={e => setSaludPagado(e.target.value)}
          disabled={pagado} className="h-8 text-xs text-right w-24 ml-auto" />
      </td>
      <td className="px-3 py-2.5 text-right text-gray-400 text-xs">{formatCLP(descuentoRef)} ref.</td>
      <td className="px-3 py-2.5">
        {pagado ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
            ✓ {pago?.fecha_pago && new Date(pago.fecha_pago).toLocaleDateString('es-CL')}
          </span>
        ) : (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Pendiente</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {pago && <SubirComprobanteBtn tabla="pagos_previsionales" registroId={pago.id} urlActual={pago.comprobante_url} />}
          {pagado ? (
            <Button variant="outline" size="sm" className="text-orange-600 border-orange-300 text-xs h-7" onClick={marcarPendiente} disabled={saving}>
              Revertir
            </Button>
          ) : (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs h-7" onClick={marcarPagado} disabled={saving}>
              ✓ Marcar pagado
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function PagosPrevisionalesTable({ mes, empleados, pagos, vencimientoPresencial, vencimientoElectronico }: Props) {
  if (empleados.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-800 mb-1">Pagos previsionales</h2>
        <p className="text-sm text-gray-400">
          No hay empleados registrados. Agrégalos en{' '}
          <a href="/configuracion" className="text-blue-600 hover:underline">Configuración → Gastos fijos</a>.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-5 py-3 border-b bg-gray-50">
        <h2 className="font-semibold text-gray-800">Pagos previsionales (sueldo + AFP + salud)</h2>
        <p className="text-xs text-gray-400 mt-0.5">Montos pre-cargados con el cálculo referencial de Gastos fijos — ajústalos si difieren del pago real</p>
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
            📅 Presencial/DNP: vence {new Date(vencimientoPresencial + 'T12:00:00').toLocaleDateString('es-CL')}
          </span>
          <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg">
            💻 Electrónico (Previred web): vence {new Date(vencimientoElectronico + 'T12:00:00').toLocaleDateString('es-CL')} — plazo fatal, no se corre
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Empleado', 'Sueldo pagado', 'AFP pagado', 'Salud pagado', 'Total desc.', 'Estado', ''].map((h, i) => (
                <th key={i} className={`px-3 py-2 text-xs font-medium text-gray-600 ${i === 0 ? 'text-left' : i >= 5 ? '' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {empleados.map(emp => (
              <FilaEmpleado key={emp.id} mes={mes} empleado={emp} pago={pagos.find(p => p.empleado_id === emp.id)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
