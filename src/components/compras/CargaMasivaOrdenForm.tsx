'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { formatCLP, formatCantidad, UNIDAD_MEDIDA_LABEL } from '@/lib/calculations'
import { useRouter } from 'next/navigation'

interface Proveedor { id: string; nombre: string }
interface Categoria { id: string; nombre: string; tipo: string }

interface Props {
  proveedores: Proveedor[]
  categorias: Categoria[]
}

const UNIDADES_VALIDAS = Object.keys(UNIDAD_MEDIDA_LABEL)

interface FilaItem {
  fila: number
  nombre: string
  sku: string
  codigo_barras: string
  cantidad: number
  unidad_medida: string
  precio_unitario: number
  precio_venta: number
  precio_incluye_iva: boolean
  categoria_nombre: string
  categoria_id: string | null
  stock_minimo: number
  ubicacion_bodega: string
  descripcion: string
  // resultado del matching
  product_id: string | null
  match: 'existente' | 'nuevo_con_cat' | 'nuevo_sin_cat'
  errores: string[]
}

interface OrdenHeader {
  supplier_id: string
  metodo_pago: 'efectivo' | 'transferencia' | 'debito' | 'credito'
  costo_envio: string
  fecha_estimada_llegada: string
  notas: string
}

const METODO_LABELS = {
  efectivo: '💵 Efectivo',
  transferencia: '🏦 Transferencia',
  debito: '💳 Débito',
  credito: '💳 Crédito',
}

function toNum(v: unknown, def = 0): number {
  if (v === undefined || v === null || v === '') return def
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[.$]/g, '').replace(',', '.'))
  return isNaN(n) ? def : n
}

function parseBool(v: unknown): boolean {
  const s = String(v ?? '').trim().toUpperCase()
  return s === 'SI' || s === 'SÍ' || s === 'YES' || s === '1' || s === 'TRUE'
}

function str(v: unknown): string {
  return String(v ?? '').trim()
}

function parseRow(
  raw: Record<string, unknown>,
  idx: number,
  categorias: Categoria[],
  productosExistentes: { id: string; sku: string | null; codigo_barras: string | null; nombre: string }[]
): FilaItem {
  const errores: string[] = []

  const nombre = str(raw['nombre'] ?? raw['Nombre'])
  if (!nombre) errores.push('Nombre obligatorio')

  const sku = str(raw['sku'] ?? raw['SKU'])
  const codigo_barras = str(raw['codigo_barras'] ?? raw['Código barras'] ?? raw['codigo barras'])
  const descripcion = str(raw['descripcion'] ?? raw['Descripción'])
  const ubicacion_bodega = str(raw['ubicacion_bodega'] ?? raw['Ubicación bodega'])

  const unidadRaw = String(raw['unidad_medida'] ?? raw['Unidad de medida'] ?? '').trim().toLowerCase()
  const unidad_medida = unidadRaw && UNIDADES_VALIDAS.includes(unidadRaw) ? unidadRaw : 'unidad'
  if (unidadRaw && !UNIDADES_VALIDAS.includes(unidadRaw)) errores.push(`unidad_medida "${unidadRaw}" no válida`)

  const cantidad = toNum(raw['cantidad'] ?? raw['Cantidad'])
  if (cantidad <= 0) errores.push('Cantidad debe ser > 0')

  const precio_unitario = toNum(raw['precio_unitario'] ?? raw['Precio unitario'])
  if (precio_unitario < 0) errores.push('Precio unitario no puede ser negativo')

  const precio_venta = toNum(raw['precio_venta'] ?? raw['Precio venta'])
  const precio_incluye_iva = parseBool(raw['precio_incluye_iva'] ?? raw['Precio incluye IVA'])
  const stock_minimo = Math.round(toNum(raw['stock_minimo'] ?? raw['Stock mínimo']))

  const categoria_nombre = str(raw['categoria'] ?? raw['Categoría'])
  const catMatch = categorias.find(c => c.nombre.toLowerCase() === categoria_nombre.toLowerCase())
  if (categoria_nombre && !catMatch) errores.push(`Categoría "${categoria_nombre}" no encontrada`)

  // Intentar emparejar con producto existente: SKU > código barras > nombre exacto
  let product_id: string | null = null
  if (sku) {
    const found = productosExistentes.find(p => p.sku && p.sku.trim().toLowerCase() === sku.toLowerCase())
    if (found) product_id = found.id
  }
  if (!product_id && codigo_barras) {
    const found = productosExistentes.find(p => p.codigo_barras && p.codigo_barras.trim() === codigo_barras)
    if (found) product_id = found.id
  }
  if (!product_id && nombre) {
    const found = productosExistentes.find(p => p.nombre.toLowerCase() === nombre.toLowerCase())
    if (found) product_id = found.id
  }

  const match: FilaItem['match'] = product_id
    ? 'existente'
    : catMatch
      ? 'nuevo_con_cat'
      : 'nuevo_sin_cat'

  return {
    fila: idx + 2,
    nombre, sku, codigo_barras, cantidad, unidad_medida, precio_unitario,
    precio_venta, precio_incluye_iva,
    categoria_nombre, categoria_id: catMatch?.id ?? null,
    stock_minimo, ubicacion_bodega, descripcion,
    product_id, match, errores,
  }
}

