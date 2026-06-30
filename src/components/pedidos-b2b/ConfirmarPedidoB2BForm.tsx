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

interface ProductoDisponible {
  id: string
  nombre: string
  precioVenta: number
  precioMayorista: number | null
  stockActual: number
}

interface ItemExtra {
  id: string
  productId: string
  nombre: string
  cantidad: string
  precio: string
  stockActual: number
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

interface SolicitudComprador {
  tipoDocumento: string | null
  rutFacturacion: string | null
  razonSocialFacturacion: string | null
}

export default function ConfirmarPedidoB2BForm({ pedidoId, items, productosDisponibles = [], solicitudComprador }: { pedidoId: string; items: ItemPedido[]; productosDisponibles?: ProductoDisponible[]; solicitudComprador?: SolicitudComprador }) {
  const router = useRouter()
  const [filas, setFilas] = useState<Record<string, FilaEstado>>(() =>
    Object.fromEntries(items.map(it => [it.id, {
      incluido: true,
      cantidad: String(it.cantidadSolicitada),
      precio: String(it.precioSugerido),
    }]))
  )
  const [tipoDocumento, setTipoDocumento] = useState(solicitudComprador?.tipoDocumento ?? 'factura')
  const [plazoPagoDias, setPlazoPagoDias] = useState<number | null>(30)
  const [exentoIva, setExentoIva] = useState(false)
  const IVA_PCT = 19 // referencial para la vista previa; el valor real se aplica en el servidor
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [mostrarRechazo, setMostrarRechazo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [extras, setExtras] = useState<ItemExtra[]>([])
  const [busquedaExtra, setBusquedaExtra] = useState('')

  const idsYaIncluidos = new Set(extras.map(e => e.productId))
  const sugerencias = busquedaExtra.trim()
    ? productosDisponibles
        .filter(p => p.nombre.toLowerCase().includes(busquedaExtra.toLowerCase()) && !idsYaIncluidos.has(p.id))
        .slice(0, 6)
    : []

  function agregarExtra(p: ProductoDisponible) {
    setExtras(prev => [...prev, {
      id: `extra-${p.id}`,
      productId: p.id,
      nombre: p.nombre,
      cantidad: '1',
      precio: String(p.precioMayorista ?? p.precioVenta),
      stockActual: p.stockActual,
    }])
    setBusquedaExtra('')
  }

  function quitarExtra(id: string) {
    setExtras(prev => prev.filter(e => e.id !== id))
  }

  function setExtra(id: string, campo: 'cantidad' | 'precio', valor: string) {
    setExtras(prev => prev.map(e => e.id === id ? { ...e, [campo]: valor } : e))
  }

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
    }, 0) + extras.reduce((s, e) => s + (Number(e.cantidad) || 0) * (Number(e.precio) || 0), 0)
  , [filas, items, extras])

  const itemsConExceso = useMemo(() =>
    items.filter(it => {
      const f = filas[it.id]
      return f?.incluido && (Number(f.cantidad) || 0) > it.stockActual
    })
  , [filas, items])

  const totalExento = useMemo(() => Math.round(total / (1 + IVA_PCT / 100)), [total])

  async function confirmar() {
    const itemsBody: Record<string, { cantidadConfirmada: number; precioUnitario: number }> = {}
    items.forEach(it => {
      const f = filas[it.id]
      if (f?.incluido && Number(f.cantidad) > 0) {
        itemsBody[it.id] = { cantidadConfirmada: Number(f.cantidad), precioUnitario: Number(f.precio) || 0 }
      }
    })
    const itemsNuevos = extras
      .filter(e => Number(e.cantidad) > 0)
      .map(e => ({ productId: e.productId, nombre: e.nombre, cantidad: Number(e.cantidad), precioUnitario: Number(e.precio) || 0 }))

    if (Object.keys(itemsBody).length === 0 && itemsNuevos.length === 0) { toast.error('Marca al menos un producto para confirmar'); return }

    const nProductos = Object.keys(itemsBody).length + itemsNuevos.length
    const montoFinal = exentoIva ? totalExento : total
    if (!window.confirm(`¿Confirmar este pedido por ${formatCLP(montoFinal)}${exentoIva ? ' (exento de IVA)' : ''} (${nProductos} producto${nProductos === 1 ? '' : 's'})?\n\nSe generará una venta en Caja y se descontará el stock.`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/pedidos-b2b/${pedidoId}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsBody, itemsNuevos, tipoDocumento, plazoPagoDias, exentoIva }),
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
              {exentoIva && (
                <tr className="bg-gray-50 text-xs text-gray-400">
                  <td className="px-3 py-1" colSpan={6}>Total con IVA (referencial)</td>
                  <td className="px-3 py-1 text-right line-through">{formatCLP(total)}</td>
                </tr>
              )}
              <tr className="bg-gray-50 font-semibold border-t-2">
                <td className="px-3 py-2" colSpan={6}>{exentoIva ? 'Total a cobrar (exento de IVA)' : 'Total a cobrar'}</td>
                <td className="px-3 py-2 text-right text-blue-700">{formatCLP(exentoIva ? totalExento : total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="bg-gray-50 border-b rounded-t-xl px-4 py-2.5">
          <h2 className="font-semibold text-gray-800 text-sm">+ Agregar otro producto a esta venta</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative max-w-md">
            <Input
              value={busquedaExtra}
              onChange={e => setBusquedaExtra(e.target.value)}
              placeholder="Buscar producto del inventario..."
              autoComplete="off"
            />
            {sugerencias.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                {sugerencias.map(p => (
                  <button key={p.id} type="button"
                    onMouseDown={e => { e.preventDefault(); agregarExtra(p) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0 flex justify-between gap-2">
                    <span className="font-medium">{p.nombre}</span>
                    <span className="text-gray-400 whitespace-nowrap">{formatCLP(p.precioMayorista ?? p.precioVenta)} · stock {p.stockActual}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {extras.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-1.5 font-medium">Producto</th>
                    <th className="py-1.5 font-medium text-right">Stock</th>
                    <th className="py-1.5 font-medium text-right">Cantidad</th>
                    <th className="py-1.5 font-medium text-right">Precio unitario</th>
                    <th className="py-1.5 font-medium text-right">Subtotal</th>
                    <th className="py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {extras.map(e => {
                    const subtotal = (Number(e.cantidad) || 0) * (Number(e.precio) || 0)
                    return (
                      <tr key={e.id}>
                        <td className="py-2 font-medium text-gray-900">{e.nombre} <span className="text-[10px] text-blue-600 font-normal">añadido</span></td>
                        <td className="py-2 text-right text-gray-500">{e.stockActual}</td>
                        <td className="py-2 text-right"><Input type="number" min={0} className="w-20 text-right inline-block" value={e.cantidad} onChange={ev => setExtra(e.id, 'cantidad', ev.target.value)} /></td>
                        <td className="py-2 text-right"><Input type="number" min={0} className="w-28 text-right inline-block" value={e.precio} onChange={ev => setExtra(e.id, 'precio', ev.target.value)} /></td>
                        <td className="py-2 text-right font-medium">{formatCLP(subtotal)}</td>
                        <td className="py-2 text-right">
                          <button type="button" onClick={() => quitarExtra(e.id)} className="text-gray-400 hover:text-red-600">✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-4 max-w-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tipo de documento</Label>
            <Select value={tipoDocumento} onValueChange={v => setTipoDocumento(v ?? 'factura')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="factura">Factura</SelectItem>
                <SelectItem value="boleta">Boleta</SelectItem>
              </SelectContent>
            </Select>
            {solicitudComprador?.tipoDocumento && (
              <p className="text-xs text-gray-400">
                El comprador pidió: <strong>{solicitudComprador.tipoDocumento === 'factura' ? 'Factura' : 'Boleta'}</strong>
                {solicitudComprador.tipoDocumento === 'factura' && solicitudComprador.razonSocialFacturacion && (
                  <> · {solicitudComprador.razonSocialFacturacion} ({solicitudComprador.rutFacturacion})</>
                )}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Plazo de pago</Label>
            <Select
              value={plazoPagoDias === null ? 'contado' : String(plazoPagoDias)}
              onValueChange={v => setPlazoPagoDias(v === 'contado' ? null : Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contado">Al contado</SelectItem>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="15">15 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
                <SelectItem value="60">60 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input type="checkbox" className="mt-0.5" checked={exentoIva} onChange={e => setExentoIva(e.target.checked)} />
          <span className="text-sm text-gray-700">
            Venta exenta de IVA
            <span className="block text-xs text-gray-400">El total a cobrar baja a {formatCLP(totalExento)} (precio neto, sin el 19%).</span>
          </span>
        </label>
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
