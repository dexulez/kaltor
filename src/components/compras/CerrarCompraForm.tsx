'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { formatCLP } from '@/lib/calculations'
import { PurchaseOrder, Supplier } from '@/types'

const METODO_LABELS: Record<string, string> = {
  efectivo:      'Efectivo',
  transferencia: 'Transferencia',
  debito:        'Débito',
  credito:       'Crédito (agregar a deuda proveedor)',
}

type Props = {
  oc: PurchaseOrder & { suppliers?: Supplier | null }
}

export default function CerrarCompraForm({ oc }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [metodoPago, setMetodoPago] = useState<string>(oc.metodo_pago ?? '')
  const [notas, setNotas] = useState(oc.notas ?? '')

  // Solo mostrar cuando la OC ya tiene mercancía recibida y aún no está cerrada/cancelada
  if (['recibida_completa', 'cancelada', 'pendiente'].includes(oc.estado)) return null

  async function handleCerrar() {
    if (!metodoPago) { toast.error('Selecciona el método de pago'); return }
    setLoading(true)

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        estado: 'recibida_completa',
        metodo_pago: metodoPago,
        notas: notas.trim() || null,
        fecha_recepcion: oc.fecha_recepcion ?? new Date().toISOString(),
      })
      .eq('id', oc.id)

    if (error) {
      toast.error('Error al cerrar compra: ' + error.message)
      setLoading(false)
      return
    }

    // Si es crédito, sumar al saldo deudor del proveedor
    if (metodoPago === 'credito' && oc.supplier_id) {
      const saldoActual = oc.suppliers?.saldo_deudor ?? 0
      await supabase
        .from('suppliers')
        .update({ saldo_deudor: saldoActual + oc.total })
        .eq('id', oc.supplier_id)
    }

    toast.success('Compra cerrada y pago registrado')
    router.refresh()
    setLoading(false)
  }

  async function handleCancelar() {
    if (!confirm('¿Estás seguro de cancelar esta orden de compra?')) return
    setLoading(true)
    const { error } = await supabase
      .from('purchase_orders')
      .update({ estado: 'cancelada' })
      .eq('id', oc.id)
    if (error) toast.error(error.message)
    else { toast.success('Orden cancelada'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-green-50 border-b border-green-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-green-800 text-sm">Cerrar compra y registrar pago</p>
          <p className="text-xs text-green-600 mt-0.5">
            Total a pagar: <span className="font-bold">{formatCLP(oc.total)}</span>
          </p>
        </div>
        <span className="text-2xl">💳</span>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Método de pago</label>
          <Select value={metodoPago} onValueChange={v => setMetodoPago(v ?? '')}>
            <SelectTrigger>
              <span className="flex-1 text-left text-sm">
                {metodoPago
                  ? (metodoPago === 'credito' ? 'Crédito (agrega a deuda proveedor)' : METODO_LABELS[metodoPago] ?? metodoPago)
                  : 'Seleccionar método...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METODO_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Notas de pago (opcional)</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Ej: transferencia enviada ref. 123456"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleCerrar}
            disabled={loading || !metodoPago}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Cerrando...' : '✓ Confirmar y cerrar compra'}
          </Button>
          <Button
            onClick={handleCancelar}
            disabled={loading}
            variant="outline"
            className="text-red-500 hover:text-red-700 hover:border-red-300"
          >
            Cancelar OC
          </Button>
        </div>
      </div>
    </div>
  )
}
