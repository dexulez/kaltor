'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCLP } from '@/lib/calculations'

const METODOS = [
  { value: 'efectivo',      label: '💵 Efectivo' },
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'debito',        label: '💳 Débito' },
  { value: 'credito',       label: '💳 Crédito' },
]

interface Props {
  supplierId: string
  nombreProveedor: string
  montoSugerido: number
  periodoDesde: string
  periodoHasta: string
}

export default function LiquidacionActions({ supplierId, nombreProveedor, montoSugerido, periodoDesde, periodoHasta }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [monto, setMonto] = useState(String(montoSugerido))
  const [metodo, setMetodo] = useState('transferencia')
  const [nota, setNota] = useState('')
  const [cubrePeriodo, setCubrePeriodo] = useState(true)
  const [saving, setSaving] = useState(false)

  async function registrarPago() {
    const montoNum = parseInt(monto) || 0
    if (montoNum <= 0) { toast.error('Ingresa un monto mayor a 0'); return }

    setSaving(true)
    const { error } = await supabase.from('supplier_settlements').insert({
      supplier_id: supplierId,
      fecha: new Date().toISOString().split('T')[0],
      periodo_desde: cubrePeriodo ? periodoDesde : null,
      periodo_hasta: cubrePeriodo ? periodoHasta : null,
      monto: montoNum,
      metodo_pago: metodo,
      nota: nota.trim() || null,
    })

    if (error) { toast.error('Error al registrar pago: ' + error.message); setSaving(false); return }

    // Actualizar saldo_deudor del proveedor
    const { data: prov } = await supabase.from('suppliers').select('saldo_deudor').eq('id', supplierId).single()
    if (prov) {
      const nuevoSaldo = Math.max(0, (prov.saldo_deudor ?? 0) - montoNum)
      await supabase.from('suppliers').update({ saldo_deudor: nuevoSaldo }).eq('id', supplierId)
    }

    toast.success(`Pago de ${formatCLP(montoNum)} registrado a ${nombreProveedor}`)
    setNota('')
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-800">Registrar pago</h2>
        <p className="text-xs text-gray-400 mt-0.5">Abona al proveedor por los productos vendidos</p>
      </div>

      <div className="space-y-1.5">
        <Label>Monto a pagar (CLP)</Label>
        <Input
          type="number"
          min={1}
          value={monto}
          onChange={e => setMonto(e.target.value)}
          className="text-lg font-bold"
        />
        {montoSugerido > 0 && (
          <button
            type="button"
            onClick={() => setMonto(String(montoSugerido))}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            ← Usar saldo pendiente: {formatCLP(montoSugerido)}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Método de pago</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {METODOS.map(m => (
            <button key={m.value} type="button" onClick={() => setMetodo(m.value)}
              className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${metodo === m.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Nota / referencia</Label>
        <Input value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: Transferencia ref. 12345..." />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={cubrePeriodo} onChange={e => setCubrePeriodo(e.target.checked)} className="w-4 h-4 accent-blue-600" />
        <span className="text-xs text-gray-600">Cubre período {periodoDesde} → {periodoHasta}</span>
      </label>

      <Button onClick={registrarPago} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
        {saving ? 'Registrando...' : `💸 Pagar ${formatCLP(parseInt(monto) || 0)} a ${nombreProveedor}`}
      </Button>
    </div>
  )
}
