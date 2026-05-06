'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCLP, calcularIva, calcularPpm, formatRut } from '@/lib/calculations'
import { Customer, Equipment, RepairItem, RepairOrder, SystemConfig } from '@/types'

const METODO_LABELS = {
  efectivo: '💵 Efectivo',
  transferencia: '🏦 Transferencia',
  debito: '💳 Débito',
  credito: '💳 Crédito',
}

interface Props {
  ot: RepairOrder & {
    customers: Pick<Customer, 'nombre'> | null
    equipment: Pick<Equipment, 'marca' | 'modelo'> | null
    repair_items: RepairItem[] | null
  }
  config: Pick<SystemConfig, 'iva' | 'ppm' | 'comision_debito' | 'comision_credito'>
}

export default function CobrarOTForm({ ot, config }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia' | 'debito' | 'credito'>('efectivo')
  const [tipoDoc, setTipoDoc] = useState<'boleta' | 'factura'>('boleta')
  const [rutReceptor, setRutReceptor] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const precioServicio = ot.precio_servicio ?? 0
  const netoServicio = Math.round(precioServicio / 1.19)
  const ivaTotal = calcularIva(netoServicio, config.iva)
  const ppmTotal = calcularPpm(netoServicio, config.ppm)
  const comisionPct = metodo === 'debito' ? config.comision_debito : metodo === 'credito' ? config.comision_credito : 0
  const comisionBancaria = Math.round(precioServicio * comisionPct / 100)

  async function handleCobro() {
    if (precioServicio === 0) {
      toast.error('Esta OT no tiene precio de servicio definido')
      return
    }
    setLoading(true)

    const { data: venta, error: ve } = await supabase.from('sales').insert({
      tipo: 'reparacion',
      repair_order_id: ot.id,
      customer_id: ot.customer_id,
      subtotal: netoServicio,
      iva: ivaTotal,
      ppm: ppmTotal,
      total: precioServicio,
      metodo_pago: metodo,
      comision_bancaria: comisionBancaria,
      tipo_documento: tipoDoc,
      rut_receptor: rutReceptor.trim() || null,
      razon_social_receptor: razonSocial.trim() || null,
      notas: notas.trim() || null,
    }).select().single()

    if (ve) { toast.error('Error al registrar cobro: ' + ve.message); setLoading(false); return }

    await supabase.from('sale_items').insert({
      sale_id: venta.id,
      nombre: `Reparación ${ot.numero_ot} — ${ot.equipment?.marca ?? ''} ${ot.equipment?.modelo ?? ''}`.trim(),
      cantidad: 1,
      precio_unitario: precioServicio,
      precio_costo: 0,
      subtotal: precioServicio,
    })

    await supabase.from('repair_orders').update({
      estado: 'entregado',
      metodo_pago: metodo,
      fecha_entrega: new Date().toISOString(),
      iva_aplicado: ivaTotal,
      ppm_aplicado: ppmTotal,
    }).eq('id', ot.id)

    await supabase.from('repair_status_history').insert({
      repair_order_id: ot.id,
      estado_anterior: 'listo',
      estado_nuevo: 'entregado',
      comentario: `Cobro registrado — ${formatCLP(precioServicio)} — ${metodo}`,
    })

    toast.success(`OT ${ot.numero_ot} cobrada — ${formatCLP(precioServicio)}`)
    router.push('/caja')
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Detalle de la OT */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Detalle de la reparación</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">N° OT</p>
              <p className="font-mono font-bold text-blue-700">{ot.numero_ot}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Cliente</p>
              <p className="font-medium text-gray-800">{ot.customers?.nombre}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Equipo</p>
              <p className="font-medium text-gray-800">
                {ot.equipment?.marca} {ot.equipment?.modelo}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Tipo reparación</p>
              <p className="font-medium text-gray-800 capitalize">{ot.tipo_reparacion ?? '—'}</p>
            </div>
          </div>
          {ot.diagnostico_tecnico && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Diagnóstico técnico</p>
              <p className="text-sm text-gray-700">{ot.diagnostico_tecnico}</p>
            </div>
          )}
        </div>

        {/* Repuestos usados */}
        {ot.repair_items && ot.repair_items.length > 0 && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <p className="font-semibold text-gray-800 text-sm">Repuestos utilizados</p>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Nombre</th>
                  <th className="text-center px-4 py-2 text-gray-500 font-medium">Cant.</th>
                  <th className="text-right px-4 py-2 text-gray-500 font-medium">Costo unit.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ot.repair_items.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">{item.nombre}</td>
                    <td className="px-4 py-2 text-center">{item.cantidad}</td>
                    <td className="px-4 py-2 text-right">{formatCLP(item.precio_costo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel de cobro */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl border p-5 space-y-4 sticky top-4">
          <h2 className="font-semibold text-gray-800 text-lg">Resumen de cobro</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Neto</span>
              <span>{formatCLP(netoServicio)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA ({config.iva}%)</span>
              <span>{formatCLP(ivaTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>PPM ({config.ppm}%)</span>
              <span>{formatCLP(ppmTotal)}</span>
            </div>
            {comisionBancaria > 0 && (
              <div className="flex justify-between text-orange-600 text-xs">
                <span>Comisión bancaria ({comisionPct}%)</span>
                <span>−{formatCLP(comisionBancaria)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl border-t pt-2 text-gray-900">
              <span>TOTAL</span>
              <span>{formatCLP(precioServicio)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(METODO_LABELS).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setMetodo(k as typeof metodo)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                      ${metodo === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Documento</Label>
              <Select value={tipoDoc} onValueChange={(v) => setTipoDoc(v as typeof tipoDoc)}>
                <SelectTrigger>
                  <span className="text-sm">{tipoDoc === 'boleta' ? 'Boleta' : 'Factura'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleta">Boleta</SelectItem>
                  <SelectItem value="factura">Factura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoDoc === 'factura' && (
              <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">RUT receptor</Label>
                  <Input value={rutReceptor} onChange={e => setRutReceptor(formatRut(e.target.value))} placeholder="76123456-7" inputMode="numeric" className="h-8 text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Razón social</Label>
                  <Input value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Empresa SpA" className="h-8 text-sm" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones del cobro..." />
            </div>
          </div>

          <Button onClick={handleCobro} disabled={loading || precioServicio === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-base py-6">
            {loading ? 'Procesando...' : `✓ Cobrar ${formatCLP(precioServicio)}`}
          </Button>

          {precioServicio === 0 && (
            <p className="text-xs text-red-500 text-center">Esta OT no tiene precio de servicio definido</p>
          )}
        </div>
      </div>
    </div>
  )
}