export default function CargaMasivaOrdenForm({ proveedores, categorias }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [header, setHeader] = useState<OrdenHeader>({
    supplier_id: proveedores[0]?.id ?? '',
    metodo_pago: 'transferencia',
    costo_envio: '0',
    fecha_estimada_llegada: '',
    notas: '',
  })
  const [filas, setFilas] = useState<FilaItem[]>([])
  const [cargando, setCargando] = useState(false)
  const [importando, setImportando] = useState(false)

  const proveedorLabel = proveedores.find(p => p.id === header.supplier_id)?.nombre ?? 'Seleccionar...'

  // ── Descargar plantilla ──────────────────────────────────────────────────
  function descargarPlantilla() {
    const wb = XLSX.utils.book_new()

    const headers = [
      'nombre', 'sku', 'codigo_barras', 'cantidad', 'unidad_medida', 'precio_unitario',
      'precio_venta', 'precio_incluye_iva', 'categoria',
      'stock_minimo', 'ubicacion_bodega', 'descripcion',
    ]
    const ej1 = ['Pantalla iPhone 13 OLED', 'PAN-IP13', '8900000001234', 2, 'unidad', 45000, 95000, 'SI', 'Repuesto', 2, 'Estante A-3', 'Original pull-out']
    const ej2 = ['Batería Samsung A54', 'BAT-SA54', '', 5, 'unidad', 8000, 22000, 'NO', 'Repuesto', 3, 'Estante B-1', '']
    const ej3 = ['Funda silicona iPhone 15', '', '', 10, 'unidad', 1500, 5990, 'SI', 'Accesorio', 5, '', 'Color negro']
    const ej4 = ['Cable USB-C trenzado 2m', 'CAB-USBC-2M', '7500000009876', 20, 'unidad', 2000, 7990, 'NO', 'Accesorio', 10, '', '']
    const ej5 = ['Alcohol isopropílico', 'INS-ALC', '', 5, 'litro', 6000, 12000, 'NO', 'Insumo', 1, 'Estante C-2', 'Limpieza de placas']

    const ws = XLSX.utils.aoa_to_sheet([headers, ej1, ej2, ej3, ej4, ej5])
    ws['!cols'] = [
      { wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
      { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 25 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Items')

    // Instrucciones
    const instrData: unknown[][] = [
      ['COLUMNA', 'OBLIGATORIO', 'DESCRIPCIÓN', 'EJEMPLO'],
      ['nombre', 'SÍ', 'Nombre del producto o ítem', 'Pantalla iPhone 13 OLED'],
      ['sku', 'NO', 'SKU único. Si coincide con inventario, se vincula automáticamente', 'PAN-IP13'],
      ['codigo_barras', 'NO', 'Código de barras EAN-13 o Code128', '8900000001234'],
      ['cantidad', 'SÍ', 'Cantidad a pedir (mayor que 0, acepta decimales si la unidad no es "unidad")', '5'],
      ['unidad_medida', 'NO', `Unidad de compra: ${UNIDADES_VALIDAS.join(', ')} (por defecto unidad)`, 'litro'],
      ['precio_unitario', 'SÍ', 'Precio de costo unitario en CLP sin puntos', '45000'],
      ['precio_venta', 'NO', 'Precio de venta al cliente en CLP (para crear producto nuevo)', '95000'],
      ['precio_incluye_iva', 'NO', 'SI = precio de venta ya incluye IVA | NO = es precio neto', 'SI'],
      ['categoria', 'NO', 'Nombre de categoría (ver hoja Categorías). Necesario para crear producto nuevo', 'Repuesto'],
      ['stock_minimo', 'NO', 'Stock mínimo de alerta para el producto nuevo (por defecto 0)', '2'],
      ['ubicacion_bodega', 'NO', 'Ubicación física en bodega', 'Estante A-3'],
      ['descripcion', 'NO', 'Descripción o notas del ítem', 'Original pull-out'],
      [],
      ['COMPORTAMIENTO AL IMPORTAR:'],
      ['• Si SKU o código de barras coincide con un producto existente → se vincula sin duplicar'],
      ['• Si no coincide y tiene categoría → se crea el producto nuevo en inventario automáticamente'],
      ['• Si no coincide y no tiene categoría → se agrega como ítem libre en la OC (sin crear producto)'],
      ['• Los precios van en pesos chilenos sin puntos ni comas (ej: 45000, no 45.000)'],
      ['• No modificar la fila de encabezados (fila 1)'],
    ]
    const wsI = XLSX.utils.aoa_to_sheet(instrData)
    wsI['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 65 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, wsI, 'Instrucciones')

    // Categorías
    const catData: unknown[][] = [
      ['Categorías válidas (copiar exactamente)', 'Tipo'],
      ...categorias.map(c => [c.nombre, c.tipo]),
    ]
    const wsC = XLSX.utils.aoa_to_sheet(catData)
    wsC['!cols'] = [{ wch: 25 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsC, 'Categorías')

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_orden_compra.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Leer archivo Excel ───────────────────────────────────────────────────
  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCargando(true)

    try {
      // Cargar productos existentes para matching
      const { data: existentes } = await supabase
        .from('products')
        .select('id, sku, codigo_barras, nombre')
        .eq('activo', true)

      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

      if (rows.length === 0) {
        toast.error('El archivo no tiene datos')
        setCargando(false)
        return
      }
      if (rows.length > 200) {
        toast.error('Máximo 200 ítems por carga. Divide el archivo.')
        setCargando(false)
        return
      }

      const parsed = rows.map((row, i) => parseRow(row, i, categorias, existentes ?? []))
      setFilas(parsed)
      toast.success(`${parsed.length} filas leídas`)
    } catch {
      toast.error('Error al leer el archivo. Verifica que sea un .xlsx o .xls válido.')
    }

    setCargando(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Crear OC ─────────────────────────────────────────────────────────────
  async function handleCrearOrden() {
    if (!header.supplier_id) { toast.error('Selecciona un proveedor'); return }
    const validas = filas.filter(f => f.errores.length === 0)
    if (!validas.length) { toast.error('No hay ítems válidos'); return }

    setImportando(true)

    // 1. Crear productos nuevos que tienen categoría
    const itemsConProducto: (FilaItem & { product_id_final: string | null })[] = []

    for (const fila of validas) {
      let pid = fila.product_id

      if (!pid && fila.match === 'nuevo_con_cat' && fila.categoria_id) {
        // Crear/upsert producto en inventario
        const payload = {
          nombre: fila.nombre,
          sku: fila.sku || null,
          codigo_barras: fila.codigo_barras || null,
          descripcion: fila.descripcion || null,
          categoria_id: fila.categoria_id,
          unidad_medida: fila.unidad_medida,
          precio_costo: fila.precio_unitario,
          precio_venta: fila.precio_venta > 0 ? fila.precio_venta : fila.precio_unitario * 2,
          precio_incluye_iva: fila.precio_incluye_iva,
          stock_actual: 0,
          stock_minimo: fila.stock_minimo,
          ubicacion_bodega: fila.ubicacion_bodega || null,
          compatibilidad: [],
          activo: true,
        }

        if (fila.sku) {
          const { data } = await supabase
            .from('products')
            .upsert(payload, { onConflict: 'sku', ignoreDuplicates: false })
            .select('id')
            .single()
          pid = data?.id ?? null
        } else {
          const { data } = await supabase.from('products').insert(payload).select('id').single()
          pid = data?.id ?? null
        }
      }

      itemsConProducto.push({ ...fila, product_id_final: pid })
    }

    // 2. Crear la orden de compra
    const costoEnvio = parseFloat(header.costo_envio) || 0
    const subtotalItems = validas.reduce((s, f) => s + f.precio_unitario * f.cantidad, 0)

    const { data: nuevaOC, error: ocErr } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id: header.supplier_id,
        metodo_pago: header.metodo_pago,
        costo_envio_total: costoEnvio,
        total: subtotalItems + costoEnvio,
        fecha_estimada_llegada: header.fecha_estimada_llegada || null,
        notas: header.notas || null,
        estado: 'pendiente',
      })
      .select('id, numero_oc')
      .single()

    if (ocErr || !nuevaOC) {
      toast.error('Error al crear la orden de compra')
      setImportando(false)
      return
    }

    // 3. Crear los ítems
    const itemsPayload = itemsConProducto.map(f => ({
      purchase_order_id: nuevaOC.id,
      product_id: f.product_id_final,
      nombre: f.nombre,
      cantidad_solicitada: f.cantidad,
      precio_unitario: f.precio_unitario,
      subtotal: f.precio_unitario * f.cantidad,
    }))

    const { error: itemsErr } = await supabase.from('purchase_order_items').insert(itemsPayload)

    setImportando(false)

    if (itemsErr) {
      toast.error('OC creada pero hubo errores al agregar algunos ítems')
    } else {
      const nuevos = itemsConProducto.filter(f => f.match === 'nuevo_con_cat').length
      const vinculados = itemsConProducto.filter(f => f.match === 'existente').length
      toast.success(
        `OC ${nuevaOC.numero_oc} creada — ${validas.length} ítems` +
        (nuevos > 0 ? `, ${nuevos} productos nuevos en inventario` : '') +
        (vinculados > 0 ? `, ${vinculados} vinculados` : '')
      )
      router.push(`/compras/orden/${nuevaOC.id}`)
    }
  }

  const validas = filas.filter(f => f.errores.length === 0)
  const conErrores = filas.filter(f => f.errores.length > 0)
  const subtotal = validas.reduce((s, f) => s + f.precio_unitario * f.cantidad, 0)
  const costoEnvio = parseFloat(header.costo_envio) || 0

  return (
    <div className="space-y-6">

      {/* ── Paso 1: Cabecera de la OC ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="text-3xl">1️⃣</div>
          <div>
            <h2 className="font-semibold text-gray-800">Datos de la orden de compra</h2>
            <p className="text-sm text-gray-500">Completa los datos generales antes de subir el Excel.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Proveedor <span className="text-red-500">*</span></Label>
            <Select value={header.supplier_id} onValueChange={(v) => setHeader(h => ({ ...h, supplier_id: v ?? '' }))}>
              <SelectTrigger>
                <span className="truncate text-sm">{proveedorLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {proveedores.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Método de pago</Label>
            <Select
              value={header.metodo_pago}
              onValueChange={v => setHeader(h => ({ ...h, metodo_pago: v as OrdenHeader['metodo_pago'] }))}
            >
              <SelectTrigger>
                <span className="text-sm">{METODO_LABELS[header.metodo_pago]}</span>
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(METODO_LABELS) as [OrdenHeader['metodo_pago'], string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Costo de envío (CLP)</Label>
            <Input
              type="number"
              min={0}
              value={header.costo_envio}
              onChange={e => setHeader(h => ({ ...h, costo_envio: e.target.value }))}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha estimada de llegada</Label>
            <Input
              type="date"
              value={header.fecha_estimada_llegada}
              onChange={e => setHeader(h => ({ ...h, fecha_estimada_llegada: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notas / observaciones</Label>
            <Input
              value={header.notas}
              onChange={e => setHeader(h => ({ ...h, notas: e.target.value }))}
              placeholder="Condiciones especiales, referencia del pedido..."
            />
          </div>
        </div>
      </div>

      {/* ── Paso 2: Plantilla ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <div className="flex items-start gap-4">
          <div className="text-3xl">2️⃣</div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">Descarga la plantilla Excel</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Incluye ejemplos, instrucciones y la lista de categorías. Los productos que ya existen en inventario se vinculan automáticamente por SKU o código de barras.
            </p>
            <Button onClick={descargarPlantilla} className="mt-3 bg-green-600 hover:bg-green-700 gap-2">
              ⬇️ Descargar plantilla Excel
            </Button>
          </div>
        </div>

        <details className="mt-1">
          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 select-none">
            Ver referencia de columnas
          </summary>
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Columna</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Req.</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ['nombre', 'SÍ', 'Nombre del producto o ítem a pedir'],
                  ['sku', 'NO', 'SKU. Si coincide con inventario, se vincula automáticamente'],
                  ['codigo_barras', 'NO', 'Código de barras EAN-13/Code128 para vincular'],
                  ['cantidad', 'SÍ', 'Cantidad a pedir, acepta decimales (> 0)'],
                  ['unidad_medida', 'NO', `${UNIDADES_VALIDAS.join(', ')} (por defecto unidad)`],
                  ['precio_unitario', 'SÍ', 'Costo de compra por unidad en CLP sin puntos'],
                  ['precio_venta', 'NO', 'Precio de venta sugerido al cliente (para crear producto)'],
                  ['precio_incluye_iva', 'NO', 'SI/NO — si precio_venta ya incluye IVA'],
                  ['categoria', 'NO', 'Nombre exacto de categoría. Si se indica, crea el producto en inventario'],
                  ['stock_minimo', 'NO', 'Mínimo de stock para alerta (solo productos nuevos)'],
                  ['ubicacion_bodega', 'NO', 'Estante o sección en bodega'],
                  ['descripcion', 'NO', 'Notas adicionales del ítem'],
                ].map(([col, req, desc]) => (
                  <tr key={col} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-blue-700">{col}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${req === 'SÍ' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{req}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      {/* ── Paso 3: Subir archivo ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-start gap-4">
          <div className="text-3xl">3️⃣</div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">Sube el archivo completado</h2>
            <p className="text-sm text-gray-500 mt-0.5">Rellena la hoja "Items" y sube el archivo aquí.</p>

            <label className="mt-3 flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <span className="text-3xl mb-1">📂</span>
              <span className="text-sm font-medium text-gray-700">
                {cargando ? 'Procesando...' : 'Arrastra tu archivo aquí o haz clic'}
              </span>
              <span className="text-xs text-gray-400">.xlsx o .xls · máx. 200 ítems</span>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleArchivo}
                disabled={cargando}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Paso 4: Vista previa ─────────────────────────────────────────── */}
      {filas.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-start gap-4">
              <div className="text-3xl">4️⃣</div>
              <div>
                <p className="font-semibold text-gray-800">Vista previa — {filas.length} ítem(s)</p>
                <div className="flex flex-wrap gap-3 mt-0.5 text-xs">
                  <span className="text-green-700 font-medium">✓ {validas.length} válidos</span>
                  {conErrores.length > 0 && <span className="text-red-600 font-medium">✗ {conErrores.length} con errores</span>}
                  <span className="text-blue-700 font-medium">🔗 {validas.filter(f => f.match === 'existente').length} vinculados a inventario</span>
                  <span className="text-purple-700 font-medium">✨ {validas.filter(f => f.match === 'nuevo_con_cat').length} productos nuevos a crear</span>
                  <span className="text-gray-500 font-medium">📄 {validas.filter(f => f.match === 'nuevo_sin_cat').length} ítems libres</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilas([])}
              className="text-xs"
            >
              Limpiar
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 w-8">#</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Producto / Ítem</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">SKU</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Categoría</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Cant.</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Unidad</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">P. Unit.</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Subtotal</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filas.map(f => {
                  const ok = f.errores.length === 0
                  return (
                    <tr key={f.fila} className={ok ? 'hover:bg-gray-50' : 'bg-red-50'}>
                      <td className="px-3 py-2 text-gray-400">{f.fila}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] truncate">
                        {f.nombre || <span className="text-red-400 italic">vacío</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-500">{f.sku || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{f.categoria_nombre || '—'}</td>
                      <td className="px-3 py-2 text-right">{formatCantidad(f.cantidad, f.unidad_medida)}</td>
                      <td className="px-3 py-2 text-gray-500">{UNIDAD_MEDIDA_LABEL[f.unidad_medida] ?? f.unidad_medida}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{formatCLP(f.precio_unitario)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCLP(f.precio_unitario * f.cantidad)}</td>
                      <td className="px-3 py-2 min-w-[160px]">
                        {!ok ? (
                          <div className="space-y-0.5">
                            {f.errores.map((e, i) => <p key={i} className="text-red-600">✗ {e}</p>)}
                          </div>
                        ) : f.match === 'existente' ? (
                          <span className="text-blue-600 font-medium">🔗 Vinculado</span>
                        ) : f.match === 'nuevo_con_cat' ? (
                          <span className="text-purple-600 font-medium">✨ Crear en inventario</span>
                        ) : (
                          <span className="text-gray-500">📄 Ítem libre</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totales + botón confirmar */}
          <div className="border-t bg-gray-50 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm space-y-0.5">
              <div className="flex justify-between gap-8 text-gray-600">
                <span>Subtotal ítems válidos</span>
                <span className="font-medium">{formatCLP(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-8 text-gray-600">
                <span>Costo de envío</span>
                <span className="font-medium">{formatCLP(costoEnvio)}</span>
              </div>
              <div className="flex justify-between gap-8 font-bold text-gray-900 text-base pt-1 border-t">
                <span>Total OC</span>
                <span>{formatCLP(subtotal + costoEnvio)}</span>
              </div>
            </div>

            <Button
              onClick={handleCrearOrden}
              disabled={importando || validas.length === 0 || !header.supplier_id}
              className="bg-blue-600 hover:bg-blue-700 text-sm px-6 py-2.5"
            >
              {importando ? 'Creando orden...' : `✅ Crear OC con ${validas.length} ítem(s)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
