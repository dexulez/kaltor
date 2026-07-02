'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { UserProfile } from '@/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import { MODULOS, MENU_GROUPS, ModuloKey, tieneAccesoModulo } from '@/lib/modulos'
import NotificacionesBell from '@/components/layout/NotificacionesBell'

const ROL_LABEL: Record<string, string> = {
  administrador:     'Administrador',
  tecnico:           'Técnico',
  vendedor:          'Vendedor',
  supervisor_ventas: 'Supervisor Ventas',
  comprador_externo: 'Comprador externo',
}

interface Alertas { compras: number; pedidosB2B: number }

const ALERTA_POR_HREF: Record<string, keyof Alertas> = {
  '/compras': 'compras',
  '/pedidos-b2b': 'pedidosB2B',
}

// Módulos que siempre se muestran sin importar el plan
const MODULOS_CORE = new Set<string>(['dashboard', 'configuracion', 'notificaciones'])

type Modulo = typeof MODULOS[number]

function esActivo(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
}

function grupoQueContiene(pathname: string): string | null {
  for (const grupo of MENU_GROUPS) {
    const contiene = grupo.modulos.some(key => {
      const item = MODULOS.find(m => m.key === key)
      return item ? esActivo(pathname, item.href) : false
    })
    if (contiene) return grupo.key
  }
  return null
}

