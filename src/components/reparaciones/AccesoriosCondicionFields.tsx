'use client'

import { useState, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { getConfigTipoEquipo } from '@/lib/tipoEquipo'
import { ACC_INICIAL, COND_INICIAL, MICROSD_SIZES, type AccState, type CondState } from '@/lib/recepcionEquipo'

export { ACC_INICIAL, COND_INICIAL }
export type { AccState, CondState }

const AREA_GENERICA = '__general__'
const CARRIERS_SUGERIDOS = ['Entel', 'Claro', 'Movistar', 'WOM', 'Virgin Mobile', 'Bitel', 'Mundo']

interface Props {
  tipoEquipo: string
  acc: AccState
  onAccChange: (updater: (a: AccState) => AccState) => void
  cond: CondState
  onCondChange: (updater: (c: CondState) => CondState) => void
}

function Chip({ active, onClick, children, activeClass = 'bg-blue-600 text-white border-blue-600' }: {
  active: boolean; onClick: () => void; children: ReactNode; activeClass?: string
}) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? activeClass : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
      {children}
    </button>
  )
}

export default function AccesoriosCondicionFields({ tipoEquipo, acc, onAccChange, cond, onCondChange }: Props) {
  const config = getConfigTipoEquipo(tipoEquipo)

  const [savedCarriers, setSavedCarriers] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('tr_sim_carriers') ?? '[]') } catch { return [] }
  })
  function saveCarrier(carrier: string) {
    const c = carrier.trim()
    if (!c || savedCarriers.includes(c)) return
    const updated = [...savedCarriers, c].sort()
    setSavedCarriers(updated)
    try { localStorage.setItem('tr_sim_carriers', JSON.stringify(updated)) } catch { /* ignore */ }
  }

  function toggleAccSimple(label: string) {
    onAccChange(a => ({ ...a, simples: a.simples.includes(label) ? a.simples.filter(s => s !== label) : [...a.simples, label] }))
  }
  function toggleCondSimple(label: string) {
    onCondChange(c => ({ ...c, simples: c.simples.includes(label) ? c.simples.filter(s => s !== label) : [...c.simples, label] }))
  }
  function toggleArea(campo: 'rayones' | 'golpes' | 'humedad' | 'quemaduras', area: string) {
    onCondChange(c => {
      const arr = c[campo]
      return { ...c, [campo]: arr.includes(area) ? arr.filter(a => a !== area) : [...arr, area] }
    })
  }
  function toggleGenerico(campo: 'rayones' | 'golpes' | 'humedad' | 'quemaduras') {
    onCondChange(c => ({ ...c, [campo]: c[campo].includes(AREA_GENERICA) ? [] : [AREA_GENERICA] }))
  }

  return (
    <div className="space-y-5">
      {/* Accesorios */}
      <div className="space-y-3">
        <Label>Accesorios entregados</Label>

        {config.accesorios.notaLibre ? (
          <input
            value={acc.notaLibre}
            onChange={e => onAccChange(a => ({ ...a, notaLibre: e.target.value }))}
            placeholder="Especifica el accesorio entregado..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        ) : (
          <>
            {config.accesorios.simples.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.accesorios.simples.map(label => (
                  <Chip key={label} active={acc.simples.includes(label)} onClick={() => toggleAccSimple(label)}>{label}</Chip>
                ))}
              </div>
            )}

            {config.accesorios.sim && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 font-medium">Quedan siempre registrados (con o sin):</p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={acc.bandejaSim} onClick={() => onAccChange(a => ({ ...a, bandejaSim: !a.bandejaSim }))}>
                    {acc.bandejaSim ? '✓ Bandeja de SIM' : 'Sin Bandeja de SIM'}
                  </Chip>
                  <Chip active={acc.sim} onClick={() => onAccChange(a => ({ ...a, sim: !a.sim }))}>
                    {acc.sim ? '✓ SIM card' : 'Sin SIM card'}
                  </Chip>
                </div>
                {acc.sim && (
                  <div className="ml-2 pl-3 border-l-2 border-blue-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 font-medium">¿Cuántas SIM?</span>
                      {([1, 2] as const).map(n => (
                        <Chip key={n} active={acc.simCantidad === n} onClick={() => onAccChange(a => ({ ...a, simCantidad: n }))}>{n}</Chip>
                      ))}
                    </div>
                    <datalist id="carriers-list">
                      {savedCarriers.map(c => <option key={c} value={c} />)}
                      {CARRIERS_SUGERIDOS.filter(c => !savedCarriers.includes(c)).map(c => <option key={c} value={c} />)}
                    </datalist>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">SIM 1 — Operadora</Label>
                        <input list="carriers-list" value={acc.sim1Carrier}
                          onChange={e => onAccChange(a => ({ ...a, sim1Carrier: e.target.value }))}
                          onBlur={e => saveCarrier(e.target.value)}
                          placeholder="Ej: Entel, Claro..."
                          className="w-full h-8 border rounded-lg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 mt-1" />
                      </div>
                      {acc.simCantidad === 2 && (
                        <div>
                          <Label className="text-xs">SIM 2 — Operadora</Label>
                          <input list="carriers-list" value={acc.sim2Carrier}
                            onChange={e => onAccChange(a => ({ ...a, sim2Carrier: e.target.value }))}
                            onBlur={e => saveCarrier(e.target.value)}
                            placeholder="Ej: Movistar, WOM..."
                            className="w-full h-8 border rounded-lg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 mt-1" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {config.accesorios.microsdLabel && (
              <div className="flex items-center gap-2">
                <Chip active={acc.microsd} onClick={() => onAccChange(a => ({ ...a, microsd: !a.microsd, microsdTamano: a.microsd ? '' : a.microsdTamano }))}>
                  {config.accesorios.microsdLabel}
                </Chip>
              </div>
            )}
            {config.accesorios.microsdLabel && acc.microsd && (
              <div className="ml-2 pl-3 border-l-2 border-blue-200 space-y-1">
                <p className="text-xs text-gray-600 font-medium">Tamaño</p>
                <div className="flex flex-wrap gap-1.5">
                  {MICROSD_SIZES.map(size => (
                    <Chip key={size} active={acc.microsdTamano === size} onClick={() => onAccChange(a => ({ ...a, microsdTamano: a.microsdTamano === size ? '' : size }))}>{size}</Chip>
                  ))}
                </div>
              </div>
            )}

            {config.accesorios.mandoCantidad && (
              <div className="flex items-center gap-2">
                <Chip active={acc.mandoCantidad > 0} onClick={() => onAccChange(a => ({ ...a, mandoCantidad: a.mandoCantidad > 0 ? 0 : 1 }))}>
                  🎮 Mando
                </Chip>
                {acc.mandoCantidad > 0 && (
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-2 py-1">
                    <button type="button" onClick={() => onAccChange(a => ({ ...a, mandoCantidad: Math.max(1, a.mandoCantidad - 1) }))}
                      className="w-5 h-5 rounded-full bg-white border border-blue-300 flex items-center justify-center text-xs font-bold text-blue-700">−</button>
                    <span className="text-xs font-semibold text-blue-700 w-4 text-center">{acc.mandoCantidad}</span>
                    <button type="button" onClick={() => onAccChange(a => ({ ...a, mandoCantidad: a.mandoCantidad + 1 }))}
                      className="w-5 h-5 rounded-full bg-white border border-blue-300 flex items-center justify-center text-xs font-bold text-blue-700">+</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Condición visual y física */}
      <div className="space-y-3">
        <Label>Condición visual y física</Label>
        <div className="space-y-2">

          <div className="flex flex-wrap gap-2">
            <Chip active={cond.equipoApagado} onClick={() => onCondChange(c => ({ ...c, equipoApagado: !c.equipoApagado }))} activeClass="bg-gray-700 text-white border-gray-700">
              📵 Equipo apagado
            </Chip>
            <Chip active={cond.sinDanos} onClick={() => onCondChange(c => ({ ...c, sinDanos: !c.sinDanos }))} activeClass="bg-green-600 text-white border-green-600">
              ✓ Sin daños visibles
            </Chip>
          </div>

          {config.condicion.cargaPuerto && (
            <div className="space-y-1.5">
              <div className="flex gap-1.5 flex-wrap">
                <Chip active={cond.carga !== ''} onClick={() => onCondChange(c => ({ ...c, carga: c.carga !== '' ? '' : 'si' }))}>
                  🔋 Carga
                </Chip>
              </div>
              {cond.carga !== '' && (
                <div className="ml-2 pl-3 border-l-2 border-blue-200 space-y-2">
                  <div className="flex gap-1.5">
                    {(['si', 'no_carga'] as const).map(v => (
                      <Chip key={v} active={cond.carga === v} onClick={() => onCondChange(c => ({ ...c, carga: v }))}>
                        {v === 'si' ? 'Sí carga' : 'No carga'}
                      </Chip>
                    ))}
                  </div>
                  {cond.carga === 'si' && (
                    <div className="flex gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Voltios (V)</label>
                        <input value={cond.cargaVoltios} onChange={e => onCondChange(c => ({ ...c, cargaVoltios: e.target.value }))}
                          placeholder="ej: 5" className="w-20 h-7 border rounded px-2 text-xs block mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Amperaje (A)</label>
                        <input value={cond.cargaAmperaje} onChange={e => onCondChange(c => ({ ...c, cargaAmperaje: e.target.value }))}
                          placeholder="ej: 2.4" className="w-20 h-7 border rounded px-2 text-xs block mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {config.condicion.simples.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {config.condicion.simples.map(label => (
                <Chip key={label} active={cond.simples.includes(label)} onClick={() => toggleCondSimple(label)} activeClass="bg-orange-500 text-white border-orange-500">
                  {label}
                </Chip>
              ))}
            </div>
          )}

          {(['rayones', 'golpes'] as const).map(campo => (
            <div key={campo} className="space-y-1.5">
              {config.condicion.areasRayones.length > 0 ? (
                <>
                  <button type="button"
                    onClick={() => onCondChange(c => ({ ...c, [campo]: c[campo].length > 0 ? [] : [config.condicion.areasRayones[0]] }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${cond[campo].length > 0 ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}>
                    {campo === 'rayones' ? 'Rayones' : 'Golpes'}{cond[campo].length > 0 && ` (${cond[campo].length})`}
                  </button>
                  {cond[campo].length > 0 && (
                    <div className="ml-2 flex flex-wrap gap-1.5 pl-3 border-l-2 border-orange-200">
                      {config.condicion.areasRayones.map(area => (
                        <Chip key={area} active={cond[campo].includes(area)} onClick={() => toggleArea(campo, area)} activeClass="bg-orange-500 text-white border-orange-500">{area}</Chip>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Chip active={cond[campo].includes(AREA_GENERICA)} onClick={() => toggleGenerico(campo)} activeClass="bg-orange-500 text-white border-orange-500">
                  {campo === 'rayones' ? 'Rayones' : 'Golpes'}
                </Chip>
              )}
            </div>
          ))}

          {(['humedad', 'quemaduras'] as const).map(campo => (
            <div key={campo} className="space-y-1.5">
              {config.condicion.areasHumedad.length > 0 ? (
                <>
                  <button type="button"
                    onClick={() => onCondChange(c => ({ ...c, [campo]: c[campo].length > 0 ? [] : [config.condicion.areasHumedad[0]] }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${cond[campo].length > 0 ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}>
                    {campo === 'humedad' ? '💧 Humedad' : '🔥 Quemaduras'}{cond[campo].length > 0 && ` (${cond[campo].length})`}
                  </button>
                  {cond[campo].length > 0 && (
                    <div className="ml-2 flex flex-wrap gap-1.5 pl-3 border-l-2 border-red-200">
                      {config.condicion.areasHumedad.map(area => (
                        <Chip key={area} active={cond[campo].includes(area)} onClick={() => toggleArea(campo, area)} activeClass="bg-red-500 text-white border-red-500">{area}</Chip>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Chip active={cond[campo].includes(AREA_GENERICA)} onClick={() => toggleGenerico(campo)} activeClass="bg-red-500 text-white border-red-500">
                  {campo === 'humedad' ? '💧 Humedad' : '🔥 Quemaduras'}
                </Chip>
              )}
            </div>
          ))}

        </div>
      </div>
    </div>
  )
}
