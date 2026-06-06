'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCLP } from '@/lib/calculations'
import { soundAbono, soundError } from '@/lib/sounds'

const METODOS = [
  { value: 'efectivo',      label: '💵 Efectivo' },
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'debito',        label: '💳 Débito' },
  { value: 'credito',       label: '💳 Crédito' },
]

interface Deposito {
  id: string; monto: number; metodo_pago: string; nota: string | null; created_at: string
}

interface Props {
  otId: string
  numeroOt: string
  precioServicio: number | null
  depositos: Deposito[]
}

export default function AbonoOTForm({ otId, numeroOt, precioServicio, depositos }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  // eliminación con razón
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [razonElim, setRazonElim] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function eliminarAbono(id: string, montoAbono: number) {
    if (!razonElim.trim()) { toast.error('Debes indicar la razón'); return }
    setDeletingId(id)
    const { error } = await supabase.from('repair_deposits').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar: ' + error.message); setDeletingId(null); return }
    toast.success(`Abono de ${formatCLP(montoAbono)} eliminado — ${razonElim}`)
    setEliminandoId(null)
    setRazonElim('')
    setDeletingId(null)
    router.refresh()
  }

  const totalAbonado = depositos.reduce((s, d) => s + d.monto, 0)
  const saldoPendiente = precioServicio ? Math.max(0, precioServicio - totalAbonado) : null

  async function registrar() {
    const montoNum = parseInt(monto) || 0
    if (montoNum <= 0) { toast.error('Ingresa un monto mayor a 0'); return }
    setSaving(true)
    const { error } = await supabase.from('repair_deposits').insert({
      repair_order_id: otId,
      monto: montoNum,
      metodo_pago: metodo,
      nota: nota.trim() || null,
    })
    if (error) { soundError(); toast.error('Error: ' + error.message); setSaving(false); return }
    soundAbono()
    toast.success(`Abono de ${formatCLP(montoNum)} registrado`)
    setMonto(''); setNota(''); setOpen(false)
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">Abonos recibidos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Pagos parciales del cliente</p>
        </div>
        <Button size="sm" onClick={() => setOpen(o => !o)} variant="outline" className="gap-1">
          {open ? '✕ Cerrar' : '+ Registrar abono'}
        </Button>
      </div>

      {/* Formulario de abono */}
      {open && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Nuevo abono — {numeroOt}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 font-medium">Monto (CLP)</label>
              <Input type="number" min={1} value={monto} onChange={e => setMonto(e.target.value)}
                placeholder="Ej: 15000" className="mt-1 h-9" autoFocus />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium">Nota (opcional)</label>
              <Input value={nota} onChange={e => setNota(e.target.value)}
                placeholder="Ej: Pago inicial" className="mt-1 h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {METODOS.map(m => (
              <button key={m.value} type="button" onClick={() => setMetodo(m.value)}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${metodo === m.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                {m.label}
              </button>
            ))}
          </div>
          <Button onClick={registrar} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
            {saving ? 'Registrando...' : `Registrar abono ${monto ? formatCLP(parseInt(monto) || 0) : ''}`}
          </Button>
        </div>
      )}

      {/* Resumen */}
      {precioServicio && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-xs text-gray-400">Precio total</p>
            <p className="text-sm font-bold text-gray-800">{formatCLP(precioServicio)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <p className="text-xs text-gray-400">Total abonado</p>
            <p className="text-sm font-bold text-green-700">{formatCLP(totalAbonado)}</p>
          </div>
          <div className={`rounded-lg p-2 ${saldoPendiente! > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className="text-xs text-gray-400">Saldo</p>
            <p className={`text-sm font-bold ${saldoPendiente! > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {saldoPendiente! > 0 ? formatCLP(saldoPendiente!) : '✓ Pagado'}
            </p>
          </div>
        </div>
      )}

      {/* Historial */}
      {depositos.length > 0 ? (
        <div className="space-y-1.5">
          {depositos.map(d => (
            <div key={d.id} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-gray-800">{formatCLP(d.monto)}</span>
                  <span className="text-gray-400 text-xs ml-2">{METODOS.find(m => m.value === d.metodo_pago)?.label ?? d.metodo_pago}</span>
                  {d.nota && <span className="text-gray-500 text-xs ml-2">· {d.nota}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString('es-CL')}</span>
                  {eliminandoId !== d.id && (
                    <button
                      onClick={() => { setEliminandoId(d.id); setRazonElim('') }}
                      className="text-red-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                      title="Eliminar abono"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              {eliminandoId === d.id && (
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Razón de eliminación..."
                    value={razonElim}
                    onChange={e => setRazonElim(e.target.value)}
                    onKeyDown={e => e.key === 'Escape' && setEliminandoId(null)}
                    className="flex-1 min-w-0 border border-red-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                  <button
                    onClick={() => eliminarAbono(d.id, d.monto)}
                    disabled={!razonElim.trim() || deletingId === d.id}
                    className="text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-2.5 py-1 rounded transition-colors"
                  >
                    {deletingId === d.id ? '...' : 'Confirmar'}
                  </button>
                  <button
                    onClick={() => { setEliminandoId(null); setRazonElim('') }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
          {!precioServicio && (
            <p className="text-xs text-gray-400 text-center">Total: {formatCLP(totalAbonado)}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">Sin abonos registrados</p>
      )}
    </div>
  )
}
