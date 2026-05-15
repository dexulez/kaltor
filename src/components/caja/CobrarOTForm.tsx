'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCLP, calcularIva, calcularPpm, formatRut } from '@/lib/calculations'
import { Customer, Equipment, RepairItem, RepairOrder, SystemConfig } from '@/types'
import ComprobanteOT from '@/components/caja/ComprobanteOT'

const METODO_LABELS = {
  efectivo: '💵 Efectivo',
  transferencia: '🏦 Transferencia',
  debito: '💳 Débito',
  credito: '💳 Crédito',
}

interface Props {
  ot: RepairOrder & {
    customers: Pick<Customer, 'nombre' | 'telefono' | 'rut' | 'email'> | null
    equipment: Pick<Equipment, 'marca' | 'modelo' | 'color' | 'capacidad' | 'imei' | 'accesorios' | 'condicion_visual' | 'falla_reportada'> | null
    repair_items: RepairItem[] | null
    user_profiles?: { nombre_completo: string } | null
  }
  config: Pick<SystemConfig, 'iva' | 'ppm' | 'comision_debito' | 'comision_credito'> & {
    nombre_local?: string; rut_local?: string | null; direccion?: string | null
    telefono?: string | null; email?: string | null
    logo_url?: string | null; terminos_condiciones?: string | null
  }
}

