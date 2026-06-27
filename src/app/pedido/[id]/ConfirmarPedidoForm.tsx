'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/calculations'

interface Item {
  id: string
  nombre: string
  cantidad_solicitada: number
  cantidad_recibida?: number
  precio_unitario: number
  disponible_proveedor: boolean | null
  precio_cotizado?: number | null
  precio_aceptado?: number | null
  nota_proveedor?: string | null
  alternativa?: string | null
  descuento_tipo?: string | null
  descuento_valor?: number | null
  descuento_desde_cantidad?: number | null
}

async function comprimirFoto(file: File): Promise<File> {
  const MAX = 5 * 1024 * 1024
  if (file.size <= MAX) return file
  const img = new Image()
  const srcUrl = URL.createObjectURL(file)
  await new Promise<void>(res => { img.onload = () => res(); img.src = srcUrl })
  URL.revokeObjectURL(srcUrl)
  let { width, height } = img
  const MAX_DIM = 2400
  if (width > MAX_DIM || height > MAX_DIM) {
    if (width >= height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
    else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
  }
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
  for (let q = 0.9; q >= 0.3; q -= 0.1) {
    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', q))
    if (blob.size <= MAX) return new File([blob], 'comprobante.jpg', { type: 'image/jpeg' })
  }
  const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.3))
  return new File([blob], 'comprobante.jpg', { type: 'image/jpeg' })
}

type Etapa = 'disponibilidad' | 'esperando' | 'preparando' | 'envio' | 'finalizado'

type ProductoAdicional = {
  id: string
  nombre: string
  cantidad: string
  precio: string
  nota: string
  descuentoActivo: boolean
  descuentoTipo: string
  descuentoValor: string
  descuentoDesdeCantidad: string
}

function getEtapaInicial(estado: string, yaConfirmado: boolean): Etapa {
  if (estado === 'preparando') return 'envio'
  if (estado === 'confirmada') return 'preparando'
  if (estado === 'proveedor_respondio') return 'esperando'
  if (estado === 'en_transito' || estado === 'recibida_parcial' || estado === 'recibida_completa') return 'finalizado'
  if (estado === 'pendiente' && yaConfirmado) return 'preparando'
  return 'disponibilidad'
}