export default function AppSidebar({ user, logoUrl, nombreLocal, alertas, modulosDelPlan }: {
  user: UserProfile | null
  logoUrl?: string | null
  nombreLocal?: string
  alertas?: Alertas
  modulosDelPlan?: Set<string> | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const navRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>(() => {
    const inicial = grupoQueContiene(pathname)
    return inicial ? { [inicial]: true } : {}
  })
  const [flyout, setFlyout] = useState<string | null>(null)
  const roleName = user?.roles?.nombre ?? ''

  const visibleItems = MODULOS.filter(m => {
    if (!tieneAccesoModulo(m.key, roleName, user?.permisos_modulos ?? null)) return false
    // El administrador siempre ve todos los módulos que su rol permite
    if (roleName !== 'administrador' && modulosDelPlan && !MODULOS_CORE.has(m.key) && !modulosDelPlan.has(m.key)) return false
    return true
  })
  const visibleKeys = new Set(visibleItems.map(m => m.key))
  const dashboardItem = visibleItems.find(m => m.key === 'dashboard')

  useEffect(() => {
    const activo = grupoQueContiene(pathname)
    if (activo) setGruposAbiertos(prev => prev[activo] ? prev : { ...prev, [activo]: true })
    setFlyout(null)
  }, [pathname])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setFlyout(null)
    }
    if (flyout) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [flyout])

  function alertaDe(item: Modulo) {
    const key = ALERTA_POR_HREF[item.href]
    return key ? (alertas?.[key] ?? 0) : 0
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/login')
    router.refresh()
  }

  const initials = user?.nombre_completo
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U'

  function renderLink(item: Modulo) {
    const isActive = esActivo(pathname, item.href)
    const cantidadAlerta = alertaDe(item)
    const mostrarBadge = !isActive && cantidadAlerta > 0
    return (
      <Link
        href={item.href}
        onClick={() => setFlyout(null)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
          isActive
            ? 'bg-[#FF7A1A]/10 text-[#FF7A1A]'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
      >
        <span className="text-base shrink-0">{item.icon}</span>
        <span className="flex-1 leading-tight">{item.label}</span>
        {mostrarBadge && (
          <span className="bg-orange-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
            {cantidadAlerta > 9 ? '9+' : cantidadAlerta}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside className={cn(
      'hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 shrink-0',
      collapsed ? 'w-16' : 'w-72'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-gray-200',
        collapsed ? 'flex-col gap-2 px-1 py-3' : 'gap-3 px-4 py-4'
      )}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className={cn('object-contain shrink-0', collapsed ? 'h-7 w-7' : 'h-9 max-w-[40px]')} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/kaltor-logo-hex.svg" alt="Kaltor" className={cn('object-contain shrink-0', collapsed ? 'h-7 w-7' : 'h-8 w-8')} />
        )}
        {!collapsed && (
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight truncate text-gray-900">{nombreLocal ?? 'Kaltor'}</p>
            <p className="text-gray-400 text-xs truncate">Gestión de taller</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn('text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1 h-7 w-7 shrink-0', !collapsed && 'ml-auto')}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '→' : '←'}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden" ref={navRef}>
        <ul className="space-y-1 px-2">
          {dashboardItem && <li>{renderLink(dashboardItem)}</li>}

          {MENU_GROUPS.map(grupo => {
            const itemsDelGrupo = grupo.modulos
              .filter((k): k is ModuloKey => visibleKeys.has(k))
              .map(k => visibleItems.find(m => m.key === k)!)
            if (itemsDelGrupo.length === 0) return null

            if (grupo.standalone && itemsDelGrupo.length === 1) {
              return <li key={grupo.key}>{renderLink(itemsDelGrupo[0])}</li>
            }

            const grupoActivo = itemsDelGrupo.some(item => esActivo(pathname, item.href))
            const abierto = !!gruposAbiertos[grupo.key]
            const badgeGrupo = itemsDelGrupo.reduce((s, item) => s + alertaDe(item), 0)
            const mostrarBadgeGrupo = !grupoActivo && badgeGrupo > 0

            return (
              <li key={grupo.key} className="relative">
                <button
                  type="button"
                  title={collapsed ? grupo.label : undefined}
                  onClick={() => {
                    if (collapsed) { setFlyout(f => f === grupo.key ? null : grupo.key); return }
                    setGruposAbiertos(prev => ({ ...prev, [grupo.key]: !prev[grupo.key] }))
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    grupoActivo ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <span className="text-lg shrink-0 relative">
                    {grupo.icon}
                    {collapsed && mostrarBadgeGrupo && (
                      <span className="absolute -top-1 -left-1 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold animate-pulse"
                        style={{ fontSize: '9px', lineHeight: '1' }}>
                        {badgeGrupo > 9 ? '9+' : badgeGrupo}
                      </span>
                    )}
                  </span>
                  {!collapsed && <span className="flex-1 text-left leading-tight">{grupo.label}</span>}
                  {!collapsed && mostrarBadgeGrupo && (
                    <span className="bg-orange-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                      {badgeGrupo > 9 ? '9+' : badgeGrupo}
                    </span>
                  )}
                  {!collapsed && (
                    <span className={cn('text-xs text-gray-400 transition-transform shrink-0', abierto && 'rotate-90')}>▸</span>
                  )}
                </button>

                {/* Expandido en línea (sidebar ancho) */}
                {!collapsed && abierto && (
                  <ul className="mt-1 ml-4 pl-3 border-l border-gray-200 space-y-0.5">
                    {itemsDelGrupo.map(item => <li key={item.href}>{renderLink(item)}</li>)}
                  </ul>
                )}

                {/* Flyout (sidebar colapsado) */}
                {collapsed && flyout === grupo.key && (
                  <div className="absolute left-full top-0 ml-1 z-[100] bg-white border border-gray-200 rounded-xl shadow-2xl py-2 w-56">
                    <p className="px-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{grupo.label}</p>
                    <ul className="space-y-0.5 px-1">
                      {itemsDelGrupo.map(item => <li key={item.href}>{renderLink(item)}</li>)}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Notificaciones (no disponible para compradores externos) */}
      {roleName !== 'comprador_externo' && (
        <div className="px-2 pb-2 relative">
          <NotificacionesBell collapsed={collapsed} />
        </div>
      )}

      {/* User info */}
      <div className="border-t border-gray-200 p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-[#FF7A1A] text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate text-gray-900">{user?.nombre_completo ?? 'Usuario'}</p>
              <p className="text-xs text-gray-400 truncate">{ROL_LABEL[roleName] ?? roleName}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex gap-1 mt-2">
            <Link href="/perfil" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-xs">
                👤 Perfil
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-xs"
              onClick={handleLogout}
            >
              Salir
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
