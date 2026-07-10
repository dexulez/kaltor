'use client'

import { useState } from 'react'
import { toast } from 'sonner'

const ALL_MODULES = [
  { key: 'ventas',        label: 'Ventas' },
  { key: 'compras',       label: 'Compras' },
  { key: 'productos',     label: 'Inventario' },
  { key: 'servicios',     label: 'Servicios' },
  { key: 'taller',        label: 'Taller' },
  { key: 'informes',      label: 'Informes' },
  { key: 'contabilidad',  label: 'Contabilidad' },
  { key: 'canal_b2b',     label: 'Canal B2B' },
  { key: 'configuracion', label: 'Configuración' },
  { key: 'manuales',      label: 'Manuales' },
  { key: 'conciliaciones',label: 'Conciliaciones' },
  { key: 'trazabilidad',  label: 'Trazabilidad' },
  { key: 'panaderia',     label: 'Panadería y Repostería' },
]

export default function StoreModuleToggles({
  storeId,
  activeModules,
}: {
  storeId: string
  activeModules: string[]
}) {
  const [modules, setModules] = useState<Set<string>>(new Set(activeModules))
  const [busy, setBusy] = useState<string | null>(null)

  async function toggle(key: string) {
    if (busy) return
    setBusy(key)
    const newValue = !modules.has(key)
    try {
      const res = await fetch(`/api/superadmin/stores/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_module', module_key: key, activo: newValue }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Error al actualizar módulo')
        return
      }
      setModules(prev => {
        const next = new Set(prev)
        if (newValue) next.add(key)
        else next.delete(key)
        return next
      })
      toast.success(newValue ? `Módulo activado` : `Módulo desactivado`)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setBusy(null)
    }
  }

  const activeCount = modules.size

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Módulos</h2>
        <span className="text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
          {activeCount} activos
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {ALL_MODULES.map(m => {
          const active = modules.has(m.key)
          const loading = busy === m.key

          return (
            <div key={m.key} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <span className={`text-sm font-medium transition-colors ${active ? 'text-gray-800' : 'text-gray-400'}`}>
                {m.label}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => toggle(m.key)}
                disabled={!!busy}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A] disabled:cursor-wait ${
                  active ? 'bg-[#FF7A1A]' : 'bg-gray-200'
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  active ? 'translate-x-4' : 'translate-x-0'
                } ${loading ? 'opacity-60' : ''}`} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
