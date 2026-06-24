'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'

interface Props {
  ordenId: string
  supplierId: string
  numero: string
  totalOC: number
  montoPagado: number
  saldoDeudorProveedor: number
  metodoPagoOC?: string
}

export default function PagarOCBtn({
  ordenId, supplierId, numero, totalOC, montoPagado, saldoDeudorProveedor, metodoPagoOC,
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [monto, setMonto] = useState<string>('')
  const [metodo, setMetodo] = useState('transferencia')
  const [nota, setNota] = useState('')

  const saldoPendiente = totalOC - montoPagado
  if (saldoPendiente <= 0) return null

  async function pagar() {
    const montoNum = parseInt(monto)
    if (!montoNum || montoNum <= 0) { toast.error('Ingresa un monto válido'); return }
    if (montoNum > saldoPendiente) { toast.error(`El monto no puede superar el saldo pendiente ${formatCLP(saldoPendiente)}`); return }

    setLoading(true)
    try {
      // Registrar pago en historial
      const { error: errPago } = await supabase.from('purchase_order_payments').insert({
        purchase_order_id: ordenId,
        monto: montoNum,
        metodo_pago: metodo,
        fecha: new Date().toISOString().split('T')[0],
        nota: nota.trim() || null,
      })
      if (errPago) throw errPago

      // Actualizar monto_pagado en la OC
      const nuevoMontoPagado = montoPagado + montoNum
      const { error: errOC } = await supabase.from('purchase_orders')
        .update({ monto_pagado: nuevoMontoPagado })
        .eq('id', ordenId)
      if (errOC) throw errOC

      // Solo si la OC original es a crédito existe deuda con el proveedor que reducir
      if (metodoPagoOC === 'credito') {
        const nuevoSaldo = Math.max(0, saldoDeudorProveedor - montoNum)
        await supabase.from('suppliers')
          .update({ saldo_deudor: nuevoSaldo })
          .eq('id', supplierId)
      }

      toast.success(`Pago de ${formatCLP(montoNum)} registrado para ${numero}`)
      setOpen(false)
      setMonto('')
      setNota('')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar el pago')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-orange-800 text-sm">Pago de esta orden de compra</p>
          <div className="flex gap-4 mt-1 text-xs">
            <span className="text-gray-600">Total: <strong>{formatCLP(totalOC)}</strong></span>
            <span className="text-green-700">Pagado: <strong>{formatCLP(montoPagado)}</strong></span>
            <span className="text-red-600 font-bold">Pendiente: <strong>{formatCLP(saldoPendiente)}</strong></span>
          </div>
        </div>
        <span className="text-2xl">💳</span>
      </div>

      {!open ? (
        <div className="px-4 py-3">
          <Button
            onClick={() => setOpen(true)}
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            💳 Abonar a esta OC
          </Button>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Monto a pagar</label>
              <input
                type="number"
                min={1}
                max={saldoPendiente}
                placeholder={String(saldoPendiente)}
                value={monto}
                onChange={e => setMonto(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-0.5">Máx: {formatCLP(saldoPendiente)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Método de pago</label>
              <select
                value={metodo}
                onChange={e => setMetodo(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="debito">💳 Débito</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Nota (opcional)</label>
            <input
              type="text"
              placeholder="Ej: Transferencia ref. 12345"
              value={nota}
              onChange={e => setNota(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={pagar} disabled={loading || !monto}
              className="flex-1 bg-orange-500 hover:bg-orange-600">
              {loading ? 'Registrando...' : `Registrar pago${monto ? ` de ${formatCLP(parseInt(monto) || 0)}` : ''}`}
            </Button>
            <Button variant="outline" onClick={() => { setOpen(false); setMonto(''); setNota('') }} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
