'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MODULOS, tieneAccesoModulo } from '@/lib/modulos'
import { UserProfile } from '@/types'

const SHORT_LABEL: Record<string, string> = {
  dashboard:    'Inicio',
  clientes:     'Clientes',
  reparaciones: 'Taller',
  inventario:   'Stock',
  caja:         'Caja',
  compras:      'Compras',
  usuarios:     'Usuarios',
  informes:     'Informes',
  configuracion:'Config',
}

// Módulos que siempre van en la barra inferior (los más usados)
const BARRA_KEYS = ['dashboard', 'reparaciones', 'caja', 'inventario']

export default function MobileNav({ user }: { user: UserProfile | null }) {
  const pathname = usePathname()
  const roleName = user?.roles?.nombre ?? ''
  const [drawerOpen, setDrawerOpen] = useState(false)

  const visibles = MODULOS.filter(m =>
    tieneAccesoModulo(m.key, roleName, user?.permisos_modulos ?? null)
  )

  // Barra inferior: módulos prioritarios que el usuario puede ver
  const barraItems = visibles.filter(m => BARRA_KEYS.includes(m.key))
  // Drawer: todos los módulos que NO están en la barra
  const drawerItems = visibles.filter(m => !BARRA_KEYS.includes(m.key))

  // Si algún módulo del drawer está activo, destacar el botón "Más"
  const drawerActivo = drawerItems.some(m =>
    pathname === m.href || (m.href !== '/dashboard' && pathname.startsWith(m.href))
  )

  return (
    <>
      {/* ── Drawer "Más" ───────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Fondo semitransparente */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Panel */}
          <div
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Tirador */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <p className="font-semibold text-gray-800 text-sm">Todos los módulos</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-lg"
              >✕</button>
            </div>

            {/* Grid de módulos */}
            <div className="p-4 grid grid-cols-3 gap-3">
              {drawerItems.map(item => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 py-4 px-2 rounded-xl border transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                    )}
                  >
                    <span className="text-2xl leading-none">{item.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight">
                      {SHORT_LABEL[item.key] ?? item.label}
                    </span>
                  </Link>
                )
              })}
            </div>

            {/* Separador y accesos rápidos dentro de Compras */}
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 px-1">Accesos rápidos</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/compras/orden/nueva"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium hover:bg-amber-100"
                >
                  <span className="text-base">📋</span>
                  Nueva orden de compra
                </Link>
                <Link
                  href="/compras"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-medium hover:bg-blue-100"
                >
                  <span className="text-base">🏭</span>
                  Ver compras
                </Link>
                <Link
                  href="/informes?tab=rentabilidad"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-medium hover:bg-green-100"
                >
                  <span className="text-base">📈</span>
                  Informes
                </Link>
                <Link
                  href="/caja/venta-directa"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-700 text-xs font-medium hover:bg-purple-100"
                >
                  <span className="text-base">🛒</span>
                  Venta directa
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra inferior ─────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-blue-900 border-t border-blue-800">
        <div className="flex items-stretch h-16">
          {barraItems.map(item => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                  isActive ? 'text-white bg-blue-700' : 'text-blue-300 hover:text-white'
                )}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium leading-tight">
                  {SHORT_LABEL[item.key] ?? item.label}
                </span>
              </Link>
            )
          })}

          {/* Botón "Más" */}
          {drawerItems.length > 0 && (
            <button
              onClick={() => setDrawerOpen(v => !v)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                (drawerOpen || drawerActivo) ? 'text-white bg-blue-700' : 'text-blue-300 hover:text-white'
              )}
            >
              {/* 3 puntos animados cuando hay módulo activo en el drawer */}
              <span className="text-xl leading-none relative">
                •••
                {drawerActivo && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full" />
                )}
              </span>
              <span className="text-[10px] font-medium leading-tight">Más</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
