'use client'

import { useEffect, useMemo, useState } from 'react'
import ExportButtons from './ExportButtons'

type TipoCampo = 'texto' | 'numero' | 'clp' | 'fecha' | 'bool'

interface CampoFuente { key: string; label: string; tipo: TipoCampo }
interface FiltroFuente { columna: string; label: string; opciones: { value: string; label: string }[] }
interface FuenteMeta { key: string; label: string; campos: CampoFuente[]; filtros: FiltroFuente[] }
interface Resultado { campos: CampoFuente[]; rows: Record<string, unknown>[]; truncado: boolean }

const MAX_FILAS_PREVIEW = 200

function hace30Dias() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

function hoy() {
  return new Date().toISOString().split('T')[0]
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

function formatearValor(valor: unknown, tipo: TipoCampo): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (tipo === 'clp') return formatCLP(Number(valor) || 0)
  if (tipo === 'bool') return valor ? 'Sí' : 'No'
  if (tipo === 'fecha') {
    const s = String(valor)
    return s.includes('T') ? s.split('T')[0] : s
  }
  return String(valor)
}

export default function ReportBuilder() {
  const [fuentes, setFuentes] = useState<FuenteMeta[]>([])
  const [cargandoFuentes, setCargandoFuentes] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fuenteKey, setFuenteKey] = useState('')
  const [columnas, setColumnas] = useState<string[]>([])
  const [desde, setDesde] = useState(hace30Dias())
  const [hasta, setHasta] = useState(hoy())
  const [filtroValores, setFiltroValores] = useState<Record<string, string>>({})

  const [generando, setGenerando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    fetch('/api/informes/personalizado')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        const lista: FuenteMeta[] = data.fuentes ?? []
        setFuentes(lista)
        if (lista.length) {
          setFuenteKey(lista[0].key)
          setColumnas(lista[0].campos.map(c => c.key))
        }
      })
      .catch(() => setError('No se pudo cargar la lista de fuentes de datos'))
      .finally(() => setCargandoFuentes(false))
  }, [])

  const fuente = useMemo(() => fuentes.find(f => f.key === fuenteKey) ?? null, [fuentes, fuenteKey])

  function handleFuenteChange(key: string) {
    setFuenteKey(key)
    setFiltroValores({})
    setResultado(null)
    const f = fuentes.find(x => x.key === key)
    setColumnas(f ? f.campos.map(c => c.key) : [])
  }

  function toggleColumna(key: string) {
    setColumnas(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function generar() {
    if (!fuente || columnas.length === 0) return
    setGenerando(true)
    setError(null)
    try {
      const res = await fetch('/api/informes/personalizado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fuente: fuente.key, columnas, desde, hasta, filtros: filtroValores }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al generar el reporte')
        setResultado(null)
        return
      }
      setResultado(data)
    } catch {
      setError('Error de conexión al generar el reporte')
      setResultado(null)
    } finally {
      setGenerando(false)
    }
  }

  const seccionesExport = useMemo(() => {
    if (!resultado) return []
    return [{
      titulo: fuente?.label ?? 'Reporte',
      headers: resultado.campos.map(c => c.label),
      rows: resultado.rows.map(row => resultado.campos.map(c => {
        const valor = row[c.key]
        if (c.tipo === 'numero') return typeof valor === 'number' ? valor : Number(valor) || 0
        return formatearValor(valor, c.tipo)
      })),
    }]
  }, [resultado, fuente])

  if (cargandoFuentes) {
    return <div className="text-center py-16 text-gray-400 text-sm">Cargando fuentes de datos...</div>
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fuente de datos</label>
          <select
            value={fuenteKey}
            onChange={e => handleFuenteChange(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {fuentes.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>

        {fuente && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Columnas a incluir</label>
            <div className="flex flex-wrap gap-2">
              {fuente.campos.map(c => (
                <label key={c.key} className="flex items-center gap-1.5 text-sm text-gray-700 bg-gray-50 border rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-blue-300">
                  <input type="checkbox" checked={columnas.includes(c.key)} onChange={() => toggleColumna(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          {fuente?.filtros.map(flt => (
            <div key={flt.columna}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{flt.label}</label>
              <select
                value={filtroValores[flt.columna] ?? ''}
                onChange={e => setFiltroValores(prev => ({ ...prev, [flt.columna]: e.target.value }))}
                className="border rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="">Todos</option>
                {flt.opciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <button
            type="button"
            onClick={generar}
            disabled={generando || !fuente || columnas.length === 0}
            className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {generando ? 'Generando…' : '▶ Generar reporte'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {resultado && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">{fuente?.label} — {resultado.rows.length} fila{resultado.rows.length !== 1 ? 's' : ''}</h2>
              {resultado.truncado && (
                <p className="text-xs text-amber-600 mt-0.5">Se alcanzó el límite de filas; acota el rango de fechas para ver todo el detalle.</p>
              )}
            </div>
            <ExportButtons titulo={fuente?.label ?? 'Reporte'} subtitulo={`Período: ${desde} a ${hasta}`} secciones={seccionesExport} />
          </div>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  {resultado.campos.map(c => (
                    <th key={c.key} className={`px-3 py-2 text-xs text-gray-500 font-medium whitespace-nowrap ${c.tipo === 'texto' || c.tipo === 'fecha' ? 'text-left' : 'text-right'}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {resultado.rows.length === 0 ? (
                  <tr><td colSpan={resultado.campos.length} className="px-3 py-8 text-center text-gray-400 text-xs">Sin datos para los filtros seleccionados</td></tr>
                ) : resultado.rows.slice(0, MAX_FILAS_PREVIEW).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {resultado.campos.map(c => (
                      <td key={c.key} className={`px-3 py-2 text-xs whitespace-nowrap ${c.tipo === 'texto' || c.tipo === 'fecha' ? '' : 'text-right'}`}>{formatearValor(row[c.key], c.tipo)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultado.rows.length > MAX_FILAS_PREVIEW && (
            <p className="text-xs text-gray-400 px-4 py-2 border-t">Mostrando las primeras {MAX_FILAS_PREVIEW} filas de {resultado.rows.length}. Exporta para ver el detalle completo.</p>
          )}
        </div>
      )}
    </div>
  )
}
