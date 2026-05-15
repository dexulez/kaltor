'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'
import { useRouter } from 'next/navigation'

interface Categoria { id: string; nombre: string; tipo: string }
interface Proveedor { id: string; nombre: string }

interface Props {
  categorias: Categoria[]
  proveedores: Proveedor[]
}

interface FilaParsed {
  fila: number
  nombre: string
  sku: string
  descripcion: string
  categoria_nombre: string
  categoria_id: string | null
  proveedor_nombre: string
  proveedor_id: string | null
  stock_actual: number
  stock_minimo: number
  precio_costo: number
  costo_envio: number
  precio_venta: number
  precio_incluye_iva: boolean
  ubicacion_bodega: string
  errores: string[]
}

// Convierte cualquier valor de celda a número limpio
function toNum(v: unknown, defaultVal = 0): number {
  if (v === undefined || v === null || v === '') return defaultVal
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[.$]/g, '').replace(',', '.'))
  return isNaN(n) ? defaultVal : n
}

function parseBool(v: unknown): boolean {
  const s = String(v ?? '').trim().toUpperCase()
  return s === 'SI' || s === 'SÍ' || s === 'YES' || s === '1' || s === 'TRUE'
}

function parseRow(
  raw: Record<string, unknown>,
  idx: number,
  categorias: Categoria[],
  proveedores: Proveedor[]
): FilaParsed {
  const errores: string[] = []

  const nombre = String(raw['nombre'] ?? raw['Nombre'] ?? '').trim()
  if (!nombre) errores.push('Nombre obligatorio')

  const sku = String(raw['sku'] ?? raw['SKU'] ?? '').trim()
  const descripcion = String(raw['descripcion'] ?? raw['Descripción'] ?? '').trim()
  const ubicacion_bodega = String(raw['ubicacion_bodega'] ?? raw['Ubicación bodega'] ?? '').trim()

  // Categoría: buscar por nombre exacto (sin mayúsculas/minúsculas)
  const categoria_nombre = String(raw['categoria'] ?? raw['Categoría'] ?? '').trim()
  const catMatch = categorias.find(c => c.nombre.toLowerCase() === categoria_nombre.toLowerCase())
  if (categoria_nombre && !catMatch) errores.push(`Categoría "${categoria_nombre}" no encontrada`)
  if (!categoria_nombre) errores.push('Categoría obligatoria')

  // Proveedor: opcional
  const proveedor_nombre = String(raw['proveedor'] ?? raw['Proveedor'] ?? '').trim()
  const provMatch = proveedor_nombre
    ? proveedores.find(p => p.nombre.toLowerCase() === proveedor_nombre.toLowerCase())
    : null
  if (proveedor_nombre && !provMatch) errores.push(`Proveedor "${proveedor_nombre}" no encontrado`)

  const stock_actual = Math.round(toNum(raw['stock_actual'] ?? raw['Stock actual']))
  const stock_minimo = Math.round(toNum(raw['stock_minimo'] ?? raw['Stock mínimo']))
  const precio_costo = toNum(raw['precio_costo'] ?? raw['Precio costo'])
  const costo_envio = toNum(raw['costo_envio'] ?? raw['Costo envío'])
  const precio_venta = toNum(raw['precio_venta'] ?? raw['Precio venta'])

  if (precio_venta <= 0) errores.push('Precio de venta debe ser > 0')
  if (stock_actual < 0) errores.push('Stock actual no puede ser negativo')

  const precio_incluye_iva = parseBool(raw['precio_incluye_iva'] ?? raw['Precio incluye IVA'])

  return {
    fila: idx + 2,
    nombre,
    sku,
    descripcion,
    categoria_nombre,
    categoria_id: catMatch?.id ?? null,
    proveedor_nombre,
    proveedor_id: provMatch?.id ?? null,
    stock_actual,
    stock_minimo,
    precio_costo,
    costo_envio,
    precio_venta,
    precio_incluye_iva,
    ubicacion_bodega,
    errores,
  }
}

