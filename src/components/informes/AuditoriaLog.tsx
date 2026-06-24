'use client'

import { useMemo, useState } from 'react'
import { formatCLP } from '@/lib/calculations'
import ExportButtons from '@/components/informes/ExportButtons'
import MultiSelectDropdown from '@/components/ui/multi-select-dropdown'

interface LogEntry {
  fecha: string
  usuario: string
  modulo: string
  accion: string
  detalle: string
  monto?: number
  color: string
}

interface Props {
  entries: LogEntry[]
  puedeExportar: boolean
}

export default function AuditoriaLog({ entries, puedeExportar }: Props) {
  const [usuariosSel, setUsuariosSel] = useState<Set<string>>(new Set())
  const [modulosSel, setModulosSel] = useState<Set<string>>(new Set())
  const [accionesSel, setAccionesSel] = useState<Set<string>>(new Set())
  const [busquedaDetalle, setBusquedaDetalle] = useState('')

  const usuariosOpciones = useMemo(() => [...new Set(entries.map(e => e.usuario))].sort().map(v => ({ value: v, label: v })), [entries])
  const modulosOpciones = useMemo(() => [...new Set(entries.map(e => e.modulo))].sort().map(v => ({ value: v, label: v })), [entries])
  const accionesOpciones = useMemo(() => [...new Set(entries.map(e => e.accion))].sort().map(v => ({ value: v, label: v })), [entries])

  const filtrados = useMemo(() => {
    const q = busquedaDetalle.trim().toLowerCase()
    return entries.filter(e =>
      (usuariosSel.size === 0 || usuariosSel.has(e.usuario)) &&
      (modulosSel.size === 0 || modulosSel.has(e.modulo)) &&
      (accionesSel.size === 0 || accionesSel.has(e.accion)) &&
      (!q || e.detalle.toLowerCase().includes(q))
    )
  }, [entries, usuariosSel, modulosSel, accionesSel, busquedaDetalle])

  const hayFiltros = usuariosSel.size > 0 || modulosSel.size > 0 || accionesSel.size > 0 || busquedaDetalle.trim() !== ''

  function limpiarFiltros() {
    setUsuariosSel(new Set())
    setModulosSel(new Set())
    setAccionesSel(new Set())
    setBusquedaDetalle('')
  }

  const TZ_CL = 'America/Santiago'
  const fmtFecha = (iso: string) => new Date(iso).toLocaleString('es-CL', { timeZone: TZ_CL, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const filtradosRows = filtrados.map(e => [fmtFecha(e.fecha), e.usuario, e.modulo, e.accion, e.detalle, e.monto ? formatCLP(e.monto) : '—'])

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-gray-50 border-b px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-gray-800 text-sm">
            📋 Log completo de actividad ({filtrados.length}{filtrados.length !== entries.length ? ` de ${entries.length}` : ''} eventos)
          </h2>
          <ExportButtons
            visible={puedeExportar}
            titulo="Log de auditoría"
            subtitulo={hayFiltros ? 'Filtrado' : 'Completo'}
            secciones={[
              { titulo: 'Log de auditoría', headers: ['Fecha / Hora', 'Usuario', 'Módulo', 'Acción', 'Detalle', 'Monto'], rows: filtradosRows },
            ]}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MultiSelectDropdown label="👤 Usuario" opciones={usuariosOpciones} seleccion={usuariosSel} onChange={setUsuariosSel} />
          <MultiSelectDropdown label="🗂️ Módulo" opciones={modulosOpciones} seleccion={modulosSel} onChange={setModulosSel} />
          <MultiSelectDropdown label="⚡ Acción" opciones={accionesOpciones} seleccion={accionesSel} onChange={setAccionesSel} />
          <input
            type="text"
            value={busquedaDetalle}
            onChange={e => setBusquedaDetalle(e.target.value)}
            placeholder="Buscar en detalle..."
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
          />
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="text-xs text-blue-600 hover:underline font-medium">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Fecha / Hora', 'Usuario', 'Módulo', 'Acción', 'Detalle', 'Monto'].map((h, i) => (
                <th key={i} className={`px-3 py-2.5 text-gray-500 font-medium ${i === 0 || i === 1 || i === 4 ? 'text-left' : 'text-center'} ${i === 5 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtrados.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                {entries.length === 0 ? 'Sin actividad registrada en el período seleccionado' : 'Ningún evento coincide con los filtros aplicados'}
              </td></tr>
            ) : filtrados.map((e, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtFecha(e.fecha)}</td>
                <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{e.usuario}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{e.modulo}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${e.color}`}>{e.accion}</span>
                </td>
                <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{e.detalle}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">{e.monto ? formatCLP(e.monto) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
