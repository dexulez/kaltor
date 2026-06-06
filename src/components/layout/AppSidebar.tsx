'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { UserProfile } from '@/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { MODULOS, tieneAccesoModulo } from '@/lib/modulos'
import NotificacionesBell from '@/components/layout/NotificacionesBell'

const ROL_LABEL: Record<string, string> = {
  administrador:     'Administrador',
  tecnico:           'Técnico',
  vendedor:          'Vendedor',
  supervisor_ventas: 'Supervisor Ventas',
}

export default function AppSidebar({ user, logoUrl, nombreLocal, alertas }: {
  user: UserProfile | null
  logoUrl?: string | null
  nombreLocal?: string
  alertas?: { compras: number }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const roleName = user?.roles?.nombre ?? ''

  const visibleItems = MODULOS.filter(m =>
    tieneAccesoModulo(m.key, roleName, user?.permisos_modulos ?? null)
  )

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

  return (
    <aside className={cn(
      'hidden md:flex flex-col bg-blue-900 text-white transition-all duration-300 shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-blue-800">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className={cn('object-contain shrink-0', collapsed ? 'h-8 w-8' : 'h-9 max-w-[40px]')} />
        ) : (
          <span className="text-2xl shrink-0">🔧</span>
        )}
        {!collapsed && (
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight truncate">{nombreLocal ?? 'TechRepair Pro'}</p>
            <p className="text-blue-300 text-xs truncate">Gestión de taller</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-blue-300 hover:text-white hover:bg-blue-800 p-1 h-7 w-7 shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '→' : '←'}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            // Badge de alerta para compras (solicitudes pendientes)
            const badgeCompras = item.href === '/compras' && !isActive && (alertas?.compras ?? 0) > 0
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="text-lg shrink-0 relative">
                    {item.icon}
                    {badgeCompras && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold animate-pulse"
                        style={{ fontSize: '9px', lineHeight: '1' }}>
                        {(alertas?.compras ?? 0) > 9 ? '9+' : alertas?.compras}
                      </span>
                    )}
                  </span>
                  {!collapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {!collapsed && badgeCompras && (
                    <span className="ml-auto bg-orange-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                      {(alertas?.compras ?? 0) > 9 ? '9+' : alertas?.compras}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Notificaciones */}
      <div className="px-2 pb-2 relative">
        <NotificacionesBell collapsed={collapsed} />
      </div>

      {/* User info */}
      <div className="border-t border-blue-800 p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.nombre_completo ?? 'Usuario'}</p>
              <p className="text-xs text-blue-300 truncate">{ROL_LABEL[roleName] ?? roleName}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex gap-1 mt-2">
            <Link href="/perfil" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full text-blue-300 hover:text-white hover:bg-blue-800 text-xs">
                👤 Perfil
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-blue-300 hover:text-white hover:bg-blue-800 text-xs"
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
