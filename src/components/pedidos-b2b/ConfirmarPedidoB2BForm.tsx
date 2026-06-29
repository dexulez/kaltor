'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ItemPedido {
  id: string
  nombre: string
  cantidadSolicitada: number
  precioSugerido: number
  stockActual: number
}

interface FilaEstado {
  incluido: boolean
  cantidad: string
  precio: string
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

export default function ConfirmarPedidoB2BForm({ pedidoId, items }: { pedidoId: string; items: ItemPedido[] }) {
  const router = useRouter()
  const [filas, setFilas] = useState<Record<string, FilaEstado>>(() =>
    Object.fromEntries(items.map(it => [it.id, {
      incluido: true,
      cantidad: String(it.cantidadSolicitada),
      precio: String(it.precioSugerido),
    }]))
  )
  const [metodoPago, setMetodoPago] = useState('transferencia')
  const [tipoDocumento, setTipoDocumento] = useState('factura')
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [mostrarRechazo, setMostrarRechazo] = useState(false)
  const [loading, setLoading] = useState(false)

  function set(id: string, campo: keyof FilaEstado, valor: string | boolean) {
    setFilas(prev => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }))
  }

  const todosIncluidos = items.length > 0 && items.every(it => filas[it.id]?.incluido)

  function toggleTodos(valor: boolean) {
    setFilas(prev => Object.fromEntries(items.map(it => [it.id, { ...prev[it.id], incluido: valor }])))
  }

  const total = useMemo(() =>
    items.reduce((s, it) => {
      const f = filas[it.id]
      if (!f?.incluido) return s
      return s + (Number(f.cantidad) || 0) * (Number(f.precio) || 0)
    }, 0)
  , [filas, items])

  const itemsConExceso = useMemo(() =>
    items.filter(it => {
      const f = filas[it.id]
      return f?.incluido && (Number(f.cantidad) || 0) > it.stockActual
    })
  , [filas, items])

  async function confirmar() {
    const itemsBody: Record<string, { cantidadConfirmada: number; precioUnitario: number }> = {}
    items.forEach(it => {
      const f = filas[it.id]
      if (f?.incluido && Number(f.cantidad) > 0) {
        itemsBody[it.id] = { cantidadConfirmada: Number(f.cantidad), precioUnitario: Number(f.precio) || 0 }
      }
    })
    if (Object.keys(itemsBody).length === 0) { toast.error('Marca al menos un producto para confirmar'); return }

    const nProductos = Object.keys(itemsBody).length
    if (!window.confirm(`¿Confirmar este pedido por ${formatCLP(total)} (${nProductos} producto${nProductos === 1 ? '' : 's'})?\n\nSe generará una venta en Caja y se descontará el stock.`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsBody, metodoPago, tipoDocumento }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al confirmar el pedido'); return }
      toast.success('Pedido confirmado — se generó la venta')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function rechazar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/rechazar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoRechazo }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al rechazar el pedido'); return }
      toast.success('Pedido rechazado')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 border-b px-4 py-2.5">
          <h2 className="font-semibold text-gray-800 text-sm">Revisar y ajustar antes de confirmar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={todosIncluidos} onChange={e => toggleTodos(e.target.checked)} />
                    Incluir
                  </label>
                </th>
                <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Producto</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Solicitado</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Stock</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Cantidad a confirmar</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Precio unitario</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(it => {
                const f = filas[it.id]
                const subtotal = f?.incluido ? (Number(f.cantidad) || 0) * (Number(f.precio) || 0) : 0
                const excedeStock = f?.incluido && (Number(f.cantidad) || 0) > it.stockActual
                return (
                  <tr key={it.id} className={!f?.incluido ? 'opacity-50' : ''}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={f?.incluido ?? false} onChange={e => set(it.id, 'incluido', e.target.checked)} />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">{it.nombre}</td>
                    <td className="px-3 py-2 text-right">{it.cantidadSolicitada}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={it.stockActual < it.cantidadSolicitada ? 'text-red-600 font-medium' : 'text-gray-500'}>{it.stockActual}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number" min={0}
                        className={`w-20 text-right inline-block ${excedeStock ? 'border-amber-400 bg-amber-50 text-amber-800 focus-visible:ring-amber-400' : ''}`}
                        value={f?.cantidad ?? ''}
                        onChange={e => set(it.id, 'cantidad', e.target.value)}
                        disabled={!f?.incluido}
                      />
                      {excedeStock && <p className="text-[10px] text-amber-600 mt-0.5 whitespace-nowrap">⚠ Supera el stock</p>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input type="number" min={0} className="w-28 text-right inline-block" value={f?.precio ?? ''} onChange={e => set(it.id, 'precio', e.target.value)} disabled={!f?.incluido} />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatCLP(subtotal)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2">
                <td className="px-3 py-2" colSpan={6}>Total a cobrar</td>
                <td className="px-3 py-2 text-right text-blue-700">{formatCLP(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Método de pago</Label>
          <Select value={metodoPago} onValueChange={v => setMetodoPago(v ?? 'transferencia')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="transferencia">Transferencia</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="debito">Débito</SelectItem>
              <SelectItem value="credito">Crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de documento</Label>
          <Select value={tipoDocumento} onValueChange={v => setTipoDocumento(v ?? 'factura')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="factura">Factura</SelectItem>
              <SelectItem value="boleta">Boleta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {itemsConExceso.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          ⚠ {itemsConExceso.length === 1 ? 'Un producto supera' : `${itemsConExceso.length} productos superan`} el stock disponible
          ({itemsConExceso.map(it => it.nombre).join(', ')}). Puedes confirmar igual si vas a reabastecer, pero el stock quedará en 0, no en negativo.
        </div>
      )}

      {mostrarRechazo && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <Label className="text-red-800">Motivo del rechazo (opcional)</Label>
          <Input value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Ej: sin stock disponible" />
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" className="bg-green-600 hover:bg-green-700" disabled={loading} onClick={confirmar}>
          {loading ? 'Procesando...' : '✓ Confirmar y generar venta'}
        </Button>
        {!mostrarRechazo ? (
          <Button type="button" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setMostrarRechazo(true)}>
            Rechazar pedido
          </Button>
        ) : (
          <Button type="button" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" disabled={loading} onClick={rechazar}>
            Confirmar rechazo
          </Button>
        )}
      </div>
    </div>
  )
}
