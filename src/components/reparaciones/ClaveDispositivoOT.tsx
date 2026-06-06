'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type TipoClave = 'patron' | 'pin' | 'texto'

interface ClaveData {
  tipo: TipoClave
  valor: string
  notas?: string | null
}

interface Props {
  otId: string
  claveInicial?: ClaveData | null
}

const GRID_PX = 192
const CELL_PX = GRID_PX / 3
const DOT_R = 18

function getCenter(idx: number) {
  return {
    x: (idx % 3) * CELL_PX + CELL_PX / 2,
    y: Math.floor(idx / 3) * CELL_PX + CELL_PX / 2,
  }
}

function PatronGrid({
  seq,
  onToggle,
  disabled,
}: {
  seq: number[]
  onToggle: (idx: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex justify-center select-none">
      <div className="relative" style={{ width: GRID_PX, height: GRID_PX }}>
        <svg className="absolute inset-0 pointer-events-none" width={GRID_PX} height={GRID_PX}>
          {seq.slice(0, -1).map((from, i) => {
            const to = seq[i + 1]
            const c1 = getCenter(from)
            const c2 = getCenter(to)
            return (
              <line
                key={`${from}-${to}-${i}`}
                x1={c1.x} y1={c1.y}
                x2={c2.x} y2={c2.y}
                stroke="#0d9488"
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0.7}
              />
            )
          })}
        </svg>
        {Array.from({ length: 9 }, (_, idx) => {
          const posInSeq = seq.indexOf(idx)
          const selected = posInSeq !== -1
          const c = getCenter(idx)
          return (
            <button
              key={idx}
              type="button"
              onClick={() => !disabled && onToggle(idx)}
              disabled={disabled}
              style={{
                position: 'absolute',
                left: c.x - DOT_R,
                top: c.y - DOT_R,
                width: DOT_R * 2,
                height: DOT_R * 2,
              }}
              className={[
                'rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all',
                selected
                  ? 'bg-teal-500 border-teal-600 text-white shadow-md scale-110'
                  : 'bg-white border-gray-300 text-gray-400 hover:border-teal-400 hover:bg-teal-50',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {selected ? posInSeq + 1 : '·'}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PinKeypad({
  pin,
  onPin,
  disabled,
}: {
  pin: string
  onPin: (p: string) => void
  disabled: boolean
}) {
  const press = (k: string) => {
    if (k === '⌫') return onPin(pin.slice(0, -1))
    if (pin.length < 12) onPin(pin + k)
  }
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="space-y-3">
      <div className="flex justify-center items-center gap-2 min-h-8">
        {pin.length === 0 ? (
          <p className="text-gray-400 text-sm">Ingresa el PIN</p>
        ) : (
          pin.split('').map((_, i) => (
            <div key={i} className="w-3 h-3 bg-teal-500 rounded-full" />
          ))
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-[216px] mx-auto">
        {keys.map((key, i) => (
          <button
            key={i}
            type="button"
            onClick={() => key && !disabled && press(key)}
            disabled={disabled || !key}
            className={[
              'h-12 rounded-xl text-lg font-semibold transition-all active:scale-95',
              !key ? 'invisible' : '',
              key === '⌫'
                ? 'text-red-500 bg-red-50 hover:bg-red-100'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800',
              disabled ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ClaveDispositivoOT({ otId, claveInicial }: Props) {
  const [tab, setTab] = useState<TipoClave>(claveInicial?.tipo ?? 'patron')
  const [patron, setPatron] = useState<number[]>(() => {
    if (claveInicial?.tipo === 'patron' && claveInicial.valor) {
      return claveInicial.valor.split('-').map(Number).filter(n => !isNaN(n))
    }
    return []
  })
  const [pin, setPin] = useState(claveInicial?.tipo === 'pin' ? claveInicial.valor : '')
  const [texto, setTexto] = useState(claveInicial?.tipo === 'texto' ? claveInicial.valor : '')
  const [notas, setNotas] = useState(claveInicial?.notas ?? '')
  const [mostrar, setMostrar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [guardado, setGuardado] = useState(!!claveInicial)
  const [editando, setEditando] = useState(!claveInicial)

  const toggleDot = useCallback((idx: number) => {
    setPatron(prev => {
      if (prev.includes(idx)) return prev.slice(0, prev.indexOf(idx))
      return [...prev, idx]
    })
  }, [])

  const getValor = () => {
    if (tab === 'patron') return patron.join('-')
    if (tab === 'pin') return pin
    return texto.trim()
  }

  const esValido = () => {
    if (tab === 'patron') return patron.length >= 4
    if (tab === 'pin') return pin.length >= 4
    return texto.trim().length > 0
  }

  async function guardar() {
    if (!esValido()) {
      toast.error(
        tab === 'patron'
          ? 'El patrón debe tener al menos 4 puntos'
          : tab === 'pin'
          ? 'El PIN debe tener al menos 4 dígitos'
          : 'Ingresa una contraseña o texto'
      )
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/reparaciones/${otId}/clave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: tab, valor: getValor(), notas: notas.trim() || undefined }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Clave guardada correctamente')
      setGuardado(true)
      setEditando(false)
    } catch {
      toast.error('Error al guardar la clave')
    }
    setLoading(false)
  }

  async function borrar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reparaciones/${otId}/clave`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setPatron([])
      setPin('')
      setTexto('')
      setNotas('')
      setGuardado(false)
      setEditando(true)
      toast.success('Clave eliminada')
    } catch {
      toast.error('Error al eliminar la clave')
    }
    setLoading(false)
  }

  const LABELS: Record<TipoClave, string> = {
    patron: '🔷 Patrón',
    pin: '🔢 PIN',
    texto: '🔑 Contraseña',
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-slate-50 border-b px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-slate-800">Clave del dispositivo</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {guardado && !editando
              ? 'Clave registrada para la reparación'
              : 'Registra el PIN, patrón o contraseña para poder reparar el equipo'}
          </p>
        </div>
        <span className="text-2xl">🔐</span>
      </div>

      <div className="p-4">
        {guardado && !editando ? (
          <div className="space-y-2">
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <span className="text-lg mt-0.5">✅</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">{LABELS[tab]} registrado</p>
                {mostrar && (
                  <p className="text-sm font-mono text-green-700 mt-1 break-all">
                    {tab === 'patron'
                      ? `Puntos: ${patron.map(n => n + 1).join(' → ')}`
                      : getValor()}
                  </p>
                )}
                {notas && <p className="text-xs text-green-600 mt-1">📝 {notas}</p>}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0 text-right">
                <button
                  onClick={() => setMostrar(v => !v)}
                  className="text-xs text-green-700 underline whitespace-nowrap"
                >
                  {mostrar ? 'Ocultar' : 'Ver clave'}
                </button>
                <button
                  onClick={() => setEditando(true)}
                  className="text-xs text-blue-600 underline"
                >
                  Editar
                </button>
                <button
                  onClick={borrar}
                  disabled={loading}
                  className="text-xs text-red-500 underline disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['patron', 'pin', 'texto'] as TipoClave[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={[
                    'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
                    tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {LABELS[t]}
                </button>
              ))}
            </div>

            {tab === 'patron' && (
              <div className="space-y-2">
                <PatronGrid seq={patron} onToggle={toggleDot} disabled={loading} />
                {patron.length > 0 && (
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-xs text-gray-500">
                      {patron.length} puntos → {patron.map(n => n + 1).join(' · ')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPatron([])}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
                {patron.length > 0 && patron.length < 4 && (
                  <p className="text-center text-xs text-amber-600">
                    Selecciona al menos 4 puntos ({4 - patron.length} más)
                  </p>
                )}
              </div>
            )}

            {tab === 'pin' && (
              <PinKeypad pin={pin} onPin={setPin} disabled={loading} />
            )}

            {tab === 'texto' && (
              <div className="space-y-2">
                <label className="text-xs text-gray-500 block">Contraseña o texto libre</label>
                <div className="relative">
                  <input
                    type={mostrar ? 'text' : 'password'}
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    placeholder="Contraseña, PIN alfanumérico, etc."
                    disabled={loading}
                    autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-20 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrar(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    {mostrar ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Ej: 2do PIN de respaldo, patrón en funda rota…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <div className="flex gap-2">
              {guardado && (
                <Button
                  variant="outline"
                  onClick={() => setEditando(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              )}
              <Button
                onClick={guardar}
                disabled={loading || !esValido()}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                {loading ? 'Guardando...' : '💾 Guardar clave'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
