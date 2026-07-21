'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCLP } from '@/lib/calculations'

type SesionExistente = {
  id: string
  fecha: string
  efectivo_apertura: number
  efectivo_cierre: number | null
  transbank_cierre: number | null
  transferencia_cierre: number | null
  otros_cierre: number | null
}

type ProductoBusqueda = {
  id: string
  nombre: string
  sku?: string | null
  precio_venta: number
  stock_actual: number
  unidad_medida: string
}

type ServicioBusqueda = {
  id: string
  nombre: string
  precio_base: number
  tipo_reparacion: string
}

type ItemVenta = {
  key: string
  product_id: string | null
  nombre: string
  cantidad: number
  precio_unitario: number
}

interface Props {
  mode: 'editar' | 'nueva'
  sesion?: SesionExistente
  puedeCorregir: boolean
  productos: ProductoBusqueda[]
  servicios: ServicioBusqueda[]
}

const TZ = 'America/Santiago'

export default function CorregirCajaModal({ mode, sesion, puedeCorregir, productos, servicios }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [paso, setPaso] = useState<'form' | 'autorizar'>('form')
  const [saving, setSaving] = useState(false)

  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
  const [fecha, setFecha] = useState('')
  const [efectivoApertura, setEfectivoApertura] = useState(String(sesion?.efectivo_apertura ?? 0))
  const [efectivoCierre, setEfectivoCierre] = useState(String(sesion?.efectivo_cierre ?? 0))
  const [transbankCierre, setTransbankCierre] = useState(String(sesion?.transbank_cierre ?? 0))
  const [transferenciaCierre, setTransferenciaCierre] = useState(String(sesion?.transferencia_cierre ?? 0))
  const [otrosCierre, setOtrosCierre] = useState(String(sesion?.otros_cierre ?? 0))
  const [motivo, setMotivo] = useState('')
  const [pin, setPin] = useState('')

  const [agregarVenta, setAgregarVenta] = useState(false)
  const [ventaMetodo, setVentaMetodo] = useState('efectivo')
  const [ventaTipoDoc, setVentaTipoDoc] = useState('boleta')
  const [busqueda, setBusqueda] = useState('')
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>([])

  function resetForm() {
    setPaso('form')
    setFecha('')
    setEfectivoApertura(String(sesion?.efectivo_apertura ?? 0))
    setEfectivoCierre(String(sesion?.efectivo_cierre ?? 0))
    setTransbankCierre(String(sesion?.transbank_cierre ?? 0))
    setTransferenciaCierre(String(sesion?.transferencia_cierre ?? 0))
    setOtrosCierre(String(sesion?.otros_cierre ?? 0))
    setMotivo('')
    setPin('')
    setAgregarVenta(false)
    setBusqueda('')
    setItemsVenta([])
  }

  const q = busqueda.toLowerCase().trim()
  const productosFiltrados = q ? productos.filter(p =>
    p.nombre.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
  ).slice(0, 20) : []
  const serviciosFiltrados = q ? servicios.filter(s =>
    s.nombre.toLowerCase().includes(q) || s.tipo_reparacion.toLowerCase().includes(q)
  ).slice(0, 20) : []

  function agregarProducto(p: ProductoBusqueda) {
    setItemsVenta(items => {
      const existe = items.find(i => i.product_id === p.id)
      if (existe) return items.map(i => i.product_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...items, { key: p.id, product_id: p.id, nombre: p.nombre, cantidad: 1, precio_unitario: p.precio_venta }]
    })
    setBusqueda('')
  }

  function agregarServicioCatalogo(s: ServicioBusqueda) {
    setItemsVenta(items => {
      if (items.find(i => i.key === `sv-${s.id}`)) return items
      return [...items, { key: `sv-${s.id}`, product_id: null, nombre: s.nombre, cantidad: 1, precio_unitario: s.precio_base }]
    })
    setBusqueda('')
  }

  function quitarItem(key: string) { setItemsVenta(items => items.filter(i => i.key !== key)) }

  function cambiarCantidadItem(key: string, delta: number) {
    setItemsVenta(items => items.map(i => i.key === key ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i))
  }

  function cambiarPrecioItem(key: string, valor: string) {
    const n = parseInt(valor.replace(/\D/g, '')) || 0
    setItemsVenta(items => items.map(i => i.key === key ? { ...i, precio_unitario: n } : i))
  }

  const totalVenta = itemsVenta.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  function cerrar() {
    setOpen(false)
    resetForm()
  }

  function continuar() {
    if (motivo.trim().length < 10) { toast.error('Escribe una nota de justificación (mínimo 10 caracteres)'); return }
    if (mode === 'nueva' && !fecha) { toast.error('Selecciona la fecha de la caja'); return }
    if (mode === 'nueva' && fecha >= hoy) { toast.error('La fecha debe ser anterior a hoy'); return }
    if (agregarVenta && itemsVenta.length === 0) { toast.error('Agrega al menos un producto o servicio'); return }
    if (puedeCorregir) {
      ejecutar()
    } else {
      setPaso('autorizar')
    }
  }

  async function ejecutar() {
    if (!puedeCorregir && !pin.trim()) { toast.error('Ingresa el PIN de autorización'); return }
    setSaving(true)

    const res = await fetch('/api/caja/corregir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modo: mode === 'nueva' ? 'apertura_retroactiva' : 'edicion_cierre',
        sesionId: sesion?.id,
        fecha: mode === 'nueva' ? fecha : undefined,
        motivo: motivo.trim(),
        pin: puedeCorregir ? undefined : pin.trim(),
        efectivo_apertura: parseInt(efectivoApertura) || 0,
        efectivo_cierre: parseInt(efectivoCierre) || 0,
        transbank_cierre: parseInt(transbankCierre) || 0,
        transferencia_cierre: parseInt(transferenciaCierre) || 0,
        otros_cierre: parseInt(otrosCierre) || 0,
        venta: agregarVenta ? {
          items: itemsVenta.map(i => ({ product_id: i.product_id, nombre: i.nombre, cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
          metodo_pago: ventaMetodo,
          tipo_documento: ventaTipoDoc,
        } : null,
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { toast.error(data.error ?? 'Error al guardar'); return }

    toast.success(mode === 'nueva' ? 'Caja registrada correctamente' : 'Caja corregida correctamente')
    cerrar()
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={mode === 'nueva'
          ? 'inline-flex items-center gap-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors'
          : 'text-xs text-amber-600 hover:text-amber-800 hover:underline font-medium transition-colors'}
        title={mode === 'nueva' ? 'Registrar caja de un día anterior' : 'Corregir esta caja'}
      >
        {mode === 'nueva' ? '🗓️ Registrar caja de un día anterior' : 'Corregir'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={cerrar}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 my-8" onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  {mode === 'nueva' ? '🗓️ Registrar caja de un día anterior' : `✏️ Corregir caja del ${sesion ? new Date(sesion.fecha + 'T12:00:00').toLocaleDateString('es-CL') : ''}`}
                </h3>
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>

            {paso === 'form' && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-sm text-amber-800 font-medium">⚠ Esta acción requiere autorización de un administrador</p>
                  <p className="text-xs text-amber-700 mt-0.5">Toda corrección queda registrada con tu usuario, la fecha y el motivo.</p>
                </div>

                {mode === 'nueva' && (
                  <div className="space-y-1.5">
                    <Label>Fecha de la caja <span className="text-red-500">*</span></Label>
                    <Input type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value)} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {mode === 'nueva' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Fondo de apertura</Label>
                      <Input type="number" min={0} value={efectivoApertura} onChange={e => setEfectivoApertura(e.target.value)} />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Efectivo cierre</Label>
                    <Input type="number" min={0} value={efectivoCierre} onChange={e => setEfectivoCierre(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Débito/Crédito</Label>
                    <Input type="number" min={0} value={transbankCierre} onChange={e => setTransbankCierre(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Transferencia</Label>
                    <Input type="number" min={0} value={transferenciaCierre} onChange={e => setTransferenciaCierre(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Otros</Label>
                    <Input type="number" min={0} value={otrosCierre} onChange={e => setOtrosCierre(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Nota de justificación <span className="text-red-500">*</span></Label>
                  <textarea
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    placeholder={mode === 'nueva' ? 'Explica por qué se registra esta caja con fecha pasada...' : 'Explica por qué se corrige este cierre...'}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="border rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={agregarVenta} onChange={e => setAgregarVenta(e.target.checked)} />
                    Agregar productos/servicios vendidos a esta caja
                  </label>
                  {agregarVenta && (
                    <div className="space-y-2 pt-1">
                      <div className="relative">
                        <Input
                          placeholder="Buscar producto o servicio..."
                          value={busqueda}
                          onChange={e => setBusqueda(e.target.value)}
                        />
                        {busqueda && (
                          <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                            {productosFiltrados.length === 0 && serviciosFiltrados.length === 0 ? (
                              <p className="text-center text-gray-400 text-xs py-3">Sin resultados para &quot;{busqueda}&quot;</p>
                            ) : (
                              <>
                                {serviciosFiltrados.map(s => (
                                  <button key={s.id} type="button" onClick={() => agregarServicioCatalogo(s)}
                                    className="w-full text-left px-3 py-2 border-b last:border-0 hover:bg-purple-50 transition-colors bg-purple-50/40 flex justify-between items-center gap-2">
                                    <div className="min-w-0">
                                      <p className="font-medium text-gray-900 text-sm truncate">{s.nombre}</p>
                                      <span className="text-xs text-purple-600">🔩 Servicio</span>
                                    </div>
                                    <p className="font-bold text-purple-700 text-sm shrink-0">{formatCLP(s.precio_base)}</p>
                                  </button>
                                ))}
                                {productosFiltrados.map(p => (
                                  <button key={p.id} type="button" onClick={() => agregarProducto(p)}
                                    className="w-full text-left px-3 py-2 border-b last:border-0 hover:bg-blue-50 transition-colors flex justify-between items-center gap-2">
                                    <div className="min-w-0">
                                      <p className="font-medium text-gray-900 text-sm truncate">{p.nombre}</p>
                                      <span className="text-xs text-gray-400">Stock: {p.stock_actual}</span>
                                    </div>
                                    <p className="font-bold text-blue-700 text-sm shrink-0">{formatCLP(p.precio_venta)}</p>
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {itemsVenta.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <tbody className="divide-y">
                              {itemsVenta.map(i => (
                                <tr key={i.key}>
                                  <td className="px-2 py-1.5 font-medium text-xs">{i.nombre}</td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button type="button" onClick={() => cambiarCantidadItem(i.key, -1)} className="w-5 h-5 rounded-full border hover:bg-gray-100 text-sm leading-none shrink-0">−</button>
                                      <span className="w-5 text-center text-xs font-bold">{i.cantidad}</span>
                                      <button type="button" onClick={() => cambiarCantidadItem(i.key, 1)} className="w-5 h-5 rounded-full border hover:bg-gray-100 text-sm leading-none shrink-0">+</button>
                                    </div>
                                  </td>
                                  <td className="px-1.5 py-1">
                                    <input
                                      type="number"
                                      min={0}
                                      value={i.precio_unitario}
                                      onChange={e => cambiarPrecioItem(i.key, e.target.value)}
                                      className="w-20 text-right border rounded px-1.5 py-1 text-xs font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <button type="button" onClick={() => quitarItem(i.key)} className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="bg-gray-50 border-t px-3 py-1.5 flex justify-between items-center">
                            <span className="text-xs text-gray-500">Total venta</span>
                            <span className="font-bold text-sm text-gray-900">{formatCLP(totalVenta)}</span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Método de pago</Label>
                          <select value={ventaMetodo} onChange={e => setVentaMetodo(e.target.value)} className="w-full h-8 rounded-lg border px-2 text-sm">
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="debito">Débito</option>
                            <option value="credito">Crédito</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Documento</Label>
                          <select value={ventaTipoDoc} onChange={e => setVentaTipoDoc(e.target.value)} className="w-full h-8 rounded-lg border px-2 text-sm">
                            <option value="boleta">Boleta</option>
                            <option value="factura">Factura</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={cerrar}>Cancelar</Button>
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={continuar} disabled={saving}>
                    {puedeCorregir ? (saving ? 'Guardando...' : 'Confirmar') : 'Continuar →'}
                  </Button>
                </div>
              </>
            )}

            {paso === 'autorizar' && (
              <>
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center space-y-2">
                  <span className="text-3xl">🔐</span>
                  <p className="font-semibold text-amber-900">Requiere autorización</p>
                  <p className="text-xs text-amber-700">
                    No tienes permiso para corregir cajas. Solicita al administrador que ingrese el PIN de autorización.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>PIN de autorización del administrador <span className="text-red-500">*</span></Label>
                  <Input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="• • • • • •"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && ejecutar()}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setPaso('form')}>← Atrás</Button>
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={ejecutar} disabled={!pin || saving}>
                    {saving ? 'Verificando...' : '🔐 Autorizar y guardar'}
                  </Button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  )
}
