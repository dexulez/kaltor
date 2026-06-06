'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/calculations'

const METODOS = [
  { value: 'efectivo',      label: '💵 Efectivo' },
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'cheque',        label: '🧾 Cheque' },
  { value: 'debito',        label: '💳 Débito' },
]

interface Props {
  supplierId: string
  nombreProveedor: string
  saldoActual: number
}

export default function AbonarProveedorBtn({ supplierId, nombreProveedor, saldoActual }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [monto, setMonto] = useState(String(saldoActual))
  const [metodo, setMetodo] = useState('transferencia')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)

  async function registrar() {
    const montoNum = parseInt(monto) || 0
    if (montoNum <= 0) { toast.error('Ingresa un monto mayor a 0'); return }
    if (montoNum > saldoActual) { toast.error(`El monto supera la deuda actual (${formatCLP(saldoActual)})`); return }
    setSaving(true)

    // Registrar en historial de pagos
    const { error: errPago } = await supabase.from('supplier_settlements').insert({
      supplier_id: supplierId,
      monto: montoNum,
      metodo_pago: metodo,
      nota: nota.trim() || `Abono deuda — ${nombreProveedor}`,
      fecha: new Date().toISOString().split('T')[0],
    })
    if (errPago) { toast.error('Error al registrar abono: ' + errPago.message); setSaving(false); return }

    // Actualizar saldo deudor del proveedor
    const nuevoSaldo = Math.max(0, saldoActual - montoNum)
    await supabase.from('suppliers').update({ saldo_deudor: nuevoSaldo }).eq('id', supplierId)

    toast.success(`Abono de ${formatCLP(montoNum)} registrado a ${nombreProveedor}`)
    setOpen(false)
    setMonto('')
    setNota('')
    router.refresh()
    setSaving(false)
  }

  if (saldoActual <= 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-300 rounded-lg font-semibold hover:bg-red-100 transition-colors whitespace-nowrap"
      >
        💳 Abonar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm space-y-4 p-6" onClick={e => e.stopPropagation()}>
            <div>
              <p className="font-bold text-gray-900 text-lg">Registrar abono</p>
              <p className="text-sm text-gray-500 mt-0.5">{nombreProveedor}</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Deuda pendiente</p>
              <p className="text-2xl font-bold text-red-600 mt-0.5">{formatCLP(saldoActual)}</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Monto a abonar (CLP)</label>
                <input
                  type="number" min={1} max={saldoActual}
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
                {parseInt(monto) > 0 && (
                  <p className="text-xs text-gray-400">
                    Saldo restante: {formatCLP(Math.max(0, saldoActual - (parseInt(monto) || 0)))}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Método de pago</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {METODOS.map(m => (
                    <button key={m.value} type="button" onClick={() => setMetodo(m.value)}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${metodo === m.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Nota (opcional)</label>
                <input
                  type="text"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Ej: Pago parcial OC-000010"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={registrar} disabled={saving}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors">
                {saving ? 'Registrando...' : `✓ Confirmar abono`}
              </button>
              <button onClick={() => setOpen(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