export default function CargaMasivaForm({ categorias, proveedores }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [filas, setFilas] = useState<FilaParsed[]>([])
  const [cargando, setCargando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; errores: number } | null>(null)

  // ── Generar plantilla Excel ──────────────────────────────────────────────
  function descargarPlantilla() {
    const wb = XLSX.utils.book_new()

    // Hoja 1: Productos
    const headers = [
      'nombre', 'sku', 'descripcion', 'categoria', 'proveedor',
      'stock_actual', 'stock_minimo', 'precio_costo', 'costo_envio',
      'precio_venta', 'precio_incluye_iva', 'ubicacion_bodega',
    ]
    const ejemplo1 = [
      'Pantalla iPhone 13 OLED', 'PAN-IP13', 'Original pull-out', 'Repuesto', proveedores[0]?.nombre ?? 'Proveedor Ejemplo',
      5, 2, 45000, 2000, 95000, 'SI', 'Estante A-3',
    ]
    const ejemplo2 = [
      'Batería Samsung A54', 'BAT-SA54', '', 'Repuesto', proveedores[0]?.nombre ?? '',
      10, 3, 8000, 500, 22000, 'NO', 'Estante B-1',
    ]
    const ejemplo3 = [
      'Funda silicona iPhone 15', 'FUN-IP15-SIL', 'Color negro', 'Accesorio', '',
      20, 5, 1500, 200, 5990, 'SI', '',
    ]

    const wsProductos = XLSX.utils.aoa_to_sheet([headers, ejemplo1, ejemplo2, ejemplo3])
    wsProductos['!cols'] = [
      { wch: 35 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 20 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 18 }, { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos')

    // Hoja 2: Instrucciones
    const instrData = [
      ['COLUMNA', 'OBLIGATORIO', 'DESCRIPCIÓN', 'EJEMPLO'],
      ['nombre', 'SÍ', 'Nombre del producto', 'Pantalla iPhone 13 OLED'],
      ['sku', 'NO', 'Código interno o SKU único', 'PAN-IP13'],
      ['descripcion', 'NO', 'Descripción opcional', 'Original pull-out'],
      ['categoria', 'SÍ', 'Debe coincidir exactamente con un nombre de la hoja Categorías', 'Repuesto'],
      ['proveedor', 'NO', 'Debe coincidir exactamente con un nombre de la hoja Proveedores', 'Los Arepas'],
      ['stock_actual', 'NO', 'Cantidad actual en bodega (número entero, por defecto 0)', '5'],
      ['stock_minimo', 'NO', 'Stock mínimo para alerta (número entero, por defecto 0)', '2'],
      ['precio_costo', 'NO', 'Precio de compra en pesos chilenos (sin puntos)', '45000'],
      ['costo_envio', 'NO', 'Costo de envío prorrateado del producto (por defecto 0)', '2000'],
      ['precio_venta', 'SÍ', 'Precio de venta al cliente en pesos chilenos', '95000'],
      ['precio_incluye_iva', 'NO', 'SI si el precio ya incluye IVA, NO si es precio neto (por defecto NO)', 'SI'],
      ['ubicacion_bodega', 'NO', 'Ubicación física en bodega', 'Estante A-3'],
      [],
      ['NOTAS:'],
      ['• No modificar la fila de encabezados (fila 1)'],
      ['• Los precios van en pesos chilenos sin puntos ni comas'],
      ['• La columna "categoria" debe coincidir exactamente con los nombres en la hoja Categorías'],
      ['• Si un SKU ya existe en el sistema, el producto se actualizará (no se duplicará)'],
    ]
    const wsInstr = XLSX.utils.aoa_to_sheet(instrData)
    wsInstr['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 55 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

    // Hoja 3: Categorías válidas
    const catData = [
      ['Categorías válidas (copiar exactamente)'],
      ...categorias.map(c => [c.nombre, `Tipo: ${c.tipo}`]),
    ]
    const wsCat = XLSX.utils.aoa_to_sheet(catData)
    wsCat['!cols'] = [{ wch: 25 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsCat, 'Categorías')

    // Hoja 4: Proveedores válidos
    const provData = [
      ['Proveedores válidos (copiar exactamente)'],
      ...proveedores.map(p => [p.nombre]),
    ]
    const wsProv = XLSX.utils.aoa_to_sheet(provData)
    wsProv['!cols'] = [{ wch: 30 }]
    XLSX.utils.book_append_sheet(wb, wsProv, 'Proveedores')

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_carga_inventario.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Leer archivo Excel ───────────────────────────────────────────────────
  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCargando(true)
    setImportResult(null)

    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

      if (rows.length === 0) {
        toast.error('El archivo no tiene datos. Verifica que estés usando la hoja "Productos".')
        setCargando(false)
        return
      }
      if (rows.length > 500) {
        toast.error('Máximo 500 productos por carga. Divide el archivo en partes.')
        setCargando(false)
        return
      }

      const parsed = rows.map((row, i) => parseRow(row, i, categorias, proveedores))
      setFilas(parsed)
    } catch {
      toast.error('Error al leer el archivo. Asegúrate de subir un archivo .xlsx o .xls válido.')
    }

    setCargando(false)
    // Reset input para permitir subir el mismo archivo de nuevo
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Importar productos válidos ───────────────────────────────────────────
  async function handleImportar() {
    const validas = filas.filter(f => f.errores.length === 0)
    if (!validas.length) { toast.error('No hay filas válidas para importar'); return }
    if (!confirm(`¿Importar ${validas.length} producto(s)? Las filas con errores serán ignoradas.`)) return

    setImportando(true)
    let ok = 0
    let errCount = 0

    // Obtener usuario actual para log
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = user
      ? await supabase.from('user_profiles').select('nombre_completo').eq('id', user.id).single()
      : { data: null }
    const nombreUsuario = (perfil as { nombre_completo?: string } | null)?.nombre_completo ?? null
    const importId = crypto.randomUUID() // ID agrupador de esta carga masiva

    for (const fila of validas) {
      const payload = {
        nombre: fila.nombre,
        sku: fila.sku || null,
        descripcion: fila.descripcion || null,
        categoria_id: fila.categoria_id!,
        proveedor_id: fila.proveedor_id ?? null,
        stock_actual: fila.stock_actual,
        stock_minimo: fila.stock_minimo,
        precio_costo: fila.precio_costo,
        costo_envio: fila.costo_envio,
        precio_venta: fila.precio_venta,
        precio_incluye_iva: fila.precio_incluye_iva,
        ubicacion_bodega: fila.ubicacion_bodega || null,
        compatibilidad: [],
        activo: true,
      }

      let prodId: string | null = null
      let stockAnterior = 0

      // Upsert por SKU si tiene SKU, sino siempre insert
      if (fila.sku) {
        // Buscar si ya existe para saber stock anterior
        const { data: existente } = await supabase.from('products').select('id, stock_actual').eq('sku', fila.sku).maybeSingle()
        stockAnterior = (existente as { stock_actual?: number } | null)?.stock_actual ?? 0
        const { data: upserted, error } = await supabase
          .from('products')
          .upsert(payload, { onConflict: 'sku', ignoreDuplicates: false })
          .select('id').single()
        if (error) { errCount++; continue }
        prodId = (upserted as { id: string } | null)?.id ?? (existente as { id: string } | null)?.id ?? null
        ok++
      } else {
        const { data: inserted, error } = await supabase.from('products').insert(payload).select('id').single()
        if (error) { errCount++; continue }
        prodId = (inserted as { id: string } | null)?.id ?? null
        ok++
      }

      // Log de movimiento
      if (prodId && fila.stock_actual > 0) {
        await supabase.from('stock_movements').insert({
          product_id: prodId,
          tipo: 'carga_inicial',
          cantidad: fila.stock_actual,
          stock_anterior: stockAnterior,
          stock_nuevo: fila.stock_actual,
          razon: `Carga masiva de inventario`,
          referencia_id: importId,
          referencia_tipo: 'carga_masiva',
          usuario_id: user?.id ?? null,
          nombre_usuario: nombreUsuario,
        }).then(r => r) // silenciar si columnas no existen aún
      }
    }

    setImportResult({ ok, errores: errCount })
    setImportando(false)

    if (ok > 0) {
      toast.success(`${ok} producto(s) importados correctamente`)
      if (errCount === 0) {
        setFilas([])
        router.refresh()
      }
    }
    if (errCount > 0) toast.error(`${errCount} producto(s) fallaron al insertar`)
  }

  const validas = filas.filter(f => f.errores.length === 0).length
  const conErrores = filas.filter(f => f.errores.length > 0).length

  return (
    <div className="space-y-6">
      {/* Paso 1: Descargar plantilla */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <div className="flex items-start gap-4">
          <div className="text-3xl">1️⃣</div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">Descarga la plantilla Excel</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              La plantilla incluye ejemplos, instrucciones, y las listas de categorías y proveedores disponibles.
            </p>
            <div className="mt-3">
              <Button
                onClick={descargarPlantilla}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                ⬇️ Descargar plantilla Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Referencia de columnas */}
        <details className="mt-2">
          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 select-none">
            Ver referencia de columnas
          </summary>
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Columna</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Obligatorio</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ['nombre', 'SÍ', 'Nombre del producto'],
                  ['sku', 'NO', 'Código único. Si ya existe en el sistema, el producto se actualizará'],
                  ['descripcion', 'NO', 'Descripción interna'],
                  ['categoria', 'SÍ', 'Debe coincidir exactamente con un nombre de la hoja Categorías'],
                  ['proveedor', 'NO', 'Debe coincidir exactamente con un nombre de la hoja Proveedores'],
                  ['stock_actual', 'NO', 'Cantidad en bodega (por defecto 0)'],
                  ['stock_minimo', 'NO', 'Mínimo para alerta (por defecto 0)'],
                  ['precio_costo', 'NO', 'Precio de compra en CLP sin puntos'],
                  ['costo_envio', 'NO', 'Costo de envío en CLP (por defecto 0)'],
                  ['precio_venta', 'SÍ', 'Precio de venta al cliente en CLP'],
                  ['precio_incluye_iva', 'NO', 'SI = precio ya tiene IVA | NO = precio neto (por defecto NO)'],
                  ['ubicacion_bodega', 'NO', 'Ubicación física, ej: Estante A-3'],
                ].map(([col, obl, desc]) => (
                  <tr key={col} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-blue-700">{col}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${obl === 'SÍ' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {obl}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      {/* Paso 2: Subir archivo */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <div className="flex items-start gap-4">
          <div className="text-3xl">2️⃣</div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">Completa y sube el archivo Excel</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Rellena la hoja &ldquo;Productos&rdquo; con tus datos y sube el archivo aquí. Máximo 500 filas por carga.
            </p>

            <label className="mt-3 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <span className="text-3xl mb-1">📂</span>
              <span className="text-sm font-medium text-gray-700">
                {cargando ? 'Procesando...' : 'Arrastra tu archivo aquí o haz click'}
              </span>
              <span className="text-xs text-gray-400">.xlsx o .xls</span>
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

      {/* Paso 3: Vista previa */}
      {filas.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-start gap-4">
              <div className="text-3xl">3️⃣</div>
              <div>
                <p className="font-semibold text-gray-800">Vista previa — {filas.length} fila(s)</p>
                <div className="flex gap-3 mt-0.5 text-xs">
                  <span className="text-green-700 font-medium">✓ {validas} válidas</span>
                  {conErrores > 0 && <span className="text-red-600 font-medium">✗ {conErrores} con errores</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilas([])}
                className="text-xs"
              >
                Limpiar
              </Button>
              <Button
                onClick={handleImportar}
                disabled={importando || validas === 0}
                className="bg-blue-600 hover:bg-blue-700 text-sm"
              >
                {importando
                  ? 'Importando...'
                  : `⬆️ Importar ${validas} producto(s)`}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 w-10">#</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Nombre</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">SKU</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Categoría</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Proveedor</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Stock</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">P. Costo</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">P. Venta</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filas.map((f) => {
                  const ok = f.errores.length === 0
                  return (
                    <tr key={f.fila} className={ok ? 'hover:bg-gray-50' : 'bg-red-50'}>
                      <td className="px-3 py-2 text-gray-400">{f.fila}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] truncate">
                        {f.nombre || <span className="text-red-400 italic">vacío</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{f.sku || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={f.categoria_id ? 'text-gray-700' : 'text-red-500'}>
                          {f.categoria_nombre || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{f.proveedor_nombre || '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{f.stock_actual}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatCLP(f.precio_costo)}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCLP(f.precio_venta)}</td>
                      <td className="px-3 py-2 min-w-[180px]">
                        {ok ? (
                          <span className="text-green-600 font-medium">✓ Listo</span>
                        ) : (
                          <div className="space-y-0.5">
                            {f.errores.map((e, i) => (
                              <p key={i} className="text-red-600 leading-tight">✗ {e}</p>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resultado de importación */}
      {importResult && (
        <div className={`rounded-xl border p-5 flex items-center gap-4 ${importResult.errores === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <span className="text-3xl">{importResult.errores === 0 ? '🎉' : '⚠️'}</span>
          <div>
            <p className="font-semibold text-gray-800">
              {importResult.ok} producto(s) importados correctamente
              {importResult.errores > 0 && `, ${importResult.errores} fallaron`}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Puedes ir al inventario para verificar los productos cargados.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
