'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Product, SupplierProductPrice } from '@/types'

interface Props {
  supplierId: string
  preciosIniciales: SupplierProductPrice[]
  productos: Product[]
}

interface FilaLote {
  fila: number
  nombre: string
  sku_proveedor: string
  precio: number
  notas: string
  error: string | null
  accion: 'crear' | 'actualizar'
}

function toNumLote(v: unknown): number {
  if (v === undefined || v === null || v === '') return NaN
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[.$]/g, '').replace(',', '.'))
  return n
}

function parseFilaLote(raw: Record<string, unknown>, idx: number, existentes: SupplierProductPrice[]): FilaLote {
  const nombre = String(raw['repuesto'] ?? raw['Repuesto'] ?? raw['nombre'] ?? raw['Nombre'] ?? '').trim()
  const sku_proveedor = String(raw['codigo_proveedor'] ?? raw['Código proveedor'] ?? raw['codigo'] ?? raw['sku'] ?? '').trim()
  const precioNum = toNumLote(raw['precio'] ?? raw['Precio'] ?? raw['Precio (CLP)'])
  const notas = String(raw['notas'] ?? raw['Notas'] ?? '').trim()

  let error: string | null = null
  if (!nombre) error = 'Falta el nombre del repuesto'
  else if (isNaN(precioNum) || precioNum < 0) error = 'Precio inválido'

  const yaExiste = existentes.find(p => p.nombre_repuesto.toLowerCase() === nombre.toLowerCase())

  return {
    fila: idx + 2,
    nombre,
    sku_proveedor,
    precio: isNaN(precioNum) ? 0 : precioNum,
    notas,
    error,
    accion: yaExiste ? 'actualizar' : 'crear',
  }
}

