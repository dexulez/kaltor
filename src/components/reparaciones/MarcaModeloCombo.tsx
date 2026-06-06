'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

// ── Listas base ────────────────────────────────────────────────────────────────

export const MARCAS_BASE = [
  'Apple', 'Samsung', 'Xiaomi', 'Redmi', 'POCO', 'Huawei', 'Honor',
  'Motorola', 'LG', 'Sony', 'Nokia', 'OnePlus', 'OPPO', 'Realme', 'Vivo',
  'Tecno', 'Infinix', 'Asus', 'HTC', 'ZTE', 'TCL', 'Alcatel', 'Lenovo',
  'Google', 'Nothing', 'BLU', 'BlackBerry', 'Wiko', 'Meizu', 'Coolpad',
  'iPad', 'Tablet Samsung', 'Tablet Lenovo', 'Tablet Huawei',
]

export const MODELOS_BASE: Record<string, string[]> = {
  Apple: [
    'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus',
    'iPhone 7', 'iPhone 7 Plus', 'iPhone 8', 'iPhone 8 Plus',
    'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
    'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
    'iPhone 12', 'iPhone 12 Mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
    'iPhone 13', 'iPhone 13 Mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
    'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
    'iPhone SE (2020)', 'iPhone SE (2022)',
    'iPad Air', 'iPad Mini', 'iPad Pro 11"', 'iPad Pro 12.9"', 'iPad 9', 'iPad 10',
  ],
  Samsung: [
    'Galaxy A03', 'Galaxy A03s', 'Galaxy A04', 'Galaxy A04s', 'Galaxy A04e',
    'Galaxy A10', 'Galaxy A10s', 'Galaxy A12', 'Galaxy A13', 'Galaxy A13 5G',
    'Galaxy A14', 'Galaxy A14 5G', 'Galaxy A15', 'Galaxy A20', 'Galaxy A20s',
    'Galaxy A21s', 'Galaxy A22', 'Galaxy A22 5G', 'Galaxy A23', 'Galaxy A23 5G',
    'Galaxy A30s', 'Galaxy A31', 'Galaxy A32', 'Galaxy A33 5G', 'Galaxy A34 5G',
    'Galaxy A50', 'Galaxy A50s', 'Galaxy A51', 'Galaxy A52', 'Galaxy A52s',
    'Galaxy A53 5G', 'Galaxy A54 5G', 'Galaxy A70', 'Galaxy A71', 'Galaxy A72',
    'Galaxy A73 5G', 'Galaxy A05', 'Galaxy A05s', 'Galaxy A25 5G', 'Galaxy A35',
    'Galaxy S20', 'Galaxy S20+', 'Galaxy S20 Ultra',
    'Galaxy S21', 'Galaxy S21+', 'Galaxy S21 Ultra',
    'Galaxy S22', 'Galaxy S22+', 'Galaxy S22 Ultra',
    'Galaxy S23', 'Galaxy S23+', 'Galaxy S23 Ultra',
    'Galaxy S24', 'Galaxy S24+', 'Galaxy S24 Ultra',
    'Galaxy Note 9', 'Galaxy Note 10', 'Galaxy Note 10+',
    'Galaxy Note 20', 'Galaxy Note 20 Ultra',
    'Galaxy Tab A7', 'Galaxy Tab A8', 'Galaxy Tab S6 Lite', 'Galaxy Tab S8',
  ],
  Xiaomi: [
    'Redmi 9', 'Redmi 9A', 'Redmi 9C', 'Redmi 9T',
    'Redmi 10', 'Redmi 10A', 'Redmi 10C',
    'Redmi 12', 'Redmi 12C', 'Redmi 12 5G',
    'Redmi Note 8', 'Redmi Note 8 Pro', 'Redmi Note 8T',
    'Redmi Note 9', 'Redmi Note 9 Pro', 'Redmi Note 9s',
    'Redmi Note 10', 'Redmi Note 10 Pro', 'Redmi Note 10s',
    'Redmi Note 11', 'Redmi Note 11 Pro', 'Redmi Note 11s',
    'Redmi Note 12', 'Redmi Note 12 Pro', 'Redmi Note 12s',
    'Redmi Note 13', 'Redmi Note 13 Pro', 'Redmi Note 13 Pro+',
    'POCO M3', 'POCO M4 Pro', 'POCO M5', 'POCO M5s', 'POCO M6 Pro',
    'POCO X3', 'POCO X3 Pro', 'POCO X4 Pro', 'POCO X5', 'POCO X5 Pro',
    'Mi 10', 'Mi 11', 'Mi 11 Lite', 'Mi 11T', 'Mi 12', 'Mi 13',
    'Xiaomi 11T Pro', 'Xiaomi 12T', 'Xiaomi 13T',
  ],
  Redmi: [
    'Redmi 9', 'Redmi 9A', 'Redmi 9C', 'Redmi 10', 'Redmi 10C',
    'Redmi 12', 'Redmi 12C', 'Redmi Note 9', 'Redmi Note 10', 'Redmi Note 11',
    'Redmi Note 12', 'Redmi Note 13',
  ],
  Huawei: [
    'P8 Lite', 'P9 Lite', 'P10 Lite', 'P20 Lite', 'P30 Lite', 'P40 Lite',
    'P30', 'P30 Pro', 'P40', 'P40 Pro', 'P50', 'P50 Pro',
    'Nova 3i', 'Nova 5T', 'Nova 7i', 'Nova 7 SE', 'Nova 8', 'Nova 9',
    'Y5', 'Y6', 'Y7', 'Y6p', 'Y7p', 'Y8p', 'Y9a', 'Y9s',
    'Mate 20', 'Mate 20 Pro', 'Mate 30 Pro', 'Mate 40 Pro',
  ],
  Honor: [
    'Honor 8X', 'Honor 9A', 'Honor 9X', 'Honor 10', 'Honor 10 Lite',
    'Honor 20', 'Honor 50', 'Honor 70', 'Honor X5', 'Honor X6', 'Honor X8',
    'Honor Magic 4', 'Honor Magic 5',
  ],
  Motorola: [
    'Moto E6 Plus', 'Moto E7', 'Moto E7 Plus', 'Moto E7i', 'Moto E7 Power',
    'Moto E20', 'Moto E30', 'Moto E40', 'Moto E32',
    'Moto G8', 'Moto G8 Power', 'Moto G9', 'Moto G9 Play', 'Moto G9 Plus',
    'Moto G10', 'Moto G20', 'Moto G30', 'Moto G40', 'Moto G50',
    'Moto G51', 'Moto G52', 'Moto G53', 'Moto G54', 'Moto G60', 'Moto G71',
    'Moto G73', 'Moto G82', 'Moto G84', 'Moto G85',
    'Moto Edge 20', 'Moto Edge 30', 'Moto Edge 40',
    'Moto One Action', 'Moto One Vision',
  ],
  LG: [
    'LG K10', 'LG K20', 'LG K40', 'LG K41S', 'LG K42', 'LG K51S', 'LG K52', 'LG K61',
    'LG Q51', 'LG Q60', 'LG G6', 'LG G7', 'LG G8',
    'LG V40', 'LG V50', 'LG Velvet', 'LG Wing',
  ],
  Sony: [
    'Xperia 1', 'Xperia 1 II', 'Xperia 1 III', 'Xperia 1 IV', 'Xperia 1 V',
    'Xperia 5', 'Xperia 5 II', 'Xperia 5 III', 'Xperia 5 IV',
    'Xperia 10', 'Xperia 10 II', 'Xperia 10 III', 'Xperia 10 IV', 'Xperia 10 V',
    'Xperia XA2', 'Xperia L4',
  ],
  Nokia: [
    'Nokia 1.3', 'Nokia 2.3', 'Nokia 2.4', 'Nokia 3.2', 'Nokia 3.4',
    'Nokia 5.3', 'Nokia 5.4', 'Nokia 6.2', 'Nokia 7.2', 'Nokia 7.3',
    'Nokia G10', 'Nokia G20', 'Nokia G21', 'Nokia G11', 'Nokia C20',
    'Nokia X10', 'Nokia X20', 'Nokia X30',
  ],
  OnePlus: [
    'OnePlus 7', 'OnePlus 7 Pro', 'OnePlus 7T', 'OnePlus 8', 'OnePlus 8 Pro',
    'OnePlus 8T', 'OnePlus 9', 'OnePlus 9 Pro', 'OnePlus 9R', 'OnePlus 10 Pro',
    'OnePlus 10T', 'OnePlus 11', 'OnePlus Nord', 'OnePlus Nord CE', 'OnePlus Nord 2',
    'OnePlus Nord CE 2', 'OnePlus Nord CE 3',
  ],
  OPPO: [
    'OPPO A5', 'OPPO A9', 'OPPO A12', 'OPPO A15', 'OPPO A16', 'OPPO A17',
    'OPPO A31', 'OPPO A52', 'OPPO A53', 'OPPO A54', 'OPPO A55', 'OPPO A57',
    'OPPO A72', 'OPPO A74', 'OPPO A76', 'OPPO A77', 'OPPO A78',
    'OPPO Find X3', 'OPPO Find X5', 'OPPO Reno 4', 'OPPO Reno 5', 'OPPO Reno 6',
    'OPPO Reno 7', 'OPPO Reno 8',
  ],
  Realme: [
    'Realme C11', 'Realme C15', 'Realme C21', 'Realme C25', 'Realme C31', 'Realme C33',
    'Realme C35', 'Realme C51', 'Realme C53', 'Realme C55',
    'Realme 5', 'Realme 6', 'Realme 7', 'Realme 8', 'Realme 9', 'Realme 10', 'Realme 11',
    'Realme GT', 'Realme GT 2', 'Realme Narzo 50', 'Realme Narzo 30',
  ],
  Vivo: [
    'Vivo Y01', 'Vivo Y12', 'Vivo Y15', 'Vivo Y20', 'Vivo Y21', 'Vivo Y22',
    'Vivo Y30', 'Vivo Y33s', 'Vivo Y35', 'Vivo Y51', 'Vivo Y52', 'Vivo Y55',
    'Vivo V20', 'Vivo V21', 'Vivo V23', 'Vivo X60', 'Vivo X70', 'Vivo X80',
  ],
  Tecno: [
    'Tecno Spark 6', 'Tecno Spark 7', 'Tecno Spark 8', 'Tecno Spark 9', 'Tecno Spark 10',
    'Tecno Camon 16', 'Tecno Camon 17', 'Tecno Camon 18', 'Tecno Camon 19',
    'Tecno Pop 5', 'Tecno Pop 6', 'Tecno Pop 7',
    'Tecno Pova 3', 'Tecno Pova 4', 'Tecno Pova 5',
  ],
  Infinix: [
    'Infinix Hot 10', 'Infinix Hot 11', 'Infinix Hot 12', 'Infinix Hot 20',
    'Infinix Note 10', 'Infinix Note 11', 'Infinix Note 12',
    'Infinix Smart 5', 'Infinix Smart 6', 'Infinix Zero 5G',
  ],
  Google: [
    'Pixel 4', 'Pixel 4a', 'Pixel 4 XL', 'Pixel 5', 'Pixel 5a',
    'Pixel 6', 'Pixel 6 Pro', 'Pixel 6a', 'Pixel 7', 'Pixel 7 Pro',
    'Pixel 7a', 'Pixel 8', 'Pixel 8 Pro', 'Pixel 8a',
  ],
  Asus: [
    'ZenFone 7', 'ZenFone 8', 'ZenFone 9', 'ZenFone 10',
    'ROG Phone 5', 'ROG Phone 6', 'ROG Phone 7',
  ],
}

