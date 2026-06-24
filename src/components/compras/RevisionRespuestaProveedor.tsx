'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/calculations'
import { PurchaseOrderItem } from '@/types'
import { Button } from '@/components/ui/button'

interface ItemConRespuesta extends PurchaseOrderItem {
  disponible_proveedor?: boolean | null
  cantidad_disponible_proveedor?: number | null
  precio_cotizado?: number | null
  nota_proveedor?: string | null
  alternativa?: string | null
  precio_alternativa?: number | null
  cantidad_alternativa?: number | null
  descuento_tipo?: string | null
  descuento_valor?: number | null
  descuento_desde_cantidad?: number | null
}

interface Seleccion {
  aceptado: boolean
  cantidadAceptada: number
  precioAceptado: number
}

interface Props {
  ordenId: string
  numero: string
  items: ItemConRespuesta[]
  supplierPhone?: string | null
  supplierNombre?: string
  modoManual?: boolean
}

export default function RevisionRespuestaProveedor({
  ordenId, numero, items, supplierPhone, supplierNombre, modoManual,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const [seleccion, setSeleccion] = useState<Record<string, Seleccion>>(() => {
    const init: Record<string, Seleccion> = {}
    for (const item of items) {
      const disponible = item.disponible_proveedor === true
      const precio = item.precio_cotizado ?? item.precio_unitario ?? 0
      const cantidad = item.cantidad_disponible_proveedor ?? item.cantidad_solicitada
      init[item.id] = {
        aceptado: disponible,
        cantidadAceptada: cantidad,
        precioAceptado: precio,
      }
    }
    return init
  })

  // El precio_cotizado ya trae el descuento aplicado según la cantidad que el
  // proveedor marcó como disponible. Si el admin acepta otra cantidad, hay que
  // recuperar el precio base y volver a evaluar el umbral del descuento.
  function precioSegunCantidad(item: ItemConRespuesta, cantidad: number): number {
    const valor = item.descuento_valor ?? 0
    const precioCotizado = item.precio_cotizado ?? item.precio_unitario ?? 0
    if (!valor) return precioCotizado
    const minimo = item.descuento_desde_cantidad ?? 0
    const cantidadCotizada = item.cantidad_disponible_proveedor ?? item.cantidad_solicitada
    const aplicadoEnCotizacion = !minimo || cantidadCotizada >= minimo
    const base = !aplicadoEnCotizacion
      ? precioCotizado
      : item.descuento_tipo === 'monto'
        ? precioCotizado + valor
        : Math.round(precioCotizado / (1 - valor / 100))
    const aplicaAhora = !minimo || cantidad >= minimo
    if (!aplicaAhora) return base
    return item.descuento_tipo === 'monto' ? Math.max(0, base - valor) : Math.max(0, Math.round(base * (1 - valor / 100)))
  }

  function setAceptado(itemId: string, val: boolean) {
    setSeleccion(prev => ({ ...prev, [itemId]: { ...prev[itemId], aceptado: val } }))
  }
  function setCantidad(itemId: string, val: number) {
    const item = items.find(i => i.id === itemId)
    setSeleccion(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        cantidadAceptada: val,
        precioAceptado: item?.descuento_valor ? precioSegunCantidad(item, val) : prev[itemId].precioAceptado,
      },
    }))
  }
  function setPrecio(itemId: string, val: number) {
    setSeleccion(prev => ({ ...prev, [itemId]: { ...prev[itemId], precioAceptado: val } }))
  }

  const totalConfirmado = Object.values(seleccion)
    .filter(s => s.aceptado)
    .reduce((acc, s) => acc + (s.cantidadAceptada * s.precioAceptado), 0)

  const aceptados = Object.values(seleccion).filter(s => s.aceptado).length

  async function confirmar() {
    if (aceptados === 0) {
      toast.error('Debes aceptar al menos un ítem')
      return
    }
    const sinPrecio = Object.values(seleccion).filter(s => s.aceptado && s.precioAceptado === 0).length
    if (sinPrecio > 0) {
      toast.error(`${sinPrecio} ítem(s) aceptado(s) tienen precio $0 — ingresa el precio antes de confirmar`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/compras/orden/${ordenId}/confirmar-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: seleccion }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Orden confirmada. Notifica al proveedor para que proceda con el envío.')
      setConfirmado(true)
      router.refresh()
    } catch {
      toast.error('Error al confirmar la selección')
    }
    setLoading(false)
  }

  function enviarWhatsApp() {
    const phone = (supplierPhone ?? '').replace(/\D/g, '')
    const itemsTexto = items
      .filter(i => seleccion[i.id]?.aceptado)
      .map(i => {
        const s = seleccion[i.id]
        return `• ${i.nombre}: ${s.cantidadAceptada} un. × ${formatCLP(s.precioAceptado)}`
      })
      .join('\n')

    const msg = `Hola${supplierNombre ? ` ${supplierNombre}` : ''}, confirmamos los siguientes ítems del pedido *${numero}*:\n\n${itemsTexto}\n\n*Total: ${formatCLP(totalConfirmado)}*\n\nPor favor empaca y envía el pedido. Sube el comprobante en el link que te enviamos anteriormente. ¡Gracias!`
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    setEnviado(true)
  }

  const itemsSinPrecio = items.filter(i => !i.precio_cotizado && i.disponible_proveedor === true)

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className={`border-b px-4 py-3 flex items-center justify-between ${modoManual ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200'}`}>
        <div>
          <p className={`font-semibold text-sm ${modoManual ? 'text-amber-800' : 'text-teal-800'}`}>
            {modoManual ? 'Ingresa la respuesta del proveedor' : 'Respuesta del proveedor — Selecciona qué aceptar'}
          </p>
          <p className={`text-xs mt-0.5 ${modoManual ? 'text-amber-600' : 'text-teal-600'}`}>
            {modoManual
              ? 'Marca los ítems disponibles, ingresa precio y cantidad cotizada por el proveedor.'
              : 'Revisa precios y disponibilidad. Desmarca lo que no vas a aceptar.'}
          </p>
        </div>
        <span className="text-2xl">{modoManual ? '✏️' : '🔍'}</span>
      </div>

      {/* Aviso cuando hay ítems sin precio recibido */}
      {itemsSinPrecio.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <span className="text-amber-500 text-sm">⚠️</span>
          <p className="text-xs text-amber-700">
            <strong>{itemsSinPrecio.length} ítem(s)</strong> no tienen precio del proveedor registrado. Ingresa el precio acordado antes de confirmar.
          </p>
        </div>
      )}

      {/* Tabla de ítems */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium w-6"></th>
              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Producto</th>
              <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">Pedido</th>
              <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">Disponible</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Precio cot.</th>
              <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">Cant. aceptar</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Precio aceptar</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map(item => {
              const s = seleccion[item.id]
              const disponible = item.disponible_proveedor === true
              const rowBg = s.aceptado
                ? ''
                : 'bg-gray-50 opacity-60'

              return (
                <>
                  <tr key={item.id} className={rowBg}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={s.aceptado}
                        onChange={e => setAceptado(item.id, e.target.checked)}
                        disabled={confirmado}
                        className="w-4 h-4 accent-teal-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-medium ${!s.aceptado ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {item.nombre}
                      </p>
                      {!disponible && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                          Sin stock
                        </span>
                      )}
                      {item.nota_proveedor && (
                        <p className="text-xs text-blue-600 mt-0.5">📝 {item.nota_proveedor}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.cantidad_solicitada}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-medium ${disponible ? 'text-green-700' : 'text-red-500'}`}>
                        {disponible ? (item.cantidad_disponible_proveedor ?? item.cantidad_solicitada) : '0'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {item.precio_cotizado
                        ? <span className="font-medium text-blue-700">{formatCLP(item.precio_cotizado)}</span>
                        : s.aceptado
                          ? <span className="text-amber-500 text-xs font-medium">⚠️ no recibido</span>
                          : <span className="text-gray-300">—</span>}
                      {!!item.descuento_valor && (
                        <p className="text-[10px] text-amber-600 mt-0.5">
                          🏷️ {item.descuento_tipo === 'monto' ? formatCLP(item.descuento_valor) : `${item.descuento_valor}%`} dto.
                          {item.descuento_desde_cantidad ? ` desde ${item.descuento_desde_cantidad} un.` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number" min={1}
                        max={item.cantidad_disponible_proveedor ?? item.cantidad_solicitada}
                        value={s.cantidadAceptada}
                        onChange={e => setCantidad(item.id, Number(e.target.value))}
                        disabled={!s.aceptado || confirmado}
                        className="w-16 border border-gray-200 rounded px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-40"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number" min={0}
                        value={s.precioAceptado}
                        onChange={e => setPrecio(item.id, Number(e.target.value))}
                        disabled={!s.aceptado || confirmado}
                        placeholder={!item.precio_cotizado && s.aceptado ? 'Ingresa precio' : undefined}
                        className={`w-24 border rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 disabled:opacity-40 ${
                          !item.precio_cotizado && s.aceptado && s.precioAceptado === 0
                            ? 'border-amber-400 focus:ring-amber-400 bg-amber-50'
                            : 'border-gray-200 focus:ring-teal-400'
                        }`}
                      />
                    </td>
                    <td className="px-3 py-3 text-right font-medium">
                      {s.aceptado ? formatCLP(s.cantidadAceptada * s.precioAceptado) : '—'}
                    </td>
                  </tr>
                  {/* Alternativa del proveedor */}
                  {item.alternativa && (
                    <tr key={`${item.id}-alt`} className="bg-amber-50">
                      <td className="px-4 py-2"></td>
                      <td colSpan={7} className="px-4 py-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs font-semibold text-amber-700">💡 Alternativa:</span>
                          <span className="text-xs text-amber-800">{item.alternativa}</span>
                          {item.precio_alternativa && (
                            <span className="text-xs text-amber-700">{formatCLP(item.precio_alternativa)} c/u</span>
                          )}
                          {item.cantidad_alternativa && (
                            <span className="text-xs text-amber-600">{item.cantidad_alternativa} disponibles</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
          <tfoot className="border-t bg-gray-50">
            <tr>
              <td colSpan={7} className="px-4 py-2.5 text-right font-semibold text-gray-700 text-sm">
                {aceptados} ítem(s) aceptado(s) — Total confirmado:
              </td>
              <td className="px-3 py-2.5 text-right font-bold text-teal-700 text-base">
                {formatCLP(totalConfirmado)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Acciones */}
      <div className="border-t">
        {confirmado ? (
          enviado ? (
            /* Ya envió por WhatsApp */
            <div className="px-4 py-3 bg-green-50 flex items-center gap-3">
              <span className="text-green-600 text-xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-green-800">Confirmación enviada al proveedor</p>
                <p className="text-xs text-green-600">Estado de la OC: <strong>Confirmada</strong> — esperando despacho.</p>
              </div>
            </div>
          ) : (
            /* Decisión: enviar ahora o después */
            <div className="px-4 py-4 bg-teal-50 border-teal-200 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">✅</span>
                <div>
                  <p className="font-semibold text-teal-800 text-sm">
                    Pedido confirmado — {aceptados} ítem(s) por {formatCLP(totalConfirmado)}
                  </p>
                  <p className="text-xs text-teal-600 mt-0.5">
                    Estado actualizado a <strong>Confirmada</strong>. ¿Deseas notificar al proveedor ahora?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={enviarWhatsApp}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  📲 Enviar ahora por WhatsApp
                </button>
                <button
                  onClick={() => setEnviado(true)}
                  className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  🕐 Enviar después
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="px-4 py-3 bg-gray-50 flex items-center gap-3 flex-wrap">
            <p className="text-xs text-gray-500 flex-1">
              Al confirmar se actualizará el total de la OC y quedará lista para notificar al proveedor.
            </p>
            <Button
              onClick={confirmar}
              disabled={loading || aceptados === 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {loading ? 'Confirmando...' : `✅ Confirmar ${aceptados} ítem(s) — ${formatCLP(totalConfirmado)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