// Barra de progreso horizontal con los pasos del pedido
function BarraEstado({ estado }: { estado: string }) {
  const pasos = [
    { id: 'pedido',      label: 'Pedido enviado',     icon: '📤' },
    { id: 'cotizacion',  label: 'Tu cotización',       icon: '💬' },
    { id: 'confirmado',  label: 'Taller confirmó',     icon: '✅' },
    { id: 'preparando',  label: 'Preparando pedido',  icon: '📦' },
    { id: 'en_camino',   label: 'En camino',           icon: '🚚' },
    { id: 'recibido',    label: 'Recibido',            icon: '📥' },
  ]

  // Qué pasos están completados según el estado
  const completados = new Set<string>()
  const activo = { id: '', label: '' }

  switch (estado) {
    case 'pendiente':
    case 'enviada':
      completados.add('pedido')
      activo.id = 'cotizacion'; activo.label = 'Esperando tu cotización'
      break
    case 'proveedor_respondio':
      completados.add('pedido'); completados.add('cotizacion')
      activo.id = 'confirmado'; activo.label = 'El taller está revisando tu cotización'
      break
    case 'confirmada':
      completados.add('pedido'); completados.add('cotizacion'); completados.add('confirmado')
      activo.id = 'preparando'; activo.label = 'Comienza a preparar tu pedido'
      break
    case 'preparando':
      completados.add('pedido'); completados.add('cotizacion'); completados.add('confirmado'); completados.add('preparando')
      activo.id = 'en_camino'; activo.label = 'Listo para despachar'
      break
    case 'en_transito':
      completados.add('pedido'); completados.add('cotizacion'); completados.add('confirmado'); completados.add('preparando'); completados.add('en_camino')
      activo.id = 'recibido'; activo.label = 'El taller está esperando tu envío'
      break
    case 'recibida_parcial':
      completados.add('pedido'); completados.add('cotizacion'); completados.add('confirmado'); completados.add('preparando'); completados.add('en_camino')
      activo.id = 'recibido'; activo.label = 'Recepción parcial registrada'
      break
    case 'recibida_completa':
      completados.add('pedido'); completados.add('cotizacion'); completados.add('confirmado'); completados.add('preparando')
      completados.add('en_camino'); completados.add('recibido')
      activo.id = ''; activo.label = '¡Todo completado!'
      break
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado del pedido</p>

      {/* Pasos */}
      <div className="flex items-center gap-0">
        {pasos.map((paso, idx) => {
          const done = completados.has(paso.id)
          const current = activo.id === paso.id
          const isLast = idx === pasos.length - 1
          return (
            <div key={paso.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all
                  ${done ? 'bg-green-500 border-green-500 text-white' :
                    current ? 'bg-blue-500 border-blue-500 text-white animate-pulse' :
                    'bg-gray-100 border-gray-200 text-gray-400'}`}>
                  {done ? '✓' : paso.icon}
                </div>
                <p className={`text-[10px] text-center mt-1 leading-tight max-w-[56px]
                  ${done ? 'text-green-700 font-medium' : current ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
                  {paso.label}
                </p>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 rounded ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Mensaje de estado */}
      {activo.label && (
        <div className={`text-center text-sm font-medium py-1.5 rounded-lg
          ${estado === 'recibida_completa' ? 'text-green-700 bg-green-50' :
            estado === 'recibida_parcial' ? 'text-orange-700 bg-orange-50' :
            'text-blue-700 bg-blue-50'}`}>
          {activo.label}
        </div>
      )}
    </div>
  )
}

export default function ConfirmarPedidoForm({
  ordenId, items, yaConfirmado, comprobanteUrl, estado,
}: {
  ordenId: string
  items: Item[]
  yaConfirmado: boolean
  comprobanteUrl?: string | null
  estado?: string
}) {
  const estadoActual = estado ?? 'enviada'
  const [disponibles, setDisponibles] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map(i => [i.id, i.disponible_proveedor ?? true]))
  )
  const [cantidades, setCantidades] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, String(i.cantidad_solicitada)]))
  )
  const [precios, setPrecios] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, i.precio_cotizado ? String(i.precio_cotizado) : (i.precio_unitario > 0 ? String(i.precio_unitario) : '')]))
  )
  // Precio final por ítem, corregible justo antes de despachar (etapa "envío")
  const [preciosFinales, setPreciosFinales] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => {
      const precio = i.precio_aceptado ?? i.precio_cotizado ?? i.precio_unitario
      return [i.id, precio > 0 ? String(precio) : '']
    }))
  )
  const [descuentoActivo, setDescuentoActivo] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map(i => [i.id, !!i.descuento_valor]))
  )
  const [descuentoTipo, setDescuentoTipo] = useState<Record<string, 'monto' | 'porcentaje'>>(
    Object.fromEntries(items.map(i => [i.id, (i.descuento_tipo as 'monto' | 'porcentaje') ?? 'porcentaje']))
  )
  const [descuentoValor, setDescuentoValor] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, i.descuento_valor ? String(i.descuento_valor) : '']))
  )
  const [descuentoDesdeCantidad, setDescuentoDesdeCantidad] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, i.descuento_desde_cantidad ? String(i.descuento_desde_cantidad) : '']))
  )
  const [notas, setNotas] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, i.nota_proveedor ?? '']))
  )
  const [alternativas, setAlternativas] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, i.alternativa ?? '']))
  )
  const [preciosAlternativa, setPreciosAlternativa] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, '']))
  )
  const [cantidadesAlternativa, setCantidadesAlternativa] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, '']))
  )
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [urlComprobante, setUrlComprobante] = useState(comprobanteUrl ?? null)
  const [etapa, setEtapa] = useState<Etapa>(getEtapaInicial(estadoActual, yaConfirmado))
  const [estadoLocal, setEstadoLocal] = useState(estadoActual)
  const [productosAdicionales, setProductosAdicionales] = useState<ProductoAdicional[]>([])

  function agregarProducto() {
    setProductosAdicionales(prev => [...prev, {
      id: crypto.randomUUID(), nombre: '', cantidad: '1', precio: '', nota: '',
      descuentoActivo: false, descuentoTipo: 'porcentaje', descuentoValor: '', descuentoDesdeCantidad: '',
    }])
  }
  function actualizarProducto(pid: string, field: keyof ProductoAdicional, value: string) {
    setProductosAdicionales(prev => prev.map(p => p.id === pid ? { ...p, [field]: value } : p))
  }
  function toggleDescuentoAdicional(pid: string, val: boolean) {
    setProductosAdicionales(prev => prev.map(p => p.id === pid ? { ...p, descuentoActivo: val } : p))
  }
  function eliminarProducto(pid: string) {
    setProductosAdicionales(prev => prev.filter(p => p.id !== pid))
  }

  // Precio final del producto adicional considerando su descuento (si aplica)
  function precioFinalAdicional(p: ProductoAdicional): number {
    const precioBase = parseInt(p.precio) || 0
    if (!p.descuentoActivo) return precioBase
    const valor = parseFloat(p.descuentoValor) || 0
    if (valor <= 0) return precioBase
    const minimo = parseInt(p.descuentoDesdeCantidad) || 0
    const cantidad = parseInt(p.cantidad) || 0
    if (minimo > 0 && cantidad < minimo) return precioBase
    if (p.descuentoTipo === 'monto') return Math.max(0, precioBase - valor)
    return Math.max(0, Math.round(precioBase * (1 - valor / 100)))
  }

  const conStock = items.filter(i => disponibles[i.id])
  const sinStock = items.filter(i => !disponibles[i.id])

  // Precio final por unidad considerando el descuento (si aplica según la cantidad disponible)
  function precioFinalItem(itemId: string): number {
    const precioBase = parseInt(precios[itemId]) || 0
    if (!descuentoActivo[itemId]) return precioBase
    const valor = parseFloat(descuentoValor[itemId]) || 0
    if (valor <= 0) return precioBase
    const minimo = parseInt(descuentoDesdeCantidad[itemId]) || 0
    const cantidadDisp = parseInt(cantidades[itemId]) || 0
    if (minimo > 0 && cantidadDisp < minimo) return precioBase
    if (descuentoTipo[itemId] === 'monto') return Math.max(0, precioBase - valor)
    return Math.max(0, Math.round(precioBase * (1 - valor / 100)))
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const comprimida = await comprimirFoto(f)
    setFoto(comprimida)
    setFotoPreview(URL.createObjectURL(comprimida))
  }

  async function confirmarDisponibilidad() {
    setGuardando(true)
    try {
      const productosAdicionalesPayload = productosAdicionales
        .filter(p => p.nombre.trim())
        .map(p => ({
          nombre: p.nombre.trim(),
          cantidad: parseInt(p.cantidad) || 1,
          precio: precioFinalAdicional(p),
          nota: p.nota.trim() || undefined,
          ...(p.descuentoActivo && (parseFloat(p.descuentoValor) || 0) > 0 ? {
            descuentoTipo: p.descuentoTipo,
            descuentoValor: parseFloat(p.descuentoValor) || 0,
            descuentoDesdeCantidad: parseInt(p.descuentoDesdeCantidad) || null,
          } : {}),
        }))

      // El precio enviado ya incluye el descuento aplicado (si corresponde según la cantidad)
      const preciosConDescuento = Object.fromEntries(
        items.map(i => [i.id, String(precioFinalItem(i.id))])
      )
      const descuentos = Object.fromEntries(
        items.filter(i => descuentoActivo[i.id] && (parseFloat(descuentoValor[i.id]) || 0) > 0).map(i => [i.id, {
          tipo: descuentoTipo[i.id],
          valor: parseFloat(descuentoValor[i.id]) || 0,
          desdeCantidad: parseInt(descuentoDesdeCantidad[i.id]) || null,
        }])
      )

      const res = await fetch(`/api/pedido/${ordenId}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponibles, cantidades, precios: preciosConDescuento, notas, alternativas, preciosAlternativa, cantidadesAlternativa, productosAdicionales: productosAdicionalesPayload, descuentos }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('¡Respuesta enviada! El taller revisará tu cotización.')
      setEstadoLocal('proveedor_respondio')
      setEtapa('esperando')
    } catch (err) {
      toast.error('Error al confirmar. Intenta nuevamente.')
      console.error(err)
    }
    setGuardando(false)
  }

  async function confirmarPreparando() {
    setGuardando(true)
    try {
      const res = await fetch(`/api/pedido/${ordenId}/preparando`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      toast.success('¡Marcado como en preparación! El taller fue notificado.')
      setEstadoLocal('preparando')
      setEtapa('envio')
    } catch (err) {
      toast.error('Error al actualizar. Intenta nuevamente.')
      console.error(err)
    }
    setGuardando(false)
  }

  async function confirmarEnvio() {
    setGuardando(true)
    try {
      const fd = new FormData()
      if (foto) fd.append('foto', foto, 'comprobante.jpg')

      const preciosCorregidos = Object.fromEntries(
        items
          .filter(i => i.disponible_proveedor !== false && (parseInt(preciosFinales[i.id]) || 0) > 0)
          .map(i => [i.id, parseInt(preciosFinales[i.id])])
      )
      fd.append('precios', JSON.stringify(preciosCorregidos))

      const res = await fetch(`/api/pedido/${ordenId}/envio`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const { fotoUrl } = await res.json() as { fotoUrl: string | null }
      if (fotoUrl) setUrlComprobante(fotoUrl)
      toast.success('¡Envío confirmado! El taller fue notificado.')
      setEstadoLocal('en_transito')
      setEtapa('finalizado')
    } catch (err) {
      toast.error('Error al confirmar envío. Intenta nuevamente.')
      console.error(err)
    }
    setGuardando(false)
  }

  // ── Finalizado ─────────────────────────────────────────────────────────────
  if (etapa === 'finalizado') {
    const recibidaCompleta = estadoLocal === 'recibida_completa'
    const recibidaParcial  = estadoLocal === 'recibida_parcial'
    const enTransito       = estadoLocal === 'en_transito'

    return (
      <div className="space-y-4">
        {/* Barra de estado */}
        <BarraEstado estado={estadoLocal} />

        {/* Panel principal según estado */}
        {recibidaCompleta && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="font-bold text-green-800">¡Pedido completado!</p>
                <p className="text-sm text-green-700">El taller recibió toda la mercancía. ¡Gracias por tu trabajo!</p>
              </div>
            </div>
          </div>
        )}

        {recibidaParcial && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <div>
                <p className="font-bold text-orange-800">Recepción parcial registrada</p>
                <p className="text-sm text-orange-700">El taller recibió parte de los productos. Puede que se contacten contigo por los ítems pendientes.</p>
              </div>
            </div>
          </div>
        )}

        {enTransito && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚚</span>
              <div>
                <p className="font-bold text-blue-800">¡Envío registrado!</p>
                <p className="text-sm text-blue-700">El taller fue notificado y está esperando la llegada del paquete.</p>
              </div>
            </div>
          </div>
        )}

        {/* Resumen de ítems */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="font-semibold text-gray-800 text-sm">Detalle del pedido</p>
          </div>
          <div className="divide-y">
            {items.map(item => {
              const disponible = item.disponible_proveedor !== false
              const precioFinal = item.precio_aceptado ?? item.precio_cotizado ?? item.precio_unitario
              const recibida = (item.cantidad_recibida ?? 0)
              return (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                  <span className={`text-base shrink-0 ${disponible ? 'text-green-500' : 'text-red-400'}`}>
                    {disponible ? '✓' : '✕'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!disponible ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.nombre}
                    </p>
                    {item.nota_proveedor && (
                      <p className="text-xs text-blue-600 mt-0.5">📝 {item.nota_proveedor}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">Solicitado: <strong>{item.cantidad_solicitada}</strong></p>
                    {recibida > 0 && (
                      <p className={`text-xs font-semibold ${recibida >= item.cantidad_solicitada ? 'text-green-600' : 'text-orange-600'}`}>
                        Recibido: {recibida}
                      </p>
                    )}
                    {precioFinal > 0 && disponible && (
                      <>
                        <p className="text-sm font-semibold text-gray-700">{formatCLP(precioFinal * item.cantidad_solicitada)}</p>
                        <p className="text-xs text-gray-400">{formatCLP(precioFinal)} c/u</p>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Comprobante de envío */}
        {urlComprobante && (
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tu comprobante de envío</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlComprobante} alt="Comprobante de envío" className="w-full max-h-64 object-contain rounded-xl border" />
          </div>
        )}
      </div>
    )
  }

  // ── Esperando confirmación del admin ───────────────────────────────────────
  if (etapa === 'esperando') {
    return (
      <div className="space-y-4">
        <BarraEstado estado={estadoLocal} />

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-bold text-amber-800">¡Cotización enviada!</p>
              <p className="text-sm text-amber-700">El taller está revisando tu respuesta. Te avisaremos cuando confirmen qué ítems aceptar y puedas proceder con el envío.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="text-xs font-semibold text-gray-500 uppercase">Tu respuesta enviada</p>
          </div>
          <div className="divide-y">
            {items.map(i => (
              <div key={i.id} className="px-4 py-3 flex items-center gap-3">
                <span className={disponibles[i.id] ? 'text-green-500' : 'text-red-400'}>
                  {disponibles[i.id] ? '✓' : '✕'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!disponibles[i.id] ? 'text-gray-400 line-through' : 'text-gray-800 font-medium'}`}>
                    {i.nombre}
                  </p>
                </div>
                {disponibles[i.id] && precios[i.id] && (
                  <span className="text-xs text-gray-500 shrink-0">{formatCLP(parseInt(precios[i.id]) || 0)} c/u</span>
                )}
              </div>
            ))}
            {productosAdicionales.filter(p => p.nombre.trim()).map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3 bg-violet-50">
                <span className="text-violet-500 font-bold">+</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-violet-800 font-medium">{p.nombre}</p>
                  <p className="text-xs text-violet-500">Producto adicional sugerido</p>
                </div>
                {p.precio && (
                  <span className="text-xs text-gray-500 shrink-0">{formatCLP(parseInt(p.precio) || 0)} c/u</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Etapa 1.5: Preparando pedido ──────────────────────────────────────────
  if (etapa === 'preparando') {
    return (
      <div className="space-y-4">
        <BarraEstado estado={estadoLocal} />

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-indigo-800 uppercase">✅ Taller confirmó tu cotización</p>
          <p className="text-sm text-indigo-700">Por favor empaca los siguientes ítems:</p>
          <ul className="space-y-1 mt-1">
            {items.filter(i => i.disponible_proveedor !== false).map(i => {
              const precioFinal = i.precio_aceptado ?? i.precio_cotizado ?? i.precio_unitario
              return (
                <li key={i.id} className="text-sm text-gray-800 flex items-baseline justify-between gap-2">
                  <span>• {i.nombre} × {i.cantidad_solicitada}</span>
                  {precioFinal > 0 && (
                    <span className="text-right shrink-0">
                      <span className="text-gray-700 font-semibold">{formatCLP(precioFinal * i.cantidad_solicitada)}</span>
                      <span className="text-gray-400 text-xs ml-1">({formatCLP(precioFinal)} c/u)</span>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="border-t border-indigo-200 pt-2 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-indigo-800">Total</span>
            <span className="text-base font-bold text-indigo-900">
              {formatCLP(items
                .filter(i => i.disponible_proveedor !== false)
                .reduce((s, i) => s + (i.precio_aceptado ?? i.precio_cotizado ?? i.precio_unitario) * i.cantidad_solicitada, 0))}
            </span>
          </div>
        </div>

        <button
          onClick={confirmarPreparando}
          disabled={guardando}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          {guardando ? 'Actualizando...' : '📦 Ya empecé a preparar el pedido'}
        </button>
      </div>
    )
  }

  // ── Etapa 2: Comprobante de envío ─────────────────────────────────────────
  if (etapa === 'envio') {
    return (
      <div className="space-y-4">
        <BarraEstado estado={estadoLocal} />

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-blue-800 uppercase">📦 Lista preliminar — revisa antes de despachar</p>
          <p className="text-sm text-blue-700">Confirma que el precio final coincide con lo que estás cobrando. Si varió por unos pesos, corrígelo aquí:</p>
          <ul className="space-y-2 mt-1">
            {items.filter(i => i.disponible_proveedor !== false).map(i => (
              <li key={i.id} className="text-sm text-gray-800 flex items-center justify-between gap-2">
                <span className="flex-1 min-w-0 truncate">• {i.nombre} × {i.cantidad_solicitada}</span>
                <div className="text-right shrink-0">
                  <input
                    type="number" min={0}
                    value={preciosFinales[i.id] ?? ''}
                    onChange={e => setPreciosFinales(prev => ({ ...prev, [i.id]: e.target.value }))}
                    placeholder="c/u"
                    className="w-24 border border-blue-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="text-gray-400 text-xs ml-1">c/u</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-blue-200 pt-2 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-blue-800">Total final</span>
            <span className="text-base font-bold text-blue-900">
              {formatCLP(items
                .filter(i => i.disponible_proveedor !== false)
                .reduce((s, i) => s + (parseInt(preciosFinales[i.id]) || 0) * i.cantidad_solicitada, 0))}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b">
            <p className="font-semibold text-gray-800">Comprobante de envío</p>
            <p className="text-xs text-gray-500">Opcional — foto del paquete, guía de despacho o ticket de envío</p>
          </div>
          <div className="p-5 space-y-4">
            {urlComprobante ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlComprobante} alt="Comprobante" className="w-full max-h-64 object-cover rounded-xl border" />
                <p className="text-xs text-green-700 font-medium text-center">✓ Envío ya confirmado</p>
              </div>
            ) : fotoPreview ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoPreview} alt="Vista previa" className="w-full max-h-64 object-cover rounded-xl border" />
                <div className="flex gap-2 justify-center">
                  <label className="cursor-pointer text-xs text-blue-600 hover:underline flex items-center gap-1 px-3 py-1.5 border border-blue-200 rounded-lg">
                    📷 Cambiar (cámara)
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                  </label>
                  <label className="cursor-pointer text-xs text-blue-600 hover:underline flex items-center gap-1 px-3 py-1.5 border border-blue-200 rounded-lg">
                    🖼️ Elegir otra
                    <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <span className="text-2xl">📷</span>
                    <span className="text-xs font-medium text-gray-600 text-center">Tomar foto</span>
                    <span className="text-xs text-gray-400 text-center">Cámara</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                  </label>
                  <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <span className="text-2xl">🖼️</span>
                    <span className="text-xs font-medium text-gray-600 text-center">Desde galería</span>
                    <span className="text-xs text-gray-400 text-center">Archivos / imágenes</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                  </label>
                </div>
                <p className="text-xs text-gray-400 text-center">El comprobante es opcional — puedes confirmar el envío sin adjuntar imagen</p>
              </div>
            )}

            {!urlComprobante && (
              <button
                onClick={confirmarEnvio}
                disabled={guardando}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {guardando ? 'Confirmando...' : foto ? '🚚 Confirmar envío con comprobante' : '🚚 Confirmar envío'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Etapa 1: Lista de disponibilidad ─────────────────────────────────────
  return (
    <div className="space-y-4">
      <BarraEstado estado={estadoLocal} />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b">
          <p className="font-semibold text-gray-800">¿Qué tienes disponible?</p>
          <p className="text-xs text-gray-500">Marca los productos que puedes enviar e indica precio y cantidad</p>
        </div>

        <div className="divide-y">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Sin productos en esta solicitud</p>
          ) : items.map(item => {
            const tengo = disponibles[item.id] !== false
            return (
              <div key={item.id} className="px-5 py-4 space-y-3">
                <label className="flex items-center gap-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tengo}
                    onChange={e => setDisponibles(prev => ({ ...prev, [item.id]: e.target.checked }))}
                    className="w-6 h-6 rounded accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!tengo ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.nombre}
                    </p>
                    <p className="text-xs text-gray-400">
                      Cantidad: <strong>{item.cantidad_solicitada}</strong>
                      {item.precio_unitario > 0 ? ` · Ref: ${formatCLP(item.precio_unitario)}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${tengo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {tengo ? '✓ Tengo' : '✕ No tengo'}
                  </span>
                </label>

                {tengo ? (
                  <div className="ml-10 grid grid-cols-1 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Cantidad disponible</label>
                      <input
                        type="number" min={1} max={item.cantidad_solicitada}
                        value={cantidades[item.id] ?? item.cantidad_solicitada}
                        onChange={e => setCantidades(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <p className="text-xs text-gray-400 mt-0.5">Solicitado: {item.cantidad_solicitada}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Precio por unidad (CLP) — opcional</label>
                      <input
                        type="number" min={0}
                        placeholder="Ej: 15000"
                        value={precios[item.id] ?? ''}
                        onChange={e => setPrecios(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    {/* Descuento por ítem */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!descuentoActivo[item.id]}
                          onChange={e => setDescuentoActivo(prev => ({ ...prev, [item.id]: e.target.checked }))}
                          className="w-4 h-4 rounded accent-amber-600"
                        />
                        <span className="text-xs font-medium text-amber-800">🏷️ Este producto tiene descuento</span>
                      </label>
                      {descuentoActivo[item.id] && (
                        <div className="space-y-2 pl-1">
                          <div className="flex items-center gap-2">
                            <div className="flex border border-amber-300 rounded-lg overflow-hidden text-xs shrink-0">
                              <button type="button" onClick={() => setDescuentoTipo(prev => ({ ...prev, [item.id]: 'porcentaje' }))}
                                className={`px-2.5 py-1.5 font-semibold ${descuentoTipo[item.id] !== 'monto' ? 'bg-amber-500 text-white' : 'bg-white text-amber-700'}`}>%</button>
                              <button type="button" onClick={() => setDescuentoTipo(prev => ({ ...prev, [item.id]: 'monto' }))}
                                className={`px-2.5 py-1.5 font-semibold ${descuentoTipo[item.id] === 'monto' ? 'bg-amber-500 text-white' : 'bg-white text-amber-700'}`}>$</button>
                            </div>
                            <input
                              type="number" min={0}
                              placeholder={descuentoTipo[item.id] === 'monto' ? 'Ej: 1000' : 'Ej: 10'}
                              value={descuentoValor[item.id] ?? ''}
                              onChange={e => setDescuentoValor(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="flex-1 border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-amber-700">¿Solo si compran cierta cantidad? (opcional)</label>
                            <input
                              type="number" min={0}
                              placeholder="Ej: 5 (vacío = aplica siempre)"
                              value={descuentoDesdeCantidad[item.id] ?? ''}
                              onChange={e => setDescuentoDesdeCantidad(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="mt-1 w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>
                          <p className="text-xs text-amber-700 font-medium">
                            Precio final: {formatCLP(precioFinalItem(item.id))} c/u
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 font-medium">Nota — opcional</label>
                      <input
                        type="text"
                        placeholder="Ej: Envío en 2 días, precio incluye despacho"
                        value={notas[item.id] ?? ''}
                        onChange={e => setNotas(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="ml-10 grid grid-cols-1 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">¿Tienes una alternativa? — descripción</label>
                      <input
                        type="text"
                        placeholder="Ej: Pantalla compatible modelo X400"
                        value={alternativas[item.id] ?? ''}
                        onChange={e => setAlternativas(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    {alternativas[item.id] && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 font-medium">Cantidad disponible</label>
                          <input
                            type="number" min={1}
                            placeholder="Ej: 2"
                            value={cantidadesAlternativa[item.id] ?? ''}
                            onChange={e => setCantidadesAlternativa(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-medium">Precio unitario (CLP)</label>
                          <input
                            type="number" min={0}
                            placeholder="Ej: 12000"
                            value={preciosAlternativa[item.id] ?? ''}
                            onChange={e => setPreciosAlternativa(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Productos adicionales */}
        <div className="px-5 py-4 border-t bg-violet-50 space-y-3">
          <div>
            <p className="text-sm font-semibold text-violet-800">¿Tienes productos adicionales?</p>
            <p className="text-xs text-violet-600">Ofrécenos productos que no están en esta solicitud</p>
          </div>
          {productosAdicionales.map(prod => (
            <div key={prod.id} className="bg-white border border-violet-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nombre del producto *"
                  value={prod.nombre}
                  onChange={e => actualizarProducto(prod.id, 'nombre', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <button
                  type="button"
                  onClick={() => eliminarProducto(prod.id)}
                  className="shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-sm flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Cantidad</label>
                  <input
                    type="number" min={1}
                    value={prod.cantidad}
                    onChange={e => actualizarProducto(prod.id, 'cantidad', e.target.value)}
                    className="mt-0.5 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Precio unitario (CLP)</label>
                  <input
                    type="number" min={0}
                    placeholder="Ej: 15000"
                    value={prod.precio}
                    onChange={e => actualizarProducto(prod.id, 'precio', e.target.value)}
                    className="mt-0.5 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Nota opcional (ej: incluye despacho)"
                value={prod.nota}
                onChange={e => actualizarProducto(prod.id, 'nota', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />

              {/* Descuento del producto adicional */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prod.descuentoActivo}
                    onChange={e => toggleDescuentoAdicional(prod.id, e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-600"
                  />
                  <span className="text-xs font-medium text-amber-800">🏷️ Este producto tiene descuento</span>
                </label>
                {prod.descuentoActivo && (
                  <div className="space-y-2 pl-1">
                    <div className="flex items-center gap-2">
                      <div className="flex border border-amber-300 rounded-lg overflow-hidden text-xs shrink-0">
                        <button type="button" onClick={() => actualizarProducto(prod.id, 'descuentoTipo', 'porcentaje')}
                          className={`px-2.5 py-1.5 font-semibold ${prod.descuentoTipo !== 'monto' ? 'bg-amber-500 text-white' : 'bg-white text-amber-700'}`}>%</button>
                        <button type="button" onClick={() => actualizarProducto(prod.id, 'descuentoTipo', 'monto')}
                          className={`px-2.5 py-1.5 font-semibold ${prod.descuentoTipo === 'monto' ? 'bg-amber-500 text-white' : 'bg-white text-amber-700'}`}>$</button>
                      </div>
                      <input
                        type="number" min={0}
                        placeholder={prod.descuentoTipo === 'monto' ? 'Ej: 1000' : 'Ej: 10'}
                        value={prod.descuentoValor}
                        onChange={e => actualizarProducto(prod.id, 'descuentoValor', e.target.value)}
                        className="flex-1 border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-amber-700">¿Solo si compran cierta cantidad? (opcional)</label>
                      <input
                        type="number" min={0}
                        placeholder="Ej: 5 (vacío = aplica siempre)"
                        value={prod.descuentoDesdeCantidad}
                        onChange={e => actualizarProducto(prod.id, 'descuentoDesdeCantidad', e.target.value)}
                        className="mt-1 w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <p className="text-xs text-amber-700 font-medium">
                      Precio final: {formatCLP(precioFinalAdicional(prod))} c/u
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={agregarProducto}
            className="w-full text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-2 rounded-lg font-medium transition-colors"
          >
            + Agregar
          </button>
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t space-y-3">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Disponibles: <strong className="text-green-700">{conStock.length}</strong></span>
            <span>Sin stock: <strong className="text-red-600">{sinStock.length}</strong></span>
            {productosAdicionales.filter(p => p.nombre.trim()).length > 0 && (
              <span>Adicionales: <strong className="text-violet-700">{productosAdicionales.filter(p => p.nombre.trim()).length}</strong></span>
            )}
          </div>
          <button
            onClick={confirmarDisponibilidad}
            disabled={guardando}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {guardando ? '⏳ Enviando...' : `✅ Enviar cotización (${conStock.length}/${items.length} disponibles)`}
          </button>
        </div>
      </div>
    </div>
  )
}