const LS_MARCAS = 'tr_custom_brands'
const LS_MODELOS = 'tr_custom_models'

function loadCustom<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? '') ?? fallback } catch { return fallback }
}
function saveCustom(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* ignore */ }
}

// ── Componente MarcaSelector ──────────────────────────────────────────────────

export function MarcaSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [extraMarcas, setExtraMarcas] = useState<string[]>([])
  const [showInput, setShowInput] = useState(false)
  const [nuevaMarca, setNuevaMarca] = useState('')
  const [open, setOpen] = useState(false)
  const [busq, setBusq] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setExtraMarcas(loadCustom<string[]>(LS_MARCAS, []))
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const todasMarcas = [...new Set([...MARCAS_BASE, ...extraMarcas])].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  const filtradas = busq.trim()
    ? todasMarcas.filter(m => m.toLowerCase().includes(busq.toLowerCase()))
    : todasMarcas

  function seleccionar(marca: string) {
    if (marca === '__otro__') {
      setNuevaMarca(busq.trim())   // pre-rellena con lo que escribió
      setShowInput(true)
      setOpen(false)
      return
    }
    onChange(marca)
    setBusq('')
    setOpen(false)
    setShowInput(false)
  }

  function guardarNueva() {
    const limpia = nuevaMarca.trim()
    if (!limpia) return
    if (!extraMarcas.includes(limpia)) {
      const nuevas = [...extraMarcas, limpia].sort()
      setExtraMarcas(nuevas)
      saveCustom(LS_MARCAS, nuevas)
    }
    onChange(limpia)
    setNuevaMarca('')
    setShowInput(false)
    toast.success(`Marca "${limpia}" guardada para futuras OTs`)
  }

  if (showInput) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={nuevaMarca}
          onChange={e => setNuevaMarca(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardarNueva() } }}
          onBlur={() => { if (nuevaMarca.trim()) guardarNueva() }}
          placeholder="Nombre de la marca..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button type="button" onClick={guardarNueva}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          ✓
        </button>
        <button type="button" onClick={() => { setShowInput(false); setNuevaMarca('') }}
          className="px-3 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50">
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-left"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || 'Seleccionar marca...'}</span>
        <span className="text-gray-400 text-xs ml-2">▼</span>
      </button>
      {open && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={busq}
              onChange={e => setBusq(e.target.value)}
              placeholder="Buscar marca..."
              className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtradas.map(m => (
              <button key={m} type="button" onClick={() => seleccionar(m)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${value === m ? 'bg-blue-100 font-semibold text-blue-800' : 'text-gray-700'}`}>
                {m}
                {extraMarcas.includes(m) && <span className="ml-2 text-xs text-amber-500">★</span>}
              </button>
            ))}
            <button type="button" onClick={() => seleccionar('__otro__')}
              className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t font-medium">
              + Agregar nueva marca...
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente ModeloSelector ─────────────────────────────────────────────────

export function ModeloSelector({ marca, value, onChange }: { marca: string; value: string; onChange: (v: string) => void }) {
  const [extraModelos, setExtraModelos] = useState<Record<string, string[]>>({})
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setExtraModelos(loadCustom<Record<string, string[]>>(LS_MODELOS, {}))
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const baseParaMarca = MODELOS_BASE[marca] ?? []
  const extraParaMarca = extraModelos[marca] ?? []
  const todosModelos = [...new Set([...baseParaMarca, ...extraParaMarca])].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  const filtrados = value.trim()
    ? todosModelos.filter(m => m.toLowerCase().includes(value.toLowerCase()))
    : todosModelos

  function guardarModelo() {
    const limpio = value.trim()
    if (!limpio || todosModelos.includes(limpio)) return
    const nuevos = { ...extraModelos, [marca]: [...(extraModelos[marca] ?? []), limpio] }
    setExtraModelos(nuevos)
    saveCustom(LS_MODELOS, nuevos)
    toast.success(`Modelo "${limpio}" guardado para ${marca}`)
    setOpen(false)
  }

  const esNuevo = value.trim() && !todosModelos.includes(value.trim())

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (esNuevo) guardarModelo() } }}
          placeholder={marca ? `Modelo de ${marca}...` : 'Escribe el modelo...'}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8"
        />
        {value && (
          <button type="button" onClick={() => { onChange(''); setOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
        )}
      </div>
      {open && (filtrados.length > 0 || esNuevo) && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtrados.slice(0, 20).map(m => (
              <button key={m} type="button"
                onClick={() => { onChange(m); setOpen(false) }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${value === m ? 'bg-blue-100 font-semibold text-blue-800' : 'text-gray-700'}`}>
                {m}
                {(extraModelos[marca] ?? []).includes(m) && <span className="ml-2 text-xs text-amber-500">★</span>}
              </button>
            ))}
            {esNuevo && (
              <button type="button" onClick={guardarModelo}
                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t font-medium">
                ✚ Guardar &quot;{value.trim()}&quot; como modelo de {marca || 'este equipo'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