export default function CobrarOTForm({ ot, config }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia' | 'debito' | 'credito'>('efectivo')
  const [tipoDoc, setTipoDoc] = useState<'boleta' | 'factura'>('boleta')
  const [rutReceptor, setRutReceptor] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [notas, setNotas] = useState('')

  // Descuento
  const [descuentoInput, setDescuentoInput] = useState('')
  const [tipodescuento, setTipoDescuento] = useState<'monto' | 'pct'>('monto')

  // Cobro mixto
  const [cobromixto, setCobromixto] = useState(false)
  const [metodo2, setMetodo2] = useState<'efectivo' | 'transferencia' | 'debito' | 'credito'>('efectivo')
  const [monto2Input, setMonto2Input] = useState('')

  const [loading, setLoading] = useState(false)
  const [ventaCompletada, setVentaCompletada] = useState(false)
  const [ventaData, setVentaData] = useState<{ id: string; numero_venta: string } | null>(null)
  const [precioManual, setPrecioManual] = useState(String(ot.presupuesto_estimado ?? ''))

  const precioServicio = ot.precio_servicio ? ot.precio_servicio : (parseInt(precioManual) || 0)
  const repuestosTotal = (ot.repair_items ?? []).reduce((s, i) => s + i.precio_costo * i.cantidad, 0)
  const baseTotal = precioServicio + repuestosTotal

  // Calcular descuento
  const descuentoNum = parseFloat(descuentoInput) || 0
  const descuentoFinal = tipodescuento === 'pct'
    ? Math.round(baseTotal * descuentoNum / 100)
    : Math.round(descuentoNum)

  const totalConDescuento = Math.max(0, baseTotal - descuentoFinal)
  const netoServicio = Math.round(totalConDescuento / (1 + (config.iva ?? 19) / 100))
  const ivaTotal = totalConDescuento - netoServicio
  const ppmTotal = calcularPpm(netoServicio, config.ppm)
  const comisionPct = metodo === 'debito' ? config.comision_debito : metodo === 'credito' ? config.comision_credito : 0
  const comisionBancaria = Math.round(totalConDescuento * comisionPct / 100)
  const totalFinal = totalConDescuento

  const monto2 = parseInt(monto2Input) || 0
  const monto1 = Math.max(0, totalFinal - monto2)

  async function handleCobro() {
    if (precioServicio === 0) {
      toast.error('Ingresa el precio del servicio antes de cobrar')
      return
    }
    setLoading(true)
    // Si el precio fue ingresado manualmente, guardarlo en la OT
    if (!ot.precio_servicio && parseInt(precioManual) > 0) {
      await supabase.from('repair_orders').update({ precio_servicio: parseInt(precioManual) }).eq('id', ot.id)
    }

    const { data: venta, error: ve } = await supabase.from('sales').insert({
      tipo: 'reparacion',
      repair_order_id: ot.id,
      customer_id: ot.customer_id,
      subtotal: netoServicio,
      iva: ivaTotal,
      ppm: ppmTotal,
      total: totalFinal,
      descuento: descuentoFinal,
      metodo_pago: metodo,
      metodo_pago_2: cobromixto && monto2 > 0 ? metodo2 : null,
      monto_pago_2: cobromixto && monto2 > 0 ? monto2 : null,
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
      precio_unitario: totalFinal,
      precio_costo: 0,
      subtotal: totalFinal,
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
      comentario: `Cobro registrado — ${formatCLP(totalFinal)} — ${metodo}`,
    })

    toast.success(`OT ${ot.numero_ot} cobrada — ${formatCLP(totalFinal)}`)
    setVentaData({ id: venta.id, numero_venta: venta.numero_venta })
    setVentaCompletada(true)
    setLoading(false)
    // Redirigir a caja después de 2 segundos para que se vea el comprobante
    setTimeout(() => {
      router.push('/caja')
      router.refresh()
    }, 2500)
  }

  // ── Vista post-cobro: comprobante ──────────────────────────────────────────
  if (ventaCompletada && ventaData) {
    return (
      <div className="space-y-5">
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">OT {ot.numero_ot} cobrada exitosamente</p>
            <p className="text-sm text-green-700">Venta {ventaData.numero_venta} — {formatCLP(totalFinal)}</p>
          </div>
          <Button variant="outline" className="ml-auto" onClick={() => { router.push('/caja'); router.refresh() }}>
            Volver a Caja →
          </Button>
        </div>

        <ComprobanteOT
          ot={{
            ...ot,
            metodo_pago: metodo,
            metodo_pago_2: cobromixto && monto2 > 0 ? metodo2 : null,
            monto_pago_2: cobromixto && monto2 > 0 ? monto2 : null,
            descuento: descuentoFinal,
            iva_aplicado: ivaTotal,
            repair_items: ot.repair_items ?? [],
          }}
          config={config as Parameters<typeof ComprobanteOT>[0]['config']}
          totalFinal={totalFinal}
          descuento={descuentoFinal}
        />
      </div>
    )
  }

  // ── Formulario de cobro ────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Detalle OT */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Detalle de la reparación</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400 uppercase tracking-wide">N° OT</p><p className="font-mono font-bold text-blue-700">{ot.numero_ot}</p></div>
            <div><p className="text-xs text-gray-400 uppercase tracking-wide">Cliente</p><p className="font-medium">{ot.customers?.nombre}</p></div>
            <div><p className="text-xs text-gray-400 uppercase tracking-wide">Equipo</p><p className="font-medium">{ot.equipment?.marca} {ot.equipment?.modelo}</p></div>
            <div><p className="text-xs text-gray-400 uppercase tracking-wide">Tipo</p><p className="font-medium capitalize">{ot.tipo_reparacion ?? '—'}</p></div>
          </div>
          {ot.diagnostico_tecnico && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Diagnóstico</p>
              <p className="text-sm text-gray-700">{ot.diagnostico_tecnico}</p>
            </div>
          )}
        </div>

        {ot.repair_items && ot.repair_items.length > 0 && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b"><p className="font-semibold text-sm">Repuestos utilizados</p></div>
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50"><tr>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Nombre</th>
                <th className="text-center px-4 py-2 text-gray-500 font-medium">Cant.</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Costo</th>
              </tr></thead>
              <tbody className="divide-y">
                {ot.repair_items.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">{item.nombre}</td>
                    <td className="px-4 py-2 text-center">{item.cantidad}</td>
                    <td className="px-4 py-2 text-right">{formatCLP(item.precio_costo * item.cantidad)}</td>
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

          {/* Precio del servicio — editable si no está definido */}
          {!ot.precio_servicio && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-1.5">
              <Label className="text-amber-800 font-semibold">⚠ Esta OT no tiene precio definido</Label>
              <p className="text-xs text-amber-700">Ingresa el precio del servicio para poder cobrar</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={precioManual}
                  onChange={e => setPrecioManual(e.target.value)}
                  placeholder="Ej: 35000"
                  className="border-amber-300 focus:ring-amber-400"
                />
                {parseInt(precioManual) > 0 && (
                  <span className="text-sm font-bold text-amber-800 shrink-0">
                    {formatCLP(parseInt(precioManual))}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Descuento */}
          <div className="space-y-1.5">
            <Label>Descuento</Label>
            <div className="flex gap-2">
              <div className="flex border rounded-lg overflow-hidden text-xs">
                <button onClick={() => setTipoDescuento('monto')}
                  className={`px-3 py-1.5 font-medium transition-colors ${tipodescuento === 'monto' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  $
                </button>
                <button onClick={() => setTipoDescuento('pct')}
                  className={`px-3 py-1.5 font-medium transition-colors ${tipodescuento === 'pct' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  %
                </button>
              </div>
              <Input
                type="number"
                min={0}
                max={tipodescuento === 'pct' ? 100 : undefined}
                placeholder={tipodescuento === 'pct' ? 'Ej: 10' : 'Ej: 5000'}
                value={descuentoInput}
                onChange={e => setDescuentoInput(e.target.value)}
                className="flex-1"
              />
            </div>
            {descuentoFinal > 0 && (
              <p className="text-xs text-red-600">Descuento: −{formatCLP(descuentoFinal)}</p>
            )}
          </div>

          {/* Totales */}
          <div className="space-y-1.5 text-sm bg-gray-50 rounded-lg p-3">
            {repuestosTotal > 0 && (
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Servicio</span><span>{formatCLP(precioServicio)}</span>
              </div>
            )}
            {repuestosTotal > 0 && (
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Repuestos</span><span>{formatCLP(repuestosTotal)}</span>
              </div>
            )}
            {descuentoFinal > 0 && (
              <div className="flex justify-between text-red-600 text-xs">
                <span>Descuento</span><span>−{formatCLP(descuentoFinal)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600 border-t pt-1">
              <span>Neto</span><span>{formatCLP(netoServicio)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA ({config.iva}%)</span><span>{formatCLP(ivaTotal)}</span>
            </div>
            {comisionBancaria > 0 && (
              <div className="flex justify-between text-orange-600 text-xs">
                <span>Comisión bancaria ({comisionPct}%)</span><span>−{formatCLP(comisionBancaria)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-1.5">
              <span>TOTAL</span><span>{formatCLP(totalFinal)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Método de pago */}
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(METODO_LABELS).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setMetodo(k as typeof metodo)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${metodo === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Cobro mixto */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cobromixto} onChange={e => setCobromixto(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm font-medium text-gray-700">Cobro mixto (dos métodos)</span>
              </label>
              {cobromixto && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(METODO_LABELS).filter(([k]) => k !== metodo).map(([k, v]) => (
                      <button key={k} type="button" onClick={() => setMetodo2(k as typeof metodo2)}
                        className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${metodo2 === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <div>
                    <Label className="text-xs">Monto con {METODO_LABELS[metodo2]?.split(' ')[1] ?? metodo2}</Label>
                    <Input type="number" min={0} max={totalFinal} value={monto2Input} onChange={e => setMonto2Input(e.target.value)}
                      placeholder={`Máx: ${formatCLP(totalFinal)}`} className="mt-1 h-8 text-sm" />
                  </div>
                  {monto2 > 0 && (
                    <div className="text-xs space-y-0.5 text-gray-600">
                      <div className="flex justify-between"><span>{METODO_LABELS[metodo]}</span><span>{formatCLP(monto1)}</span></div>
                      <div className="flex justify-between"><span>{METODO_LABELS[metodo2]}</span><span>{formatCLP(monto2)}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Documento */}
            <div className="space-y-1.5">
              <Label>Documento</Label>
              <Select value={tipoDoc} onValueChange={v => setTipoDoc(v as typeof tipoDoc)}>
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
            {loading ? 'Procesando...' : `✓ Cobrar ${formatCLP(totalFinal)}`}
          </Button>
          {precioServicio === 0 && (
            <p className="text-xs text-red-500 text-center">Esta OT no tiene precio de servicio definido</p>
          )}
        </div>
      </div>
    </div>
  )
}
