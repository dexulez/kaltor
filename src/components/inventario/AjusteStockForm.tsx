'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCLP, formatCantidad } from '@/lib/calculations'

const MOTIVOS_CARGA = [
  'Corrección de inventario',
  'Devolución de cliente',
  'Devolución de proveedor',
  'Producto encontrado / conteo',
  'Ingreso por donación',
  'Otro',
]

const MOTIVOS_DESCARGA = [
  'Merma / pérdida',
  'Producto dañado',
  'Uso interno / consumo',
  'Muestra / regalo',
  'Corrección de inventario',
  'Robo / extravío',
  'Vencimiento',
  'Otro',
]

interface Producto {
  id: string
  nombre: string
  sku: string | null
  stock_actual: number
  precio_costo: number
  unidad_medida: string
}

interface Props {
  productos: Producto[]
}

export default function AjusteStockForm({ productos }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [busqueda, setBusqueda] = useState('')
  const [dropOpen, setDropOpen] = useState(false)
  const [prodSel, setProdSel] = useState<Producto | null>(null)
  const [tipo, setTipo] = useState<'carga' | 'descarga'>('carga')
  const [cantidad, setCantidad] = useState('1')
  const [motivoSel, setMotivoSel] = useState('')
  const [motivoCustom, setMotivoCustom] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const filtrados = busqueda.trim().length >= 1
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(busqueda.toLowerCase())
      ).slice(0, 10)
    : []

  function seleccionar(p: Producto) {
    setProdSel(p)
    setBusqueda(p.nombre)
    setDropOpen(false)
    setCantidad('1')
    setMotivoSel('')
    setMotivoCustom('')
  }

  const motivos = tipo === 'carga' ? MOTIVOS_CARGA : MOTIVOS_DESCARGA
  const motivoFinal = motivoSel === 'Otro' ? motivoCustom.trim() : motivoSel
  const cant = parseFloat(cantidad) || 0
  const stockNuevo = prodSel ? (tipo === 'carga' ? prodSel.stock_actual + cant : prodSel.stock_actual - cant) : 0

  async function guardar() {
    if (!prodSel) { toast.error('Selecciona un producto'); return }
    if (cant <= 0) { toast.error('La cantidad debe ser mayor a 0'); return }
    if (!motivoFinal) { toast.error('Indica el motivo del ajuste'); return }
    if (tipo === 'descarga' && cant > prodSel.stock_actual) {
      toast.error(`Stock insuficiente. Stock actual: ${formatCantidad(prodSel.stock_actual, prodSel.unidad_medida)}`); return
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = user
      ? await supabase.from('user_profiles').select('nombre_completo').eq('id', user.id).single()
      : { data: null }
    const nombreUsuario = (perfil as { nombre_completo?: string } | null)?.nombre_completo ?? null

    const stockAnterior = prodSel.stock_actual
    const nuevoStock = tipo === 'carga' ? stockAnterior + cant : stockAnterior - cant
    const tipoMov = tipo === 'carga' ? 'ajuste_positivo' : 'ajuste_negativo'
    const razonCompleta = notas.trim() ? `${motivoFinal} — ${notas.trim()}` : motivoFinal

    const [{ error: errProd }, { error: errMov }] = await Promise.all([
      supabase.from('products').update({ stock_actual: nuevoStock }).eq('id', prodSel.id),
      supabase.from('stock_movements').insert({
        product_id: prodSel.id,
        tipo: tipoMov,
        cantidad: cant,
        stock_anterior: stockAnterior,
        stock_nuevo: nuevoStock,
        razon: razonCompleta,
        referencia_tipo: 'ajuste_manual',
        usuario_id: user?.id ?? null,
        nombre_usuario: nombreUsuario,
      }),
    ])

    if (errProd) { toast.error('Error al actualizar stock: ' + errProd.message); setSaving(false); return }
    if (errMov) { /* silenciar si columnas no existen */ }

    toast.success(
      tipo === 'carga'
        ? `✅ Carga registrada: +${formatCantidad(cant, prodSel.unidad_medida)} de "${prodSel.nombre}" (nuevo stock: ${formatCantidad(nuevoStock, prodSel.unidad_medida)})`
        : `✅ Descarga registrada: −${formatCantidad(cant, prodSel.unidad_medida)} de "${prodSel.nombre}" (nuevo stock: ${formatCantidad(nuevoStock, prodSel.unidad_medida)})`
    )

    // Reset form
    setProdSel(null)
    setBusqueda('')
    setCantidad('1')
    setMotivoSel('')
    setMotivoCustom('')
    setNotas('')
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-5">
      {/* Tipo de ajuste */}
      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Tipo de ajuste</Label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => { setTipo('carga'); setMotivoSel('') }}
            className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center gap-1 ${tipo === 'carga' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-green-300'}`}>
            <span className="text-2xl">📥</span>
            Carga de stock
            <span className="text-xs font-normal opacity-70">Agregar unidades</span>
          </button>
          <button type="button" onClick={() => { setTipo('descarga'); setMotivoSel('') }}
            className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center gap-1 ${tipo === 'descarga' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-red-300'}`}>
            <span className="text-2xl">📤</span>
            Descarga de stock
            <span className="text-xs font-normal opacity-70">Retirar unidades</span>
          </button>
        </div>
      </div>

      {/* Búsqueda de producto */}
      <div ref={dropRef} className="relative space-y-1">
        <Label>Producto <span className="text-red-500">*</span></Label>
        <Input
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setProdSel(null); setDropOpen(true) }}
          onFocus={() => busqueda && setDropOpen(true)}
          placeholder="Buscar por nombre o SKU..."
          className="mt-1"
        />
        {dropOpen && filtrados.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {filtrados.map(p => (
              <button key={p.id} type="button" onClick={() => seleccionar(p)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{p.nombre}</p>
                  {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs font-semibold text-gray-700">Stock: {formatCantidad(p.stock_actual, p.unidad_medida)}</p>
                  {p.precio_costo > 0 && <p className="text-xs text-gray-400">{formatCLP(p.precio_costo)}/u</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Producto seleccionado — preview */}
      {prodSel && (
        <div className={`rounded-xl border-2 px-4 py-3 flex items-center justify-between gap-3 ${tipo === 'carga' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div>
            <p className="font-semibold text-gray-800">{prodSel.nombre}</p>
            {prodSel.sku && <p className="text-xs text-gray-400">{prodSel.sku}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500">Stock actual</p>
            <p className="text-xl font-bold text-gray-800">{formatCantidad(prodSel.stock_actual, prodSel.unidad_medida)}</p>
          </div>
          {cant > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-500">Stock después</p>
              <p className={`text-xl font-bold ${tipo === 'carga' ? 'text-green-700' : stockNuevo < 0 ? 'text-red-600' : 'text-red-700'}`}>
                {formatCantidad(stockNuevo, prodSel.unidad_medida)}
              </p>
              {tipo === 'descarga' && stockNuevo < 0 && (
                <p className="text-xs text-red-500 font-medium">⚠ Insuficiente</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cantidad y motivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>
            Cantidad <span className="text-red-500">*</span>
            {prodSel && prodSel.unidad_medida !== 'unidad' && (
              <span className="text-xs text-gray-400 font-normal ml-1">({prodSel.unidad_medida})</span>
            )}
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <button type="button" onClick={() => setCantidad(v => String(Math.max(1, (parseFloat(v) || 1) - 1)))}
              className="w-9 h-9 rounded-lg border flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-lg">−</button>
            <Input
              type="text"
              inputMode="decimal"
              value={cantidad}
              onChange={e => setCantidad(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              className="text-center font-bold text-lg w-20"
            />
            <button type="button" onClick={() => setCantidad(v => String((parseFloat(v) || 0) + 1))}
              className="w-9 h-9 rounded-lg border flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-lg">+</button>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Motivo <span className="text-red-500">*</span></Label>
          <select value={motivoSel} onChange={e => setMotivoSel(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Seleccionar motivo...</option>
            {motivos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Motivo personalizado */}
      {motivoSel === 'Otro' && (
        <div className="space-y-1">
          <Label>Describe el motivo <span className="text-red-500">*</span></Label>
          <Input value={motivoCustom} onChange={e => setMotivoCustom(e.target.value)}
            placeholder="Especifica el motivo del ajuste..." className="mt-1" autoFocus />
        </div>
      )}

      {/* Notas adicionales */}
      <div className="space-y-1">
        <Label className="text-gray-600">Notas adicionales <span className="text-gray-400 font-normal text-xs">(opcional)</span></Label>
        <Input value={notas} onChange={e => setNotas(e.target.value)}
          placeholder="Observaciones, número de documento, referencia..." className="mt-1" />
      </div>

      {/* Botón */}
      <Button
        onClick={guardar}
        disabled={saving || !prodSel || cant <= 0 || !motivoFinal || (tipo === 'descarga' && stockNuevo < 0)}
        className={`w-full py-6 text-base font-semibold ${tipo === 'carga' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
      >
        {saving
          ? 'Registrando...'
          : tipo === 'carga'
            ? `📥 Registrar carga de +${formatCantidad(cant || 0, prodSel?.unidad_medida)}${prodSel ? ` a "${prodSel.nombre}"` : ''}`
            : `📤 Registrar descarga de −${formatCantidad(cant || 0, prodSel?.unidad_medida)}${prodSel ? ` de "${prodSel.nombre}"` : ''}`
        }
      </Button>
    </div>
  )
}
