'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

const TABS = [
  { key: 'ventas',       label: '💰 Ventas',       title: 'Ventas y Facturación' },
  { key: 'taller',       label: '🔧 Taller',       title: 'Servicio Técnico' },
  { key: 'inventario',   label: '📦 Inventario',   title: 'Inventario y Stock' },
  { key: 'rentabilidad', label: '📈 Rentabilidad', title: 'Análisis de Rentabilidad' },
  { key: 'servicios',    label: '🔩 Servicios',    title: 'Análisis de Servicios' },
  { key: 'auditoria',    label: '🔍 Auditoría',    title: 'Log de Usuarios' },
]

interface Props {
  currentTab: string
  desde: string
  hasta: string
}

export default function FiltroFechas({ currentTab, desde, hasta }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function navigate(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => params.set(k, v))
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function handleTab(tab: string) { navigate({ tab }) }
  function handleDesde(v: string) { navigate({ desde: v }) }
  function handleHasta(v: string) { navigate({ hasta: v }) }

  function setRango(dias: number) {
    const h = new Date()
    const d = new Date()
    d.setDate(d.getDate() - dias)
    navigate({
      desde: d.toISOString().split('T')[0],
      hasta: h.toISOString().split('T')[0],
    })
  }

  const currentTabLabel = TABS.find(t => t.key === currentTab)?.title ?? 'Informes'

  return (
    <div className="space-y-3">
      {/* Tabs de módulos */}
      <div className="flex gap-1 flex-wrap bg-gray-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentTab === tab.key
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros de fecha */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">{currentTabLabel}</span>
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Rangos rápidos */}
          {[
            { label: 'Hoy', dias: 0 },
            { label: '7 días', dias: 7 },
            { label: '30 días', dias: 30 },
            { label: '90 días', dias: 90 },
          ].map(({ label, dias }) => (
            <button
              key={label}
              onClick={() => setRango(dias)}
              className="px-2 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {label}
            </button>
          ))}
          <span className="text-gray-300 text-xs">|</span>
          <input
            type="date"
            value={desde}
            onChange={e => handleDesde(e.target.value)}
            className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-gray-400 text-xs">→</span>
          <input
            type="date"
            value={hasta}
            onChange={e => handleHasta(e.target.value)}
            className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
    </div>
  )
}
