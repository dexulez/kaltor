'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCLP, calcularIva, calcularPpm, formatRut } from '@/lib/calculations'
import { imprimirTicketVenta, TICKET_FORMATOS, TicketFormato, TicketVentaData } from '@/lib/ticketPrint'
import { Customer, Product } from '@/types'
import QRScanner from '@/components/shared/QRScanner'
import { parseProductoQR } from '@/components/shared/ProductoQRCode'

interface ItemCarrito { product: Product; cantidad: number }

interface ItemServicioOT {
  id: string
  numero_ot: string
  cliente_nombre: string
  equipo: string
  precio: number
}

interface OTListaItem {
  id: string
  numero_ot: string
  precio_servicio: number | null
  customers: { nombre: string } | null
  equipment: { marca: string; modelo: string } | null
}

interface Props {
  productos: Product[]
  clientes: Pick<Customer, 'id' | 'nombre' | 'telefono' | 'rut'>[]
  IVA: number
  PPM: number
  comisionDebito: number
  comisionCredito: number
  otPreload?: ItemServicioOT | null
}

const METODO_LABELS = { efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia', debito: '💳 Débito', credito: '💳 Crédito' }

export default function PosVentaDirecta({ productos, clientes, IVA, PPM, comisionDebito, comisionCredito, otPreload }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [clientesList, setClientesList] = useState(clientes)
  const [serviciosOT, setServiciosOT] = useState<ItemServicioOT[]>([])
  const [showImportOT, setShowImportOT] = useState(false)
  const [otsDisponibles, setOtsDisponibles] = useState<OTListaItem[]>([])
  const [loadingOTs, setLoadingOTs] = useState(false)
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
  const [productosExtra, setProductosExtra] = useState<Product[]>([])
  const [modalNuevoProd, setModalNuevoProd] = useState(false)
  const [categoriasDisp, setCategoriasDisp] = useState<{ id: string; nombre: string }[]>([])
  const [npNombre, setNpNombre]     = useState('')
  const [npPrecioVenta, setNpPrecioVenta] = useState('')
  const [npPrecioCosto, setNpPrecioCosto] = useState('')
  const [npStock, setNpStock]       = useState('0')
  const [npCatId, setNpCatId]       = useState('')
  const [npSaving, setNpSaving]     = useState(false)
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia' | 'debito' | 'credito'>('efectivo')
  const [tipoDoc, setTipoDoc] = useState<'boleta' | 'factura' | 'presupuesto'>('boleta')
  const [busqueda, setBusqueda] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  // Descuento
  const [descuentoInput, setDescuentoInput] = useState('')
  const [tipoDescuento, setTipoDescuento] = useState<'monto' | 'pct'>('monto')
  // Cobro mixto
  const [cobromixto, setCobromixto] = useState(false)
  const [metodo2, setMetodo2] = useState<'efectivo' | 'transferencia' | 'debito' | 'credito'>('efectivo')
  const [monto2Input, setMonto2Input] = useState('')
  // Post-venta
  const [ventaCompletada, setVentaCompletada] = useState<TicketVentaData | null>(null)
  const [ticketFormato, setTicketFormato] = useState<TicketFormato>('ticket80')

  async function abrirModalNuevoProd() {
    setNpNombre(busqueda.trim())
    setNpPrecioVenta('')
    setNpPrecioCosto('')
    setNpStock('0')
    setModalNuevoProd(true)
    if (!categoriasDisp.length) {
      const { data } = await supabase.from('product_categories').select('id, nombre').order('nombre')
      setCategoriasDisp((data ?? []) as { id: string; nombre: string }[])
      if (data?.[0]) setNpCatId(data[0].id)
    }
  }

  async function crearProductoRapido() {
    if (!npNombre.trim()) { toast.error('Ingresa el nombre del producto'); return }
    if (!npPrecioVenta || parseInt(npPrecioVenta) <= 0) { toast.error('Ingresa el precio de venta'); return }
    if (!npCatId) { toast.error('Selecciona una categoría'); return }
    setNpSaving(true)
    const { data, error } = await supabase.from('products').insert({
      nombre: npNombre.trim(),
      precio_venta: parseInt(npPrecioVenta),
      precio_costo: parseInt(npPrecioCosto) || 0,
      stock_actual: parseInt(npStock) || 0,
      stock_minimo: 0,
      categoria_id: npCatId,
      activo: true,
      precio_incluye_iva: true,
    }).select('*').single()
    if (error) { toast.error('Error: ' + error.message); setNpSaving(false); return }
    const prod = data as Product
    setProductosExtra(prev => [...prev, prod])
    agregarProducto(prod)
    toast.success(`"${prod.nombre}" creado y agregado al carrito`)
    setModalNuevoProd(false)
    setBusqueda('')
    setNpSaving(false)
  }

  const q = busqueda.toLowerCase().trim()
  const productosTodos = [...productos, ...productosExtra]
  const productosFiltrados = productosTodos.filter(p =>
    p.stock_actual > 0 && (
      p.nombre.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.codigo_barras && p.codigo_barras.includes(busqueda.trim()))
    )
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

  // Precargar OT desde URL param
  useEffect(() => {
    if (otPreload) {
      setServiciosOT([otPreload])
      toast.success(`OT ${otPreload.numero_ot} cargada para cobro`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function abrirImportOT() {
    setShowImportOT(true)
    setLoadingOTs(true)
    const { data } = await supabase
      .from('repair_orders')
      .select('id, numero_ot, precio_servicio, customers(nombre), equipment(marca, modelo)')
      .eq('estado', 'listo')
      .order('created_at', { ascending: false })
      .limit(50)
    setOtsDisponibles((data ?? []) as unknown as OTListaItem[])
    setLoadingOTs(false)
  }

  function agregarOT(ot: OTListaItem) {
    if (serviciosOT.find(s => s.id === ot.id)) { toast.error('Esta OT ya está en el cobro'); return }
    setServiciosOT(prev => [...prev, {
      id: ot.id,
      numero_ot: ot.numero_ot,
      cliente_nombre: ot.customers?.nombre ?? '—',
      equipo: `${ot.equipment?.marca ?? ''} ${ot.equipment?.modelo ?? ''}`.trim(),
      precio: ot.precio_servicio ?? 0,
    }])
    toast.success(`OT ${ot.numero_ot} agregada`)
  }

  function quitarOT(id: string) { setServiciosOT(s => s.filter(ot => ot.id !== id)) }

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

  const subtotalProductos = carrito.reduce((s, i) => s + i.product.precio_venta * i.cantidad, 0)
  const subtotalOTs = serviciosOT.reduce((s, ot) => s + ot.precio, 0)
  const subtotal = subtotalProductos + subtotalOTs
  // Descuento
  const descuentoNum = parseFloat(descuentoInput) || 0
  const descuentoFinal = tipoDescuento === 'pct' ? Math.round(subtotal * descuentoNum / 100) : Math.round(descuentoNum)
  const totalFinalConDesc = Math.max(0, subtotal - descuentoFinal)
  // Cobro mixto
  const monto2 = Math.min(parseInt(monto2Input) || 0, totalFinalConDesc)
  const monto1 = Math.max(0, totalFinalConDesc - monto2)
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

  const esPresupuesto = tipoDoc === 'presupuesto'
  // Presupuesto: sin IVA, sin PPM, sin comisión bancaria
  const netoTotal = esPresupuesto ? totalFinalConDesc : Math.round(totalFinalConDesc / (1 + IVA / 100))
  const ivaTotal = esPresupuesto ? 0 : totalFinalConDesc - netoTotal
  const ppmTotal = esPresupuesto ? 0 : calcularPpm(netoTotal, PPM)
  const comisionPct = (!esPresupuesto && metodo === 'debito') ? comisionDebito : (!esPresupuesto && metodo === 'credito') ? comisionCredito : 0
  const comisionBancaria = esPresupuesto ? 0 : Math.round(totalFinalConDesc * comisionPct / 100)
  const totalFinal = totalFinalConDesc

  async function handleVenta() {
    if (!carrito.length && !serviciosOT.length) { toast.error('Agrega al menos un producto u OT'); return }
    setLoading(true)

    const tipoVenta = serviciosOT.length > 0 && carrito.length === 0 ? 'reparacion' : 'directa'
    const { data: venta, error: ve } = await supabase.from('sales').insert({
      tipo: tipoVenta,
      customer_id: clienteId || null,
      subtotal: netoTotal,
      iva: ivaTotal,
      ppm: ppmTotal,
      total: totalFinal,
      descuento: descuentoFinal,
      metodo_pago: metodo,
      metodo_pago_2: cobromixto && monto2 > 0 ? metodo2 : null,
      monto_pago_2: cobromixto && monto2 > 0 ? monto2 : null,
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

    // Items de servicios OT
    if (serviciosOT.length > 0) {
      const otItems = serviciosOT.map(ot => ({
        sale_id: venta.id,
        product_id: null,
        nombre: `Servicio técnico ${ot.numero_ot} — ${ot.equipo}`,
        cantidad: 1,
        precio_unitario: ot.precio,
        precio_costo: 0,
        subtotal: ot.precio,
      }))
      await supabase.from('sale_items').insert(otItems)

      // Marcar cada OT como entregada
      for (const ot of serviciosOT) {
        await supabase.from('repair_orders').update({
          estado: 'entregado',
          metodo_pago: metodo,
          fecha_entrega: new Date().toISOString(),
        }).eq('id', ot.id)
        await supabase.from('repair_status_history').insert({
          repair_order_id: ot.id,
          estado_anterior: 'listo',
          estado_nuevo: 'entregado',
          comentario: `Cobrado en venta ${venta.numero_venta}`,
        })
      }
    }

    toast.success(`Venta ${venta.numero_venta} registrada — ${formatCLP(totalFinal)}`)

    // Preparar datos del ticket antes de limpiar
    const ticketItems = [
      ...carrito.map(i => ({
        nombre: i.product.nombre,
        cantidad: i.cantidad,
        precio_unitario: i.product.precio_venta,
        subtotal: i.product.precio_venta * i.cantidad,
      })),
      ...serviciosOT.map(ot => ({
        nombre: `Servicio técnico ${ot.numero_ot} — ${ot.equipo}`,
        cantidad: 1,
        precio_unitario: ot.precio,
        subtotal: ot.precio,
      })),
    ]
    setVentaCompletada({
      numero_venta: venta.numero_venta as string,
      created_at: venta.created_at as string,
      tipo_documento: tipoDoc,
      metodo_pago: metodo,
      cliente_nombre: clienteSeleccionado?.nombre ?? null,
      items: ticketItems,
      subtotal: netoTotal,
      iva: ivaTotal,
      ppm: ppmTotal,
      descuento: descuentoFinal,
      total: totalFinal,
    })

    // Limpiar todo el POS para la siguiente venta
    setCarrito([])
    setServiciosOT([])
    setClienteId('')
    setBusqueda('')
    setDescuentoInput('')
    setTipoDescuento('monto')
    setMetodo('efectivo')
    setTipoDoc('boleta')
    setCobromixto(false)
    setMetodo2('efectivo')
    setMonto2Input('')

    router.refresh()
    setLoading(false)
  }

  // Panel post-venta
  if (ventaCompletada) {
    const cfg = { nombre_local: 'TechRepair Pro' } // config básica disponible en client
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6 text-center space-y-2">
          <div className="text-4xl">✅</div>
          <p className="font-bold text-green-800 text-lg">Venta registrada</p>
          <p className="text-green-700 font-mono text-xl font-bold">{ventaCompletada.numero_venta}</p>
          <p className="text-green-600">{formatCLP(ventaCompletada.total)}</p>
        </div>

        <div className="bg-white rounded-xl border p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Formato del ticket</p>
          <div className="grid grid-cols-3 gap-2">
            {TICKET_FORMATOS.map(f => (
              <button key={f.key} type="button" onClick={() => setTicketFormato(f.key)}
                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-colors ${ticketFormato === f.key ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                <span className="text-xl">{f.icon}</span>
                <p className="text-xs font-semibold text-gray-800">{f.label}</p>
                <p className="text-xs text-gray-400">{f.desc}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => imprimirTicketVenta(ventaCompletada, cfg, ticketFormato)}
            className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-semibold text-sm transition-colors"
          >
            🖨️ Imprimir ticket
          </button>

          <button
            onClick={() => setVentaCompletada(null)}
            className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
          >
            + Nueva venta
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
    {showScanner && (
      <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
    )}

    {/* ── Modal crear producto rápido ────────────────────────────────── */}
    {modalNuevoProd && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModalNuevoProd(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-gray-800 text-lg">➕ Crear producto</h3>
          <div className="space-y-3">
            <div>
              <Label>Nombre <span className="text-red-500">*</span></Label>
              <Input value={npNombre} onChange={e => setNpNombre(e.target.value)} autoFocus className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Precio venta (CLP) <span className="text-red-500">*</span></Label>
                <Input type="number" min={0} value={npPrecioVenta} onChange={e => setNpPrecioVenta(e.target.value)} className="mt-1" placeholder="0" />
                {npPrecioVenta && <p className="text-xs text-blue-600 mt-0.5">{formatCLP(parseInt(npPrecioVenta) || 0)}</p>}
              </div>
              <div>
                <Label>Precio costo (CLP)</Label>
                <Input type="number" min={0} value={npPrecioCosto} onChange={e => setNpPrecioCosto(e.target.value)} className="mt-1" placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stock inicial</Label>
                <Input type="number" min={0} value={npStock} onChange={e => setNpStock(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Categoría <span className="text-red-500">*</span></Label>
                <select value={npCatId} onChange={e => setNpCatId(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Seleccionar...</option>
                  {categoriasDisp.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setModalNuevoProd(false)}>Cancelar</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={crearProductoRapido} disabled={npSaving}>
              {npSaving ? 'Creando...' : 'Crear y agregar'}
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* ── Diálogo importar OT ─────────────────────────────────────────── */}
    {showImportOT && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowImportOT(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <p className="font-semibold text-gray-800">Importar OT para cobro</p>
              <p className="text-xs text-gray-500">OTs con estado "Listo"</p>
            </div>
            <button onClick={() => setShowImportOT(false)} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-lg">✕</button>
          </div>
          <div className="overflow-y-auto flex-1">
            {loadingOTs ? (
              <div className="py-10 text-center text-gray-400 text-sm">Cargando órdenes...</div>
            ) : otsDisponibles.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No hay OTs listas para cobrar</div>
            ) : (
              <div className="divide-y">
                {otsDisponibles.map(ot => (
                  <button key={ot.id} onClick={() => { agregarOT(ot); setShowImportOT(false) }}
                    className="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono font-semibold text-sm text-gray-900">{ot.numero_ot}</p>
                      <p className="text-xs text-gray-500">{ot.customers?.nombre ?? '—'} · {ot.equipment?.marca} {ot.equipment?.modelo}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-blue-700 text-sm">{formatCLP(ot.precio_servicio ?? 0)}</p>
                      <p className="text-xs text-green-600">Listo ✓</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Buscador de productos */}
      <div className="lg:col-span-3 space-y-3">
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-base font-semibold">Buscar producto</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={abrirImportOT}
                className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-800 border border-orange-300 rounded-lg px-3 py-1.5 hover:bg-orange-50 transition-colors"
              >
                🔧 Importar OT
              </button>
              <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
            >
                📷 Escanear código
              </button>
            </div>
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
                <div className="text-center py-4 space-y-2">
                  <p className="text-gray-400 text-sm">Sin resultados para &quot;{busqueda}&quot;</p>
                  <button
                    type="button"
                    onClick={abrirModalNuevoProd}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                  >
                    + Crear &quot;{busqueda}&quot; como nuevo producto
                  </button>
                </div>
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

        {/* Servicios OT */}
        {serviciosOT.length > 0 && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-orange-50 px-4 py-3 border-b flex items-center justify-between">
              <p className="font-semibold text-orange-800 text-sm">🔧 Servicios de reparación ({serviciosOT.length})</p>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {serviciosOT.map(ot => (
                  <tr key={ot.id}>
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-gray-900">{ot.numero_ot}</p>
                      <p className="text-xs text-gray-500">{ot.cliente_nombre} · {ot.equipo}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-700">{formatCLP(ot.precio)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => quitarOT(ot.id)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Carrito */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <p className="font-semibold text-gray-800">Productos en venta ({carrito.length + serviciosOT.length})</p>
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

          {/* Descuento */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Descuento</Label>
            <div className="flex gap-2">
              <div className="flex border rounded-lg overflow-hidden text-xs shrink-0">
                <button onClick={() => setTipoDescuento('monto')}
                  className={`px-3 py-1.5 font-semibold transition-colors ${tipoDescuento === 'monto' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>$</button>
                <button onClick={() => setTipoDescuento('pct')}
                  className={`px-3 py-1.5 font-semibold transition-colors ${tipoDescuento === 'pct' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>%</button>
              </div>
              <Input type="number" min={0} max={tipoDescuento === 'pct' ? 100 : undefined}
                placeholder={tipoDescuento === 'pct' ? 'Ej: 10' : 'Ej: 5000'}
                value={descuentoInput} onChange={e => setDescuentoInput(e.target.value)} className="flex-1 h-9" />
            </div>
            {descuentoFinal > 0 && (
              <p className="text-xs text-red-600 font-medium">− {formatCLP(descuentoFinal)} de descuento</p>
            )}
          </div>

          {/* Totales */}
          <div className={`space-y-1.5 text-sm rounded-lg p-3 ${esPresupuesto ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}>
            {esPresupuesto && (
              <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-purple-200">
                <span className="text-sm">📋</span>
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Presupuesto — sin impuestos</span>
              </div>
            )}
            {subtotal > 0 && descuentoFinal > 0 && (
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Subtotal</span><span>{formatCLP(subtotal)}</span>
              </div>
            )}
            {descuentoFinal > 0 && (
              <div className="flex justify-between text-red-600 text-xs">
                <span>Descuento</span><span>− {formatCLP(descuentoFinal)}</span>
              </div>
            )}
            {!esPresupuesto && (
              <>
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
                    <span>Comisión bancaria ({comisionPct}%)</span><span>− {formatCLP(comisionBancaria)}</span>
                  </div>
                )}
              </>
            )}
            <div className={`flex justify-between font-bold text-xl border-t pt-2 ${esPresupuesto ? 'text-purple-800 border-purple-200' : 'text-gray-900'}`}>
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
                      <Input value={nuevoCliente.rut} onChange={e => setNuevoCliente(v => ({ ...v, rut: formatRut(e.target.value) }))} placeholder="26595544-4" inputMode="numeric" />
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

            {/* Cobro mixto */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cobromixto} onChange={e => setCobromixto(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm font-medium text-gray-700">💳 Cobro mixto (2 métodos)</span>
              </label>
              {cobromixto && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-blue-700 font-medium">Segundo método de pago</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(METODO_LABELS).filter(([k]) => k !== metodo).map(([k, v]) => (
                      <button key={k} type="button" onClick={() => setMetodo2(k as typeof metodo2)}
                        className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${metodo2 === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <div>
                    <Label className="text-xs">Monto con {METODO_LABELS[metodo2]}</Label>
                    <Input type="number" min={0} max={totalFinal}
                      placeholder={`Máx: ${formatCLP(totalFinal)}`}
                      value={monto2Input} onChange={e => setMonto2Input(e.target.value)}
                      className="mt-1 h-8 text-sm" />
                  </div>
                  {monto2 > 0 && (
                    <div className="space-y-0.5 text-xs font-medium border-t border-blue-200 pt-2">
                      <div className="flex justify-between text-gray-700">
                        <span>{METODO_LABELS[metodo]}</span><span>{formatCLP(monto1)}</span>
                      </div>
                      <div className="flex justify-between text-blue-700">
                        <span>{METODO_LABELS[metodo2]}</span><span>{formatCLP(monto2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Documento</Label>
              {/* Presupuesto solo disponible para Efectivo y Transferencia */}
              {(metodo === 'debito' || metodo === 'credito') && tipoDoc === 'presupuesto' && (() => { setTimeout(() => setTipoDoc('boleta'), 0); return null })()}
              <Select
                value={tipoDoc}
                onValueChange={v => {
                  const val = v as typeof tipoDoc
                  if (val === 'presupuesto' && (metodo === 'debito' || metodo === 'credito')) return
                  setTipoDoc(val)
                }}
              >
                <SelectTrigger>
                  <span className="flex-1 text-left text-sm">
                    {tipoDoc === 'boleta' ? '🧾 Boleta' : tipoDoc === 'factura' ? '📄 Factura' : '📋 Presupuesto'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleta">🧾 Boleta</SelectItem>
                  <SelectItem value="factura">📄 Factura</SelectItem>
                  {(metodo === 'efectivo' || metodo === 'transferencia') && (
                    <SelectItem value="presupuesto">📋 Presupuesto (sin IVA ni PPM)</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {(metodo === 'debito' || metodo === 'credito') && (
                <p className="text-xs text-gray-400">Débito/Crédito solo admite Boleta o Factura</p>
              )}
              {esPresupuesto && (
                <p className="text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg">
                  📋 Descuenta stock y suma a ventas sin IVA ni PPM. Válido solo con Efectivo o Transferencia.
                </p>
              )}
            </div>
          </div>

          <Button onClick={handleVenta} disabled={loading || (!carrito.length && !serviciosOT.length)}
            className={`w-full text-base py-6 ${esPresupuesto ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'}`}>
            {loading ? 'Procesando...' : esPresupuesto ? `📋 Registrar presupuesto ${formatCLP(totalFinal)}` : `✓ Cobrar ${formatCLP(totalFinal)}`}
          </Button>
        </div>
      </div>
    </div>
    </>
  )
}
