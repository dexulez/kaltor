'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCLP } from '@/lib/calculations'
import SubirComprobanteBtn from '@/components/contabilidad/SubirComprobanteBtn'

interface F29Existente {
  id: string
  mes: string
  iva_credito: number
  fecha_vencimiento: string | null
  fecha_pago: string | null
  comprobante_url: string | null
  notas: string | null
}

interface Props {
  mes: string // 'YYYY-MM-01'
  ivaDebito: number
  ppm: number
  existing: F29Existente | null
}

function vencimientoDefault(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m, 12) // día 12 del mes siguiente
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ResumenF29({ mes, ivaDebito, ppm, existing }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [ivaCreditoInput, setIvaCreditoInput] = useState(String(existing?.iva_credito ?? 0))
  const [fechaVencimiento, setFechaVencimiento] = useState(existing?.fecha_vencimiento ?? vencimientoDefault(mes))
  const [notas, setNotas] = useState(existing?.notas ?? '')

  const ivaCredito = parseInt(ivaCreditoInput) || 0
  const netoIva = Math.max(0, ivaDebito - ivaCredito)
  const totalF29 = netoIva + ppm
  const pagado = !!existing?.fecha_pago

  const hoy = new Date().toISOString().split('T')[0]
  const vencida = !pagado && !!fechaVencimiento && fechaVencimiento < hoy

  async function guardar() {
    setSaving(true)
    const { error } = await supabase.from('declaraciones_f29').upsert({
      mes,
      iva_credito: ivaCredito,
      fecha_vencimiento: fechaVencimiento || null,
      notas: notas.trim() || null,
    }, { onConflict: 'mes' })
    setSaving(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Datos del F29 guardados')
    router.refresh()
  }

  async function marcarPagado() {
    setSaving(true)
    const { error } = await supabase.from('declaraciones_f29').upsert({
      mes,
      iva_credito: ivaCredito,
      fecha_vencimiento: fechaVencimiento || null,
      notas: notas.trim() || null,
      fecha_pago: hoy,
    }, { onConflict: 'mes' })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('F29 marcado como pagado')
    router.refresh()
  }

  async function quitarPago() {
    if (!existing) return
    setSaving(true)
    const { error } = await supabase.from('declaraciones_f29').update({ fecha_pago: null }).eq('id', existing.id)
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Pago revertido a pendiente')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-gray-800">Formulario 29 — IVA y PPM</h2>
          <p className="text-xs text-gray-400 mt-0.5">El IVA débito y el PPM se calculan automáticamente desde tus ventas del mes</p>
        </div>
        {pagado ? (
          <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">✓ Pagado el {new Date(existing!.fecha_pago!).toLocaleDateString('es-CL')}</span>
        ) : vencida ? (
          <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">⚠ Vencido</span>
        ) : (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-medium">Pendiente</span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">IVA débito</p>
          <p className="font-bold text-blue-700">{formatCLP(ivaDebito)}</p>
          <p className="text-xs text-gray-400">calculado</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">IVA crédito (compras con factura)</Label>
          <Input type="number" min={0} value={ivaCreditoInput} onChange={e => setIvaCreditoInput(e.target.value)} disabled={pagado} />
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">PPM 3%</p>
          <p className="font-bold text-orange-600">{formatCLP(ppm)}</p>
          <p className="text-xs text-gray-400">calculado</p>
        </div>
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600 font-semibold mb-1">TOTAL F29</p>
          <p className="text-xl font-bold text-green-700">{formatCLP(totalF29)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Fecha de vencimiento</Label>
          <Input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} disabled={pagado} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notas</Label>
          <Input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Folio, observaciones..." disabled={pagado} />
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        {existing && (
          <SubirComprobanteBtn tabla="declaraciones_f29" registroId={existing.id} urlActual={existing.comprobante_url} />
        )}
        <div className="flex gap-2 ml-auto">
          {!pagado ? (
            <>
              <Button variant="outline" size="sm" onClick={guardar} disabled={saving}>Guardar</Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={marcarPagado} disabled={saving}>
                ✓ Marcar como pagado
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="text-orange-600 border-orange-300" onClick={quitarPago} disabled={saving}>
              Revertir a pendiente
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
