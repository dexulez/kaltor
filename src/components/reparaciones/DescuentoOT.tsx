'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/calculations'
import { Button } from '@/components/ui/button'

interface Props {
  otId: string
  precioServicio: number | null
  descuentoInicial: number
}

export default function DescuentoOT({ otId, precioServicio, descuentoInicial }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<'porcentaje' | 'monto'>('porcentaje')
  const [valor, setValor] = useState('')
  const [loading, setLoading] = useState(false)

  const tieneDescuento = descuentoInicial > 0
  // El precio base es el precio actual + el descuento ya aplicado
  const precioBase = (precioServicio ?? 0) + descuentoInicial
  const precioActual = precioServicio ?? 0

  // Calcular preview según el input actual
  const valorNum = parseFloat(valor) || 0
  const descuentoCalculado = tipo === 'porcentaje'
    ? Math.round(precioBase * valorNum / 100)
    : Math.round(valorNum)
  const precioFinalPreview = Math.max(0, precioBase - descuentoCalculado)
  const pctPreview = precioBase > 0 ? ((descuentoCalculado / precioBase) * 100).toFixed(1) : '0'

  async function aplicar() {
    if (valorNum <= 0) { toast.error('Ingresa un valor mayor a 0'); return }
    if (descuentoCalculado >= precioBase) { toast.error('El descuento no puede ser igual o mayor al precio'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/reparaciones/${otId}/descuento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descuento: descuentoCalculado, precioFinal: precioFinalPreview }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(`Descuento de ${formatCLP(descuentoCalculado)} aplicado`)
      setOpen(false)
      setValor('')
      router.refresh()
    } catch {
      toast.error('Error al aplicar el descuento')
    }
    setLoading(false)
  }

  async function eliminar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reparaciones/${otId}/descuento`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Descuento eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar el descuento')
    }
    setLoading(false)
  }

  if (!precioServicio) return null

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🏷️</span>
          <div>
            <p className="font-semibold text-sm text-gray-800">Descuento</p>
            {tieneDescuento ? (
              <p className="text-xs text-green-600 font-medium">
                {formatCLP(descuentoInicial)} descontado
                {' '}·{' '}
                <span className="text-gray-400">
                  Base {formatCLP(precioBase)} → Final {formatCLP(precioActual)}
                </span>
              </p>
            ) : (
              <p className="text-xs text-gray-400">Sin descuento aplicado</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {tieneDescuento && (
            <button
              onClick={eliminar}
              disabled={loading}
              className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
            >
              Quitar
            </button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setOpen(o => !o); setValor('') }}
            className="text-xs h-7 px-3"
          >
            {open ? '✕ Cancelar' : tieneDescuento ? '✏️ Editar' : '+ Aplicar descuento'}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-orange-50 px-4 py-4 space-y-3">
          {/* Tipo de descuento */}
          <div className="flex gap-1 bg-white rounded-lg p-1 border border-orange-200 w-fit">
            {(['porcentaje', 'monto'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTipo(t); setValor('') }}
                className={[
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  tipo === t ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {t === 'porcentaje' ? '% Porcentaje' : '$ Monto fijo'}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[180px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                {tipo === 'porcentaje' ? '%' : '$'}
              </span>
              <input
                type="number"
                min={0}
                max={tipo === 'porcentaje' ? 100 : precioBase}
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder={tipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 5000'}
                autoFocus
                className="w-full border border-orange-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </div>

            {/* Preview en tiempo real */}
            {valorNum > 0 && descuentoCalculado < precioBase && (
              <div className="text-xs text-gray-600 space-y-0.5">
                <p>Base: <span className="font-medium line-through text-gray-400">{formatCLP(precioBase)}</span></p>
                <p>Descuento: <span className="font-medium text-orange-600">−{formatCLP(descuentoCalculado)} ({pctPreview}%)</span></p>
                <p>Final: <span className="font-bold text-green-700">{formatCLP(precioFinalPreview)}</span></p>
              </div>
            )}
          </div>

          <Button
            onClick={aplicar}
            disabled={loading || valorNum <= 0 || descuentoCalculado >= precioBase}
            className="bg-orange-500 hover:bg-orange-600 w-full"
          >
            {loading ? 'Aplicando...' : `Aplicar descuento${descuentoCalculado > 0 ? ` de ${formatCLP(descuentoCalculado)}` : ''}`}
          </Button>
        </div>
      )}
    </div>
  )
}
