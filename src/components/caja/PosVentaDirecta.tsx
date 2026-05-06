'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCLP, calcularIva, calcularPpm } from '@/lib/calculations'
import { Customer, Product } from '@/types'
import QRScanner from '@/components/shared/QRScanner'
import { parseProductoQR } from '@/components/shared/ProductoQRCode'

interface ItemCarrito { product: Product; cantidad: number }

interface Props {
  productos: Product[]
  clientes: Pick<Customer, 'id' | 'nombre' | 'telefono' | 'rut'>[]
  IVA: number
  PPM: number
  comisionDebito: number
  comisionCredito: number
}

const METODO_LABELS = { efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia', debito: '💳 Débito', credito: '💳 Crédito' }

export default function PosVentaDirecta({ productos, clientes, IVA, PPM, comisionDebito, comisionCredito }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [clientesList, setClientesList] = useState(clientes)
  const [clienteId, setClienteId] = useState('')
  const [popupClienteOpen, setPopupClienteOpen] = useState(false)
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    telefono: '',
    rut: '',
    email: '',
    direccion: '',
    notas: '',
  })
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia' | 'debito' | 'credito'>('efectivo')
  const [tipoDoc, setTipoDoc] = useState<'boleta' | 'factura'>('boleta')
  const [busqueda, setBusqueda] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock_actual > 0
  )

  function agregarProducto(p: Product) {
    setCarrito(c => {
      const existe = c.find(i => i.product.id === p.id)
      if (existe) return c.map(i => i.product.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...c, { product: p, cantidad: 1 }]
    })
    setBusqueda('')
  }

  function cambiarCantidad(id: string, delta: number) {
    setCarrito(c => c.map(i => i.product.id === id
      ? { ...i, cantidad: Math.max(1, i.cantidad + delta) }
      : i).filter(i => i.cantidad > 0))
  }

  function quitarItem(id: string) { setCarrito(c => c.filter(i => i.product.id !== id)) }

  function handleQRScan(value: string) {
    setShowScanner(false)
    // 1. Intentar QR interno (TR:P:{uuid})
    const productId = parseProductoQR(value)
    if (productId) {
      const producto = productos.find(p => p.id === productId)
      if (!producto) { toast.error('Producto no encontrado'); return }
      if (producto.stock_actual <= 0) { toast.error(`${producto.nombre} sin stock`); return }
      agregarProducto(producto)
      toast.success(`${producto.nombre} agregado`)
      return
    }
    // 2. Buscar por código de barras EAN-13 / Code128 del producto
    const porBarcode = productos.find(p =>
      p.codigo_barras && p.codigo_barras.trim() === value.trim()
    )
    if (porBarcode) {
      if (porBarcode.stock_actual <= 0) { toast.error(`${porBarcode.nombre} sin stock`); return }
      agregarProducto(porBarcode)
      toast.success(`${porBarcode.nombre} agregado`)
      return
    }
    // 3. Buscar por SKU interno
    const porSku = productos.find(p =>
      p.sku && p.sku.trim().toLowerCase() === value.trim().toLowerCase()
    )
    if (porSku) {
      if (porSku.stock_actual <= 0) { toast.error(`${porSku.nombre} sin stock`); return }
      agregarProducto(porSku)
      toast.success(`${porSku.nombre} agregado`)
      return
    }
    // 4. Buscar por IMEI / N° serie
    const porImei = productos.find(p => p.imei === value || p.numero_serie === value)
    if (porImei) {
      agregarProducto(porImei)
      toast.success(`${porImei.nombre} agregado`)
      return
    }
    toast.error(`Código "${value.slice(0, 20)}…" no encontrado — asigna el código de barras al producto en Inventario`)
  }

  const subtotal = carrito.reduce((s, i) => s + i.product.precio_venta * i.cantidad, 0)
  const clienteSeleccionado = clientesList.find(c => c.id === clienteId)
  const clienteValue = clienteSeleccionado ? clienteId : ''

  async function crearClienteDesdePopup() {
    if (!nuevoCliente.nombre.trim()) {
      toast.error('Ingresa el nombre del cliente')
      return
    }
    if (!nuevoCliente.telefono.trim()) {
      toast.error('Ingresa el teléfono del cliente')
      return
    }

    setGuardandoCliente(true)
    const payload = {
      nombre: nuevoCliente.nombre.trim(),
      telefono: nuevoCliente.telefono.trim(),
      rut: nuevoCliente.rut.trim() || null,
      email: nuevoCliente.email.trim() || null,
      direccion: nuevoCliente.direccion.trim() || null,
      notas: nuevoCliente.notas.trim() || null,
    }

    const { data, error } = await supabase.from('customers').insert(payload).select('*').single()
    if (error) {
      toast.error('Error al crear cliente: ' + error.message)
      setGuardandoCliente(false)
      return
    }

    const creado = {
      id: data.id as string,
      nombre: data.nombre as string,
      telefono: (data.telefono as string) ?? '',
      rut: (data.rut as string | null) ?? undefined,
    }

    setClientesList(prev => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setClienteId(creado.id)
    setNuevoCliente({ nombre: '', telefono: '', rut: '', email: '', direccion: '', notas: '' })
    setPopupClienteOpen(false)
    setGuardandoCliente(false)
    toast.success(`Cliente "${creado.nombre}" creado y seleccionado`)
  }

  const precioNeto = (i: ItemCarrito) => i.product.precio_incluye_iva
    ? Math.round(i.product.precio_venta / 1.19)
    : i.product.precio_venta

  const netoTotal = carrito.reduce((s, i) => s + precioNeto(i) * i.cantidad, 0)
  const ivaTotal = calcularIva(netoTotal, IVA)
  const ppmTotal = calcularPpm(netoTotal, PPM)
  const comisionPct = metodo === 'debito' ? comisionDebito : metodo === 'credito' ? comisionCredito : 0
  const comisionBancaria = Math.round(subtotal * comisionPct / 100)
  const totalFinal = subtotal

  async function handleVenta() {
    if (!carrito.length) { toast.error('Agrega al menos un producto'); return }
    setLoading(true)

    const { data: venta, error: ve } = await supabase.from('sales').insert({
      tipo: 'directa',
      customer_id: clienteId || null,
      subtotal: netoTotal,
      iva: ivaTotal,
      ppm: ppmTotal,
      total: totalFinal,
      metodo_pago: metodo,
      comision_bancaria: comisionBancaria,
      tipo_documento: tipoDoc,
    }).select().single()

    if (ve) { toast.error('Error al crear venta: ' + ve.message); setLoading(false); return }

    const items = carrito.map(i => ({
      sale_id: venta.id,
      product_id: i.product.id,
      nombre: i.product.nombre,
      cantidad: i.cantidad,
      precio_unitario: i.product.precio_venta,
      precio_costo: (i.product.precio_costo ?? 0) + (i.product.costo_envio ?? 0),
      subtotal: i.product.precio_venta * i.cantidad,
    }))

    await supabase.from('sale_items').insert(items)

    for (const item of carrito) {
      const nuevoStock = item.product.stock_actual - item.cantidad
      await supabase.from('products').update({ stock_actual: nuevoStock }).eq('id', item.product.id)
      await supabase.from('stock_movements').insert({
        product_id: item.product.id,
        tipo: 'salida',
        cantidad: item.cantidad,
        stock_anterior: item.product.stock_actual,
        stock_nuevo: nuevoStock,
        razon: `Venta ${venta.numero_venta}`,
        referencia_id: venta.id,
        referencia_tipo: 'sale',
      })
    }

    toast.success(`Venta ${venta.numero_venta} registrada — ${formatCLP(totalFinal)}`)
    setCarrito([])
    router.refresh()
    setLoading(false)
  }

  return (
    <>
    {showScanner && (
      <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
    )}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Buscador de productos */}
      <div className="lg:col-span-3 space-y-3">
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Buscar producto</Label>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
            >
              📷 Escanear código
            </button>
          </div>
          <Input
            placeholder="Nombre del producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            autoFocus
          />
          {busqueda && (
            <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              {productosFiltrados.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">Sin resultados</p>
              ) : (
                productosFiltrados.map(p => (
                  <button key={p.id} onClick={() => agregarProducto(p)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                        <p className="text-xs text-gray-400">Stock: {p.stock_actual}</p>
                      </div>
                      <p className="font-bold text-blue-700">{formatCLP(p.precio_venta)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Carrito */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <p className="font-semibold text-gray-800">Productos en venta ({carrito.length})</p>
          </div>
          {carrito.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">Busca y agrega productos...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-600 font-medium">Producto</th>
                  <th className="text-center px-4 py-2 text-gray-600 font-medium">Cant.</th>
                  <th className="text-right px-4 py-2 text-gray-600 font-medium">Precio</th>
                  <th className="text-right px-4 py-2 text-gray-600 font-medium">Subtotal</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {carrito.map(({ product: p, cantidad }) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => cambiarCantidad(p.id, -1)} className="w-6 h-6 rounded-full border hover:bg-gray-100 text-lg leading-none">−</button>
                        <span className="w-8 text-center font-bold">{cantidad}</span>
                        <button onClick={() => cambiarCantidad(p.id, 1)} disabled={cantidad >= p.stock_actual} className="w-6 h-6 rounded-full border hover:bg-gray-100 text-lg leading-none disabled:opacity-40">+</button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCLP(p.precio_venta)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCLP(p.precio_venta * cantidad)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => quitarItem(p.id)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Panel de cobro */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl border p-5 space-y-4 sticky top-4">
          <h2 className="font-semibold text-gray-800 text-lg">Resumen de cobro</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Neto</span><span>{formatCLP(netoTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA ({IVA}%)</span><span>{formatCLP(ivaTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>PPM ({PPM}%)</span><span>{formatCLP(ppmTotal)}</span>
            </div>
            {comisionBancaria > 0 && (
              <div className="flex justify-between text-orange-600 text-xs">
                <span>Comisión bancaria ({comisionPct}%)</span><span>−{formatCLP(comisionBancaria)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl border-t pt-2 text-gray-900">
              <span>TOTAL</span><span>{formatCLP(totalFinal)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clienteValue} onValueChange={(value) => setClienteId(value ?? '')}>
                <SelectTrigger>
                  <span className="flex-1 text-left text-sm truncate">
                    {clienteId
                      ? (clienteSeleccionado ? `${clienteSeleccionado.nombre} — ${clienteSeleccionado.telefono}` : 'Cliente no disponible')
                      : 'Sin cliente'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {clientesList.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre} — {c.telefono}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={popupClienteOpen} onOpenChange={setPopupClienteOpen}>
                <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
                  + Crear cliente
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nuevo cliente</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label>Nombre completo <span className="text-red-500">*</span></Label>
                      <Input value={nuevoCliente.nombre} onChange={e => setNuevoCliente(v => ({ ...v, nombre: e.target.value }))} placeholder="Juan Pérez González" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Teléfono <span className="text-red-500">*</span></Label>
                      <Input value={nuevoCliente.telefono} onChange={e => setNuevoCliente(v => ({ ...v, telefono: e.target.value }))} placeholder="+56 9 1234 5678" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>RUT</Label>
                      <Input value={nuevoCliente.rut} onChange={e => setNuevoCliente(v => ({ ...v, rut: e.target.value }))} placeholder="12.345.678-9" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={nuevoCliente.email} onChange={e => setNuevoCliente(v => ({ ...v, email: e.target.value }))} placeholder="correo@ejemplo.com" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label>Dirección</Label>
                      <Input value={nuevoCliente.direccion} onChange={e => setNuevoCliente(v => ({ ...v, direccion: e.target.value }))} placeholder="Av. Principal 123, Santiago" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label>Notas</Label>
                      <Textarea rows={3} value={nuevoCliente.notas} onChange={e => setNuevoCliente(v => ({ ...v, notas: e.target.value }))} placeholder="Observaciones del cliente..." />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setPopupClienteOpen(false)}>Cancelar</Button>
                    <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={crearClienteDesdePopup} disabled={guardandoCliente}>
                      {guardandoCliente ? 'Guardando...' : 'Guardar cliente'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

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
                  <span className="flex-1 text-left text-sm">{tipoDoc === 'boleta' ? 'Boleta' : 'Factura'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleta">Boleta</SelectItem>
                  <SelectItem value="factura">Factura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleVenta} disabled={loading || !carrito.length}
            className="w-full bg-green-600 hover:bg-green-700 text-base py-6">
            {loading ? 'Procesando...' : `✓ Cobrar ${formatCLP(totalFinal)}`}
          </Button>
        </div>
      </div>
    </div>
    </>
  )
}
