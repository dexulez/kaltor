'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MODULOS, MENU_GROUPS, ModuloKey, ModuloNegocio, tieneAccesoModulo } from '@/lib/modulos'
import { UserProfile } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const ROL_LABEL: Record<string, string> = {
  administrador:     'Administrador',
  tecnico:           'Técnico',
  vendedor:          'Vendedor',
  supervisor_ventas: 'Supervisor Ventas',
}

const SHORT_LABEL: Record<string, string> = {
  dashboard:    'Inicio',
  clientes:     'Clientes',
  reparaciones: 'Taller',
  inventario:   'Stock',
  caja:         'Caja',
  compras:      'Compras',
  usuarios:     'Usuarios',
  informes:     'Informes',
  servicios:    'Servicios',
  manuales:     'Manuales',
  configuracion:'General',
  catalogo_b2b: 'Catálogo',
  pedidos_b2b:  'Pedidos',
  contabilidad: 'Contab.',
  notificaciones: 'Avisos',
}

// Módulos que siempre van en la barra inferior (los más usados)
const BARRA_KEYS = ['dashboard', 'reparaciones', 'caja', 'inventario']


const ALERTA_POR_HREF: Record<string, keyof Alertas> = {
  '/compras': 'compras',
  '/pedidos-b2b': 'pedidosB2B',
}

interface Alertas { compras: number; pedidosB2B: number }

export default function MobileNav({ user, alertas, modulosDelPlan }: { user: UserProfile | null; alertas?: Alertas; modulosDelPlan?: Set<ModuloNegocio> | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const rolesRaw = user?.roles as unknown as { nombre?: string } | { nombre?: string }[] | null
  const roleName = ((Array.isArray(rolesRaw) ? rolesRaw[0]?.nombre : rolesRaw?.nombre) ?? '').toLowerCase()
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/login')
    router.refresh()
  }

  const visibles = MODULOS.filter(m => {
    if (!tieneAccesoModulo(m.key, roleName, user?.permisos_modulos ?? null)) return false
    if (roleName !== 'administrador' && modulosDelPlan && m.modulo !== null && !modulosDelPlan.has(m.modulo as ModuloNegocio)) return false
    return true
  })

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

            {/* Grid de módulos, agrupado por categoría */}
            <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
              {(() => {
                const drawerKeys = new Set(drawerItems.map(m => m.key))
                const gruposConItems = MENU_GROUPS
                  .filter(grupo => !grupo.standalone)
                  .map(grupo => ({
                    grupo,
                    items: grupo.modulos.filter((k): k is ModuloKey => drawerKeys.has(k)).map(k => drawerItems.find(m => m.key === k)!),
                  }))
                  .filter(g => g.items.length > 0)
                const keysAgrupadas = new Set(gruposConItems.flatMap(g => g.items.map(i => i.key)))
                const sueltos = drawerItems.filter(m => !keysAgrupadas.has(m.key))

                function renderItem(item: typeof drawerItems[number]) {
                  const isActive = pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  const alertaKey = ALERTA_POR_HREF[item.href]
                  const cantidadAlerta = alertaKey ? (alertas?.[alertaKey] ?? 0) : 0
                  const mostrarBadge = !isActive && cantidadAlerta > 0
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 py-4 px-2 rounded-xl border transition-colors',
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                      )}
                    >
                      {mostrarBadge && (
                        <span className="absolute top-2 left-2 bg-orange-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                          {cantidadAlerta > 9 ? '9+' : cantidadAlerta}
                        </span>
                      )}
                      <span className="text-2xl leading-none">{item.icon}</span>
                      <span className="text-xs font-medium text-center leading-tight">
                        {SHORT_LABEL[item.key] ?? item.label}
                      </span>
                    </Link>
                  )
                }

                return (
                  <>
                    {gruposConItems.map(({ grupo, items }) => (
                      <div key={grupo.key}>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 px-1">{grupo.icon} {grupo.label}</p>
                        <div className="grid grid-cols-3 gap-3">
                          {items.map(renderItem)}
                        </div>
                      </div>
                    ))}
                    {sueltos.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 px-1">Otros</p>
                        <div className="grid grid-cols-3 gap-3">
                          {sueltos.map(renderItem)}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Accesos rápidos */}
            <div className="px-4 pb-2">
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

            {/* Info usuario + Cerrar sesión */}
            <div className="px-4 pb-5 pt-2 border-t mx-4 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                    {user?.nombre_completo?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.nombre_completo ?? 'Usuario'}</p>
                    <p className="text-xs text-gray-400">{ROL_LABEL[roleName] ?? roleName}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold hover:bg-red-100 active:bg-red-200 transition-colors"
                >
                  <span>🚪</span>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra inferior ─────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-1px_4px_rgba(0,0,0,0.06)]">
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
                  isActive ? 'text-[#FF7A1A]' : 'text-gray-400 hover:text-gray-700'
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
                (drawerOpen || drawerActivo) ? 'text-[#FF7A1A]' : 'text-gray-400 hover:text-gray-700'
              )}
            >
              <span className="text-xl leading-none relative">
                •••
                {drawerActivo && (
                  <span className="absolute -top-1 -left-1 w-2 h-2 bg-orange-400 rounded-full" />
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