export default function PreciosProveedorManager({ supplierId, preciosIniciales, productos }: Props) {
  const supabase = createClient()
  const [precios, setPrecios] = useState<SupplierProductPrice[]>(preciosIniciales)
  const [nombre, setNombre] = useState('')
  const [productId, setProductId] = useState<string | null>(null)
  const [skuProveedor, setSkuProveedor] = useState('')
  const [precio, setPrecio] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const inputLoteRef = useRef<HTMLInputElement>(null)
  const [mostrarLote, setMostrarLote] = useState(false)
  const [cargandoLote, setCargandoLote] = useState(false)
  const [filasLote, setFilasLote] = useState<FilaLote[]>([])
  const [importandoLote, setImportandoLote] = useState(false)

  const filtrados = busqueda
    ? productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 6)
    : []

  function seleccionarProducto(p: Product) {
    setProductId(p.id)
    setNombre(p.nombre)
    setBusqueda('')
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    const precioNum = parseFloat(precio)
    if (!nombre.trim()) { toast.error('Escribe el nombre del repuesto'); return }
    if (!(precioNum >= 0)) { toast.error('Ingresa un precio válido'); return }

    setGuardando(true)
    const { data, error } = await supabase.from('supplier_product_prices').insert({
      supplier_id: supplierId,
      product_id: productId,
      nombre_repuesto: nombre.trim(),
      sku_proveedor: skuProveedor.trim() || null,
      precio: precioNum,
      notas: notas.trim() || null,
    }).select().single()
    setGuardando(false)

    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Ya existe un precio cargado para ese producto con este proveedor'
          : 'Error al guardar: ' + error.message
      )
      return
    }
    setPrecios(prev => [...prev, data].sort((a, b) => a.nombre_repuesto.localeCompare(b.nombre_repuesto)))
    setNombre('')
    setProductId(null)
    setSkuProveedor('')
    setPrecio('')
    setNotas('')
    toast.success('Precio agregado')
  }

  // ── Carga por lote desde Excel ───────────────────────────────────────────
  function descargarPlantillaLote() {
    const wb = XLSX.utils.book_new()
    const headers = ['repuesto', 'codigo_proveedor', 'precio', 'notas']
    const ejemplo1 = ['Altavoz Samsung A05 5G', 'ALT-A05', 8500, '']
    const ejemplo2 = ['Pantalla iPhone 13 OLED', 'PAN-IP13', 45000, 'Original pull-out']
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo1, ejemplo2])
    ws['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Precios')

    const instrData = [
      ['COLUMNA', 'OBLIGATORIO', 'DESCRIPCIÓN'],
      ['repuesto', 'SÍ', 'Nombre del repuesto. Si ya existe un precio con el mismo nombre para este proveedor, se actualiza; si no, se crea uno nuevo.'],
      ['codigo_proveedor', 'NO', 'Código o SKU que usa el proveedor para este repuesto'],
      ['precio', 'SÍ', 'Precio en pesos chilenos, sin puntos ni comas'],
      ['notas', 'NO', 'Observaciones opcionales'],
    ]
    const wsInstr = XLSX.utils.aoa_to_sheet(instrData)
    wsInstr['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_precios_proveedor.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleArchivoLote(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCargandoLote(true)
    setFilasLote([])

    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

      if (rows.length === 0) {
        toast.error('El archivo no tiene datos.')
      } else if (rows.length > 300) {
        toast.error('Máximo 300 repuestos por carga. Divide el archivo en partes.')
      } else {
        setFilasLote(rows.map((row, i) => parseFilaLote(row, i, precios)))
      }
    } catch {
      toast.error('Error al leer el archivo. Asegúrate de subir un archivo .xlsx o .xls válido.')
    }

    setCargandoLote(false)
    if (inputLoteRef.current) inputLoteRef.current.value = ''
  }

  async function importarLote() {
    const validas = filasLote.filter(f => !f.error)
    if (!validas.length) { toast.error('No hay filas válidas para importar'); return }
    if (!confirm(`¿Importar ${validas.length} precio(s)? Las filas con errores serán ignoradas.`)) return

    setImportandoLote(true)
    let ok = 0
    let errCount = 0
    let resultado = [...precios]

    for (const fila of validas) {
      const idx = resultado.findIndex(p => p.nombre_repuesto.toLowerCase() === fila.nombre.toLowerCase())
      if (idx >= 0) {
        const { error } = await supabase.from('supplier_product_prices').update({
          precio: fila.precio,
          sku_proveedor: fila.sku_proveedor || null,
          notas: fila.notas || null,
          actualizado_at: new Date().toISOString(),
        }).eq('id', resultado[idx].id)
        if (error) { errCount++; continue }
        resultado[idx] = { ...resultado[idx], precio: fila.precio, sku_proveedor: fila.sku_proveedor || undefined, notas: fila.notas || undefined }
        ok++
      } else {
        const { data, error } = await supabase.from('supplier_product_prices').insert({
          supplier_id: supplierId,
          product_id: null,
          nombre_repuesto: fila.nombre,
          sku_proveedor: fila.sku_proveedor || null,
          precio: fila.precio,
          notas: fila.notas || null,
        }).select().single()
        if (error) { errCount++; continue }
        resultado = [...resultado, data]
        ok++
      }
    }

    resultado.sort((a, b) => a.nombre_repuesto.localeCompare(b.nombre_repuesto))
    setPrecios(resultado)
    setImportandoLote(false)

    if (ok > 0) {
      toast.success(`${ok} precio(s) cargados/actualizados`)
      if (errCount === 0) { setFilasLote([]); setMostrarLote(false) }
    }
    if (errCount > 0) toast.error(`${errCount} fila(s) fallaron al guardar`)
  }

  async function actualizarPrecio(id: string, nuevoPrecio: number) {
    if (!(nuevoPrecio >= 0)) return
    setPrecios(prev => prev.map(p => p.id === id ? { ...p, precio: nuevoPrecio } : p))
    const { error } = await supabase.from('supplier_product_prices')
      .update({ precio: nuevoPrecio, actualizado_at: new Date().toISOString() }).eq('id', id)
    if (error) toast.error('Error al actualizar el precio: ' + error.message)
  }

  async function alternarDisponible(id: string, disponible: boolean) {
    setPrecios(prev => prev.map(p => p.id === id ? { ...p, disponible } : p))
    const { error } = await supabase.from('supplier_product_prices').update({ disponible }).eq('id', id)
    if (error) toast.error('Error al actualizar: ' + error.message)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este precio de la lista?')) return
    const { error } = await supabase.from('supplier_product_prices').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar: ' + error.message); return }
    setPrecios(prev => prev.filter(p => p.id !== id))
    toast.success('Precio eliminado')
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMostrarLote(v => !v)}
        >
          📥 Cargar precios desde lista de precios
        </Button>
      </div>

      {mostrarLote && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div>
            <p className="font-semibold text-gray-800 text-sm">Carga por lote desde Excel</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Descarga la plantilla, complétala con los repuestos y precios de este proveedor, y súbela aquí. Si un repuesto ya está en la lista (mismo nombre), su precio se actualiza; si no, se agrega nuevo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={descargarPlantillaLote}>
              ⬇️ Descargar plantilla
            </Button>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border cursor-pointer hover:bg-gray-50">
              📂 {cargandoLote ? 'Procesando...' : 'Subir archivo'}
              <input
                ref={inputLoteRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleArchivoLote}
                disabled={cargandoLote}
              />
            </label>
          </div>

          {filasLote.length > 0 && (
            <div className="space-y-2">
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Fila</th>
                        <th className="px-2 py-1.5 text-left">Repuesto</th>
                        <th className="px-2 py-1.5 text-left">Código</th>
                        <th className="px-2 py-1.5 text-right">Precio</th>
                        <th className="px-2 py-1.5 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filasLote.map(f => (
                        <tr key={f.fila} className={f.error ? 'bg-red-50' : ''}>
                          <td className="px-2 py-1.5 text-gray-400">{f.fila}</td>
                          <td className="px-2 py-1.5">{f.nombre || '—'}</td>
                          <td className="px-2 py-1.5">{f.sku_proveedor || '—'}</td>
                          <td className="px-2 py-1.5 text-right">{f.precio.toLocaleString('es-CL')}</td>
                          <td className="px-2 py-1.5">
                            {f.error
                              ? <span className="text-red-600">✗ {f.error}</span>
                              : <span className={f.accion === 'actualizar' ? 'text-blue-600' : 'text-green-700'}>
                                  {f.accion === 'actualizar' ? '↻ Actualizar' : '✓ Nuevo'}
                                </span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-gray-500">
                  {filasLote.filter(f => !f.error).length} válida(s)
                  {filasLote.some(f => f.error) && `, ${filasLote.filter(f => f.error).length} con error`}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setFilasLote([])}>
                    Limpiar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={importarLote}
                    disabled={importandoLote || filasLote.every(f => f.error)}
                  >
                    {importandoLote ? 'Importando...' : `Importar ${filasLote.filter(f => !f.error).length} precio(s)`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={agregar} className="bg-white rounded-xl border p-4 space-y-3">
        <p className="font-semibold text-gray-800 text-sm">Agregar repuesto a la lista</p>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 space-y-1 relative">
            <Label className="text-xs">Repuesto</Label>
            <Input
              value={nombre}
              onChange={e => {
                if (productId) setProductId(null)
                setNombre(e.target.value)
                setBusqueda(e.target.value)
              }}
              onBlur={() => setTimeout(() => setBusqueda(''), 150)}
              placeholder="Ej: Altavoz Samsung A05 5G"
              className="text-sm"
              autoComplete="off"
            />
            {productId && <p className="text-[10px] text-green-600 mt-0.5">✓ Vinculado a producto del inventario</p>}
            {busqueda && !productId && filtrados.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filtrados.map(p => (
                  <button key={p.id} type="button"
                    onMouseDown={e => { e.preventDefault(); seleccionarProducto(p) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0">
                    {p.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Código proveedor</Label>
            <Input value={skuProveedor} onChange={e => setSkuProveedor(e.target.value)} placeholder="Opcional" className="text-sm" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Precio (CLP)</Label>
            <Input type="number" min={0} value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0" className="text-sm" />
          </div>
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-xs">Notas</Label>
            <Input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" className="text-sm" />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={guardando}>{guardando ? 'Guardando...' : '+ Agregar'}</Button>
      </form>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <p className="font-semibold text-gray-800 text-sm">{precios.length} repuesto{precios.length !== 1 ? 's' : ''} en la lista</p>
        </div>
        {precios.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">Todavía no cargas precios de repuestos para este proveedor.</p>
        ) : (
          <div className="divide-y">
            {precios.map(p => (
              <div key={p.id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-medium text-gray-800">{p.nombre_repuesto}</p>
                  <p className="text-xs text-gray-400">
                    {p.sku_proveedor && <span>Código: {p.sku_proveedor} · </span>}
                    Actualizado {new Date(p.actualizado_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {p.notas && <span> · {p.notas}</span>}
                  </p>
                </div>
                <Input
                  type="number" min={0}
                  defaultValue={p.precio}
                  onBlur={e => {
                    const val = parseFloat(e.target.value)
                    if (val !== p.precio) actualizarPrecio(p.id, val)
                  }}
                  className="w-28 text-sm"
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={p.disponible} onChange={e => alternarDisponible(p.id, e.target.checked)} className="accent-green-600" />
                  Disponible
                </label>
                <button type="button" onClick={() => eliminar(p.id)} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
